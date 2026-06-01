import type { Room, RoomState, MatrixClient } from "matrix-js-sdk";
import type { Task, TaskStatus, Priority, TaskType, EstimateUnit, RelationType, WorklogEntry, VersionInfo, NotificationPrefs, TaskTemplate, CustomFieldDefinition, CustomFieldType, CustomFieldValue, ApprovalState, ApprovalStatus, ApprovalConfig, ExternalLink, SortOrderState, GitConfig } from "./types";
import { TAMARIX_EVENT_TYPES } from "./types";

/**
 * Read a custom Tamarix state event from a room.
 */
export function getStateEvent<T>(
  room: Room,
  eventType: string,
  stateKey: string = ""
): T | null {
  const event = room.currentState.getStateEvents(eventType as any, stateKey);
  if (!event) return null;
  return event.getContent() as T;
}

/**
 * Send a custom Tamarix state event to a room.
 */
export async function sendStateEvent<T>(
  client: MatrixClient,
  roomId: string,
  eventType: string,
  content: T,
  stateKey: string = ""
): Promise<void> {
  await client.sendStateEvent(roomId, eventType as any, content as any, stateKey);
}

// --- Typed helpers for each event ---

export async function setTaskStatus(
  client: MatrixClient,
  roomId: string,
  status: TaskStatus
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TASK_STATUS, { status });
}

export async function setPriority(
  client: MatrixClient,
  roomId: string,
  level: Priority
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.PRIORITY, { level });
}

export async function setDueDate(
  client: MatrixClient,
  roomId: string,
  date: string
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.DUE_DATE, { date });
}

export async function setTaskType(
  client: MatrixClient,
  roomId: string,
  type: TaskType
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TASK_TYPE, { type });
}

export async function setEstimate(
  client: MatrixClient,
  roomId: string,
  points: number,
  unit: EstimateUnit
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.ESTIMATE, { points, unit });
}

export async function setTags(
  client: MatrixClient,
  roomId: string,
  tags: string[]
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TAGS, { tags });
}

export async function setAssignee(
  client: MatrixClient,
  roomId: string,
  userId: string
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.ASSIGNEE, { user_id: userId });
}

export async function clearAssignee(
  client: MatrixClient,
  roomId: string
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.ASSIGNEE, {});
}

export async function setRelation(
  client: MatrixClient,
  roomId: string,
  relType: RelationType,
  targetRoom: string
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.RELATION, {
    rel_type: relType,
    target_room: targetRoom
  });
}

export async function setArchive(
  client: MatrixClient,
  roomId: string,
  archived: boolean
): Promise<void> {
  const userId = client.getUserId();
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TASK_ARCHIVED, {
    archived,
    archived_by: userId ?? "",
    archived_at: new Date().toISOString()
  });
}

export function getArchiveState(
  room: Room
): { archived: boolean; archived_by: string; archived_at: string } | null {
  return getStateEvent<{ archived: boolean; archived_by: string; archived_at: string }>(
    room,
    TAMARIX_EVENT_TYPES.TASK_ARCHIVED
  );
}

// --- Description (Markdown) ---

export async function setDescription(
  client: MatrixClient,
  roomId: string,
  body: string,
  formattedBody: string
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.DESCRIPTION, {
    body,
    formatted_body: formattedBody,
    format: "org.matrix.custom.html"
  });
}

export function getDescription(
  room: Room
): { body: string; formatted_body: string; format: string } | null {
  return getStateEvent<{ body: string; formatted_body: string; format: string }>(
    room,
    TAMARIX_EVENT_TYPES.DESCRIPTION
  );
}

// --- Worklog ---

export async function addWorklog(
  client: MatrixClient,
  roomId: string,
  entry: WorklogEntry
): Promise<void> {
  const stateKey = `${entry.userId}_${entry.loggedAt}`;
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.WORKLOG, {
    user_id: entry.userId,
    hours: entry.hours,
    note: entry.note ?? "",
    logged_at: entry.loggedAt
  }, stateKey);
}

export function getWorklogs(room: Room): WorklogEntry[] {
  const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.WORKLOG as any);
  return events
    .map(e => {
      const content = e.getContent();
      return {
        userId: content.user_id ?? e.getStateKey() ?? "",
        hours: content.hours ?? 0,
        note: content.note ?? "",
        loggedAt: content.logged_at ?? 0
      } as WorklogEntry;
    })
    .filter(e => e.hours > 0)
    .sort((a, b) => b.loggedAt - a.loggedAt);
}

export async function removeWorklog(
  client: MatrixClient,
  roomId: string,
  stateKey: string
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.WORKLOG, {}, stateKey);
}

// --- Version ---

export async function setVersion(
  client: MatrixClient,
  spaceRoomId: string,
  versionKey: string,
  version: VersionInfo
): Promise<void> {
  await sendStateEvent(client, spaceRoomId, TAMARIX_EVENT_TYPES.VERSION, {
    name: version.name,
    description: version.description ?? "",
    release_date: version.releaseDate ?? "",
    status: version.status
  }, versionKey);
}

