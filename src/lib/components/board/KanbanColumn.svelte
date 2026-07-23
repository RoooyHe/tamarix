<script lang="ts">
  import type { Task, TaskStatus } from "$lib/matrix/task-types";
  import { TASK_STATUS_ORDER } from "$lib/matrix/task-types";
  import { getStatusLabel } from "$lib/matrix/labels";
  import { t } from "$lib/i18n";
  import KanbanCard from "./KanbanCard.svelte";
  import { getDragData, hasDragData } from "$lib/utils/drag";
  import type { TaskDragData } from "$lib/utils/drag";
  import { canTransition } from "$lib/matrix/workflow";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { ChevronDown, ChevronRight } from "@lucide/svelte";

  interface Props {
    status: TaskStatus;
    tasks: Task[];
    selectedTaskIds?: Set<string>;
    mobile?: boolean;
    onTaskClick?: (task: Task) => void;
    onTaskDrop?: (taskId: string, targetStatus: TaskStatus) => void;
    onTaskReorder?: (taskId: string, status: TaskStatus, newIndex: number) => void;
    onToggleSelect?: (taskId: string) => void;
  }

  let { status, tasks, selectedTaskIds, mobile = false, onTaskClick, onTaskDrop, onTaskReorder, onToggleSelect }: Props = $props();

  let isDragOver = $state(false);
  let invalidDropMsg = $state("");
  let isCollapsed = $state(Boolean(mobile));
  let dropIndex = $state<number | null>(null);

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
      dropIndex = null;
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
    const data = getDragData(event);
    if (data && data.fromStatus === status && dropIndex !== null) {
      onTaskReorder?.(data.taskId, status, dropIndex);
      dropIndex = null;
      return;
    }
    if (data && data.fromStatus !== status) {
      if (canTransition(data.fromStatus, status)) {
        onTaskDrop?.(data.taskId, status);
      } else {
        invalidDropMsg = t("kanban.invalid_transition", { to: getStatusLabel(status) });
        setTimeout(() => { invalidDropMsg = ""; }, 2000);
      }
    }
    dropIndex = null;
  }

  function handleCardDragOver(event: DragEvent, index: number) {
    if (!hasDragData(event)) return;
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    dropIndex = event.clientY > rect.top + rect.height / 2 ? index + 1 : index;
  }

  function toggleCollapse() {
    if (mobile) {
      isCollapsed = !isCollapsed;
    }
  }
</script>

<div
  class="flex flex-col rounded-lg border border-border bg-muted/30 {mobile ? 'w-full' : 'w-72 shrink-0'}"
  ondragover={handleDragOver}
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="list"
>
  <!-- Column header -->
  {#if mobile}
    <button
      type="button"
      class="flex min-h-[44px] w-full items-center justify-between px-3 py-2 border-b border-border"
      onclick={toggleCollapse}
      aria-expanded={!isCollapsed}
      aria-label={isCollapsed ? t("kanban.expand_column") : t("kanban.collapse_column")}
    >
      <div class="flex items-center gap-2">
        {#if isCollapsed}
          <ChevronRight class="h-4 w-4 text-muted-foreground" />
        {:else}
          <ChevronDown class="h-4 w-4 text-muted-foreground" />
        {/if}
        <span class="text-sm font-medium text-foreground">{getStatusLabel(status)}</span>
      </div>
      <span class="text-xs text-muted-foreground">{tasks.length}</span>
    </button>
  {:else}
    <div class="flex items-center justify-between px-3 py-2 border-b border-border">
      <span class="text-sm font-medium text-foreground">{getStatusLabel(status)}</span>
      <span class="text-xs text-muted-foreground">{tasks.length}</span>
    </div>
  {/if}

  <!-- Cards area -->
  {#if !mobile || !isCollapsed}
    <div
      class="flex-1 space-y-2 p-2 overflow-y-auto min-h-[120px] transition-colors {isDragOver ? 'bg-accent/50' : ''}"
    >
      {#each tasks as task, index (task.roomId)}
        {#if dropIndex === index}
          <div class="h-1 rounded-full bg-primary"></div>
        {/if}
        <div role="listitem" ondragover={(event) => handleCardDragOver(event, index)}>
          <KanbanCard
            {task}
            selected={selectedTaskIds?.has(task.roomId) ?? false}
            onClick={(t) => onTaskClick?.(t)}
            onToggleSelect={onToggleSelect ? (id) => onToggleSelect?.(id) : undefined}
          />
        </div>
      {/each}
      {#if dropIndex === tasks.length}
        <div class="h-1 rounded-full bg-primary"></div>
      {/if}

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
  {/if}

{#if invalidDropMsg}
  <div class="mx-2 mb-2">
    <Alert variant="destructive">
      <AlertDescription>{invalidDropMsg}</AlertDescription>
    </Alert>
  </div>
{/if}
</div>
