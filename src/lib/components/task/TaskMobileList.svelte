<script lang="ts">
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Badge } from "$lib/components/ui/badge";
  import { Archive, MoreHorizontal, ArchiveRestore } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { Task } from "$lib/matrix/task-types";
import { getStatusLabel, getPriorityLabel, getTypeLabel } from "$lib/matrix/labels";
  import {  } from "$lib/matrix/task-types";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu";
  import { typeIcon, statusVariant, priorityColorClass, formatSender } from "./task-list-helpers";

  interface Props {
    tasks: Task[];
    selectedTaskIds: Set<string>;
    onToggleSelect: (taskId: string) => void;
    onArchive: (task: Task, archived: boolean) => void;
    onTaskClick: (task: Task) => void;
  }

  let { tasks, selectedTaskIds, onToggleSelect, onArchive, onTaskClick }: Props = $props();
</script>

<div class="space-y-2 md:hidden">
  {#each tasks as task (task.roomId)}
    <div
      class="rounded-lg border border-border bg-card p-3 cursor-pointer {task.archived ? 'opacity-60' : ''} {selectedTaskIds.has(task.roomId) ? 'ring-2 ring-primary' : ''}"
      onclick={() => onTaskClick(task)}
      role="button"
      tabindex={0}
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <button type="button" class="flex min-w-[44px] min-h-[44px] items-center justify-center" onclick={(e) => { e.stopPropagation(); onToggleSelect(task.roomId); }}>
            <Checkbox checked={selectedTaskIds.has(task.roomId)} />
          </button>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              {#if task.type && typeIcon[task.type]}
                {@const Icon = typeIcon[task.type]}
                <Icon class="h-4 w-4 shrink-0 text-muted-foreground" />
              {/if}
              {#if task.ticketId}
                <span class="font-mono text-[10px] text-muted-foreground">{task.ticketId}</span>
              {/if}
              <span class="font-medium text-foreground truncate">{task.title}</span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge variant={statusVariant[task.status] ?? "outline"} class="text-[10px]">
                {getStatusLabel(task.status)}
              </Badge>
              {#if task.priority}
                <Badge variant="outline" class="text-[10px] {priorityColorClass[task.priority] ?? ''}">
                  {getPriorityLabel(task.priority)}
                </Badge>
              {/if}
              {#if task.assignee}
                <span class="text-[10px] text-muted-foreground">{formatSender(task.assignee)}</span>
              {/if}
              {#if task.archived}
                <Badge variant="outline" class="text-[10px] bg-muted/50">
                  <Archive class="mr-0.5 h-3 w-3" />
                  {t("common.archived")}
                </Badge>
              {/if}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <button class="p-1 rounded hover:bg-accent" onclick={(e) => e.stopPropagation()}>
              <MoreHorizontal class="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {#if task.archived}
              <DropdownMenuItem onclick={() => onArchive(task, false)}>
                <ArchiveRestore class="mr-2 h-4 w-4" />
                {t("common.unarchive")}
              </DropdownMenuItem>
            {:else}
              <DropdownMenuItem onclick={() => onArchive(task, true)}>
                <Archive class="mr-2 h-4 w-4" />
                {t("common.archive")}
              </DropdownMenuItem>
            {/if}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  {/each}
</div>