export function getVersions(room: Room): VersionInfo[] {
  const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.VERSION as any);
  return events.map(e => {
    const content = e.getContent();
    return {
      name: content.name ?? e.getStateKey() ?? "",
      description: content.description ?? undefined,
      releaseDate: content.release_date ?? undefined,
      status: content.status ?? "planned"
    } as VersionInfo;
  });
}

// --- Task-Version Link ---

export async function setTaskVersion(
  client: MatrixClient,
  roomId: string,
  versionKey: string
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TASK_VERSION, {
    version: versionKey
  });
}

export function getTaskVersion(room: Room): string | null {
  const content = getStateEvent<{ version: string }>(room, TAMARIX_EVENT_TYPES.TASK_VERSION);
  return content?.version ?? null;
}

// --- Watcher ---

export async function addWatcher(
  client: MatrixClient,
  roomId: string,
  userId: string
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.WATCHER, {
    user_id: userId
  }, userId);
}

export async function removeWatcher(
  client: MatrixClient,
  roomId: string,
  userId: string
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.WATCHER, {}, userId);
}

export function getWatchers(room: Room): string[] {
  const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.WATCHER as any);
  return events
    .map(e => {
      const content = e.getContent();
      return (content.user_id ?? e.getStateKey() ?? "") as string;
    })
    .filter(id => id.startsWith("@"));
}

// --- Notification Preferences ---

export async function setNotificationPrefs(
  client: MatrixClient,
  roomId: string,
  prefs: NotificationPrefs
): Promise<void> {
  await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.NOTIFICATION_PREFS, {
    assign_notify: prefs.assignNotify,
    status_change_notify: prefs.statusChangeNotify,
    due_remind: prefs.dueRemind,
    mention_notify: prefs.mentionNotify,
    channels: prefs.channels
  });
}

export function getNotificationPrefs(room: Room): NotificationPrefs | null {
  const content = getStateEvent<{
    assign_notify: boolean;
    status_change_notify: boolean;
    due_remind: boolean;
    mention_notify: boolean;
    channels: ("in_app" | "email")[];
  }>(room, TAMARIX_EVENT_TYPES.NOTIFICATION_PREFS);
  if (!content) return null;
  return {
    assignNotify: content.assign_notify,
    statusChangeNotify: content.status_change_notify,
    dueRemind: content.due_remind,
    mentionNotify: content.mention_notify,
    channels: content.channels
  };
}

// ============================================================
// P4: Task Template
// ============================================================

export async function createTaskTemplate(
  client: MatrixClient,
  spaceRoomId: string,
  template: TaskTemplate
): Promise<void> {
  const stateKey = template.name.replace(/\s+/g, "_").toLowerCase();
  await sendStateEvent(client, spaceRoomId, TAMARIX_EVENT_TYPES.TASK_TEMPLATE, {
    name: template.name,
    default_title: template.defaultTitle ?? "",
    default_description: template.defaultDescription ?? "",
    default_status: template.defaultStatus ?? "",
    default_priority: template.defaultPriority ?? "",
    default_type: template.defaultType ?? "",
    default_tags: template.defaultTags ?? []
  }, stateKey);
}

export function getTaskTemplates(room: Room): TaskTemplate[] {
  const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.TASK_TEMPLATE as any);
  return events.map(e => {
    const c = e.getContent() as {
      name: string;
      default_title?: string;
      default_description?: string;
      default_status?: string;
      default_priority?: string;
      default_type?: string;
      default_tags?: string[];
    };
    return {
      name: c.name,
      defaultTitle: c.default_title || undefined,
      defaultDescription: c.default_description || undefined,
      defaultStatus: (c.default_status as TaskStatus) || undefined,
      defaultPriority: (c.default_priority as Priority) || undefined,
      defaultType: (c.default_type as TaskType) || undefined,
      defaultTags: c.default_tags?.length ? c.default_tags : undefined
    };
  });
}

export async function deleteTaskTemplate(
  client: MatrixClient,
  spaceRoomId: string,
  stateKey: string
): Promise<void> {
  await sendStateEvent(client, spaceRoomId, TAMARIX_EVENT_TYPES.TASK_TEMPLATE, {}, stateKey);
}

// ============================================================
// P4: Custom Field
// ============================================================

export async function setCustomFieldDefinition(
  client: MatrixClient,
  spaceRoomId: string,
  fieldName: string,
  definition: CustomFieldDefinition
): Promise<void> {
  await sendStateEvent(client, spaceRoomId, TAMARIX_EVENT_TYPES.CUSTOM_FIELD, {
    label: definition.label,
    type: definition.type,
    options: definition.options ?? [],
    required: definition.required ?? false
  }, fieldName);
}

