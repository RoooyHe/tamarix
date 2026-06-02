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
  import { t } from "$lib/i18n";

  let auth = getAuthContext();
  let projects = getProjectsContext();
  let tasks = getTasksContext();
  const COMMAND_TASK_LIMIT = 50;

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();
  let commandTasks = $derived(open ? tasks.tasks.slice(0, COMMAND_TASK_LIMIT) : []);

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

<CommandDialog bind:open title={t("search.title")} description={t("search.placeholder")}>
  <CommandInput placeholder={t("search.placeholder")} />
  <CommandList>
    <CommandEmpty>{t("common.no_results")}</CommandEmpty>

    <CommandGroup heading={t("search.tasks")}>
      {#each commandTasks as task (task.roomId)}
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

    <CommandGroup heading={t("search.projects")}>
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
