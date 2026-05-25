<script lang="ts">
  import type { Task, TaskStatus } from "$lib/matrix/types";
  import { TASK_STATUS_ORDER } from "$lib/matrix/types";
  import KanbanColumn from "./KanbanColumn.svelte";
  import { t } from "$lib/i18n";

  interface Props {
    tasks: Task[];
    onTaskClick?: (task: Task) => void;
    onTaskDrop?: (taskId: string, targetStatus: TaskStatus) => void;
  }

  let { tasks, onTaskClick, onTaskDrop }: Props = $props();

  /** Group tasks by status */
  let tasksByStatus = $derived.by(() => {
    const map = new Map<TaskStatus, Task[]>();
    for (const status of TASK_STATUS_ORDER) {
      map.set(status, []);
    }
    for (const task of tasks) {
      const list = map.get(task.status);
      if (list) {
        list.push(task);
      } else {
        map.set(task.status, [task]);
      }
    }
    return map;
  });
</script>

<div class="flex gap-4 overflow-x-auto pb-4" role="region" aria-label={t("kanban.label")}>
  {#each TASK_STATUS_ORDER as status}
    <KanbanColumn
      {status}
      tasks={tasksByStatus.get(status) ?? []}
      onTaskClick={(t) => onTaskClick?.(t)}
      onTaskDrop={(taskId, targetStatus) => onTaskDrop?.(taskId, targetStatus)}
    />
  {/each}
</div>
