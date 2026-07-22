import type { Room, MatrixClient } from "matrix-js-sdk";
import { EventType, Preset } from "matrix-js-sdk";
import type {
  Task, TaskStatus, Priority, TaskType, EstimateUnit,
  WorklogEntry
} from "./types";
import { TAMARIX_EVENT_TYPES } from "./types";
import { isTaskRoom, isRoomEncrypted, getParentSpaceId, getRoomCreatedAt } from "./room-utils";
import { generateNextTicketId } from "./ticket-id";
import { getStateEvent, sendStateEvent } from "./state-primitives";

// ─── Task<->Matrix mapping ──────────────────────────────────────

function roomToTask(room: Room): Task {
  const statusEvent = getStateEvent<{ status: string }>(room, TAMARIX_EVENT_TYPES.TASK_STATUS);
  const priorityEvent = getStateEvent<{ level: string }>(room, TAMARIX_EVENT_TYPES.PRIORITY);
  const typeEvent = getStateEvent<{ type: string }>(room, TAMARIX_EVENT_TYPES.TASK_TYPE);
  const dueDateEvent = getStateEvent<{ date: string }>(room, TAMARIX_EVENT_TYPES.DUE_DATE);
  const estimateEvent = getStateEvent<{ points: number; unit: string }>(room, TAMARIX_EVENT_TYPES.ESTIMATE);
  const tagsEvent = getStateEvent<{ tags: string[] }>(room, TAMARIX_EVENT_TYPES.TAGS);
  const sortOrderEvent = getStateEvent<{ order: string }>(room, TAMARIX_EVENT_TYPES.SORT_ORDER);
  const ticketIdEvent = getStateEvent<{ id: string }>(room, TAMARIX_EVENT_TYPES.TICKET_ID);
  const assigneeEvent = getStateEvent<{ user_id: string }>(room, TAMARIX_EVENT_TYPES.ASSIGNEE);
  const archiveEvent = getStateEvent<{ archived: boolean; archived_by: string; archived_at: string }>(
    room, TAMARIX_EVENT_TYPES.TASK_ARCHIVED
  );
  const descriptionEvent = getStateEvent<{ body: string; formatted_body: string; format: string }>(
    room, TAMARIX_EVENT_TYPES.DESCRIPTION
  );
  const worklogEvents = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.WORKLOG as any);
  const worklogs: WorklogEntry[] = worklogEvents
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

  const versionEvent = getStateEvent<{ version: string }>(room, TAMARIX_EVENT_TYPES.TASK_VERSION);
  const watcherEvents = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.WATCHER as any);
  const watchers: string[] = watcherEvents
    .map(e => {
      const content = e.getContent();
      return (content.user_id ?? e.getStateKey() ?? "") as string;
    })
    .filter(id => id.startsWith("@"));

  const topicContent = room.currentState.getStateEvents(EventType.RoomTopic, "")?.getContent();
  const topic = (topicContent?.topic as string) ?? undefined;

  return {
    roomId: room.roomId,
    encrypted: isRoomEncrypted(room),
    ticketId: ticketIdEvent?.id,
    title: room.name || room.roomId,
    description: topic,
    formattedDescription: descriptionEvent?.formatted_body ?? undefined,
    worklogs: worklogs.length > 0 ? worklogs : undefined,
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
    updatedAt: Date.now()
  };
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Build a Task object from a Matrix room.
 * Returns null if the room is not a task room.
 */
export function getTask(client: MatrixClient, roomId: string): Task | null {
  const room = client.getRoom(roomId);
  if (!room || !isTaskRoom(room)) return null;
  return roomToTask(room);
}

/**
 * Get all task rooms, optionally filtered by project.
 */
export function getTasks(client: MatrixClient, projectRoomId?: string): Task[] {
  const rooms = client.getRooms();
  const taskRooms = rooms.filter(isTaskRoom);
  const filtered = projectRoomId
    ? taskRooms.filter(room => {
        const parentEvents = room.currentState.getStateEvents("m.space.parent" as any);
        return parentEvents.some((e: any) => e.getStateKey() === projectRoomId);
      })
    : taskRooms;
  return filtered.map(roomToTask);
}

/**
 * Find a task by ticket ID (e.g. "TAM-42") from a list of tasks.
 */
export function getTaskByTicketId(ticketId: string, tasks: Task[]): Task | undefined {
  return tasks.find(task => task.ticketId === ticketId);
}

/**
 * Apply a partial patch to a task room.
 * - Saves the previous state for rollback
 * - Optimistically updates the caller-provided cache via `applyPatch`
 * - Writes each changed field to Matrix as the appropriate state event
 * - On failure, restores the previous state via `applyPatch`
 *
 * @param client - Matrix client
 * @param roomId - Task room ID
 * @param patch - Partial Task fields to apply
 * @param applyPatch - Callback to apply or revert the patch in the caller's cache
 * @returns true if the write succeeded, false on failure
 */