export function getCustomFieldDefinitions(room: Room): Map<string, CustomFieldDefinition> {
  const result = new Map<string, CustomFieldDefinition>();
  const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.CUSTOM_FIELD as any);
  for (const e of events) {
    const c = e.getContent() as {
      label: string;
      type: CustomFieldType;
      options?: string[];
      required?: boolean;
    };
    if (!c.label) continue;
    result.set(e.getStateKey()!, {
      label: c.label,
      type: c.type,
      options: c.options?.length ? c.options : undefined,
      required: c.required ?? undefined
    });
  }
  return result;
}

export async function deleteCustomFieldDefinition(
  client: MatrixClient,
  spaceRoomId: string,
  fieldName: string
): Promise<void> {
  await sendStateEvent(client, spaceRoomId, TAMARIX_EVENT_TYPES.CUSTOM_FIELD, {}, fieldName);
}

export async function setCustomFieldValue(
  client: MatrixClient,
  taskRoomId: string,
  fieldName: string,
  value: string | number
): Promise<void> {
  await sendStateEvent(client, taskRoomId, TAMARIX_EVENT_TYPES.CUSTOM_FIELD_VALUE, {
    value
  }, fieldName);
}

export function getCustomFieldValues(room: Room): Map<string, CustomFieldValue> {
  const result = new Map<string, CustomFieldValue>();
  const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.CUSTOM_FIELD_VALUE as any);
  for (const e of events) {
    const c = e.getContent() as { value: string | number };
    if (c.value === undefined) continue;
    result.set(e.getStateKey()!, { value: c.value });
  }
  return result;
}

// ============================================================
// P4: Approval
// ============================================================

export async function setApproval(
  client: MatrixClient,
  taskRoomId: string,
  approval: ApprovalState
): Promise<void> {
  await sendStateEvent(client, taskRoomId, TAMARIX_EVENT_TYPES.APPROVAL, {
    status: approval.status,
    required_approvals: approval.requiredApprovals,
    current_approvals: approval.currentApprovals
  });
}

export function getApproval(room: Room): ApprovalState | null {
  const content = getStateEvent<{
    status: ApprovalStatus;
    required_approvals: number;
    current_approvals: number;
  }>(room, TAMARIX_EVENT_TYPES.APPROVAL);
  if (!content) return null;
  return {
    status: content.status,
    requiredApprovals: content.required_approvals,
    currentApprovals: content.current_approvals
  };
}

export async function setApprovalConfig(
  client: MatrixClient,
  projectRoomId: string,
  config: ApprovalConfig
): Promise<void> {
  await sendStateEvent(client, projectRoomId, TAMARIX_EVENT_TYPES.APPROVAL_CONFIG, {
    enabled: config.enabled,
    required_approvals: config.requiredApprovals
  });
}

export function getApprovalConfig(room: Room): ApprovalConfig {
  const content = getStateEvent<{ enabled?: boolean; required_approvals?: number }>(
    room,
    TAMARIX_EVENT_TYPES.APPROVAL_CONFIG
  );
  return {
    enabled: content?.enabled ?? false,
    requiredApprovals: content?.required_approvals ?? 1
  };
}

// ============================================================
// P4: Sort Order
// ============================================================

export async function setSortOrder(
  client: MatrixClient,
  taskRoomId: string,
  order: string
): Promise<void> {
  await sendStateEvent(client, taskRoomId, TAMARIX_EVENT_TYPES.SORT_ORDER, { order });
}

export function getSortOrder(room: Room): string | null {
  const content = getStateEvent<SortOrderState>(room, TAMARIX_EVENT_TYPES.SORT_ORDER);
  return content?.order ?? null;
}

// ============================================================
// P4: External Link
// ============================================================

export async function addExternalLink(
  client: MatrixClient,
  taskRoomId: string,
  link: ExternalLink
): Promise<void> {
  // Use URL hash as state_key for uniqueness
  const stateKey = link.label.replace(/\s+/g, "_").toLowerCase() + "_" + Date.now();
  await sendStateEvent(client, taskRoomId, TAMARIX_EVENT_TYPES.EXTERNAL_LINK, {
    url: link.url,
    label: link.label
  }, stateKey);
}

export function getExternalLinks(room: Room): ExternalLink[] {
  const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.EXTERNAL_LINK as any);
  return events
    .map(e => {
      const c = e.getContent() as { url: string; label: string };
      return { url: c.url, label: c.label, stateKey: e.getStateKey() ?? undefined };
    })
    .filter(l => l.url && l.label);
}

export async function removeExternalLink(
  client: MatrixClient,
  taskRoomId: string,
  stateKey: string
): Promise<void> {
  await sendStateEvent(client, taskRoomId, TAMARIX_EVENT_TYPES.EXTERNAL_LINK, {}, stateKey);
}

// ============================================================
// P4: Git Integration
// ============================================================

export async function setGitConfig(
  client: MatrixClient,
  projectRoomId: string,
  config: GitConfig
): Promise<void> {
  await sendStateEvent(client, projectRoomId, TAMARIX_EVENT_TYPES.GIT_CONFIG, config);
}

export function getGitConfig(room: Room): GitConfig | null {
  return getStateEvent<GitConfig>(room, TAMARIX_EVENT_TYPES.GIT_CONFIG);
}
