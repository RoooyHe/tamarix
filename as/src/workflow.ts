/**
 * Tamarix AS -- Workflow engine (hard validation)
 *
 * Monitors com.tamarix.task_status changes and validates transitions
 * against the same VALID_TRANSITIONS whitelist used by the frontend.
 * If a transition is invalid, the AS rolls back to the previous status
 * and sends a notice to the room.
 *
 * This provides a server-side hard validation layer that complements
 * the frontend's soft validation (UI disables invalid options).
 */

import { getBot, sendNotice, sendStateEvent } from "./bot.js";
import { getDb } from "./db.js";
import { createLogger } from "./logger.js";

const log = createLogger("workflow");

type TaskStatus = "todo" | "in_progress" | "review" | "done" | "closed";

/**
 * Valid status transitions -- identical to the frontend's VALID_TRANSITIONS.
 */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in_progress", "closed"],
  in_progress: ["review", "todo", "closed"],
  review: ["done", "in_progress", "closed"],
  done: ["closed"],
  closed: []
};

/**
 * Check whether a status transition is allowed.
 */
function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true; // no-op
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Handle a task_status change event.
 * If the transition is invalid, roll back and notify the room.
 */
export async function handleStatusChange(
  roomId: string,
  sender: string,
  newStatus: string,
  prevStatus?: string
): Promise<void> {
  const from = (prevStatus as TaskStatus) ?? "todo";
  const to = newStatus as TaskStatus;

  if (isValidTransition(from, to)) {
    log.info(`Room ${roomId}: valid transition ${from} -> ${to} by ${sender}`);
    // Update the index
    const db = getDb();
    db.prepare("UPDATE tasks SET status = ?, updated_at = ? WHERE room_id = ?")
      .run(to, Date.now(), roomId);
    return;
  }

  // Invalid transition -- roll back
  log.warn(`Room ${roomId}: invalid transition ${from} -> ${to} by ${sender}, rolling back`);

  try {
    // Roll back the state event to the previous status
    await sendStateEvent(roomId, "com.tamarix.task_status", "", { status: from });

    // Notify the room
    await sendNotice(
      roomId,
      `Invalid status transition: ${from} -> ${to}. Reverted to ${from}.`,
      `<b>Invalid status transition</b>: <code>${from} -> ${to}</code>. Reverted to <code>${from}</code>.`
    );

    log.info(`Room ${roomId}: rolled back to ${from}`);
  } catch (err) {
    log.error(`Room ${roomId}: failed to roll back status: ${err}`);
  }
}
