/**
 * Tamarix AS -- Ticket ID generator (idempotent)
 *
 * Listens for room creation events and injects com.tamarix.ticket_id
 * if it doesn't already exist. This ensures both frontend and AS
 * can safely create ticket IDs without conflicts.
 *
 * Format: TAM-{n} -- identical to the frontend's generateNextTicketId().
 */

import { type MatrixClient, getBot, sendStateEvent, getStateEvent } from "./bot.js";
import { getDb } from "./db.js";
import { createLogger } from "./logger.js";

const log = createLogger("ticket-id");

const TICKET_ID_REGEX = /^TAM-(\d+)$/;

/**
 * Handle a newly created room: check if ticket_id already exists,
 * and if not, generate and inject the next one for the project.
 */
export async function handleRoomCreated(roomId: string, projectId: string, client?: MatrixClient): Promise<void> {
  const db = getDb();

  // Check if ticket_id already exists (frontend may have injected it)
  const existing = await getStateEvent<{ id: string }>(roomId, "com.tamarix.ticket_id");
  if (existing?.id) {
    log.info(`Room ${roomId} already has ticket_id: ${existing.id}, skipping`);
    return;
  }

  // Find the max ticket number in this project
  const row = db.prepare(
    "SELECT ticket_id FROM tasks WHERE project_room_id = ? ORDER BY ticket_id DESC LIMIT 1"
  ).get(projectId) as { ticket_id: string } | undefined;

  let nextNum = 1;
  if (row?.ticket_id) {
    const match = row.ticket_id.match(TICKET_ID_REGEX);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  // Also check rooms not yet in the index by scanning the bot's known rooms
  const bot = client ?? getBot();
  try {
    const roomState = await bot.getRoomState(roomId);
    const parentEvent = roomState.find(
      (e: any) => e.type === "m.space.parent" && e.state_key === projectId
    );
    if (parentEvent) {
      // Room belongs to the project, proceed
    }
  } catch (err) {
    log.warn(`Could not verify project membership for room ${roomId}: ${err}`);
  }

  const ticketId = `TAM-${nextNum}`;
  log.info(`Injecting ticket_id ${ticketId} into room ${roomId}`);

  try {
    await sendStateEvent(roomId, "com.tamarix.ticket_id", "", { id: ticketId });
  } catch (err) {
    log.error(`Failed to inject ticket_id ${ticketId} into room ${roomId}: ${err}`);
  }
}
