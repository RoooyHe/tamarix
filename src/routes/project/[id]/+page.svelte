<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getTasksContext } from "$lib/stores/tasks.svelte";
  import { getProjectsContext } from "$lib/stores/projects.svelte";
  import TaskCreateDialog from "$lib/components/task/TaskCreateDialog.svelte";
  import KanbanBoard from "$lib/components/board/KanbanBoard.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import type { TaskStatus, Priority, TaskType } from "$lib/matrix/types";
  import { t } from "$lib/i18n";
  import ImportDialog from "$lib/components/task/ImportDialog.svelte";
  import BulkActionBar from "$lib/components/task/BulkActionBar.svelte";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";
  import { exportTasksToCSV, exportTasksToJSON, downloadFile } from "$lib/utils/export";
  import { computeSortAtPosition, SORT_MAX } from "$lib/utils/sort-order";
  import { useTaskFilters } from "$lib/hooks/useTaskFilters.svelte";
  import { useTaskPagination } from "$lib/hooks/useTaskPagination.svelte";
  import { useTaskSelection } from "$lib/hooks/useTaskSelection.svelte";
  import ProjectHeader from "$lib/components/project/ProjectHeader.svelte";
  import FilterToolbar from "$lib/components/project/FilterToolbar.svelte";
  import TaskListView from "$lib/components/task/TaskListView.svelte";

  let auth = getAuthContext();
  let tasks = getTasksContext();
  let projects = getProjectsContext();
  let isMobile = new IsMobile();

  let projectId = $derived(decodeURIComponent($page.params.id ?? ""));
  let project = $derived(projects.getProjectById(projectId));

  // Dialog state
  let importOpen = $state(false);
  let createTaskOpen = $state(false);
  let searchInput: HTMLInputElement | null = $state(null);

  // View state
  let currentView = $state<"list" | "board">("list");

  // Composable hooks
  let filters = useTaskFilters(
    () => tasks.getTasksByProject(projectId),
    () => auth.client
  );
  let pagination = useTaskPagination(() => filters.sortedTasks);
  let selection = useTaskSelection();

  onMount(() => {
    if (auth.client) {
      tasks.fetchTasksFromRooms(auth.client, projectId);
    }

    const handleShortcut = (event: Event) => {
      const detail = (event as CustomEvent<{ action: string; status?: TaskStatus }>).detail;
      if (!detail) return;

      if (detail.action === "new_task") {
        createTaskOpen = true;
      } else if (detail.action === "focus_search") {
        searchInput?.focus();
      } else if (detail.action === "edit") {
        const firstSelected = [...selection.selectedTaskIds][0];
        if (firstSelected) {
          goto(`/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(firstSelected)}`);
        }
      } else if (detail.action === "set_status" && detail.status && selection.selectedTaskIds.size > 0) {
        void handleBulkStatus(detail.status);
      } else if (detail.action === "toggle_tag" && selection.selectedTaskIds.size > 0) {
        void handleShortcutTag();
      } else if (detail.action === "assign" && selection.selectedTaskIds.size > 0) {
        void handleShortcutAssign();
      } else if (detail.action === "due_date" && selection.selectedTaskIds.size > 0) {
        void handleShortcutDueDate();
      }
    };

    window.addEventListener("tamarix:shortcut", handleShortcut);
    return () => window.removeEventListener("tamarix:shortcut", handleShortcut);
  });

  let projectTasks = $derived(tasks.getTasksByProject(projectId));

  // Reset page when filters change
  $effect(() => {
    filters.searchQuery; filters.filterPriorities; filters.filterTypes; filters.filterAssignees; filters.filterTags; filters.showArchived;
    pagination.resetPage();
  });

  // Derived: available filter options
  let availableAssignees = $derived.by(() => {
    const set = new Set<string>();
    for (const t of projectTasks) {
      if (t.assignee) set.add(t.assignee);
    }
    return [...set].sort();
  });

  let availableTags = $derived.by(() => {
    const set = new Set<string>();
    for (const t of projectTasks) {
      for (const tag of t.tags) {
        set.add(tag);
      }
    }
    return [...set].sort();
  });

  // Task action handlers
  function handleTaskDrop(taskId: string, targetStatus: TaskStatus) {
    if (!auth.client) return;
    tasks.updateTaskStatus(auth.client, taskId, targetStatus, projectId);
  }

  async function handleTaskReorder(taskId: string, status: TaskStatus, newIndex: number) {
    if (!auth.client) return;
    const columnTasks = filters.filteredTasks
      .filter(task => task.status === status && task.roomId !== taskId)
      .sort((a, b) => (a.sortOrder ?? SORT_MAX).localeCompare(b.sortOrder ?? SORT_MAX));
    const orderMap = new Map(columnTasks.map(task => [task.roomId, task.sortOrder ?? SORT_MAX]));
    const nextOrder = computeSortAtPosition(columnTasks, Math.min(newIndex, columnTasks.length), orderMap);
    await tasks.updateTaskSortOrder(auth.client, taskId, nextOrder);
  }

  async function handleTableDrop(taskId: string, newIndex: number) {
    if (!auth.client) return;
    const moving = filters.sortedTasks.find(task => task.roomId === taskId);
    if (!moving) return;
    const items = filters.sortedTasks.filter(task => task.roomId !== taskId);
    const orderMap = new Map(items.map(task => [task.roomId, task.sortOrder ?? SORT_MAX]));
    const nextOrder = computeSortAtPosition(items, Math.min(newIndex, items.length), orderMap);
    await tasks.updateTaskSortOrder(auth.client, taskId, nextOrder);
    filters.sortKey = "manual";
    filters.sortDir = "asc";
  }

  async function handleCreateTask(data: { name: string; topic?: string; status: TaskStatus; priority: Priority; type: TaskType; assignee?: string; tags?: string[]; encrypted?: boolean }) {
    if (!auth.client) return;
    return await tasks.createTask(auth.client, projectId, {
      name: data.name,
      topic: data.topic,
      status: data.status,
      priority: data.priority,
      type: data.type,
      assignee: data.assignee,
      tags: data.tags,
      encrypted: data.encrypted
    });
  }

  function handleExportCSV() {
    const csv = exportTasksToCSV(filters.filteredTasks);
    downloadFile(csv, `${project?.name ?? "tasks"}.csv`, "text/csv");
  }

  function handleExportJSON() {
    const json = exportTasksToJSON(filters.filteredTasks);
    downloadFile(json, `${project?.name ?? "tasks"}.json`, "application/json");
  }

  function handleImportComplete() {
    if (auth.client) {
      tasks.fetchTasksFromRooms(auth.client, projectId);
    }
  }

  async function handleImportTask(data: { name: string; status?: TaskStatus; priority?: Priority; type?: TaskType; assignee?: string; tags?: string[] }) {
    await tasks.createTask(auth.client!, projectId, {
      name: data.name,
      status: data.status || "todo",
      priority: data.priority || "medium",
      type: data.type || "task",
      assignee: data.assignee,
      tags: data.tags
    });
  }

  async function toggleArchive(task: { roomId: string }, archived: boolean) {
    if (!auth.client) return;
    await tasks.updateTaskArchive(auth.client, task.roomId, archived);
  }

  // Bulk action handlers
  async function handleBulkStatus(status: TaskStatus) {
    if (!auth.client) return;
    await tasks.bulkUpdateStatus(auth.client, [...selection.selectedTaskIds], status, projectId);
    selection.clearSelection();
  }

  async function handleBulkPriority(priority: Priority) {
    if (!auth.client) return;
    await tasks.bulkUpdatePriority(auth.client, [...selection.selectedTaskIds], priority, projectId);
    selection.clearSelection();
  }

  async function handleBulkArchive() {
    if (!auth.client) return;
    await tasks.bulkArchive(auth.client, [...selection.selectedTaskIds], projectId);
    selection.clearSelection();
  }

  async function handleBulkTag(tag: string) {
    if (!auth.client) return;
    await tasks.bulkAddTag(auth.client, [...selection.selectedTaskIds], tag, projectId);
    selection.clearSelection();
  }

  async function handleShortcutTag() {
    if (!auth.client) return;
    const tag = window.prompt(t("shortcuts.toggle_tag"));
    if (!tag?.trim()) return;
    const normalized = tag.trim();
    await Promise.all([...selection.selectedTaskIds].map(id => {
      const task = projectTasks.find(item => item.roomId === id);
      const existing = task?.tags ?? [];
      const next = existing.includes(normalized)
        ? existing.filter(item => item !== normalized)
        : [...existing, normalized];
      return tasks.updateTaskTags(auth.client!, id, next);
    }));
  }

  async function handleShortcutAssign() {
    if (!auth.client) return;
    const userId = window.prompt(t("shortcuts.assign"));
    if (userId === null) return;
    await Promise.all([...selection.selectedTaskIds].map(id =>
      tasks.updateTaskAssignee(auth.client!, id, userId.trim() ? userId.trim() : undefined)
    ));
  }

  async function handleShortcutDueDate() {
    if (!auth.client) return;
    const dueDate = window.prompt(t("shortcuts.due_date"));
    if (!dueDate?.trim()) return;
    await Promise.all([...selection.selectedTaskIds].map(id => tasks.updateTaskDueDate(auth.client!, id, dueDate.trim())));
  }
