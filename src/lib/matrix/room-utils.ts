import type { Room } from "matrix-js-sdk";
import { EventType } from "matrix-js-sdk";
import type { Task, Project, EstimateUnit } from "./types";
import { getStateEvent } from "./state-primitives";
import { TAMARIX_EVENT_TYPES } from "./types";

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
export function getRoomCreatedAt(room: Room): number {
  const createEvent = room.currentState.getStateEvents(EventType.RoomCreate, "");
  return createEvent?.getTs() ?? 0;
}
