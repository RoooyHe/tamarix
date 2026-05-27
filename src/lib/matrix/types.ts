import { t } from "$lib/i18n";

// --- Task Status ---
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "closed";

// Reactive label helpers: use t() so they update when locale changes.
// In Svelte templates, use t("status.todo") directly or call these functions inline.
export function getStatusLabel(status: TaskStatus): string {
  return t("status." + status);
}

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "review",
  "done",
  "closed"
];

// --- Priority ---
export type Priority = "critical" | "high" | "medium" | "low";

export function getPriorityLabel(priority: Priority): string {
  return t("priority." + priority);
}

export const PRIORITY_ORDER: Priority[] = [
  "critical",
  "high",
  "medium",
  "low"
];

// --- Task Type ---
export type TaskType = "bug" | "feature" | "task" | "improvement" | "epic";

export function getTypeLabel(type: TaskType): string {
  return t("type." + type);
}

// --- Task Interface ---
export interface Task {
  /** Matrix Room ID */
  roomId: string;
  /** Task ticket ID, e.g. "TAM-42" */
  ticketId?: string;
  /** Task title (from m.room.name) */
  title: string;
  /** Task description (from m.room.topic) */
  description?: string;
  /** Rich text description (from com.tamarix.description, Markdown) */
  formattedDescription?: string;
  /** Work log entries */
  worklogs?: WorklogEntry[];
  /** Task status */
  status: TaskStatus;
  /** Priority */
  priority?: Priority;
  /** Task type */
  type?: TaskType;
  /** Due date (ISO 8601) */
  dueDate?: string;
  /** Story points / estimate */
  estimate?: { points: number; unit: "story_points" | "hours" | "days" };
  /** Tags */
  tags: string[];
  /** Assigned user Matrix ID */
  assignee?: string;
  /** Whether the task is archived */
  archived?: boolean;
  /** User who archived the task */
  archivedBy?: string;
  /** When the task was archived (ISO 8601) */
  archivedAt?: string;
  /** Parent Space (project) Room ID */
  projectRoomId?: string;
  /** Whether the task room has encryption enabled */
  encrypted?: boolean;
  /** Room creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

// --- Project Interface ---
export interface Project {
  /** Matrix Space Room ID */
  roomId: string;
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** Number of tasks in the project */
  taskCount: number;
  /** Room creation timestamp */
  createdAt: number;
}

// --- Estimate Unit ---
export type EstimateUnit = "story_points" | "hours" | "days";

// --- Relation Type ---
export type RelationType = "blocks" | "duplicates" | "relates" | "subtask_of";

// --- Attachment Interface ---
export interface Attachment {
  /** Matrix event ID */
  eventId: string;
  /** File name */
  fileName: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** mxc:// URL from Matrix */
  mxcUrl: string;
  /** Thumbnail mxc:// URL (for images/videos) */
  thumbnailMxcUrl?: string;
  /** Thumbnail info */
  thumbnailInfo?: { w: number; h: number; mimetype: string; size: number };
  /** Who uploaded */
  uploadedBy: string;
  /** When uploaded (ms since epoch) */
  uploadedAt: number;
}

// --- Comment Interface ---
export interface Comment {
  /** Matrix event ID */
  eventId: string;
  /** Sender Matrix user ID */
  sender: string;
  /** Message body text */
  content: string;
  /** Event timestamp (ms since epoch) */
  timestamp: number;
  /** File attachments (from m.image/m.file/m.video/m.audio messages) */
  attachments?: Attachment[];
}

// --- Custom State Event Types ---
export const TAMARIX_EVENT_TYPES = {
  TASK_STATUS: "com.tamarix.task_status",
  PRIORITY: "com.tamarix.priority",
  DUE_DATE: "com.tamarix.due_date",
  TASK_TYPE: "com.tamarix.task_type",
  ESTIMATE: "com.tamarix.estimate",
  TAGS: "com.tamarix.tags",
  TICKET_ID: "com.tamarix.ticket_id",
  RELATION: "com.tamarix.relation",
  SPRINT_META: "com.tamarix.sprint_meta",
  ASSIGNEE: "com.tamarix.assignee",
  TASK_ARCHIVED: "com.tamarix.task_archived",
  DESCRIPTION: "com.tamarix.description",
  WORKLOG: "com.tamarix.worklog",
  VERSION: "com.tamarix.version",
  TASK_VERSION: "com.tamarix.task_version",
  WATCHER: "com.tamarix.watcher",
  NOTIFICATION_PREFS: "com.tamarix.notification_prefs"
} as const;

// --- Worklog Entry ---
export interface WorklogEntry {
  /** Matrix user ID */
  userId: string;
  /** Hours logged */
  hours: number;
  /** Optional note */
  note?: string;
  /** When logged (ms since epoch) */
  loggedAt: number;
}

// --- Version Info ---
export interface VersionInfo {
  /** Version name (e.g. "v1.0") */
  name: string;
  /** Version description */
  description?: string;
  /** Release date (ISO 8601) */
  releaseDate?: string;
  /** Version status */
  status: "planned" | "released" | "archived";
}

// --- Notification ---
export type NotificationType = "assign" | "status_change" | "mention" | "due_remind";

export interface Notification {
  /** Unique ID (client-generated) */
  id: string;
  /** Notification type */
  type: NotificationType;
  /** Task room ID */
  taskId: string;
  /** Task title */
  taskTitle: string;
  /** Who triggered the notification */
  triggeredBy: string;
  /** When triggered (ms since epoch) */
  triggeredAt: number;
  /** Whether the notification has been read */
  read: boolean;
}

// --- Notification Preferences ---
export interface NotificationPrefs {
  /** Notify on task assignment */
  assignNotify: boolean;
  /** Notify on status change */
  statusChangeNotify: boolean;
  /** Remind before due date */
  dueRemind: boolean;
  /** Notify on @mention */
  mentionNotify: boolean;
  /** Notification channels */
  channels: ("in_app" | "email")[];
}