</script>

<div class="space-y-4 pb-20 md:pb-4">
  <ProjectHeader
    {project}
    {projectId}
    isMobile={isMobile.current}
    onExportCSV={handleExportCSV}
    onExportJSON={handleExportJSON}
    onImport={() => importOpen = true}
    onCreateTask={() => createTaskOpen = true}
  />

  <ImportDialog
    bind:open={importOpen}
    client={auth.client ?? undefined}
    projectRoomId={projectId}
    onImportComplete={handleImportComplete}
    createTask={handleImportTask}
  />

  <TaskCreateDialog bind:open={createTaskOpen} onSubmit={handleCreateTask} client={auth.client ?? undefined} projectRoomId={projectId} />

  <FilterToolbar
    {filters}
    currentView={currentView}
    onViewChange={(v) => currentView = v}
    isMobile={isMobile.current}
    {availableAssignees}
    {availableTags}
    bind:searchInputRef={searchInput}
  />

  {#if tasks.isLoading}
    <div class="space-y-2">
      {#each Array(5) as _, index (index)}
        <Skeleton class="h-16 w-full" />
      {/each}
    </div>
  {:else if projectTasks.length === 0}
    <div class="rounded-lg border border-border bg-card p-12 text-center">
      <p class="text-muted-foreground">{t("task.no_tasks")}</p>
      <p class="mt-1 text-sm text-muted-foreground">{t("task.no_tasks_hint")}</p>
    </div>
  {:else if currentView === "board"}
    <KanbanBoard
      tasks={filters.filteredTasks}
      selectedTaskIds={selection.selectedTaskIds}
      onTaskClick={(t) => goto(`/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(t.roomId)}`)}
      onTaskDrop={handleTaskDrop}
      onTaskReorder={handleTaskReorder}
      onToggleSelect={selection.toggleTaskSelect}
    />
  {:else}
    <TaskListView
      tasks={projectTasks}
      sortedTasks={filters.sortedTasks}
      paginatedTasks={pagination.paginatedTasks}
      {pagination}
      selectedTaskIds={selection.selectedTaskIds}
      onToggleSelect={selection.toggleTaskSelect}
      onSelectAllOnPage={selection.toggleSelectAllOnPage}
      onArchive={toggleArchive}
      onTaskClick={(t) => goto(`/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(t.roomId)}`)}
      onTableDrop={handleTableDrop}
      client={auth.client}
      {projectId}
      isMobile={isMobile.current}
      sortKey={filters.sortKey}
      sortDir={filters.sortDir}
      onToggleSort={filters.toggleSort}
    />
  {/if}

  <BulkActionBar
    selectedCount={selection.selectedTaskIds.size}
    onClear={selection.clearSelection}
    onBulkStatus={handleBulkStatus}
    onBulkPriority={handleBulkPriority}
    onBulkArchive={handleBulkArchive}
    onBulkTag={handleBulkTag}
  />
</div>
