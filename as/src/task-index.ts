/**
 * Tamarix AS -- Task Index
 *
 * Manages the tasks SQLite table: upsert, update, remove,
 * and mark archived/encrypted. Uses a column whitelist to
 * prevent SQL injection from dynamic column names.
 */

import { getDb } from "./db.js";
import { createLogger } from "./logger.js";

const log = createLogger("task-index");

/** Whitelist of allowed columns for dynamic updates. */
const ALLOWED_COLUMNS = new Set([
  "title",
  "status",
  "priority",
  "task_type",
  "assignee",
  "due_date",
  "ticket_id",
  "encrypted",
  "archived",
]);

/**
 * Convert camelCase to snake_case for DB column names.
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Upsert a task's metadata into the tasks table.
 * Called whenever a com.tamarix.* state event changes for a task room.
 */
export function upsertTask(
  roomId: string,
  projectId: string,
  updates: Record<string, unknown>
): void {
  const db = getDb();
  const existing = db.prepare("SELECT room_id FROM tasks WHERE room_id = ?").get(roomId);

  if (existing) {
    // Build dynamic UPDATE with whitelist enforcement
    const entries = Object.entries(updates).filter(
      ([key]) => ALLOWED_COLUMNS.has(toSnakeCase(key))
    );
    if (entries.length === 0) return;

    const setClause = entries.map(([key]) => `${toSnakeCase(key)} = ?`).join(", ");
    const values = entries.map(([, val]) => val);
    db.prepare(`UPDATE tasks SET ${setClause}, updated_at = ? WHERE room_id = ?`)
      .run(...values, Date.now(), roomId);
  } else {
    // INSERT with defaults
    db.prepare(`
      INSERT INTO tasks (room_id, project_room_id, title, status, priority, task_type, assignee, due_date, ticket_id, encrypted, archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (room_id) DO UPDATE SET
        project_room_id = excluded.project_room_id,
        title = COALESCE(excluded.title, tasks.title),
        status = COALESCE(excluded.status, tasks.status),
        priority = COALESCE(excluded.priority, tasks.priority),
        task_type = COALESCE(excluded.task_type, tasks.task_type),
        assignee = COALESCE(excluded.assignee, tasks.assignee),
        due_date = COALESCE(excluded.due_date, tasks.due_date),
        ticket_id = COALESCE(excluded.ticket_id, tasks.ticket_id),
        encrypted = COALESCE(excluded.encrypted, tasks.encrypted),
        updated_at = excluded.updated_at
    `).run(
      roomId,
      projectId,
      (updates.title as string) ?? null,
      (updates.status as string) ?? "todo",
      (updates.priority as string) ?? null,
      (updates.taskType as string) ?? null,
      (updates.assignee as string) ?? null,
      (updates.dueDate as string) ?? null,
      (updates.ticketId as string) ?? null,
      (updates.encrypted as number) ?? 0,
      (updates.archived as number) ?? 0,
      Date.now(),
      Date.now()
    );
  }
}

/**
 * Update a single field on a task.
 * Only allows whitelisted columns.
 */
export function updateTaskField(roomId: string, field: string, value: unknown): void {
  const db = getDb();
  const snakeField = toSnakeCase(field);
  if (!ALLOWED_COLUMNS.has(snakeField)) {
    log.warn(`Rejected update to non-whitelisted column: ${snakeField}`);
    return;
  }
  db.prepare(`UPDATE tasks SET ${snakeField} = ?, updated_at = ? WHERE room_id = ?`)
    .run(value as any, Date.now(), roomId);
}

/**
 * Remove a task from the index.
 */
export function removeTask(roomId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM tasks WHERE room_id = ?").run(roomId);
  log.info(`Removed task ${roomId} from index`);
}

/**
 * Mark a task as archived/unarchived.
 */
export function setTaskArchived(roomId: string, archived: boolean): void {
  updateTaskField(roomId, "archived", archived ? 1 : 0);
}

/**
 * Mark a task as encrypted.
 */
export function setTaskEncrypted(roomId: string, encrypted: boolean): void {
  updateTaskField(roomId, "encrypted", encrypted ? 1 : 0);
}
