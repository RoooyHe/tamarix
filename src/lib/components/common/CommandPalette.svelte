<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getProjectsContext } from "$lib/stores/projects.svelte";
  import { getTasksContext } from "$lib/stores/tasks.svelte";
  import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator
  } from "$lib/components/ui/command";

  let auth = getAuthContext();
  let projects = getProjectsContext();
  let tasks = getTasksContext();

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  // Listen for ⌘K / Ctrl+K globally
  onMount(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        open = !open;
      }
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  });

  function navigateToTask(taskRoomId: string, projectRoomId?: string) {
    open = false;
    if (projectRoomId) {
      goto(`/project/${encodeURIComponent(projectRoomId)}/task/${encodeURIComponent(taskRoomId)}`);
    } else {
      // Try to find the project for this task
      const task = tasks.tasks.find(t => t.roomId === taskRoomId);
      if (task?.projectRoomId) {
        goto(`/project/${encodeURIComponent(task.projectRoomId)}/task/${encodeURIComponent(taskRoomId)}`);
      }
    }
  }

  function navigateToProject(roomId: string) {
    open = false;
    goto(`/project/${encodeURIComponent(roomId)}`);
  }
</script>

<CommandDialog bind:open title="搜索" description="搜索任务、项目...">
  <CommandInput placeholder="搜索任务、项目..." />
  <CommandList>
    <CommandEmpty>未找到结果</CommandEmpty>

    <CommandGroup heading="任务">
      {#each tasks.tasks as task (task.roomId)}
        <CommandItem
          value={`${task.title} ${task.ticketId ?? ""}`}
          onSelect={() => navigateToTask(task.roomId, task.projectRoomId)}
        >
          <span class="flex-1 truncate">{task.title}</span>
          {#if task.ticketId}
            <span class="ml-2 text-xs text-muted-foreground font-mono">{task.ticketId}</span>
          {/if}
        </CommandItem>
      {/each}
    </CommandGroup>

    <CommandSeparator />

    <CommandGroup heading="项目">
      {#each projects.projects as project (project.roomId)}
        <CommandItem
          value={project.name}
          onSelect={() => navigateToProject(project.roomId)}
        >
          <span class="truncate">{project.name}</span>
        </CommandItem>
      {/each}
    </CommandGroup>
  </CommandList>
</CommandDialog>
