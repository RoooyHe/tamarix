/**
 * Tamarix AS -- Watcher management
 *
 * Maintains the watchers index (who watches which task)
 * and triggers notification chains when relevant events occur.
 */

import { getDb } from "./db.js";
import { createLogger } from "./logger.js";

const log = createLogger("watcher");

/**
 * Add a watcher to a task room.
 */
export function addWatcher(roomId: string, userId: string): void {
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO watchers (room_id, user_id) VALUES (?, ?)").run(roomId, userId);
  log.info(`Added watcher ${userId} to room ${roomId}`);
}

/**
 * Remove a watcher from a task room.
 */
export function removeWatcher(roomId: string, userId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM watchers WHERE room_id = ? AND user_id = ?").run(roomId, userId);
  log.info(`Removed watcher ${userId} from room ${roomId}`);
}

/**
 * Get all watchers for a task room.
 */
export function getWatchersForRoom(roomId: string): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT user_id FROM watchers WHERE room_id = ?").all(roomId) as { user_id: string }[];
  return rows.map(r => r.user_id);
}

/**
 * Get all rooms a user is watching.
 */
export function getWatchedRooms(userId: string): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT room_id FROM watchers WHERE user_id = ?").all(userId) as { room_id: string }[];
  return rows.map(r => r.room_id);
}

/**
 * Get watchers for a task room, including project-level watchers.
 * Project-level watchers watch all tasks in a Space.
 */
export function getWatchersForNotification(roomId: string, projectRoomId: string): string[] {
  const db = getDb();

  // Task-level watchers
  const taskWatchers = db.prepare("SELECT user_id FROM watchers WHERE room_id = ?").all(roomId) as { user_id: string }[];

  // Project-level watchers: users watching the Space room itself
  const projectWatchers = db.prepare("SELECT user_id FROM watchers WHERE room_id = ?").all(projectRoomId) as { user_id: string }[];

  // Merge and deduplicate
  const allWatchers = new Set<string>();
  for (const w of taskWatchers) allWatchers.add(w.user_id);
  for (const w of projectWatchers) allWatchers.add(w.user_id);

  return [...allWatchers];
}
