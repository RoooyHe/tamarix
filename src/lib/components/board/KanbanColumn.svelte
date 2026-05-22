<script lang="ts">
  import type { Task, TaskStatus } from "$lib/matrix/types";
  import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from "$lib/matrix/types";
  import KanbanCard from "./KanbanCard.svelte";
  import { getDragData, hasDragData } from "$lib/utils/drag";
  import type { TaskDragData } from "$lib/utils/drag";

  interface Props {
    status: TaskStatus;
    tasks: Task[];
    onTaskClick?: (task: Task) => void;
    onTaskDrop?: (taskId: string, targetStatus: TaskStatus) => void;
  }

  let { status, tasks, onTaskClick, onTaskDrop }: Props = $props();

  let isDragOver = $state(false);

  function handleDragOver(event: DragEvent) {
    if (!hasDragData(event)) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";
  }

  function handleDragEnter(event: DragEvent) {
    if (!hasDragData(event)) return;
    event.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    // Only unset if leaving the column itself, not entering a child
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      isDragOver = false;
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
    const data = getDragData(event);
    if (data && data.fromStatus !== status) {
      onTaskDrop?.(data.taskId, status);
    }
  }
</script>

<div
  class="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30"
  ondragover={handleDragOver}
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="list"
>
  <!-- Column header -->
  <div class="flex items-center justify-between px-3 py-2 border-b border-border">
    <span class="text-sm font-medium text-foreground">{TASK_STATUS_LABELS[status]}</span>
    <span class="text-xs text-muted-foreground">{tasks.length}</span>
  </div>

  <!-- Cards area -->
  <div
    class="flex-1 space-y-2 p-2 overflow-y-auto min-h-[120px] transition-colors {isDragOver ? 'bg-accent/50' : ''}"
  >
    {#each tasks as task (task.roomId)}
      <KanbanCard
        {task}
        onClick={(t) => onTaskClick?.(t)}
      />
    {/each}

    {#if tasks.length === 0 && !isDragOver}
      <div class="flex h-24 items-center justify-center rounded-md border border-dashed border-border">
        <span class="text-xs text-muted-foreground">拖拽任务到此处</span>
      </div>
    {/if}

    {#if isDragOver && tasks.length === 0}
      <div class="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary/5">
        <span class="text-xs text-primary font-medium">放置到「{TASK_STATUS_LABELS[status]}」</span>
      </div>
    {/if}
  </div>
</div>
