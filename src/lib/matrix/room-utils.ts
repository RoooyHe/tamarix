import type { Room } from "matrix-js-sdk";
import { EventType } from "matrix-js-sdk";
import type { Task, Project, EstimateUnit, WorklogEntry } from "./types";
import { getStateEvent, getArchiveState, getDescription, getWorklogs } from "./state-events";
import { TAMARIX_EVENT_TYPES } from "./types";

/**
 * Convert a Matrix Room (task room) into a Task object.
 */
export function roomToTask(room: Room): Task {
  const statusEvent = getStateEvent<{ status: string }>(room, TAMARIX_EVENT_TYPES.TASK_STATUS);
  const priorityEvent = getStateEvent<{ level: string }>(room, TAMARIX_EVENT_TYPES.PRIORITY);
  const typeEvent = getStateEvent<{ type: string }>(room, TAMARIX_EVENT_TYPES.TASK_TYPE);
  const dueDateEvent = getStateEvent<{ date: string }>(room, TAMARIX_EVENT_TYPES.DUE_DATE);
  const estimateEvent = getStateEvent<{ points: number; unit: string }>(room, TAMARIX_EVENT_TYPES.ESTIMATE);
  const tagsEvent = getStateEvent<{ tags: string[] }>(room, TAMARIX_EVENT_TYPES.TAGS);
  const sortOrderEvent = getStateEvent<{ order: string }>(room, TAMARIX_EVENT_TYPES.SORT_ORDER);
  const ticketIdEvent = getStateEvent<{ id: string }>(room, TAMARIX_EVENT_TYPES.TICKET_ID);
  const assigneeEvent = getStateEvent<{ user_id: string }>(room, TAMARIX_EVENT_TYPES.ASSIGNEE);
  const archiveEvent = getArchiveState(room);
  const descriptionEvent = getDescription(room);
  const worklogEntries = getWorklogs(room);

  // Get topic from m.room.topic state event
  const topicContent = room.currentState.getStateEvents(EventType.RoomTopic, "")?.getContent();
  const topic = (topicContent?.topic as string) ?? undefined;

  const encrypted = isRoomEncrypted(room);

  return {
    roomId: room.roomId,
    encrypted,
    ticketId: ticketIdEvent?.id,
    title: room.name || room.roomId,
    description: topic,
    formattedDescription: descriptionEvent?.formatted_body ?? undefined,
    worklogs: worklogEntries.length > 0 ? worklogEntries : undefined,
    status: (statusEvent?.status as Task["status"]) ?? "todo",
    priority: (priorityEvent?.level as Task["priority"]) ?? undefined,
    type: (typeEvent?.type as Task["type"]) ?? undefined,
    dueDate: dueDateEvent?.date,
    estimate: estimateEvent
      ? { points: estimateEvent.points, unit: estimateEvent.unit as EstimateUnit }
      : undefined,
    tags: tagsEvent?.tags ?? [],
    sortOrder: sortOrderEvent?.order,
    assignee: assigneeEvent?.user_id,
    archived: archiveEvent?.archived ?? false,
    archivedBy: archiveEvent?.archived_by,
    archivedAt: archiveEvent?.archived_at,
    projectRoomId: getParentSpaceId(room),
    createdAt: getRoomCreatedAt(room),
    updatedAt: Date.now() // TODO: use last state event timestamp
  };
}

/**
 * Convert a Matrix Space room into a Project object.
 */
export function roomToProject(room: Room): Project {
  // Count child rooms from m.space.child state events
  const childEvents = room.currentState.getStateEvents(EventType.SpaceChild);

  // Filter to valid children: must have at least one via server (per MSC1772 / Space spec)
  const validChildRoomIds = childEvents
    .filter(e => {
      const content = e.getContent();
      return Array.isArray(content?.via) && content.via.length > 0;
    })
    .map(e => e.getStateKey())
    .filter((id): id is string => !!id);

  // Get topic/description from m.room.topic
  const topicContent = room.currentState.getStateEvents(EventType.RoomTopic, "")?.getContent();
  const description = (topicContent?.topic as string) ?? undefined;

  return {
    roomId: room.roomId,
    name: room.name || room.roomId,
    description,
    taskCount: validChildRoomIds.length,
    createdAt: getRoomCreatedAt(room)
  };
}

/**
 * Get the parent Space (project) Room ID for a task room.
 * Looks for m.space.parent state events. Prefers canonical: true parent.
 * m.space.parent state_key is the parent room ID.
 */
export function getParentSpaceId(room: Room): string | undefined {
  const parentEvents = room.currentState.getStateEvents(EventType.SpaceParent);

  // Prefer canonical parent
  const canonical = parentEvents.find(e => {
    const content = e.getContent();
    return content?.canonical === true;
  });
  if (canonical) return canonical.getStateKey() ?? undefined;

  // Fall back to first parent event
  const first = parentEvents[0];
  return first?.getStateKey() ?? undefined;
}

/**
 * Check if a room is a Tamarix task room (has com.tamarix.task_status state event).
 */
export function isTaskRoom(room: Room): boolean {
  const statusEvent = getStateEvent(room, TAMARIX_EVENT_TYPES.TASK_STATUS);
  return statusEvent !== null;
}

/**
 * Check if a room is encrypted (has m.room.encryption state event).
 */
export function isRoomEncrypted(room: Room): boolean {
  const encryptionEvent = room.currentState.getStateEvents(EventType.RoomEncryption, "");
  return encryptionEvent !== undefined && encryptionEvent !== null;
}

/**
 * Check if a room is a Matrix Space.
 */
export function isSpaceRoom(room: Room): boolean {
  const createEvent = room.currentState.getStateEvents(EventType.RoomCreate, "");
  const content = createEvent?.getContent();
  return content?.type === "m.space";
}

/**
 * Get the creation timestamp of a room from the m.room.create event.
 */
function getRoomCreatedAt(room: Room): number {
  const createEvent = room.currentState.getStateEvents(EventType.RoomCreate, "");
  return createEvent?.getTs() ?? 0;
}
