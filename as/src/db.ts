/**
 * Tamarix AS -- SQLite Database initialization
 *
 * Initializes Bun SQLite with WAL mode for concurrent read performance,
 * creates all tables and indexes needed by the AS.
 */

import { Database as BunDatabase } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import path from "path";
import { createLogger } from "./logger.js";

const log = createLogger("db");

export interface StatementResult {
  changes?: number;
  lastInsertRowid?: number | bigint;
}

export interface PreparedStatement {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): StatementResult;
}

export interface AppDatabase {
  pragma(statement: string): void;
  exec(sql: string): void;
  prepare(sql: string): PreparedStatement;
  close(): void;
}

class BunDatabaseAdapter implements AppDatabase {
  private readonly db: BunDatabase;

  constructor(dbPath: string) {
    this.db = new BunDatabase(dbPath, { create: true });
  }

  pragma(statement: string): void {
    this.db.exec(`PRAGMA ${statement}`);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): PreparedStatement {
    const statement = this.db.query(sql);
    return {
      get: (...params: unknown[]) => statement.get(...params as []),
      all: (...params: unknown[]) => statement.all(...params as []),
      run: (...params: unknown[]) => statement.run(...params as [])
    };
  }

  close(): void {
    this.db.close();
  }
}

let dbInstance: AppDatabase | null = null;

const SCHEMA = `
-- Tasks index: mirrors com.tamarix.* state events from each task room
CREATE TABLE IF NOT EXISTS tasks (
  room_id TEXT PRIMARY KEY,
  project_room_id TEXT NOT NULL,
  ticket_id TEXT,
  title TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT,
  task_type TEXT,
  assignee TEXT,
  due_date TEXT,
  encrypted INTEGER DEFAULT 0,
  archived INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_room_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);

-- Full-text search virtual table on task titles
CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
  title,
  content=tasks,
  content_rowid=rowid
);

-- Worklogs index
CREATE TABLE IF NOT EXISTS worklogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  state_key TEXT NOT NULL,
  user_id TEXT,
  hours REAL,
  note TEXT,
  logged_at INTEGER,
  FOREIGN KEY (room_id) REFERENCES tasks(room_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worklogs_room ON worklogs(room_id);

-- Watchers index: tracks who is watching which task
CREATE TABLE IF NOT EXISTS watchers (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_watchers_user ON watchers(user_id);

-- Versions index: project-level version definitions
CREATE TABLE IF NOT EXISTS versions (
  project_room_id TEXT NOT NULL,
  version_key TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'planned',
  release_date TEXT,
  description TEXT,
  PRIMARY KEY (project_room_id, version_key)
);

-- Task-Version associations
CREATE TABLE IF NOT EXISTS task_versions (
  room_id TEXT NOT NULL,
  version_key TEXT NOT NULL,
  PRIMARY KEY (room_id, version_key),
  FOREIGN KEY (room_id) REFERENCES tasks(room_id) ON DELETE CASCADE
);

-- Event watermark: tracks the last processed event to avoid duplicate processing
CREATE TABLE IF NOT EXISTS event_watermark (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_event_id TEXT
);

-- Insert initial watermark row if not exists
INSERT OR IGNORE INTO event_watermark (id, last_event_id) VALUES (1, '');
`;

/**
 * Initialize the SQLite database.
 * Creates all tables and indexes if they don't exist.
 */
export function initDatabase(dbPath: string): AppDatabase {
  const resolvedPath = path.resolve(dbPath);
  log.info(`Initializing database at: ${resolvedPath}`);
  mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const db = new BunDatabaseAdapter(resolvedPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Create tables
  db.exec(SCHEMA);

  // Create FTS sync triggers to keep tasks_fts in sync with tasks
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks BEGIN
      INSERT INTO tasks_fts(rowid, title) VALUES (new.rowid, new.title);
    END;
    CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks BEGIN
      INSERT INTO tasks_fts(tasks_fts, rowid, title) VALUES ('delete', old.rowid, old.title);
    END;
    CREATE TRIGGER IF NOT EXISTS tasks_au AFTER UPDATE ON tasks BEGIN
      INSERT INTO tasks_fts(tasks_fts, rowid, title) VALUES ('delete', old.rowid, old.title);
      INSERT INTO tasks_fts(rowid, title) VALUES (new.rowid, new.title);
    END;
  `);

  log.info("Database initialized successfully");
  dbInstance = db;
  return db;
}

/**
 * Get the database singleton.
 * Throws if initDatabase() has not been called.
 */
export function getDb(): AppDatabase {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return dbInstance;
}

/**
 * Get or update the event watermark (last processed event ID).
 */
export function getWatermark(db: AppDatabase): string {
  const row = db.prepare("SELECT last_event_id FROM event_watermark WHERE id = 1").get() as { last_event_id: string } | undefined;
  return row?.last_event_id ?? "";
}

export function setWatermark(db: AppDatabase, eventId: string): void {
  db.prepare("UPDATE event_watermark SET last_event_id = ? WHERE id = 1").run(eventId);
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    log.info("Database closed");
  }
}
