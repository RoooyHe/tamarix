<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getTasksContext } from "$lib/stores/tasks.svelte";
  import { searchTasks } from "$lib/matrix/search";
  import TaskCard from "$lib/components/task/TaskCard.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import type { Task, TaskStatus, Priority, TaskType } from "$lib/matrix/types";
  import { getStatusLabel, getPriorityLabel, getTypeLabel, TASK_STATUS_ORDER, PRIORITY_ORDER } from "$lib/matrix/types";
  import { t } from "$lib/i18n";
  import { Search, X } from "@lucide/svelte";

  let auth = getAuthContext();
  let tasks = getTasksContext();

  let searchQuery = $state("");
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    if (auth.client) {
      tasks.fetchTasksFromRooms(auth.client);
    }
  });

  // Search results with debounce
  let results = $derived(searchTasks(tasks.tasks, searchQuery));

  // Metadata filter chips
  let filterStatus = $state<Set<TaskStatus>>(new Set());
  let filterPriority = $state<Set<Priority>>(new Set());
  let filterType = $state<Set<TaskType>>(new Set());

  // Combined filtered results
  let filteredResults = $derived.by(() => {
    let r = results;
    if (filterStatus.size > 0) r = r.filter(t => filterStatus.has(t.status));
    if (filterPriority.size > 0) r = r.filter(t => t.priority && filterPriority.has(t.priority));
    if (filterType.size > 0) r = r.filter(t => t.type && filterType.has(t.type));
    return r;
  });

  function toggleStatusFilter(s: TaskStatus) {
    const next = new Set(filterStatus);
    if (next.has(s)) next.delete(s); else next.add(s);
    filterStatus = next;
  }

  function togglePriorityFilter(p: Priority) {
    const next = new Set(filterPriority);
    if (next.has(p)) next.delete(p); else next.add(p);
    filterPriority = next;
  }

  function toggleTypeFilter(tp: TaskType) {
    const next = new Set(filterType);
    if (next.has(tp)) next.delete(tp); else next.add(tp);
    filterType = next;
  }

  function clearAllFilters() {
    searchQuery = "";
    filterStatus = new Set();
    filterPriority = new Set();
    filterType = new Set();
  }

  let hasActiveFilters = $derived(
    searchQuery.trim() !== "" ||
    filterStatus.size > 0 ||
    filterPriority.size > 0 ||
    filterType.size > 0
  );

  function handleTaskClick(task: Task) {
    if (task.projectRoomId) {
      goto(`/project/${task.projectRoomId}/task/${task.roomId}`);
    }
  }

  const taskTypes: TaskType[] = ["bug", "feature", "task", "improvement", "epic"];
</script>

<div class="space-y-4">
  <!-- Search header -->
  <div>
    <h1 class="text-2xl font-bold text-foreground">{t("search.title")}</h1>
  </div>

  <!-- Search input -->
  <div class="relative">
    <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      class="pl-10 pr-10"
      placeholder={t("search.placeholder")}
      bind:value={searchQuery}
    />
    {#if searchQuery}
      <button
        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onclick={() => searchQuery = ""}
      >
        <X class="h-4 w-4" />
      </button>
    {/if}
  </div>
  <p class="text-xs text-muted-foreground">{t("search.syntax_hint")}</p>

  <!-- Metadata filter chips -->
  <div class="space-y-2">
    <!-- Status chips -->
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-xs text-muted-foreground mr-1">{t("task.status")}:</span>
      {#each TASK_STATUS_ORDER as s}
        <button
          class="rounded-full border px-2.5 py-0.5 text-xs transition-colors {filterStatus.has(s) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'}"
          onclick={() => toggleStatusFilter(s)}
        >
          {getStatusLabel(s)}
        </button>
      {/each}
    </div>

    <!-- Priority chips -->
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-xs text-muted-foreground mr-1">{t("task.priority")}:</span>
      {#each PRIORITY_ORDER as p}
        <button
          class="rounded-full border px-2.5 py-0.5 text-xs transition-colors {filterPriority.has(p) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'}"
          onclick={() => togglePriorityFilter(p)}
        >
          {getPriorityLabel(p)}
        </button>
      {/each}
    </div>

    <!-- Type chips -->
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="text-xs text-muted-foreground mr-1">{t("task.type")}:</span>
      {#each taskTypes as tp}
        <button
          class="rounded-full border px-2.5 py-0.5 text-xs transition-colors {filterType.has(tp) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'}"
          onclick={() => toggleTypeFilter(tp)}
        >
          {getTypeLabel(tp)}
        </button>
      {/each}
    </div>

    {#if hasActiveFilters}
      <div class="flex items-center gap-2 pt-1">
        <Button variant="ghost" size="sm" onclick={clearAllFilters}>
          {t("common.clear_filter")}
        </Button>
        <span class="text-xs text-muted-foreground">{filteredResults.length} {t("search.tasks").toLowerCase()}</span>
      </div>
    {/if}
  </div>

  <!-- Results -->
  {#if filteredResults.length > 0}
    <div class="space-y-2">
      {#each filteredResults as task (task.roomId)}
        <TaskCard {task} onClick={handleTaskClick} />
      {/each}
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center py-16">
      <Search class="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p class="text-muted-foreground">
        {hasActiveFilters ? t("search.empty") : t("search.search_tasks")}
      </p>
    </div>
  {/if}
</div>
