/**
 * Tamarix AS -- Entry point
 *
 * Initializes the Matrix AppService, registers event handlers,
 * starts project discovery, and launches the HTTP API server.
 *
 * Startup flow:
 * 1. Read .env / config
 * 2. Initialize AppService HTTP adapter
 * 3. Initialize SQLite
 * 4. Run database migrations (create tables)
 * 5. Start Bot REST client, connect to homeserver
 * 6. Run project discovery (scan Spaces + join child rooms)
 * 7. Full sync index (traverse all room state events)
 * 8. Register event handlers
 * 9. Start periodic tasks
 * 10. Start HTTP API server (port 9000)
 * 11. Log: AS startup complete
 */

import "dotenv/config";
import { createBot, initBot, ensureJoined, getStateEvent, getBot } from "./bot.js";
import { initDatabase, closeDatabase, getDb, setWatermark } from "./db.js";
import { initAppService, onAppServiceEvent, handleAppServiceRequest, type MatrixEvent } from "./appservice.js";
import { discoverProjects, startPeriodicSync, stopPeriodicSync } from "./discovery.js";
import { handleRoomCreated } from "./ticket-id.js";
import { handleStatusChange } from "./workflow.js";
import { handleSchemaValidation } from "./schema.js";
import { upsertTask, upsertWorklog, upsertVersion, upsertTaskVersion, setTaskEncrypted, setTaskArchived } from "./indexer.js";
import { handleAssigneeNotification, handleStatusNotification, handleMentionNotification } from "./notifier.js";
import { addWatcher } from "./watcher.js";
import { isRoomEncrypted, markRoomEncrypted } from "./e2ee-guard.js";
import { initApi, handleRequest } from "./api.js";
import { createLogger } from "./logger.js";

const log = createLogger("main");

// --- Configuration from environment ---
const HOMESERVER_URL = process.env.HOMESERVER_URL ?? "http://localhost:8008";
const HOMESERVER_DOMAIN = process.env.HOMESERVER_DOMAIN ?? "localhost";
const AS_PORT = parseInt(process.env.AS_PORT ?? "9000", 10);
const AS_TOKEN = process.env.AS_TOKEN ?? "";
const HS_TOKEN = process.env.HS_TOKEN ?? "";
const BOT_LOCALPART = process.env.BOT_LOCALPART ?? "tamarix-bot";
const DB_PATH = process.env.DB_PATH ?? "./data/tamarix-as.db";
const API_TOKEN = process.env.API_TOKEN ?? "";
const BOT_USER_ID = `@${BOT_LOCALPART}:${HOMESERVER_DOMAIN}`;

// --- TAMARIX event type prefix ---
const TAMARIX_PREFIX = "com.tamarix.";

