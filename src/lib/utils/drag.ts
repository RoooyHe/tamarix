import type { TaskStatus } from "$lib/matrix/task-types";

const DRAG_MIME_TYPE = "application/x-tamarix-task";

export interface TaskDragData {
  taskId: string;
  fromStatus: TaskStatus;
}

/**
 * Set drag data on a DragEvent.
 */
export function setDragData(event: DragEvent, data: TaskDragData): void {
  event.dataTransfer?.setData(DRAG_MIME_TYPE, JSON.stringify(data));
  event.dataTransfer!.effectAllowed = "move";
}

/**
 * Get drag data from a DragEvent.
 */
export function getDragData(event: DragEvent): TaskDragData | null {
  const raw = event.dataTransfer?.getData(DRAG_MIME_TYPE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TaskDragData;
  } catch {
    return null;
  }
}

/**
 * Check if a DragEvent contains Tamarix task data.
 */
export function hasDragData(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes(DRAG_MIME_TYPE) ?? false;
}
