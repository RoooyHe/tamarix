import { isDueSoon } from "./notifications";
import type { NotificationType } from "./types";

const STORAGE_KEY = "tamarix:reminded_ids";
const DUE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

type AddNotificationFn = (type: NotificationType, taskId: string, taskTitle: string, triggeredBy: string) => void;
type GetTasksFn = () => { roomId: string; title: string; dueDate?: string; status: string }[];

function loadRemindedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveRemindedSet(set: Set<string>) {
  try {
    const arr = [...set].slice(-1000);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

function checkDueReminders(
  tasks: { roomId: string; title: string; dueDate?: string; status: string }[],
  addNotification: AddNotificationFn,
  remindedIds: Set<string>
): Set<string> {
  let updated = remindedIds;
  for (const task of tasks) {
    if (!task.dueDate) continue;
    if (task.status === "done" || task.status === "closed") continue;
    if (updated.has(task.roomId)) continue;

    if (isDueSoon(task.dueDate)) {
      addNotification("due_remind", task.roomId, task.title, "system");
      updated = new Set([...updated, task.roomId]);
    }
  }
  if (updated !== remindedIds) {
    saveRemindedSet(updated);
  }
  return updated;
}

/**
 * Start a periodic timer that checks all tasks for due reminders.
 * Returns a stop function.
 */
export function startDueCheckTimer(
  getTasks: GetTasksFn,
  addNotification: AddNotificationFn
): { initialReminders: Set<string>; stop: () => void } {
  const remindedIds = loadRemindedSet();

  // Run immediately
  const updated = checkDueReminders(getTasks(), addNotification, remindedIds);

  const timer = setInterval(() => {
    checkDueReminders(getTasks(), addNotification, updated);
  }, DUE_CHECK_INTERVAL_MS);

  return {
    initialReminders: updated,
    stop: () => clearInterval(timer)
  };
}
