<script lang="ts">
  import type { Task, TaskStatus } from "$lib/matrix/task-types";
  import { TASK_STATUS_ORDER } from "$lib/matrix/task-types";
  import KanbanColumn from "./KanbanColumn.svelte";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";
  import { sortByOrder } from "$lib/utils/sort-order";

  interface Props {
    tasks: Task[];
    selectedTaskIds?: Set<string>;
    onTaskClick?: (task: Task) => void;
    onTaskDrop?: (taskId: string, targetStatus: TaskStatus) => void;
    onTaskReorder?: (taskId: string, status: TaskStatus, newIndex: number) => void;
    onToggleSelect?: (taskId: string) => void;
  }

  let { tasks, selectedTaskIds, onTaskClick, onTaskDrop, onTaskReorder, onToggleSelect }: Props = $props();

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
    const orderMap = new Map(tasks.map(task => [task.roomId, task.sortOrder ?? "zzzzzz"]));
    for (const [status, list] of map) {
      map.set(status, sortByOrder(list, orderMap));
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
      onTaskReorder={(taskId, targetStatus, newIndex) => onTaskReorder?.(taskId, targetStatus, newIndex)}
      onToggleSelect={onToggleSelect ? (id) => onToggleSelect?.(id) : undefined}
    />
  {/each}
</div>
