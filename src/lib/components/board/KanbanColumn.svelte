<script lang="ts">
  import type { Task, TaskStatus } from "$lib/matrix/types";
  import { getStatusLabel, TASK_STATUS_ORDER } from "$lib/matrix/types";
  import { t } from "$lib/i18n";
  import KanbanCard from "./KanbanCard.svelte";
  import { getDragData, hasDragData } from "$lib/utils/drag";
  import type { TaskDragData } from "$lib/utils/drag";
  import { canTransition } from "$lib/matrix/workflow";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";

  interface Props {
    status: TaskStatus;
    tasks: Task[];
    onTaskClick?: (task: Task) => void;
    onTaskDrop?: (taskId: string, targetStatus: TaskStatus) => void;
  }

  let { status, tasks, onTaskClick, onTaskDrop }: Props = $props();

  let isDragOver = $state(false);
  let invalidDropMsg = $state("");

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
      if (canTransition(data.fromStatus, status)) {
        onTaskDrop?.(data.taskId, status);
      } else {
        invalidDropMsg = t("kanban.invalid_transition", { to: getStatusLabel(status) });
        setTimeout(() => { invalidDropMsg = ""; }, 2000);
      }
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
    <span class="text-sm font-medium text-foreground">{getStatusLabel(status)}</span>
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
<span class="text-xs text-muted-foreground">{t("kanban.drop_here")}</span>
      </div>
    {/if}

    {#if isDragOver && tasks.length === 0}
      <div class="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary/5">
<span class="text-xs text-primary font-medium">{t("kanban.drop_to", { label: getStatusLabel(status) })}</span>
      </div>
    {/if}
  </div>

{#if invalidDropMsg}
  <div class="mx-2 mb-2">
    <Alert variant="destructive">
      <AlertDescription>{invalidDropMsg}</AlertDescription>
    </Alert>
  </div>
{/if}
</div>
