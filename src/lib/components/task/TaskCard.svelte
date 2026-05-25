<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Avatar, AvatarFallback, AvatarImage } from "$lib/components/ui/avatar";
  import type { Task } from "$lib/matrix/types";
  import { getStatusLabel, getPriorityLabel } from "$lib/matrix/types";
  import { Bug, Sparkles, ListTodo, Wrench, Target, Calendar, Zap } from "@lucide/svelte";
  import type { LucideProps } from "@lucide/svelte";
  import type { Component } from "svelte";

  type IconComponent = Component<LucideProps>;

  interface Props {
    task: Task;
    onClick?: (task: Task) => void;
  }

  let { task, onClick }: Props = $props();

  const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    todo: "outline",
    in_progress: "default",
    review: "secondary",
    done: "secondary",
    closed: "outline"
  };

  const priorityColorClass: Record<string, string> = {
    critical: "bg-red-500/20 text-red-500 border-red-500/30",
    high: "bg-orange-500/20 text-orange-500 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    low: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30"
  };

  const typeIcon: Record<string, IconComponent> = {
    bug: Bug,
    feature: Sparkles,
    task: ListTodo,
    improvement: Wrench,
    epic: Target
  };
</script>

<button
  class="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"
  onclick={() => onClick?.(task)}
>
  <!-- Status indicator -->
  <div class="mt-1">
    <Badge variant={statusVariant[task.status] ?? "outline"} class="text-[10px]">
      {getStatusLabel(task.status)}
    </Badge>
  </div>

  <!-- Main content -->
  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2">
      {#if task.ticketId}
        <span class="font-mono text-xs text-muted-foreground">{task.ticketId}</span>
      {/if}
      {#if task.type && typeIcon[task.type]}
        {@const Ic = typeIcon[task.type]}
        <Ic class="h-3.5 w-3.5" />
      {/if}
    </div>
    <h3 class="mt-0.5 text-sm font-medium text-foreground truncate">{task.title}</h3>
    {#if task.description}
      <p class="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
    {/if}

    <!-- Tags and meta -->
    <div class="mt-2 flex flex-wrap items-center gap-1.5">
      {#if task.priority}
        <Badge variant="outline" class={priorityColorClass[task.priority] ?? ""}>
          {getPriorityLabel(task.priority)}
        </Badge>
      {/if}
      {#each task.tags as tag}
        <Badge variant="outline" class="text-[10px]">{tag}</Badge>
      {/each}
      {#if task.dueDate}
        <span class="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Calendar class="h-3 w-3" />
          {new Date(task.dueDate).toLocaleDateString()}
        </span>
      {/if}
      {#if task.estimate}
        <span class="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Zap class="h-3 w-3" />
          {task.estimate.points}{task.estimate.unit === "story_points" ? "SP" : task.estimate.unit === "hours" ? "h" : "d"}
        </span>
      {/if}
    </div>
  </div>

  <!-- Assignee avatar -->
  {#if task.assignee}
    <div class="mt-1">
      <Avatar class="h-6 w-6 text-[9px]">
        <AvatarFallback>
          {task.assignee.split(":")[0].replace("@", "").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </div>
  {/if}
</button>
