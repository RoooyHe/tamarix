// --- Task Status ---
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "closed";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "待办",
  in_progress: "进行中",
  review: "审核中",
  done: "已完成",
  closed: "已关闭"
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "review",
  "done",
  "closed"
];

// --- Priority ---
export type Priority = "critical" | "high" | "medium" | "low";

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: "紧急",
  high: "高",
  medium: "中",
  low: "低"
};

export const PRIORITY_ORDER: Priority[] = [
  "critical",
  "high",
  "medium",
  "low"
];

// --- Task Type ---
export type TaskType = "bug" | "feature" | "task" | "improvement" | "epic";

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  bug: "缺陷",
  feature: "功能",
  task: "任务",
  improvement: "改进",
  epic: "史诗"
};

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
  TASK_ARCHIVED: "com.tamarix.task_archived"
} as const;
