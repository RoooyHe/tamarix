import { getContext, setContext } from "svelte";
import type { MatrixClient } from "matrix-js-sdk";
import type { Notification, NotificationType } from "$lib/matrix/types";
import { startNotificationListener } from "$lib/matrix/notification-timeline";
import { startDueCheckTimer } from "$lib/matrix/due-checker";

const NOTIFICATIONS_CONTEXT_KEY = "tamarix:notifications";
const DEBOUNCE_MS = 1000;

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createNotificationsState() {
  let notifications = $state<Notification[]>([]);
  let isLoading = $state(false);
  let syncCleanup: (() => void) | null = null;
  let dueCheckStop: (() => void) | null = null;

  const debounceMap = new Map<string, number>();

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

  function startSyncListener(client: MatrixClient) {
    stopSyncListener();
    syncCleanup = startNotificationListener(client, addNotification);
  }

  function stopSyncListener() {
    if (syncCleanup) {
      syncCleanup();
      syncCleanup = null;
    }
  }

  function startDueCheck(getTasks: () => { roomId: string; title: string; dueDate?: string; status: string }[]) {
    stopDueCheck();
    const { stop } = startDueCheckTimer(getTasks, addNotification);
    dueCheckStop = stop;
  }

  function stopDueCheck() {
    if (dueCheckStop) {
      dueCheckStop();
      dueCheckStop = null;
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
    startSyncListener,
    stopSyncListener,
    startDueCheck,
    stopDueCheck,
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
