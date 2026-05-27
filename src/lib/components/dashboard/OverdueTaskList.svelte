<script lang="ts">
  import { t } from "$lib/i18n";
  import type { Task } from "$lib/matrix/types";
  import { getPriorityLabel } from "$lib/matrix/types";
  import TaskCard from "$lib/components/task/TaskCard.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { AlertTriangle } from "@lucide/svelte";

  interface Props {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
  }

  let { tasks, onTaskClick }: Props = $props();

  const DAY_MS = 86400000;

  let overdueTasks = $derived(
    tasks
      .filter(t =>
        t.dueDate &&
        t.status !== "done" &&
        t.status !== "closed" &&
        new Date(t.dueDate!).getTime() < Date.now()
      )
      .map(t => ({
        task: t,
        overdueDays: Math.ceil((Date.now() - new Date(t.dueDate!).getTime()) / DAY_MS)
      }))
      .sort((a, b) => b.overdueDays - a.overdueDays)
  );
</script>

{#if overdueTasks.length > 0}
  <div>
    <h2 class="mb-3 text-lg font-semibold text-foreground flex items-center gap-2">
      <AlertTriangle class="h-5 w-5 text-destructive" />
      {t("dashboard.overdue")}
      <Badge variant="destructive" class="ml-1">{overdueTasks.length}</Badge>
    </h2>
    <div class="space-y-2">
      {#each overdueTasks as { task, overdueDays } (task.roomId)}
        <div class="relative">
          <TaskCard {task} onClick={onTaskClick} />
          <div class="absolute top-3 right-3">
            <Badge variant="destructive" class="text-[10px]">
              {t("dashboard.overdue_days", { n: overdueDays })}
            </Badge>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
