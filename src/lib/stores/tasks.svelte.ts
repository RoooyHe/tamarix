import { getContext, setContext } from "svelte";
import type { MatrixClient, Room } from "matrix-js-sdk";
import { EventType, Preset } from "matrix-js-sdk";
import type { Task, TaskStatus, Priority, TaskType } from "$lib/matrix/types";
import { roomToTask, isTaskRoom } from "$lib/matrix/room-utils";
import { TAMARIX_EVENT_TYPES, getStatusLabel } from "$lib/matrix/types";
import { generateNextTicketId } from "$lib/matrix/ticket-id";
import { canTransition } from "$lib/matrix/workflow";
import {
  clearAssignee,
  getApproval,
  getApprovalConfig,
  setArchive,
  setAssignee,
  setDescription,
  setDueDate,
  setPriority,
  setSortOrder,
  setTags,
  setTaskType
} from "$lib/matrix/state-events";
import { onSyncUpdate } from "$lib/matrix/client";
import { measureSync } from "$lib/utils/performance";
import { t } from "$lib/i18n";

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
  let syncCleanup: (() => void) | null = null;
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

  function refreshRoom(room: Room): boolean {
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

    const task = roomToTask(room);
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
          refreshRoom(room);
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

    const changed = refreshRoom(room);
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

  function patchTask(roomId: string, patch: Partial<Task>): boolean {
    const previous = byRoomId.get(roomId);
    if (!previous) return false;

    upsertCachedTask({
      ...previous,
      ...patch,
      updatedAt: Date.now()
    });
    emitTasks();
    return true;
  }

  function restoreTask(previous: Task | undefined, roomId: string) {
    if (previous) {
      upsertCachedTask(previous);
    } else {
      removeCachedTask(roomId);
    }
    emitTasks();
  }

  async function commitOptimisticPatch(
    client: MatrixClient,
    roomId: string,
    patch: Partial<Task>,
    commit: () => Promise<unknown>,
    fallbackError: string
  ): Promise<boolean> {
    const previous = byRoomId.get(roomId);
    if (previous) patchTask(roomId, patch);

    try {
      await commit();
      return true;
    } catch (e) {
      restoreTask(previous, roomId);
      error = e instanceof Error ? e.message : fallbackError;
      refreshTask(client, roomId);
      return false;
    }
  }

  /**
   * Start listening for sync updates to automatically refresh task list.
   * Call this when navigating to a project page.
   */
  function startSyncListener(client: MatrixClient, projectRoomId?: string) {
    stopSyncListener();
    lastProjectId = projectRoomId;
    syncCleanup = onSyncUpdate(client, () => {
      fetchTasksFromRooms(client, lastProjectId);
    }, { debounceMs: 250 });
  }

  function stopSyncListener() {
    if (syncCleanup) {
      syncCleanup();
      syncCleanup = null;
    }
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
      const domain = client.getDomain()!;

      // Generate the next ticket ID for this project
      const ticketId = await generateNextTicketId(client, projectRoomId);

      const result = await client.createRoom({
        name: options.name,
        topic: options.topic,
        preset: Preset.PrivateChat,
        initial_state: [
          {
            type: EventType.SpaceParent,
            state_key: projectRoomId,
            content: {
              canonical: true,
              via: [domain]
            }
          },
          ...(options.encrypted
            ? [{
                type: EventType.RoomEncryption,
                state_key: "",
                content: { algorithm: "m.megolm.v1.aes-sha2" }
              }]
            : []),
          {
            type: TAMARIX_EVENT_TYPES.TASK_STATUS,
            state_key: "",
            content: { status: options.status ?? "todo" }
          },
          {
            type: TAMARIX_EVENT_TYPES.TICKET_ID,
            state_key: "",
            content: { id: ticketId }
          },
          ...(options.priority
            ? [{
                type: TAMARIX_EVENT_TYPES.PRIORITY,
                state_key: "",
                content: { level: options.priority }
              }]
            : []),
          ...(options.type
            ? [{
                type: TAMARIX_EVENT_TYPES.TASK_TYPE,
                state_key: "",
                content: { type: options.type }
              }]
            : []),
          ...(options.assignee
            ? [{
                type: TAMARIX_EVENT_TYPES.ASSIGNEE,
                state_key: "",
                content: { user_id: options.assignee }
              }]
            : []),
          ...(options.tags?.length
            ? [{
                type: TAMARIX_EVENT_TYPES.TAGS,
                state_key: "",
                content: { tags: options.tags }
              }]
            : [])
        ]
      });

      await client.sendStateEvent(
        projectRoomId,
        EventType.SpaceChild,
        {
          via: [domain],
          suggested: false,
          order: String(Date.now()).padStart(20, "0")
        },
        result.room_id
      );

      fetchTasksFromRooms(client, projectRoomId);

      return result.room_id;
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

    await commitOptimisticPatch(
      client,
      roomId,
      { status },
      () => client.sendStateEvent(roomId, TAMARIX_EVENT_TYPES.TASK_STATUS as any, { status }, ""),
      t("error.update_status")
    );
  }

  async function updateTaskPriority(client: MatrixClient, roomId: string, priority: Priority) {
    await commitOptimisticPatch(
      client,
      roomId,
      { priority },
      () => setPriority(client, roomId, priority),
      t("error.update_status")
    );
  }

  async function updateTaskType(client: MatrixClient, roomId: string, type: TaskType) {
    await commitOptimisticPatch(
      client,
      roomId,
      { type },
      () => setTaskType(client, roomId, type),
      t("error.update_status")
    );
  }

  async function updateTaskAssignee(client: MatrixClient, roomId: string, assignee: string | undefined) {
    await commitOptimisticPatch(
      client,
      roomId,
      { assignee },
      () => assignee ? setAssignee(client, roomId, assignee) : clearAssignee(client, roomId),
      t("error.update_status")
    );
  }

  async function updateTaskArchive(client: MatrixClient, roomId: string, archived: boolean) {
    await commitOptimisticPatch(
      client,
      roomId,
      {
        archived,
        archivedBy: client.getUserId() ?? undefined,
        archivedAt: new Date().toISOString()
      },
      () => setArchive(client, roomId, archived),
      t("error.update_status")
    );
  }

  async function updateTaskDescription(client: MatrixClient, roomId: string, body: string, formattedBody: string) {
    await commitOptimisticPatch(
      client,
      roomId,
      {
        description: body,
        formattedDescription: formattedBody
      },
      () => setDescription(client, roomId, body, formattedBody),
      t("error.update_status")
    );
  }

  async function updateTaskSortOrder(client: MatrixClient, roomId: string, sortOrder: string) {
    await commitOptimisticPatch(
      client,
      roomId,
      { sortOrder },
      () => setSortOrder(client, roomId, sortOrder),
      t("error.update_status")
    );
  }

  async function updateTaskTags(client: MatrixClient, roomId: string, tags: string[]) {
    await commitOptimisticPatch(
      client,
      roomId,
      { tags },
      () => setTags(client, roomId, tags),
      t("error.update_status")
    );
  }

  async function updateTaskDueDate(client: MatrixClient, roomId: string, dueDate: string) {
    await commitOptimisticPatch(
      client,
      roomId,
      { dueDate },
      () => setDueDate(client, roomId, dueDate),
      t("error.update_status")
    );
  }

  function getTaskById(taskId: string): Task | undefined {
    return byRoomId.get(taskId) ?? tasks.find(task => task.ticketId === taskId);
  }

  async function bulkUpdateStatus(client: MatrixClient, roomIds: string[], status: TaskStatus, projectRoomId?: string) {
    error = null;
    const previous = new Map(roomIds.map(id => [id, byRoomId.get(id)] as const));
    try {
      const blocked = roomIds.some(id => {
        const currentTask = byRoomId.get(id);
        return currentTask ? isApprovalBlocked(client, id, currentTask.status, status, projectRoomId) : false;
      });
      if (blocked) {
        error = t("error.approval_required");
        return;
      }

      for (const id of roomIds) patchTask(id, { status });
      await Promise.all(
        roomIds.map(id => client.sendStateEvent(id, TAMARIX_EVENT_TYPES.TASK_STATUS as any, { status }, ""))
      );
    } catch (e) {
      for (const [id, task] of previous) restoreTask(task, id);
      error = e instanceof Error ? e.message : t("error.update_status");
    }
  }

  async function bulkUpdatePriority(client: MatrixClient, roomIds: string[], priority: Priority, _projectRoomId?: string) {
    error = null;
    const previous = new Map(roomIds.map(id => [id, byRoomId.get(id)] as const));
    try {
      for (const id of roomIds) patchTask(id, { priority });
      await Promise.all(
        roomIds.map(id => setPriority(client, id, priority))
      );
    } catch (e) {
      for (const [id, task] of previous) restoreTask(task, id);
      error = e instanceof Error ? e.message : t("error.update_status");
    }
  }

  async function bulkArchive(client: MatrixClient, roomIds: string[], _projectRoomId?: string) {
    error = null;
    const previous = new Map(roomIds.map(id => [id, byRoomId.get(id)] as const));
    try {
      const archivedAt = new Date().toISOString();
      for (const id of roomIds) {
        patchTask(id, { archived: true, archivedBy: client.getUserId() ?? undefined, archivedAt });
      }
      await Promise.all(
        roomIds.map(id => setArchive(client, id, true))
      );
    } catch (e) {
      for (const [id, task] of previous) restoreTask(task, id);
      error = e instanceof Error ? e.message : t("error.update_status");
    }
  }

  async function bulkAddTag(client: MatrixClient, roomIds: string[], tag: string, _projectRoomId?: string) {
    error = null;
    const previous = new Map(roomIds.map(id => [id, byRoomId.get(id)] as const));
    try {
      await Promise.all(
        roomIds.map(async (id) => {
          const existingTask = byRoomId.get(id);
          const existingTags = existingTask?.tags ?? [];
          const merged = [...new Set([...existingTags, tag])];
          patchTask(id, { tags: merged });
          await setTags(client, id, merged);
        })
      );
    } catch (e) {
      for (const [id, task] of previous) restoreTask(task, id);
      error = e instanceof Error ? e.message : t("error.update_status");
    }
  }

  return {
    get tasks() { return tasks; },
    get isLoading() { return isLoading; },
    get isRefreshing() { return isRefreshing; },
    get error() { return error; },
    fetchTasksFromRooms,
    refreshTask,
    getTasksByProject,
    patchTask,
    startSyncListener,
    stopSyncListener,
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
