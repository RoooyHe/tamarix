/**
 * Tamarix AS -- Task Queries & Re-exports
 *
 * Provides FTS search, project queries, and ticket-ID resolution.
 * Domain-specific indexing (task, worklog, version) lives in
 * dedicated modules. This file re-exports them for backward compatibility.
 */

import { getDb } from "./db.js";

// Re-export domain modules for backward compatibility
export { upsertTask, updateTaskField, removeTask, setTaskArchived, setTaskEncrypted } from "./task-index.js";
export { upsertWorklog, removeWorklog } from "./worklog-index.js";
export { upsertVersion, upsertTaskVersion, removeTaskVersion } from "./version-index.js";

/**
 * Search tasks using FTS5 full-text search.
 */
export function searchTasksFTS(
  query: string,
  projectId?: string,
  status?: string,
  assignee?: string,
  limit: number = 50
): unknown[] {
  const db = getDb();

  let sql = `
    SELECT t.* FROM tasks t
    JOIN tasks_fts fts ON t.rowid = fts.rowid
    WHERE tasks_fts MATCH ?
  `;
  const params: unknown[] = [query];

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
export function getTasksByProject(
  projectId: string,
  status?: string,
  page: number = 1,
  limit: number = 50
): unknown[] {
  const db = getDb();
  const offset = (page - 1) * limit;

  let sql = "SELECT * FROM tasks WHERE project_room_id = ? AND archived = 0";
  const params: unknown[] = [projectId];

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
    closed: 0,
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
  const row = db
    .prepare("SELECT room_id FROM tasks WHERE ticket_id = ? LIMIT 1")
    .get(ticketId) as { room_id: string } | undefined;
  return row?.room_id ?? null;
}