// --- State event type handlers ---
const STATE_HANDLERS: Record<string, (roomId: string, stateKey: string, content: Record<string, unknown>, sender: string, prevContent: Record<string, unknown> | null) => Promise<void> | void> = {
  "com.tamarix.task_status": async (roomId, _sk, content, sender, prevContent) => {
    // Schema validation
    handleSchemaValidation(roomId, "com.tamarix.task_status", content, sender);
    // Workflow validation
    const newStatus = content.status as string;
    const oldStatus = prevContent?.status as string | undefined;
    if (oldStatus && newStatus) {
      await handleStatusChange(roomId, sender, newStatus, oldStatus);
    }
    // Update search index
    upsertTask(roomId, "", { status: newStatus });
    // Notify watchers
    const metadata = await getTaskNotificationMetadata(roomId);
    await handleStatusNotification(
      roomId,
      metadata.projectRoomId,
      metadata.ticketId,
      metadata.title,
      oldStatus ?? "",
      newStatus,
      sender
    );
  },

  "com.tamarix.priority": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.priority", content, sender);
    upsertTask(roomId, "", { priority: content.level as string });
  },

  "com.tamarix.task_type": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.task_type", content, sender);
    upsertTask(roomId, "", { taskType: content.type as string });
  },

  "com.tamarix.description": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.description", content, sender);
    upsertTask(roomId, "", { title: content.body as string });
  },

  "com.tamarix.assignee": async (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.assignee", content, sender);
    upsertTask(roomId, "", { assignee: content.user_id as string });
    // Send assignment notification
    if (content.user_id) {
      const metadata = await getTaskNotificationMetadata(roomId);
      await handleAssigneeNotification(
        roomId,
        metadata.ticketId,
        metadata.title,
        content.user_id as string,
        sender
      );
    }
  },

  "com.tamarix.due_date": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.due_date", content, sender);
    upsertTask(roomId, "", { dueDate: content.date as string });
  },

  "com.tamarix.estimate": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.estimate", content, sender);
    // Estimate data is stored as-is; no dedicated index column
  },

  "com.tamarix.tags": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.tags", content, sender);
    // Tags stored in state; no dedicated index column
  },

  "com.tamarix.ticket_id": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.ticket_id", content, sender);
    upsertTask(roomId, "", { ticketId: content.id as string });
  },

  "com.tamarix.worklog": (roomId, stateKey, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.worklog", content, sender);
    upsertWorklog(
      roomId,
      stateKey,
      content.user_id as string,
      content.hours as number,
      content.note as string,
      Date.parse(content.logged_at as string) || Date.now()
    );
  },

  "com.tamarix.version": (roomId, stateKey, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.version", content, sender);
    upsertVersion(
      roomId,
      stateKey,
      content.name as string,
      content.status as string,
      content.release_date as string | undefined,
      content.description as string | undefined
    );
  },

  "com.tamarix.task_version": (roomId, stateKey, content, _sender) => {
    upsertTaskVersion(roomId, stateKey);
  },

  "com.tamarix.watcher": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.watcher", content, sender);
    const userId = content.user_id as string;
    if (userId) {
      addWatcher(roomId, userId);
    }
  },

  "com.tamarix.notification_prefs": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.notification_prefs", content, sender);
    // Prefs are read by notifier when sending notifications
  },

  "com.tamarix.relation": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.relation", content, sender);
    // Relations stored in state; no dedicated index column
  },

  "com.tamarix.task_archived": (roomId, _sk, content, _sender) => {
    const archived = content.archived as boolean;
    setTaskArchived(roomId, archived);
  }
};

async function getTaskNotificationMetadata(roomId: string): Promise<{
  projectRoomId: string;
  ticketId: string;
  title: string;
}> {
  const ticket = await getStateEvent<{ id: string }>(roomId, "com.tamarix.ticket_id");
  const name = await getStateEvent<{ name: string }>(roomId, "m.room.name");
  const parent = await findProjectRoomId(roomId);
  return {
    projectRoomId: parent,
    ticketId: ticket?.id ?? roomId,
    title: name?.name ?? roomId
  };
}

async function findProjectRoomId(roomId: string): Promise<string> {
  try {
    const state = await getDbSafeRoomState(roomId);
    const parent = state.find((event) => event.type === "m.space.parent" && typeof event.state_key === "string");
    return parent?.state_key ?? "";
  } catch {
    return "";
  }
}

async function getDbSafeRoomState(roomId: string): Promise<Array<{ type?: string; state_key?: string }>> {
  return await getBot().getRoomState(roomId);
}

function getPrevContent(event: MatrixEvent): Record<string, unknown> | null {
  return event.prev_content ?? event.unsigned?.prev_content ?? null;
}

/**
 * Main entry point.
 */
