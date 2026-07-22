// ─── Enums & Ordering ────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "closed";

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "todo", "in_progress", "review", "done", "closed"
];

export type Priority = "critical" | "high" | "medium" | "low";

export const PRIORITY_ORDER: Priority[] = [
  "critical", "high", "medium", "low"
];

export type TaskType = "bug" | "feature" | "task" | "improvement" | "epic";

export type EstimateUnit = "story_points" | "hours" | "days";

export type RelationType = "blocks" | "duplicates" | "relates" | "subtask_of";

// ─── Core Interfaces ─────────────────────────────────────────────

export interface Task {
  roomId: string;
  ticketId?: string;
  title: string;
  description?: string;
  formattedDescription?: string;
  worklogs?: WorklogEntry[];
  status: TaskStatus;
  priority?: Priority;
  type?: TaskType;
  dueDate?: string;
  estimate?: { points: number; unit: "story_points" | "hours" | "days" };
  tags: string[];
  sortOrder?: string;
  assignee?: string;
  archived?: boolean;
  archivedBy?: string;
  archivedAt?: string;
  projectRoomId?: string;
  encrypted?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  roomId: string;
  name: string;
  description?: string;
  taskCount: number;
  createdAt: number;
}

export interface Attachment {
  eventId: string;
  fileName: string;
  mimeType: string;
  size: number;
  mxcUrl: string;
  thumbnailMxcUrl?: string;
  thumbnailInfo?: { w: number; h: number; mimetype: string; size: number };
  uploadedBy: string;
  uploadedAt: number;
}

export interface Comment {
  eventId: string;
  sender: string;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface WorklogEntry {
  userId: string;
  hours: number;
  note?: string;
  loggedAt: number;
}

export interface VersionInfo {
  name: string;
  description?: string;
  releaseDate?: string;
  status: "planned" | "released" | "archived";
}

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

// ─── Notifications ───────────────────────────────────────────────

export type NotificationType = "assign" | "status_change" | "mention" | "due_remind";

export interface Notification {
  id: string;
  type: NotificationType;
  taskId: string;
  taskTitle: string;
  triggeredBy: string;
  triggeredAt: number;
  read: boolean;
}

export interface NotificationPrefs {
  assignNotify: boolean;
  statusChangeNotify: boolean;
  dueRemind: boolean;
  mentionNotify: boolean;
  channels: ("in_app" | "email")[];
}

// ─── Templates ───────────────────────────────────────────────────

export interface TaskTemplate {
  name: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultStatus?: TaskStatus;
  defaultPriority?: Priority;
  defaultType?: TaskType;
  defaultTags?: string[];
}

// ─── Custom Fields ───────────────────────────────────────────────

export type CustomFieldType = "text" | "number" | "select" | "date";

export interface CustomFieldDefinition {
  label: string;
  type: CustomFieldType;
  options?: string[];
  required?: boolean;
}

export interface CustomFieldValue {
  value: string | number;
}

// ─── Approvals ───────────────────────────────────────────────────

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalState {
  status: ApprovalStatus;
  requiredApprovals: number;
  currentApprovals: number;
}

export interface ApprovalConfig {
  enabled: boolean;
  requiredApprovals: number;
}

// ─── External Links ──────────────────────────────────────────────

export interface ExternalLink {
  stateKey?: string;
  url: string;
  label: string;
}

// ─── Sort Order ──────────────────────────────────────────────────

export interface SortOrderState {
  order: string;
}

// ─── Git ─────────────────────────────────────────────────────────

export type GitProvider = "github" | "gitlab";

export interface GitConfig {
  provider: GitProvider;
  repoUrl: string;
  webhookSecret: string;
}
