/**
 * Tamarix AS -- Project Discovery
 *
 * On startup, scans all Spaces the bot is aware of,
 * joins child rooms, and initializes the SQLite index
 * with current state events.
 *
 * Runs a periodic full sync every 60 minutes.
 */

import { type MatrixClient, getBot, getStateEvent } from "./bot.js";
import { upsertTask } from "./task-index.js";
import { isRoomEncrypted, markRoomEncrypted } from "./e2ee-guard.js";
import { resolveProjectParent } from "./room-utils.js";
import { createLogger } from "./logger.js";

const log = createLogger("discovery");

let syncInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Run project discovery: scan all rooms, build the search index.
 */
export async function discoverProjects(client?: MatrixClient): Promise<void> {
  const bot = client ?? getBot();

  log.info("Starting project discovery...");

  try {
    const joinedRooms = bot.getJoinedRooms();
    log.info(`Bot is in ${joinedRooms.length} rooms`);

    // Find project Spaces
    let projectCount = 0;
    for (const roomId of joinedRooms) {
      try {
        const createEvent = await getStateEvent<{ type: string }>(roomId, "m.room.create");
        if (createEvent?.type === "m.space") {
          projectCount++;
          log.info(`Found project space: ${roomId}`);
        }
      } catch {
        // Not a space or can't read state
      }
    }

    // Index all task rooms
    let taskCount = 0;
    for (const roomId of joinedRooms) {
      try {
        await indexRoom(roomId, bot);
        taskCount++;
      } catch (err) {
        log.warn(`Failed to index room ${roomId}: ${err}`);
      }
    }

    log.info(`Discovery completed: ${projectCount} projects, ${taskCount} rooms indexed`);
  } catch (err) {
    log.error(`Project discovery failed: ${err}`);
  }
}

/**
 * Index a single room by reading all its state events.
 */
async function indexRoom(roomId: string, client: MatrixClient): Promise<void> {
  const encrypted = await isRoomEncrypted(roomId);

  // Read task metadata from state events
  const ticketId = (await getStateEvent<{ id: string }>(roomId, "com.tamarix.ticket_id"))?.id ?? null;
  const status = (await getStateEvent<{ status: string }>(roomId, "com.tamarix.task_status"))?.status ?? "todo";
  const priority = (await getStateEvent<{ level: string }>(roomId, "com.tamarix.priority"))?.level ?? null;
  const taskType = (await getStateEvent<{ type: string }>(roomId, "com.tamarix.task_type"))?.type ?? null;
  const assignee = (await getStateEvent<{ user_id: string }>(roomId, "com.tamarix.assignee"))?.user_id ?? null;
  const dueDate = (await getStateEvent<{ date: string }>(roomId, "com.tamarix.due_date"))?.date ?? null;
  const archiveState = await getStateEvent<{ archived: boolean }>(roomId, "com.tamarix.task_archived");
  const nameEvent = await getStateEvent<{ name: string }>(roomId, "m.room.name");
  const title = nameEvent?.name ?? roomId;

  // Resolve parent project Space
  const projectRoomId = await resolveProjectParent(roomId, client);

  upsertTask(roomId, projectRoomId, {
    ticketId,
    title,
    status,
    priority,
    taskType,
    assignee,
    dueDate,
    encrypted: encrypted ? 1 : 0,
    archived: archiveState?.archived ? 1 : 0
  });

  if (encrypted) {
    markRoomEncrypted(roomId);
  }

  log.debug(`Indexed room ${roomId}: ${title}`);
}

/**
 * Start the periodic full sync (every 60 minutes).
 */
export function startPeriodicSync(): void {
  if (syncInterval) return;

  syncInterval = setInterval(async () => {
    log.info("Starting periodic full sync...");
    await discoverProjects();
  }, 60 * 60 * 1000);

  log.info("Periodic sync started (every 60 minutes)");
}

/**
 * Stop the periodic full sync.
 */
export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    log.info("Periodic sync stopped");
  }
}
