<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getTasksContext } from "$lib/stores/tasks.svelte";
  import { searchTasks, searchViaAS, type AsSearchResult } from "$lib/matrix/search";
  import { getUiContext } from "$lib/stores/ui.svelte";
  import { getAsStatusContext } from "$lib/stores/as-status.svelte";
  import TaskCard from "$lib/components/task/TaskCard.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import type { Task, TaskStatus, Priority, TaskType } from "$lib/matrix/task-types";
  import { TASK_STATUS_ORDER, PRIORITY_ORDER } from "$lib/matrix/task-types";
  import { getStatusLabel, getPriorityLabel, getTypeLabel } from "$lib/matrix/labels";
  import { t } from "$lib/i18n";
  import { Search, X, Database, Server } from "@lucide/svelte";

  let auth = getAuthContext();
  let tasks = getTasksContext();
  let ui = getUiContext();
  let asStatus = getAsStatusContext();

  let searchQuery = $state("");
  let debouncedSearchQuery = $state("");
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let asSearching = $state(false);
  let asResults = $state<AsSearchResult[]>([]);
  let asResultCount = $state(0);
  let asSearchRun = 0;

  const SEARCH_RESULT_LIMIT = 100;

  onMount(() => {
    if (auth.client) {
      tasks.fetchTasksFromRooms(auth.client);
    }
  });

  // Effective search source: if user chose AS but AS is unavailable, fall back to local
  let effectiveSource = $derived(
    ui.searchSource === "as" && asStatus.asAvailable ? "as" : "local"
  );

  $effect(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedSearchQuery = searchQuery;
    }, 250);
    return () => clearTimeout(debounceTimer);
  });

  // Local search results (always computed for fallback)
  let localResults = $derived(searchTasks(tasks.tasks, debouncedSearchQuery, auth.client ?? undefined));

  $effect(() => {
    const run = ++asSearchRun;
    if (effectiveSource !== "as" || !debouncedSearchQuery.trim()) {
      asResults = [];
      asResultCount = 0;
      asSearching = false;
      return;
    }
    asSearching = true;
    searchViaAS(debouncedSearchQuery, asStatus.asUrl, { limit: SEARCH_RESULT_LIMIT })
      .then(res => {
        if (run !== asSearchRun) return;
        if (res) {
          asResults = res.results;
          asResultCount = res.count;
        } else {
          asResults = [];
          asResultCount = 0;
        }
      })
      .catch(() => {
        if (run !== asSearchRun) return;
        asResults = [];
        asResultCount = 0;
      })
      .finally(() => {
        if (run !== asSearchRun) return;
        asSearching = false;
      });
  });

  // Map AS results to Task-like objects for TaskCard rendering
  let asTaskResults = $derived(
    asResults.map(r => ({
      roomId: r.room_id,
      projectRoomId: r.project_room_id,
      title: r.title ?? "",
      status: r.status as TaskStatus,
      priority: r.priority as Priority | undefined,
      type: r.task_type as TaskType | undefined,
      assignee: r.assignee ?? undefined,
      dueDate: r.due_date ?? undefined,
      ticketId: r.ticket_id ?? undefined,
      encrypted: !!r.encrypted,
      archived: !!r.archived,
      description: undefined as string | undefined,
      tags: [] as string[],
      createdAt: 0,
      updatedAt: 0,
    })) as Task[]
  );

  // Current results based on effective source
  let results = $derived(effectiveSource === "as" ? asTaskResults : localResults);

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

  let visibleResults = $derived(filteredResults.slice(0, SEARCH_RESULT_LIMIT));

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
    debouncedSearchQuery = "";
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

  <!-- Search source toggle -->
  <div class="flex items-center gap-2">
    <Button
      variant={effectiveSource === "local" ? "default" : "outline"}
      size="sm"
      onclick={() => ui.searchSource = "local"}
    >
      <Database class="mr-1 h-3.5 w-3.5" />
      {t("as.search_local")}
    </Button>
    <Button
      variant={effectiveSource === "as" ? "default" : "outline"}
      size="sm"
      onclick={() => ui.searchSource = "as"}
      disabled={!asStatus.asAvailable}
    >
      <Server class="mr-1 h-3.5 w-3.5" />
      {t("as.search_as")}
      {#if ui.searchSource === "as" && !asStatus.asAvailable}
        <span class="ml-1 text-xs opacity-60">({t("as.status_offline")})</span>
      {/if}
    </Button>
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

  <!-- AS search loading indicator -->
  {#if effectiveSource === "as" && asSearching}
    <div class="text-xs text-muted-foreground animate-pulse">
      {t("as.search_as")}...
    </div>
  {/if}

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
        <span class="text-xs text-muted-foreground">
          {Math.min(filteredResults.length, SEARCH_RESULT_LIMIT)} / {filteredResults.length} {t("search.tasks").toLowerCase()}
        </span>
      </div>
    {/if}
  </div>

  <!-- Results -->
  {#if visibleResults.length > 0}
    <div class="space-y-2">
      {#each visibleResults as task (task.roomId)}
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
