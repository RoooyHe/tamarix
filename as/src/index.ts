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
import { createBot, initBot, ensureJoined } from "./bot.js";
import { initDatabase, closeDatabase, getDb, setWatermark } from "./db.js";
import { initAppService, onAppServiceEvent, handleAppServiceRequest } from "./appservice.js";
import { discoverProjects, startPeriodicSync, stopPeriodicSync } from "./discovery.js";
import { handleRoomCreated } from "./ticket-id.js";
import { setTaskEncrypted } from "./task-index.js";
import { handleMentionNotification } from "./notifier.js";
import { isRoomEncrypted, markRoomEncrypted } from "./e2ee-guard.js";
import { initApi, handleRequest } from "./api.js";
import { TAMARIX_PREFIX, handleStateEvent, getPrevContent } from "./state-handlers.js";
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

  // 4. Register event handlers

  // Room creation -> ticket ID injection
  onAppServiceEvent("m.room.create", async (event) => {
    const roomId = event.room_id;
    const sender = event.sender;
    if (!roomId || !sender) return;
    if (sender === BOT_USER_ID) return;

    log.info(`Room created: ${roomId} by ${sender}`);
    await ensureJoined(roomId);

    const encrypted = await isRoomEncrypted(roomId);
    if (encrypted) {
      markRoomEncrypted(roomId);
      setTaskEncrypted(roomId, true);
      log.info(`Room ${roomId} is encrypted -- some features will be degraded`);
    }

    await handleRoomCreated(roomId, "");
  });

  // Membership changes handled by discovery sync
  onAppServiceEvent("m.room.member", async (_event) => {});

  // Handle all com.tamarix.* state events
  onAppServiceEvent("event", async (event) => {
    const eventType = event.type as string;
    const roomId = event.room_id;
    const sender = event.sender;
    const stateKey = event.state_key;
    if (!eventType || !roomId || !sender) return;
    if (!eventType.startsWith(TAMARIX_PREFIX)) return;
    if (sender === BOT_USER_ID) return;
    if (stateKey === undefined || stateKey === null) return;

    if (event.event_id) {
      setWatermark(getDb(), event.event_id);
    }

    const content = event.content as Record<string, unknown>;
    const prevContent = getPrevContent(event);

    await handleStateEvent(roomId, stateKey, eventType, content, sender, prevContent);
  });

  // m.room.message -> @mention detection (non-encrypted rooms only)
  onAppServiceEvent("m.room.message", async (event) => {
    const roomId = event.room_id;
    const sender = event.sender;
    if (!roomId || !sender) return;
    if (sender === BOT_USER_ID) return;

    const encrypted = await isRoomEncrypted(roomId);
    if (encrypted) return;

    const content = event.content as Record<string, unknown>;
    const body = content.body as string;
    if (body) {
      await handleMentionNotification(roomId, sender, body, false);
    }
  });

  // 5. Run project discovery
  await discoverProjects();
  log.info("Project discovery complete");

  // 6. Start periodic sync
  startPeriodicSync();

  // 7. Start HTTP API server and Matrix AppService endpoint
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