export async function patchTask(
  client: MatrixClient,
  roomId: string,
  patch: Partial<Task>,
  applyPatch: (patch: Partial<Task> | null) => void
): Promise<boolean> {
  // Apply the optimistic update
  applyPatch(patch);

  try {
    const writes: Promise<void>[] = [];

    if ("status" in patch && patch.status !== undefined) {
      writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TASK_STATUS, { status: patch.status }));
    }
    if ("priority" in patch && patch.priority !== undefined) {
      writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.PRIORITY, { level: patch.priority }));
    }
    if ("type" in patch && patch.type !== undefined) {
      writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TASK_TYPE, { type: patch.type }));
    }
    if ("dueDate" in patch && patch.dueDate !== undefined) {
      writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.DUE_DATE, { date: patch.dueDate }));
    }
    if ("tags" in patch && patch.tags !== undefined) {
      writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TAGS, { tags: patch.tags }));
    }
    if ("assignee" in patch) {
      if (patch.assignee) {
        writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.ASSIGNEE, { user_id: patch.assignee }));
      } else {
        writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.ASSIGNEE, {}));
      }
    }
    if ("sortOrder" in patch && patch.sortOrder !== undefined) {
      writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.SORT_ORDER, { order: patch.sortOrder }));
    }
    if ("archived" in patch && patch.archived !== undefined) {
      const userId = client.getUserId() ?? "";
      writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TASK_ARCHIVED, {
        archived: patch.archived,
        archived_by: userId,
        archived_at: new Date().toISOString()
      }));
    }
    if ("description" in patch || "formattedDescription" in patch) {
      writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.DESCRIPTION, {
        body: patch.description ?? "",
        formatted_body: patch.formattedDescription ?? "",
        format: "org.matrix.custom.html"
      }));
    }

    await Promise.all(writes);
    return true;
  } catch {
    // Revert the optimistic update
    applyPatch(null);
    return false;
  }
}

/**
 * Apply a batch of patches across multiple task rooms.
 * All patches are applied optimistically first; if any write fails,
 * all patches are reverted.
 */
export async function bulkPatch(
  client: MatrixClient,
  patches: Map<string, Partial<Task>>,
  applyPatches: (patches: Map<string, Partial<Task> | null> | null) => void
): Promise<boolean> {
  // Apply all optimistic updates
  applyPatches(patches);

  try {
    const writes: Promise<void>[] = [];
    for (const [roomId, patch] of patches) {
      if ("status" in patch && patch.status !== undefined) {
        writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TASK_STATUS, { status: patch.status }));
      }
      if ("priority" in patch && patch.priority !== undefined) {
        writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.PRIORITY, { level: patch.priority }));
      }
      if ("archived" in patch && patch.archived !== undefined) {
        writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TASK_ARCHIVED, {
          archived: patch.archived,
          archived_by: client.getUserId() ?? "",
          archived_at: new Date().toISOString()
        }));
      }
      if ("tags" in patch && patch.tags !== undefined) {
        writes.push(sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TAGS, { tags: patch.tags }));
      }
    }
    await Promise.all(writes);
    return true;
  } catch {
    // Revert all optimistic updates
    applyPatches(null);
    return false;
  }
}

// ─── Create Task ─────────────────────────────────────────────────

/**
 * Create a new task room in a project.
 * Registers a SpaceChild in the project space, applies initial state events,
 * and returns the new room ID.
 */
export async function createTask(
  client: MatrixClient,
  projectRoomId: string,
  options: {
    name: string;
    topic?: string;
    status?: TaskStatus;
    priority?: Priority;
    type?: TaskType;
    assignee?: string;
    tags?: string[];
    encrypted?: boolean;
  }
): Promise<string> {
  const domain = client.getDomain()!;
  const ticketId = await generateNextTicketId(client, projectRoomId);

  const result = await client.createRoom({
    name: options.name,
    topic: options.topic,
    preset: Preset.PrivateChat,
    initial_state: [
      { type: EventType.SpaceParent, state_key: projectRoomId, content: { canonical: true, via: [domain] } },
      ...(options.encrypted
        ? [{ type: EventType.RoomEncryption, state_key: "", content: { algorithm: "m.megolm.v1.aes-sha2" } }]
        : []),
      { type: TAMARIX_EVENT_TYPES.TASK_STATUS as any, state_key: "", content: { status: options.status ?? "todo" } },
      { type: TAMARIX_EVENT_TYPES.TICKET_ID as any, state_key: "", content: { id: ticketId } },
      ...(options.priority
        ? [{ type: TAMARIX_EVENT_TYPES.PRIORITY as any, state_key: "", content: { level: options.priority } }]
        : []),
      ...(options.type
        ? [{ type: TAMARIX_EVENT_TYPES.TASK_TYPE as any, state_key: "", content: { type: options.type } }]
        : []),
      ...(options.assignee
        ? [{ type: TAMARIX_EVENT_TYPES.ASSIGNEE as any, state_key: "", content: { user_id: options.assignee } }]
        : []),
      ...(options.tags?.length
        ? [{ type: TAMARIX_EVENT_TYPES.TAGS as any, state_key: "", content: { tags: options.tags } }]
        : [])
    ]
  });

  await client.sendStateEvent(
    projectRoomId,
    EventType.SpaceChild,
    { via: [domain], suggested: false, order: String(Date.now()).padStart(20, "0") },
    result.room_id
  );

  return result.room_id;
}