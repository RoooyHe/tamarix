import { getContext, setContext } from "svelte";
import type { MatrixClient, Room } from "matrix-js-sdk";
import { EventType } from "matrix-js-sdk";
import type { Task, TaskStatus, Priority, TaskType } from "$lib/matrix/types";
import { isTaskRoom } from "$lib/matrix/room-utils";
import { TAMARIX_EVENT_TYPES, getStatusLabel } from "$lib/matrix/types";
import { canTransition } from "$lib/matrix/workflow";
import { getApproval, getApprovalConfig } from "$lib/matrix/state-events";
import { measureSync } from "$lib/utils/performance";
import { t } from "$lib/i18n";
import { getTask, getTasks, patchTask, bulkPatch, createTask as repoCreateTask } from "$lib/matrix/task-repository";

const TASKS_CONTEXT_KEY = "tamarix:tasks";

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

function createTasksState() {
  let tasks = $state<Task[]>([]);
  let isLoading = $state(false);
  let isRefreshing = $state(false);
  let error = $state<string | null>(null);
  let cacheVersion = $state(0);
  let lastProjectId: string | undefined = undefined;

  const byRoomId = new Map<string, Task>();
  const projectTaskIds = new Map<string, Set<string>>();
  const taskSignatures = new Map<string, string>();
  let allTaskIds: string[] = [];

  function emitTasks() {
    tasks = allTaskIds
      .map(roomId => byRoomId.get(roomId))
      .filter((task): task is Task => !!task);
    cacheVersion += 1;
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

  function upsertCachedTask(task: Task) {
    const previous = byRoomId.get(task.roomId);
    byRoomId.set(task.roomId, task);
    if (!previous && !allTaskIds.includes(task.roomId)) {
      allTaskIds = [...allTaskIds, task.roomId];
    }
    indexTask(task, previous);
  }

  function removeCachedTask(roomId: string) {
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
        removeCachedTask(room.roomId);
        return true;
      }
      return false;
    }

    const signature = getTaskSignature(room);
    if (taskSignatures.get(room.roomId) === signature && byRoomId.has(room.roomId)) {
      return false;
    }

    const task = getTask(client, room.roomId);
    if (!task) return false;
    upsertCachedTask(task);
    taskSignatures.set(room.roomId, signature);
    return true;
  }

  function fetchTasksFromRooms(client: MatrixClient, projectRoomId?: string) {
    const showLoading = tasks.length === 0;
    isLoading = showLoading;
    isRefreshing = !showLoading;
    error = null;
    lastProjectId = projectRoomId;

    try {
      measureSync("tasks.fetch_from_rooms", () => {
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
              removeCachedTask(roomId);
            }
          }
        } else {
          const allSeenTaskIds = new Set(taskRooms.map(room => room.roomId));
          for (const roomId of [...byRoomId.keys()]) {
            if (!allSeenTaskIds.has(roomId)) {
              removeCachedTask(roomId);
            }
          }
        }

        emitTasks();
      }, { projectRoomId, currentTasks: tasks.length });
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.load_tasks");
    } finally {
      isLoading = false;
      isRefreshing = false;
    }
  }

  function refreshTask(client: MatrixClient, roomId: string) {
    const room = client.getRoom(roomId);
    if (!room) {
      if (byRoomId.has(roomId)) {
        removeCachedTask(roomId);
        emitTasks();
      }
      return;
    }

    const changed = refreshRoom(client, room);
    if (changed) emitTasks();
  }

  function getTasksByProject(projectRoomId: string): Task[] {
    cacheVersion;
    const ids = projectTaskIds.get(projectRoomId);
    if (!ids) return [];
    return [...ids]
      .map(roomId => byRoomId.get(roomId))
      .filter((task): task is Task => !!task);
  }

  function applyLocalPatch(patch: Partial<Task> | null, roomId: string, previous?: Task): boolean {
    if (patch === null) {
      // Revert: restore previous state or remove
      if (previous) {
        upsertCachedTask(previous);
      } else {
        removeCachedTask(roomId);
      }
      emitTasks();
      return true;
    }

    // Apply: merge patch into cached task
    const current = byRoomId.get(roomId);
    if (!current) return false;

    upsertCachedTask({
      ...current,
      ...patch,
      updatedAt: Date.now()
    });
    emitTasks();
    return true;
  }

  function isApprovalBlocked(
    client: MatrixClient,
    roomId: string,
    from: TaskStatus,
    to: TaskStatus,
    projectRoomId?: string
  ): boolean {
    if (!projectRoomId) return false;
    if (!["todo", "in_progress"].includes(from)) return false;
    if (!["review", "done"].includes(to)) return false;

    const projectRoom = client.getRoom(projectRoomId);
    if (!projectRoom) return false;
    const config = getApprovalConfig(projectRoom);
    if (!config.enabled) return false;

    const taskRoom = client.getRoom(roomId);
    if (!taskRoom) return true;
    return getApproval(taskRoom)?.status !== "approved";
  }

  async function createTask(
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
  ) {
    isLoading = tasks.length === 0;
    isRefreshing = tasks.length > 0;
    error = null;
    try {
      const roomId = await repoCreateTask(client, projectRoomId, options);
      fetchTasksFromRooms(client, projectRoomId);
      return roomId;
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.create_task");
    } finally {
      isLoading = false;
      isRefreshing = false;
    }
  }

  async function updateTaskStatus(
    client: MatrixClient,
    roomId: string,
    status: TaskStatus,
    projectRoomId?: string
  ) {
    error = null;
    const currentTask = byRoomId.get(roomId);
    if (currentTask && !canTransition(currentTask.status, status)) {
      error = t("error.invalid_transition", { from: getStatusLabel(currentTask.status), to: getStatusLabel(status) });
      return;
    }
    if (currentTask && isApprovalBlocked(client, roomId, currentTask.status, status, projectRoomId)) {
      error = t("error.approval_required");
      return;
    }

    const previous = byRoomId.get(roomId);
    const ok = await patchTask(client, roomId, { status }, (patch) => applyLocalPatch(patch, roomId, previous));
    if (!ok) {
      error = t("error.update_status");
    }
  }

  async function updateTaskPriority(client: MatrixClient, roomId: string, priority: Priority) {
    const previous = byRoomId.get(roomId);
    const ok = await patchTask(client, roomId, { priority }, (patch) => applyLocalPatch(patch, roomId, previous));
    if (!ok) error = t("error.update_status");
  }

  async function updateTaskType(client: MatrixClient, roomId: string, type: TaskType) {
    const previous = byRoomId.get(roomId);
    const ok = await patchTask(client, roomId, { type }, (patch) => applyLocalPatch(patch, roomId, previous));
    if (!ok) error = t("error.update_status");
  }

  async function updateTaskAssignee(client: MatrixClient, roomId: string, assignee: string | undefined) {
    const previous = byRoomId.get(roomId);
    const ok = await patchTask(client, roomId, { assignee }, (patch) => applyLocalPatch(patch, roomId, previous));
    if (!ok) error = t("error.update_status");
  }

  async function updateTaskArchive(client: MatrixClient, roomId: string, archived: boolean) {
    const previous = byRoomId.get(roomId);
    const ok = await patchTask(
      client,
      roomId,
      {
        archived,
        archivedBy: client.getUserId() ?? undefined,
        archivedAt: new Date().toISOString()
      },
      (patch) => applyLocalPatch(patch, roomId, previous)
    );
    if (!ok) error = t("error.update_status");
  }

  async function updateTaskDescription(client: MatrixClient, roomId: string, body: string, formattedBody: string) {
    const previous = byRoomId.get(roomId);
    const ok = await patchTask(
      client,
      roomId,
      {
        description: body,
        formattedDescription: formattedBody
      },
      (patch) => applyLocalPatch(patch, roomId, previous)
    );
    if (!ok) error = t("error.update_status");
  }

  async function updateTaskSortOrder(client: MatrixClient, roomId: string, sortOrder: string) {
    const previous = byRoomId.get(roomId);
    const ok = await patchTask(client, roomId, { sortOrder }, (patch) => applyLocalPatch(patch, roomId, previous));
    if (!ok) error = t("error.update_status");
  }

  async function updateTaskTags(client: MatrixClient, roomId: string, tags: string[]) {
    const previous = byRoomId.get(roomId);
    const ok = await patchTask(client, roomId, { tags }, (patch) => applyLocalPatch(patch, roomId, previous));
    if (!ok) error = t("error.update_status");
  }

  async function updateTaskDueDate(client: MatrixClient, roomId: string, dueDate: string) {
    const previous = byRoomId.get(roomId);
    const ok = await patchTask(client, roomId, { dueDate }, (patch) => applyLocalPatch(patch, roomId, previous));
    if (!ok) error = t("error.update_status");
  }

  function getTaskById(taskId: string): Task | undefined {
    return byRoomId.get(taskId) ?? tasks.find(task => task.ticketId === taskId);
  }

  async function bulkUpdateStatus(client: MatrixClient, roomIds: string[], status: TaskStatus, projectRoomId?: string) {
    error = null;
    const blocked = roomIds.some(id => {
      const currentTask = byRoomId.get(id);
      return currentTask ? isApprovalBlocked(client, id, currentTask.status, status, projectRoomId) : false;
    });
    if (blocked) {
      error = t("error.approval_required");
      return;
    }

    const patches = new Map(roomIds.map(id => [id, { status } as Partial<Task>]));
    const previous = new Map(roomIds.map(id => [id, byRoomId.get(id)] as const));
    const ok = await bulkPatch(client, patches, (revertPatches) => {
      if (revertPatches === null) {
        // Revert all
        for (const [id, prev] of previous) {
          applyLocalPatch(prev ?? null, id, undefined);
        }
      } else {
        // Apply all
        for (const [id, patch] of revertPatches) {
          applyLocalPatch(patch, id);
        }
      }
    });
    if (!ok) error = t("error.update_status");
  }

  async function bulkUpdatePriority(client: MatrixClient, roomIds: string[], priority: Priority, _projectRoomId?: string) {
    const patches = new Map(roomIds.map(id => [id, { priority } as Partial<Task>]));
    const previous = new Map(roomIds.map(id => [id, byRoomId.get(id)] as const));
    const ok = await bulkPatch(client, patches, (revertPatches) => {
      if (revertPatches === null) {
        for (const [id, prev] of previous) {
          applyLocalPatch(prev ?? null, id, undefined);
        }
      } else {
        for (const [id, patch] of revertPatches) {
          applyLocalPatch(patch, id);
        }
      }
    });
    if (!ok) error = t("error.update_status");
  }

  async function bulkArchive(client: MatrixClient, roomIds: string[], _projectRoomId?: string) {
    const patches = new Map(roomIds.map(id => [id, { archived: true } as Partial<Task>]));
    const previous = new Map(roomIds.map(id => [id, byRoomId.get(id)] as const));
    const ok = await bulkPatch(client, patches, (revertPatches) => {
      if (revertPatches === null) {
        for (const [id, prev] of previous) {
          applyLocalPatch(prev ?? null, id, undefined);
        }
      } else {
        for (const [id, patch] of revertPatches) {
          applyLocalPatch(patch, id);
        }
      }
    });
    if (!ok) error = t("error.update_status");
  }

  async function bulkAddTag(client: MatrixClient, roomIds: string[], tag: string, _projectRoomId?: string) {
    const patches = new Map<string, Partial<Task>>();
    const previous = new Map(roomIds.map(id => [id, byRoomId.get(id)] as const));
    for (const id of roomIds) {
      const existingTask = byRoomId.get(id);
      const existingTags = existingTask?.tags ?? [];
      patches.set(id, { tags: [...new Set([...existingTags, tag])] });
    }
    const ok = await bulkPatch(client, patches, (revertPatches) => {
      if (revertPatches === null) {
        for (const [id, prev] of previous) {
          applyLocalPatch(prev ?? null, id, undefined);
        }
      } else {
        for (const [id, patch] of revertPatches) {
          applyLocalPatch(patch, id);
        }
      }
    });
    if (!ok) error = t("error.update_status");
  }

  return {
    get tasks() { return tasks; },
    get isLoading() { return isLoading; },
    get isRefreshing() { return isRefreshing; },
    get error() { return error; },
    fetchTasksFromRooms,
    refreshTask,
    getTasksByProject,
    createTask,
    updateTaskStatus,
    updateTaskPriority,
    updateTaskType,
    updateTaskAssignee,
    updateTaskArchive,
    updateTaskDescription,
    updateTaskSortOrder,
    updateTaskTags,
    updateTaskDueDate,
    getTaskById,
    bulkUpdateStatus,
    bulkUpdatePriority,
    bulkArchive,
    bulkAddTag
  };
}

export type TasksStore = ReturnType<typeof createTasksState>;

export function setTasksContext() {
  const tasks = createTasksState();
  setContext(TASKS_CONTEXT_KEY, tasks);
  return tasks;
}

export function getTasksContext(): TasksStore {
  return getContext<TasksStore>(TASKS_CONTEXT_KEY);
}
