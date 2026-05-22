import { getContext, setContext } from "svelte";
import type { MatrixClient, Room } from "matrix-js-sdk";
import { EventType, Preset } from "matrix-js-sdk";
import type { Task, TaskStatus, Priority, TaskType } from "$lib/matrix/types";
import { roomToTask, isTaskRoom } from "$lib/matrix/room-utils";
import { TAMARIX_EVENT_TYPES } from "$lib/matrix/types";
import { onSyncUpdate } from "$lib/matrix/client";

const TASKS_CONTEXT_KEY = "tamarix:tasks";

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
}

function createTasksState() {
  let tasks = $state<Task[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let syncCleanup: (() => void) | null = null;
  let lastProjectId: string | undefined = undefined;

  function fetchTasksFromRooms(client: MatrixClient, projectRoomId?: string) {
    isLoading = true;
    error = null;
    lastProjectId = projectRoomId;
    try {
      const rooms = client.getRooms();
      const taskRooms = rooms.filter(isTaskRoom);

      let filtered: Room[] = taskRooms;
      if (projectRoomId) {
        filtered = taskRooms.filter(room => {
          // m.space.parent state_key is the parent room ID, not ""
          // We need to iterate all m.space.parent events to find matching parent
          const parentEvents = room.currentState.getStateEvents(EventType.SpaceParent);
          return parentEvents.some(e => e.getStateKey() === projectRoomId);
        });
      }

      tasks = filtered.map(roomToTask);
    } catch (e) {
      error = e instanceof Error ? e.message : "加载任务失败";
    } finally {
      isLoading = false;
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
    });
  }

  function stopSyncListener() {
    if (syncCleanup) {
      syncCleanup();
      syncCleanup = null;
    }
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
    }
  ) {
    isLoading = true;
    error = null;
    try {
      const domain = client.getDomain()!;

      const result = await client.createRoom({
        name: options.name,
        topic: options.topic,
        preset: Preset.PrivateChat,
        initial_state: [
          // Set m.space.parent in initial_state to establish the parent link atomically
          {
            type: EventType.SpaceParent,
            state_key: projectRoomId,
            content: {
              canonical: true,
              via: [domain]
            }
          },
          {
            type: TAMARIX_EVENT_TYPES.TASK_STATUS,
            state_key: "",
            content: { status: options.status ?? "todo" }
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
            : [])
        ]
      });

      // Add m.space.child to the project space (must be done after room creation since we need the child room ID)
      await client.sendStateEvent(
        projectRoomId,
        EventType.SpaceChild,
        {
          via: [domain],
          suggested: false,
          order: String(Date.now()).padStart(20, "0") // Lexicographic order by creation time
        },
        result.room_id
      );

      // Refresh task list
      fetchTasksFromRooms(client, projectRoomId);

      return result.room_id;
    } catch (e) {
      error = e instanceof Error ? e.message : "创建任务失败";
      return undefined;
    } finally {
      isLoading = false;
    }
  }

  async function updateTaskStatus(
    client: MatrixClient,
    roomId: string,
    status: TaskStatus,
    projectRoomId?: string
  ) {
    try {
      await client.sendStateEvent(
        roomId,
        TAMARIX_EVENT_TYPES.TASK_STATUS as any,
        { status },
        ""
      );
      // Refresh
      fetchTasksFromRooms(client, projectRoomId);
    } catch (e) {
      error = e instanceof Error ? e.message : "更新状态失败";
    }
  }

  function getTaskById(taskId: string): Task | undefined {
    return tasks.find(t => t.roomId === taskId || t.ticketId === taskId);
  }

  return {
    get tasks() { return tasks; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    fetchTasksFromRooms,
    startSyncListener,
    stopSyncListener,
    createTask,
    updateTaskStatus,
    getTaskById
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
