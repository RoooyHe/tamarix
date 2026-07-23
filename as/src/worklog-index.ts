/**
 * Tamarix AS -- Worklog Index
 *
 * Manages the worklogs SQLite table: upsert and remove worklog entries.
 */

import { getDb } from "./db.js";

/**
 * Upsert a worklog entry.
 */
export function upsertWorklog(
  roomId: string,
  stateKey: string,
  userId: string,
  hours: number,
  note: string,
  loggedAt: number
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO worklogs (room_id, state_key, user_id, hours, note, logged_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      user_id = excluded.user_id,
      hours = excluded.hours,
      note = excluded.note,
      logged_at = excluded.logged_at
  `).run(roomId, stateKey, userId, hours, note, loggedAt);
}

/**
 * Remove a worklog entry by state_key.
 */
export function removeWorklog(roomId: string, stateKey: string): void {
  const db = getDb();
  db.prepare("DELETE FROM worklogs WHERE room_id = ? AND state_key = ?").run(roomId, stateKey);
}
