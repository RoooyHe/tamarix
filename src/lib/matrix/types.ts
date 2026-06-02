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
  /** Manual sort order within a status column */
  sortOrder?: string;
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
  // --- P4: Version/Release ---
  VERSION: "com.tamarix.version",
  TASK_VERSION: "com.tamarix.task_version",

  // --- P4: Task Template ---
  TASK_TEMPLATE: "com.tamarix.task_template",

  // --- P4: Custom Field ---
  CUSTOM_FIELD: "com.tamarix.custom_field",
  CUSTOM_FIELD_VALUE: "com.tamarix.custom_field_value",

  // --- P4: Approval ---
  APPROVAL: "com.tamarix.approval",
  APPROVAL_CONFIG: "com.tamarix.approval_config",

  // --- P4: Sort Order ---
  SORT_ORDER: "com.tamarix.sort_order",

  // --- P4: External Link ---
  EXTERNAL_LINK: "com.tamarix.external_link",

  // --- P4: Git Integration ---
  GIT_CONFIG: "com.tamarix.git_config",

  // --- P6: Third-party Integrations ---
  INTEGRATION: "com.tamarix.integration",
  INTEGRATION_EVENT: "com.tamarix.integration_event",

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

// --- P6 Integration Info ---
export interface IntegrationInfo {
  provider: string;
  connectionId: string;
  scope: "global" | "project";
  projectRoomId?: string;
  displayName: string;
  status: "connected" | "disabled" | "error";
  permissions: string[];
  createdBy: string;
  createdAt: string;
  lastSyncAt?: string;
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

// --- P4: Task Template ---
export interface TaskTemplate {
  /** Template name */
  name: string;
  /** Default task title */
  defaultTitle?: string;
  /** Default task description */
  defaultDescription?: string;
  /** Default status */
  defaultStatus?: TaskStatus;
  /** Default priority */
  defaultPriority?: Priority;
  /** Default task type */
  defaultType?: TaskType;
  /** Default tags */
  defaultTags?: string[];
}

// --- P4: Custom Field Definition ---
export type CustomFieldType = "text" | "number" | "select" | "date";

export interface CustomFieldDefinition {
  /** Field label */
  label: string;
  /** Field type */
  type: CustomFieldType;
  /** Options for select type */
  options?: string[];
  /** Whether the field is required */
  required?: boolean;
}

// --- P4: Custom Field Value ---
export interface CustomFieldValue {
  /** The field value */
  value: string | number;
}

// --- P4: Approval ---
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalState {
  /** Current approval status */
  status: ApprovalStatus;
  /** Number of approvals required */
  requiredApprovals: number;
  /** Current number of approvals */
  currentApprovals: number;
}

export interface ApprovalConfig {
  /** Whether approval workflow is enforced for this project */
  enabled: boolean;
  /** Default approval count for new approval requests */
  requiredApprovals: number;
}

// --- P4: External Link ---
export interface ExternalLink {
  /** Matrix state_key for deleting/updating the link */
  stateKey?: string;
  /** Link URL */
  url: string;
  /** Link label */
  label: string;
}

// --- P4: Sort Order ---
export interface SortOrderState {
  /** Lexicographic fractional index */
  order: string;
}

// --- P4: Git Integration ---
export type GitProvider = "github" | "gitlab";

export interface GitConfig {
  /** Git provider */
  provider: GitProvider;
  /** Repository URL */
  repoUrl: string;
  /** Webhook secret for signature verification */
  webhookSecret: string;
}
