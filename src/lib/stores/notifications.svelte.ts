import { getContext, setContext } from "svelte";
import type { MatrixClient, MatrixEvent, Room, IRoomTimelineData } from "matrix-js-sdk";
import { RoomEvent, EventType } from "matrix-js-sdk";
import type { Notification, NotificationType } from "$lib/matrix/types";
import { TAMARIX_EVENT_TYPES } from "$lib/matrix/types";
import { getWatchers } from "$lib/matrix/state-events";
import { onSyncUpdate } from "$lib/matrix/client";
import { isDueSoon } from "$lib/matrix/notifications";
import { t } from "$lib/i18n";

const NOTIFICATIONS_CONTEXT_KEY = "tamarix:notifications";
const STORAGE_KEY = "tamarix:reminded_ids";
const DEBOUNCE_MS = 1000;
const DUE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadRemindedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveRemindedSet(set: Set<string>) {
  try {
    // Keep only last 1000 entries to avoid storage bloat
    const arr = [...set].slice(-1000);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

function createNotificationsState() {
  let notifications = $state<Notification[]>([]);
  let isLoading = $state(false);
  let syncCleanup: (() => void) | null = null;
  let dueCheckTimer: ReturnType<typeof setInterval> | null = null;
  let remindedIds = $state<Set<string>>(loadRemindedSet());

  // Debounce map: taskId -> last notification timestamp
  const debounceMap = new Map<string, number>();

  /** Check if a notification for this task was recently created (debounce) */
  function isDebounced(taskId: string): boolean {
    const last = debounceMap.get(taskId) ?? 0;
    return Date.now() - last < DEBOUNCE_MS;
  }

  function markDebounced(taskId: string) {
    debounceMap.set(taskId, Date.now());
  }

  let unreadCount = $derived(notifications.filter(n => !n.read).length);

  function addNotification(type: NotificationType, taskId: string, taskTitle: string, triggeredBy: string) {
    if (isDebounced(taskId)) return;
    markDebounced(taskId);

    const notification: Notification = {
      id: generateId(),
      type,
      taskId,
      taskTitle,
      triggeredBy,
      triggeredAt: Date.now(),
      read: false
    };

    // Deduplicate: if same taskId+type+triggeredBy unread exists, update instead
    const existing = notifications.find(
      n => !n.read && n.taskId === taskId && n.type === type
    );
    if (existing) {
      notifications = notifications.map(n =>
        n.id === existing.id ? { ...n, triggeredBy, triggeredAt: Date.now() } : n
      );
    } else {
      notifications = [notification, ...notifications];
    }

    // Keep max 100 notifications
    if (notifications.length > 100) {
      notifications = notifications.slice(0, 100);
    }
  }

  function markAsRead(id: string) {
    notifications = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
  }

  function markAllRead() {
    notifications = notifications.map(n => ({ ...n, read: true }));
  }

  /**
   * Check tasks for due date reminders.
   * Called periodically or on sync. Generates due_remind notification for
   * tasks due within 1 day that haven't been reminded yet.
   */
  function checkDueReminders(client: MatrixClient, tasks: { roomId: string; title: string; dueDate?: string; status: string }[]) {
    for (const task of tasks) {
      if (!task.dueDate) continue;
      if (task.status === "done" || task.status === "closed") continue;
      if (remindedIds.has(task.roomId)) continue;

      if (isDueSoon(task.dueDate)) {
        addNotification("due_remind", task.roomId, task.title, "system");
        remindedIds = new Set([...remindedIds, task.roomId]);
        saveRemindedSet(remindedIds);
      }
    }
  }

  /**
   * Start a periodic timer that checks all tasks for due reminders.
   * Should be called from layout when user is logged in.
   */
  function startDueCheckTimer(client: MatrixClient, getTasks: () => { roomId: string; title: string; dueDate?: string; status: string }[]) {
    stopDueCheckTimer();
    // Run immediately on start
    checkDueReminders(client, getTasks());
    // Then every 30 minutes
    dueCheckTimer = setInterval(() => {
      checkDueReminders(client, getTasks());
    }, DUE_CHECK_INTERVAL_MS);
  }

  function stopDueCheckTimer() {
    if (dueCheckTimer) {
      clearInterval(dueCheckTimer);
      dueCheckTimer = null;
    }
  }

  /**
   * Start listening for timeline events to auto-generate notifications.
   * Monitors status changes, assignments, and mentions for the current user.
   */
  function startSyncListener(client: MatrixClient) {
    stopSyncListener();

    const myUserId = client.getUserId();

    const handler = (event: MatrixEvent, room: Room | undefined, toStartOfTimeline: boolean | undefined) => {
      if (!room || toStartOfTimeline) return;
      if (!myUserId) return;

      const sender = event.getSender()!;
      const eventType = event.getType();

      // 1. Status change notification — for watchers (including current user if watching)
      if (eventType === TAMARIX_EVENT_TYPES.TASK_STATUS) {
        const watchers = getWatchers(room);
        if (watchers.includes(myUserId) && sender !== myUserId) {
          addNotification("status_change", room.roomId, room.name, sender);
        }
      }

      // 2. Assignee notification — notify the newly assigned user
      if (eventType === TAMARIX_EVENT_TYPES.ASSIGNEE) {
        const content = event.getContent();
        const assignedUser = content.user_id as string | undefined;
        if (assignedUser === myUserId && sender !== myUserId) {
          addNotification("assign", room.roomId, room.name, sender);
        }
      }

      // 3. Mention notification — when someone mentions the current user in a message
      if (eventType === EventType.RoomMessage) {
        const content = event.getContent();
        const body = (content.body as string) ?? "";
        if (body.includes(myUserId) && sender !== myUserId) {
          addNotification("mention", room.roomId, room.name, sender);
        }
      }
    };

    client.on(RoomEvent.Timeline, handler);
    syncCleanup = () => client.removeListener(RoomEvent.Timeline, handler);
  }

  function stopSyncListener() {
    if (syncCleanup) {
      syncCleanup();
      syncCleanup = null;
    }
  }

  function clearAll() {
    notifications = [];
    debounceMap.clear();
  }

  return {
    get notifications() { return notifications; },
    get isLoading() { return isLoading; },
    get unreadCount() { return unreadCount; },
    addNotification,
    markAsRead,
    markAllRead,
    checkDueReminders,
    startDueCheckTimer,
    stopDueCheckTimer,
    startSyncListener,
    stopSyncListener,
    clearAll
  };
}

export type NotificationsStore = ReturnType<typeof createNotificationsState>;

export function setNotificationsContext() {
  const notifications = createNotificationsState();
  setContext(NOTIFICATIONS_CONTEXT_KEY, notifications);
  return notifications;
}

export function getNotificationsContext(): NotificationsStore {
  return getContext<NotificationsStore>(NOTIFICATIONS_CONTEXT_KEY);
}
