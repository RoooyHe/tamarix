import { t } from "$lib/i18n";
import type { TaskStatus, Priority, TaskType } from "./task-types";

export function getStatusLabel(status: TaskStatus): string {
  return t("status." + status);
}

export function getPriorityLabel(priority: Priority): string {
  return t("priority." + priority);
}

export function getTypeLabel(type: TaskType): string {
  return t("type." + type);
}
