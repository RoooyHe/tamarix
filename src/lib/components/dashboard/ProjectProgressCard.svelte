<script lang="ts">
  import { t } from "$lib/i18n";
  import type { Task, Project } from "$lib/matrix/task-types";
  import { Progress } from "$lib/components/ui/progress";
  import { FolderKanban } from "@lucide/svelte";

  interface Props {
    projects: Project[];
    tasks: Task[];
    onProjectClick: (roomId: string) => void;
  }

  let { projects, tasks, onProjectClick }: Props = $props();

  interface ProjectProgress {
    project: Project;
    total: number;
    completed: number;
    percent: number;
  }

  let projectProgress = $derived(
    projects.map(project => {
      const projectTasks = tasks.filter(t => t.projectRoomId === project.roomId);
      const total = projectTasks.length;
      const completed = projectTasks.filter(t => t.status === "done" || t.status === "closed").length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { project, total, completed, percent } satisfies ProjectProgress;
    })
  );
</script>

{#if projectProgress.length > 0}
  <div>
    <h2 class="mb-3 text-lg font-semibold text-foreground flex items-center gap-2">
      <FolderKanban class="h-5 w-5 text-muted-foreground" />
      {t("dashboard.project_progress")}
    </h2>
    <div class="space-y-3">
      {#each projectProgress as pp (pp.project.roomId)}
        <button
          type="button"
          class="flex items-center gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer hover:bg-accent/50 transition-colors w-full text-left"
          onclick={() => onProjectClick(pp.project.roomId)}
        >
          <FolderKanban class="h-4 w-4 text-muted-foreground shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{pp.project.name}</div>
            <div class="flex items-center gap-2 mt-1">
              <Progress value={pp.percent} class="h-1.5 flex-1" />
              <span class="text-xs text-muted-foreground shrink-0">{pp.percent}%</span>
            </div>
          </div>
          <span class="text-xs text-muted-foreground shrink-0">{pp.completed}/{pp.total}</span>
        </button>
      {/each}
    </div>
  </div>
{/if}
