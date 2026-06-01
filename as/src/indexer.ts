/**
 * Tamarix AS -- Search Indexer
 *
 * Monitors all com.tamarix.* state event changes and upserts
 * into the SQLite index for fast searching via HTTP API.
 */

import { getDb } from "./db.js";
import { createLogger } from "./logger.js";

const log = createLogger("indexer");

/**
 * Upsert a task's metadata into the tasks table.
 * Called whenever a com.tamarix.* state event changes for a task room.
 */
export function upsertTask(roomId: string, projectId: string, updates: Record<string, unknown>): void {
  const db = getDb();

  // Check if task exists
  const existing = db.prepare("SELECT room_id FROM tasks WHERE room_id = ?").get(roomId);

  if (existing) {
    // Build dynamic UPDATE
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${toSnakeCase(k)} = ?`).join(", ");
    const values = keys.map(k => updates[k]);
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
 */
export function updateTaskField(roomId: string, field: string, value: unknown): void {
  const db = getDb();
  const snakeField = toSnakeCase(field);
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

/**
 * Upsert a worklog entry.
 */
export function upsertWorklog(roomId: string, stateKey: string, userId: string, hours: number, note: string, loggedAt: number): void {
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

/**
 * Upsert a version definition.
 */
export function upsertVersion(projectRoomId: string, versionKey: string, name: string, status: string, releaseDate?: string, description?: string): void {
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

/**
 * Search tasks using FTS5 full-text search.
 */
export function searchTasksFTS(query: string, projectId?: string, status?: string, assignee?: string, limit: number = 50): any[] {
  const db = getDb();

  let sql = `
    SELECT t.* FROM tasks t
    JOIN tasks_fts fts ON t.rowid = fts.rowid
    WHERE tasks_fts MATCH ?
  `;
  const params: any[] = [query];

  if (projectId) {
    sql += " AND t.project_room_id = ?";
    params.push(projectId);
  }
  if (status) {
    sql += " AND t.status = ?";
    params.push(status);
  }
  if (assignee) {
    sql += " AND t.assignee = ?";
    params.push(assignee);
  }
  sql += " ORDER BY rank LIMIT ?";
  params.push(limit);

  return db.prepare(sql).all(...params);
}

/**
 * Get tasks by project with optional filters and pagination.
 */
export function getTasksByProject(projectId: string, status?: string, page: number = 1, limit: number = 50): any[] {
  const db = getDb();
  const offset = (page - 1) * limit;

  let sql = "SELECT * FROM tasks WHERE project_room_id = ? AND archived = 0";
  const params: any[] = [projectId];

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return db.prepare(sql).all(...params);
}

/**
 * Get project statistics: task count per status.
 */
export function getProjectStats(projectId: string): Record<string, number> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM tasks
    WHERE project_room_id = ? AND archived = 0
    GROUP BY status
  `).all(projectId) as { status: string; count: number }[];

  const stats: Record<string, number> = {
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
    closed: 0
  };
  for (const row of rows) {
    stats[row.status] = row.count;
  }
  return stats;
}

/**
 * Resolve a Tamarix ticket ID (e.g. TAM-42) to its Matrix task room ID.
 */
export function getRoomIdByTicketId(ticketId: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT room_id FROM tasks WHERE ticket_id = ? LIMIT 1").get(ticketId) as { room_id: string } | undefined;
  return row?.room_id ?? null;
}

/**
 * Helper: convert camelCase to snake_case for DB column names.
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
