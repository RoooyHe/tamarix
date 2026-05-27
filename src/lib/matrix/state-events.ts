import type { Room, RoomState, MatrixClient } from "matrix-js-sdk";
import type { Task, TaskStatus, Priority, TaskType, EstimateUnit, RelationType, WorklogEntry, VersionInfo, NotificationPrefs } from "./types";
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
