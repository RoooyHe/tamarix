import type { Room, RoomState, MatrixClient } from "matrix-js-sdk";
import type { Task, TaskStatus, Priority, TaskType, EstimateUnit, RelationType } from "./types";
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