async function main() {
  log.info("Starting Tamarix Application Service...");

  // 1. Initialize SQLite database
  initDatabase(DB_PATH);
  log.info("Database initialized");

  // 2. Initialize API authentication
  initApi(API_TOKEN);

  // 3. Create REST bot client and AppService HTTP adapter
  const botClient = createBot({
    homeserverUrl: HOMESERVER_URL,
    asToken: AS_TOKEN,
    userId: BOT_USER_ID
  });
  initBot(botClient);
  await botClient.start();
  initAppService({
    hsToken: HS_TOKEN,
    homeserverDomain: HOMESERVER_DOMAIN,
    botUserId: BOT_USER_ID
  });
  log.info(`Bot client initialized: ${BOT_USER_ID}`);

  // 5. Register event handlers

  // Room creation -> ticket ID injection
  onAppServiceEvent("m.room.create", async (event) => {
    const roomId = event.room_id;
    const sender = event.sender;
    if (!roomId || !sender) return;

    // Skip events from the bot itself
    if (sender === BOT_USER_ID) return;

    log.info(`Room created: ${roomId} by ${sender}`);

    // Ensure bot joins the room
    await ensureJoined(roomId);

    // Check for E2EE
    const encrypted = await isRoomEncrypted(roomId);
    if (encrypted) {
      markRoomEncrypted(roomId);
      setTaskEncrypted(roomId, true);
      log.info(`Room ${roomId} is encrypted -- some features will be degraded`);
    }

    // Try to inject ticket_id (idempotent: skips if already exists)
    await handleRoomCreated(roomId, "");
  });

  // State event changes
  onAppServiceEvent("m.room.member", async (_event) => {
    // Membership changes handled by discovery sync
  });

  // Handle all com.tamarix.* state events from AppService transactions.
  onAppServiceEvent("event", async (event) => {
    const eventType = event.type as string;
    const roomId = event.room_id;
    const sender = event.sender;
    const stateKey = event.state_key;
    if (!eventType || !roomId || !sender) return;

    // Skip non-tamarix events
    if (!eventType.startsWith(TAMARIX_PREFIX)) return;

    // Skip events from the bot itself
    if (sender === BOT_USER_ID) return;

    // Skip if not a state event (state_key is present)
    if (stateKey === undefined || stateKey === null) return;

    // Update event watermark
    if (event.event_id) {
      setWatermark(getDb(), event.event_id);
    }

    const content = event.content as Record<string, unknown>;
    const prevContent = getPrevContent(event);

    // Dispatch to the appropriate handler
    const handler = STATE_HANDLERS[eventType];
    if (handler) {
      try {
        await handler(roomId, stateKey, content, sender, prevContent);
      } catch (err) {
        log.error(`Error handling ${eventType} in ${roomId}: ${err}`);
      }
    }
  });

  // m.room.message -> @mention detection (non-encrypted rooms only)
  onAppServiceEvent("m.room.message", async (event) => {
    const roomId = event.room_id;
    const sender = event.sender;
    if (!roomId || !sender) return;

    // Skip events from the bot itself
    if (sender === BOT_USER_ID) return;

    // Skip encrypted rooms (Bot cannot read message content)
    const encrypted = await isRoomEncrypted(roomId);
    if (encrypted) return;

    const content = event.content as Record<string, unknown>;
    const body = content.body as string;

    if (body) {
      await handleMentionNotification(roomId, sender, body, false);
    }
  });

  // 6. Run project discovery
  await discoverProjects();
  log.info("Project discovery complete");

  // 7. Start periodic sync
  startPeriodicSync();

  // 8. Start HTTP API server and Matrix AppService endpoint
  const server = Bun.serve({
    port: AS_PORT,
    async fetch(request) {
      const appServiceResponse = await handleAppServiceRequest(request);
      if (appServiceResponse) return appServiceResponse;
      return await handleRequest(request);
    }
  });
  log.info(`HTTP API and AppService server started on port ${AS_PORT}`);

  log.info("Tamarix Application Service started successfully");

  // Graceful shutdown
  process.on("SIGINT", () => {
    log.info("Shutting down...");
    stopPeriodicSync();
    closeDatabase();
    server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    log.info("Shutting down...");
    stopPeriodicSync();
    closeDatabase();
    server.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  log.error(`Fatal error: ${err}`);
  process.exit(1);
});
