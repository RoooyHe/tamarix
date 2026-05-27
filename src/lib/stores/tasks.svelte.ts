import { getContext, setContext } from "svelte";
import type { MatrixClient, Room } from "matrix-js-sdk";
import { EventType, Preset } from "matrix-js-sdk";
import type { Task, TaskStatus, Priority, TaskType } from "$lib/matrix/types";
import { roomToTask, isTaskRoom } from "$lib/matrix/room-utils";
import { TAMARIX_EVENT_TYPES, getStatusLabel } from "$lib/matrix/types";
import { generateNextTicketId } from "$lib/matrix/ticket-id";
import { canTransition } from "$lib/matrix/workflow";
import { onSyncUpdate } from "$lib/matrix/client";
import { t } from "$lib/i18n";

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
      error = e instanceof Error ? e.message : t("error.load_tasks");
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
      assignee?: string;
      encrypted?: boolean;
    }
  ) {
    isLoading = true;
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
          // Set m.space.parent in initial_state to establish the parent link atomically
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
      error = e instanceof Error ? e.message : t("error.create_task");
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
      // Validate workflow transition
      const currentTask = tasks.find(task => task.roomId === roomId);
      if (currentTask && !canTransition(currentTask.status, status)) {
        error = t("error.invalid_transition", { from: getStatusLabel(currentTask.status), to: getStatusLabel(status) });
        return;
      }

      await client.sendStateEvent(
        roomId,
        TAMARIX_EVENT_TYPES.TASK_STATUS as any,
        { status },
        ""
      );
      // Refresh
      fetchTasksFromRooms(client, projectRoomId);
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.update_status");
    }
  }

  function getTaskById(taskId: string): Task | undefined {
    return tasks.find(task => task.roomId === taskId || task.ticketId === taskId);
  }

  // --- Bulk operations ---

  async function bulkUpdateStatus(client: MatrixClient, roomIds: string[], status: TaskStatus, projectRoomId?: string) {
    error = null;
    try {
      await Promise.all(
        roomIds.map(id => client.sendStateEvent(id, TAMARIX_EVENT_TYPES.TASK_STATUS as any, { status }, ""))
      );
      fetchTasksFromRooms(client, projectRoomId);
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.update_status");
    }
  }

  async function bulkUpdatePriority(client: MatrixClient, roomIds: string[], priority: Priority, projectRoomId?: string) {
    error = null;
    try {
      await Promise.all(
        roomIds.map(id => client.sendStateEvent(id, TAMARIX_EVENT_TYPES.PRIORITY as any, { level: priority }, ""))
      );
      fetchTasksFromRooms(client, projectRoomId);
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.update_status");
    }
  }

  async function bulkArchive(client: MatrixClient, roomIds: string[], projectRoomId?: string) {
    error = null;
    try {
      const { setArchive } = await import("$lib/matrix/state-events");
      await Promise.all(
        roomIds.map(id => setArchive(client, id, true))
      );
      fetchTasksFromRooms(client, projectRoomId);
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.update_status");
    }
  }

  async function bulkAddTag(client: MatrixClient, roomIds: string[], tag: string, projectRoomId?: string) {
    error = null;
    try {
      const { setTags: setTagsEvent } = await import("$lib/matrix/state-events");
      await Promise.all(
        roomIds.map(async (id) => {
          const existingTask = tasks.find(t => t.roomId === id);
          const existingTags = existingTask?.tags ?? [];
          const merged = [...new Set([...existingTags, tag])];
          await setTagsEvent(client, id, merged);
        })
      );
      fetchTasksFromRooms(client, projectRoomId);
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.update_status");
    }
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
