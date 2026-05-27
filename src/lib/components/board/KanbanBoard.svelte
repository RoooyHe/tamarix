<script lang="ts">
  import type { Task, TaskStatus } from "$lib/matrix/types";
  import { TASK_STATUS_ORDER } from "$lib/matrix/types";
  import KanbanColumn from "./KanbanColumn.svelte";
  import { t } from "$lib/i18n";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";

  interface Props {
    tasks: Task[];
    selectedTaskIds?: Set<string>;
    onTaskClick?: (task: Task) => void;
    onTaskDrop?: (taskId: string, targetStatus: TaskStatus) => void;
    onToggleSelect?: (taskId: string) => void;
  }

  let { tasks, selectedTaskIds, onTaskClick, onTaskDrop, onToggleSelect }: Props = $props();

  let isMobile = new IsMobile();

  let grouped = $derived.by(() => {
    const map = new Map<TaskStatus, Task[]>();
    for (const status of TASK_STATUS_ORDER) {
      map.set(status, []);
    }
    for (const task of tasks) {
      const list = map.get(task.status);
      if (list) list.push(task);
    }
    return map;
  });
</script>

<div class={isMobile.current ? "space-y-2" : "flex gap-4 overflow-x-auto pb-4"}>
  {#each TASK_STATUS_ORDER as status}
    <KanbanColumn
      status={status}
      tasks={grouped.get(status) ?? []}
      {selectedTaskIds}
      mobile={isMobile.current}
      onTaskClick={(t) => onTaskClick?.(t)}
      onTaskDrop={(taskId, targetStatus) => onTaskDrop?.(taskId, targetStatus)}
      onToggleSelect={onToggleSelect ? (id) => onToggleSelect?.(id) : undefined}
    />
  {/each}
</div>
