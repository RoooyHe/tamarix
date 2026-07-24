/**
 * Tamarix AS -- Version Index
 *
 * Manages the versions and task_versions SQLite tables:
 * upsert version definitions and task-version associations.
 */

import { getDb } from "./db.js";

/**
 * Upsert a version definition.
 */
export function upsertVersion(
  projectRoomId: string,
  versionKey: string,
  name: string,
  status: string,
  releaseDate?: string,
  description?: string
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO versions (project_room_id, version_key, name, status, release_date, description)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (project_room_id, version_key) DO UPDATE SET
      name = excluded.name,
      status = excluded.status,
      release_date = excluded.release_date,
      description = excluded.description
  `).run(projectRoomId, versionKey, name, status, releaseDate ?? null, description ?? null);
}

/**
 * Upsert a task-version association.
 */
export function upsertTaskVersion(roomId: string, versionKey: string): void {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO task_versions (room_id, version_key)
    VALUES (?, ?)
  `).run(roomId, versionKey);
}

/**
 * Remove a task-version association.
 */
export function removeTaskVersion(roomId: string, versionKey: string): void {
  const db = getDb();
  db.prepare("DELETE FROM task_versions WHERE room_id = ? AND version_key = ?").run(roomId, versionKey);
}
