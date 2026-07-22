import type { MatrixClient, Room } from "matrix-js-sdk";
import { EventType } from "matrix-js-sdk";
import type { Task } from "$lib/matrix/types";
import { isTaskRoom } from "$lib/matrix/room-utils";
import { TAMARIX_EVENT_TYPES } from "$lib/matrix/types";
import { getTask as repoGetTask } from "$lib/matrix/task-repository";
import { measureSync } from "$lib/utils/performance";

const TASK_SIGNATURE_EVENT_TYPES = [
  EventType.RoomName,
  EventType.RoomTopic,
  EventType.RoomEncryption,
  EventType.SpaceParent,
  TAMARIX_EVENT_TYPES.TASK_STATUS,
  TAMARIX_EVENT_TYPES.PRIORITY,
  TAMARIX_EVENT_TYPES.DUE_DATE,
  TAMARIX_EVENT_TYPES.TASK_TYPE,
  TAMARIX_EVENT_TYPES.ESTIMATE,
  TAMARIX_EVENT_TYPES.TAGS,
  TAMARIX_EVENT_TYPES.TICKET_ID,
  TAMARIX_EVENT_TYPES.ASSIGNEE,
  TAMARIX_EVENT_TYPES.TASK_ARCHIVED,
  TAMARIX_EVENT_TYPES.DESCRIPTION,
  TAMARIX_EVENT_TYPES.WORKLOG,
  TAMARIX_EVENT_TYPES.SORT_ORDER
] as const;

function getParentProjectId(room: Room): string | undefined {
  const parentEvents = room.currentState.getStateEvents(EventType.SpaceParent);
  const canonical = parentEvents.find(event => event.getContent()?.canonical === true);
  return canonical?.getStateKey() ?? parentEvents[0]?.getStateKey() ?? undefined;
}

function roomMatchesProject(room: Room, projectRoomId: string): boolean {
  return room.currentState
    .getStateEvents(EventType.SpaceParent)
    .some(event => event.getStateKey() === projectRoomId);
}

function getEventsSignature(room: Room, eventType: string): string {
  const events = room.currentState.getStateEvents(eventType as any) as unknown;
  const eventList = Array.isArray(events) ? events : events ? [events] : [];
  return eventList
    .map(event => {
      const stateKey = typeof event.getStateKey === "function" ? event.getStateKey() : "";
      const eventId = typeof event.getId === "function" ? event.getId() : "";
      const ts = typeof event.getTs === "function" ? event.getTs() : 0;
      return `${stateKey ?? ""}:${eventId ?? ""}:${ts}`;
    })
    .join("|");
}

function getTaskSignature(room: Room): string {
  return [
    room.roomId,
    room.name,
    ...TASK_SIGNATURE_EVENT_TYPES.map(type => `${type}=${getEventsSignature(room, type)}`)
  ].join(";");
}

export function createTaskCache() {
  const byRoomId = new Map<string, Task>();
  const projectTaskIds = new Map<string, Set<string>>();
  const taskSignatures = new Map<string, string>();
  let allTaskIds: string[] = [];

  function getTasks(): Task[] {
    return allTaskIds
      .map(roomId => byRoomId.get(roomId))
      .filter((task): task is Task => !!task);
  }

  function indexTask(task: Task, previous?: Task) {
    if (previous?.projectRoomId && previous.projectRoomId !== task.projectRoomId) {
      projectTaskIds.get(previous.projectRoomId)?.delete(task.roomId);
    }

    if (task.projectRoomId) {
      let ids = projectTaskIds.get(task.projectRoomId);
      if (!ids) {
        ids = new Set<string>();
        projectTaskIds.set(task.projectRoomId, ids);
      }
      ids.add(task.roomId);
    }
  }

  function upsert(task: Task) {
    const previous = byRoomId.get(task.roomId);
    byRoomId.set(task.roomId, task);
    if (!previous && !allTaskIds.includes(task.roomId)) {
      allTaskIds = [...allTaskIds, task.roomId];
    }
    indexTask(task, previous);
  }

  function remove(roomId: string) {
    const previous = byRoomId.get(roomId);
    if (previous?.projectRoomId) {
      projectTaskIds.get(previous.projectRoomId)?.delete(roomId);
    }
    byRoomId.delete(roomId);
    taskSignatures.delete(roomId);
    allTaskIds = allTaskIds.filter(id => id !== roomId);
  }

  function refreshRoom(client: MatrixClient, room: Room): boolean {
    if (!isTaskRoom(room)) {
      if (byRoomId.has(room.roomId)) {
        remove(room.roomId);
        return true;
      }
      return false;
    }

    const signature = getTaskSignature(room);
    if (taskSignatures.get(room.roomId) === signature && byRoomId.has(room.roomId)) {
      return false;
    }

    const task = repoGetTask(client, room.roomId);
    if (!task) return false;
    upsert(task);
    taskSignatures.set(room.roomId, signature);
    return true;
  }

  function fetchFromRooms(client: MatrixClient, projectRoomId?: string): Task[] {
    const rooms = measureSync("tasks.get_rooms", () => client.getRooms());
    const taskRooms = measureSync("tasks.filter_task_rooms", () => rooms.filter(isTaskRoom), {
      rooms: rooms.length
    });
    const filteredRooms = projectRoomId
      ? measureSync("tasks.filter_project_rooms", () => taskRooms.filter(room => roomMatchesProject(room, projectRoomId)), {
          taskRooms: taskRooms.length
        })
      : taskRooms;

    const seenRoomIds = new Set<string>();
    for (const room of filteredRooms) {
      seenRoomIds.add(room.roomId);
      refreshRoom(client, room);
    }

    if (projectRoomId) {
      const cachedIds = [...(projectTaskIds.get(projectRoomId) ?? [])];
      for (const roomId of cachedIds) {
        if (!seenRoomIds.has(roomId)) {
          remove(roomId);
        }
      }
    } else {
      const allSeenTaskIds = new Set(taskRooms.map(room => room.roomId));
      for (const roomId of [...byRoomId.keys()]) {
        if (!allSeenTaskIds.has(roomId)) {
          remove(roomId);
        }
      }
    }

    return getTasks();
  }

  function refreshTask(client: MatrixClient, roomId: string): boolean {
    const room = client.getRoom(roomId);
    if (!room) {
      if (byRoomId.has(roomId)) {
        remove(roomId);
        return true;
      }
      return false;
    }
    return refreshRoom(client, room);
  }

  function getByRoomId(roomId: string): Task | undefined {
    return byRoomId.get(roomId);
  }

  function getByProject(projectRoomId: string): Task[] {
    const ids = projectTaskIds.get(projectRoomId);
    if (!ids) return [];
    return [...ids]
      .map(roomId => byRoomId.get(roomId))
      .filter((task): task is Task => !!task);
  }

  function getById(taskId: string): Task | undefined {
    return byRoomId.get(taskId) ?? getTasks().find(task => task.ticketId === taskId);
  }

  return {
    getTasks,
    upsert,
    remove,
    refreshRoom,
    fetchFromRooms,
    refreshTask,
    getByRoomId,
    getByProject,
    getById
  };
}

export type TaskCache = ReturnType<typeof createTaskCache>;
