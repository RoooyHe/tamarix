<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getTasksContext } from "$lib/stores/tasks.svelte";
  import { getProjectsContext } from "$lib/stores/projects.svelte";
  import TaskCreateDialog from "$lib/components/task/TaskCreateDialog.svelte";
  import KanbanBoard from "$lib/components/board/KanbanBoard.svelte";
  import { Tabs, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Input } from "$lib/components/ui/input";
  import { Popover, PopoverContent, PopoverTrigger } from "$lib/components/ui/popover";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "$lib/components/ui/dropdown-menu";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
  import { Bug, Sparkles, ListTodo, Wrench, Target, Filter, ArrowUpDown, ChevronUp, ChevronDown, LayoutGrid, List, Archive, MoreHorizontal, ArchiveRestore, ChevronLeft, ChevronRight, Settings, Download, Upload, BarChart3, Milestone } from "@lucide/svelte";
  import type { LucideProps } from "@lucide/svelte";
  import type { Component } from "svelte";
  import type { Task, TaskStatus, Priority, TaskType, CustomFieldDefinition, CustomFieldValue } from "$lib/matrix/types";
  import { getStatusLabel, getPriorityLabel, getTypeLabel, PRIORITY_ORDER } from "$lib/matrix/types";
  import { t } from "$lib/i18n";
  import BulkActionBar from "$lib/components/task/BulkActionBar.svelte";
  import ImportDialog from "$lib/components/task/ImportDialog.svelte";
  import { IsMobile } from "$lib/hooks/is-mobile.svelte";
  import { exportTasksToCSV, exportTasksToJSON, downloadFile } from "$lib/utils/export";
  import { getCustomFieldDefinitions, getCustomFieldValues } from "$lib/matrix/state-events";
  import { computeSortAtPosition, SORT_MAX } from "$lib/utils/sort-order";
  import { useTaskFilters } from "$lib/hooks/useTaskFilters.svelte";
  import { useTaskPagination } from "$lib/hooks/useTaskPagination.svelte";

  type IconComponent = Component<LucideProps>;

  let auth = getAuthContext();
  let tasks = getTasksContext();
  let projects = getProjectsContext();
  let isMobile = new IsMobile();

  let projectId = $derived(decodeURIComponent($page.params.id ?? ""));
  let project = $derived(projects.getProjectById(projectId));

  // Import dialog state
  let importOpen = $state(false);
  let createTaskOpen = $state(false);
  let searchInput: HTMLInputElement | null = $state(null);

  // View state
  let currentView = $state<"list" | "board">("list");

  let tableDragTaskId = $state<string | null>(null);
  let customFieldDefs = $state<Map<string, CustomFieldDefinition>>(new Map());
  let customFieldValuesByTask = $state<Map<string, Map<string, CustomFieldValue>>>(new Map());
  let visibleCustomFields = $state<Set<string>>(new Set());

  // Filter + sort + pagination hooks
  let filters = useTaskFilters(
    () => tasks.getTasksByProject(projectId),
    () => auth.client
  );
  let pagination = useTaskPagination(() => filters.sortedTasks);

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
        const firstSelected = [...selectedTaskIds][0];
        if (firstSelected) {
          goto(`/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(firstSelected)}`);
        }
      } else if (detail.action === "set_status" && detail.status && selectedTaskIds.size > 0) {
        void handleBulkStatus(detail.status);
      } else if (detail.action === "toggle_tag" && selectedTaskIds.size > 0) {
        void handleShortcutTag();
      } else if (detail.action === "assign" && selectedTaskIds.size > 0) {
        void handleShortcutAssign();
      } else if (detail.action === "due_date" && selectedTaskIds.size > 0) {
        void handleShortcutDueDate();
      }
    };

    window.addEventListener("tamarix:shortcut", handleShortcut);
    return () => window.removeEventListener("tamarix:shortcut", handleShortcut);
  });

  let projectTasks = $derived(tasks.getTasksByProject(projectId));

  $effect(() => {
    if (!auth.client || !projectId) return;

    const projectRoom = auth.client.getRoom(projectId);
    if (projectRoom) {
      const defs = getCustomFieldDefinitions(projectRoom);
      customFieldDefs = defs;
      if (visibleCustomFields.size === 0 && defs.size > 0) {
        visibleCustomFields = new Set(defs.keys());
      }
    }

    const values = new Map<string, Map<string, CustomFieldValue>>();
    for (const task of projectTasks) {
      const room = auth.client.getRoom(task.roomId);
      if (room) values.set(task.roomId, getCustomFieldValues(room));
    }
    customFieldValuesByTask = values;
  });

  // Reset page when filters change
  $effect(() => {
    filters.searchQuery; filters.filterPriorities; filters.filterTypes; filters.filterAssignees; filters.filterTags; filters.showArchived;
    pagination.resetPage();
  });

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

  async function handleTableDrop(newIndex: number) {
    if (!auth.client || !tableDragTaskId) return;
    const moving = filters.sortedTasks.find(task => task.roomId === tableDragTaskId);
    if (!moving) return;
    const items = filters.sortedTasks.filter(task => task.roomId !== tableDragTaskId);
    const orderMap = new Map(items.map(task => [task.roomId, task.sortOrder ?? SORT_MAX]));
    const nextOrder = computeSortAtPosition(items, Math.min(newIndex, items.length), orderMap);
    await tasks.updateTaskSortOrder(auth.client, tableDragTaskId, nextOrder);
    tableDragTaskId = null;
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

  function toggleCustomColumn(fieldName: string) {
    const next = new Set(visibleCustomFields);
    if (next.has(fieldName)) {
      next.delete(fieldName);
    } else {
      next.add(fieldName);
    }
    visibleCustomFields = next;
  }

  function getCustomFieldDisplayValue(taskId: string, fieldName: string): string {
    const value = customFieldValuesByTask.get(taskId)?.get(fieldName)?.value;
    return value === undefined || value === null ? "" : String(value);
  }

  async function toggleArchive(task: Task, archived: boolean) {
    if (!auth.client) return;
    await tasks.updateTaskArchive(auth.client, task.roomId, archived);
  }

  // Extract unique assignees and tags from current tasks for filter options
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

  let hasActiveFilters = $derived(filters.filterPriorities.size > 0 || filters.filterTypes.size > 0 || filters.filterAssignees.size > 0 || filters.filterTags.size > 0 || filters.showArchived || filters.searchQuery.trim() !== "");

  const typeIcon: Record<string, IconComponent> = {
    bug: Bug,
    feature: Sparkles,
    task: ListTodo,
    improvement: Wrench,
    epic: Target
  };

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

  function formatSender(userId: string): string {
    const match = userId.match(/^@([^:]+):/);
    return match ? match[1] : userId;
  }

  // --- Bulk selection ---
  let selectedTaskIds = $state<Set<string>>(new Set());

  function toggleTaskSelect(taskId: string) {
    const next = new Set(selectedTaskIds);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
    selectedTaskIds = next;
  }

  function clearSelection() {
    selectedTaskIds = new Set();
  }

  function toggleSelectAllOnPage() {
    const pageIds = pagination.paginatedTasks.map(t => t.roomId);
    const allSelected = pageIds.every(id => selectedTaskIds.has(id));
    if (allSelected) {
      const next = new Set(selectedTaskIds);
      for (const id of pageIds) next.delete(id);
      selectedTaskIds = next;
    } else {
      const next = new Set(selectedTaskIds);
      for (const id of pageIds) next.add(id);
      selectedTaskIds = next;
    }
  }

  async function handleBulkStatus(status: TaskStatus) {
    if (!auth.client) return;
    await tasks.bulkUpdateStatus(auth.client, [...selectedTaskIds], status, projectId);
    clearSelection();
  }

  async function handleBulkPriority(priority: Priority) {
    if (!auth.client) return;
    await tasks.bulkUpdatePriority(auth.client, [...selectedTaskIds], priority, projectId);
    clearSelection();
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

  async function handleBulkArchive() {
    if (!auth.client) return;
    await tasks.bulkArchive(auth.client, [...selectedTaskIds], projectId);
    clearSelection();
  }

  async function handleBulkTag(tag: string) {
    if (!auth.client) return;
    await tasks.bulkAddTag(auth.client, [...selectedTaskIds], tag, projectId);
    clearSelection();
  }

  async function handleShortcutTag() {
    if (!auth.client) return;
    const tag = window.prompt(t("shortcuts.toggle_tag"));
    if (!tag?.trim()) return;
    const normalized = tag.trim();
    await Promise.all([...selectedTaskIds].map(id => {
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
    await Promise.all([...selectedTaskIds].map(id =>
      tasks.updateTaskAssignee(auth.client!, id, userId.trim() ? userId.trim() : undefined)
    ));
  }

  async function handleShortcutDueDate() {
    if (!auth.client) return;
    const dueDate = window.prompt(t("shortcuts.due_date"));
    if (!dueDate?.trim()) return;
    await Promise.all([...selectedTaskIds].map(id => tasks.updateTaskDueDate(auth.client!, id, dueDate.trim())));
  }
</script>

<div class="space-y-4 pb-20 md:pb-4">
  <!-- Header -->
  <div class="flex items-center justify-between {isMobile.current ? 'flex-col gap-2' : ''}">
    <div>
      <h1 class="{isMobile.current ? 'text-lg' : 'text-2xl'} font-bold text-foreground">{project?.name ?? t("breadcrumb.projects")}</h1>
      {#if project?.description}
        <p class="text-sm text-muted-foreground">{project.description}</p>
      {/if}
    </div>
    <div class="flex items-center gap-2 {isMobile.current ? 'w-full' : ''}">
      <Button
        variant="ghost"
        size="sm"
        onclick={() => goto(`/project/${encodeURIComponent(projectId)}/versions`)}
        title={t("version.title")}
      >
        <Milestone class="mr-1 h-4 w-4" />
        {t("version.title")}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onclick={() => goto(`/project/${encodeURIComponent(projectId)}/reports`)}
        title={t("reports.title")}
      >
        <BarChart3 class="mr-1 h-4 w-4" />
        {t("reports.title")}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="outline" size="sm">
            <Download class="mr-1 h-4 w-4" />
            {t("export.title")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onclick={handleExportCSV}>
            <Download class="mr-2 h-4 w-4" />
            {t("export.csv")}
          </DropdownMenuItem>
          <DropdownMenuItem onclick={handleExportJSON}>
            <Download class="mr-2 h-4 w-4" />
            {t("export.json")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onclick={() => importOpen = true}>
            <Upload class="mr-2 h-4 w-4" />
            {t("import.title")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        size="sm"
        onclick={() => goto(`/project/${encodeURIComponent(projectId)}/settings`)}
      >
        <Settings class="mr-1 h-4 w-4" />
        {t("project.settings")}
      </Button>
      <TaskCreateDialog bind:open={createTaskOpen} onSubmit={handleCreateTask} client={auth.client ?? undefined} projectRoomId={projectId} />
    </div>
  </div>

  <ImportDialog
    bind:open={importOpen}
    client={auth.client ?? undefined}
    projectRoomId={projectId}
    onImportComplete={handleImportComplete}
    createTask={handleImportTask}
  />

  <!-- Toolbar: view tabs + search + filter -->
  <div class="flex items-center gap-3 {isMobile.current ? 'flex-wrap' : ''}">
    <Tabs bind:value={currentView}>
      <TabsList>
        <TabsTrigger value="list">
          <List class="mr-1 h-4 w-4" />
          {t("list.view")}
        </TabsTrigger>
        <TabsTrigger value="board">
          <LayoutGrid class="mr-1 h-4 w-4" />
          {t("list.board")}
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <div class="flex-1"></div>

    <!-- Search -->
    <Input
      bind:ref={searchInput}
      type="search"
      placeholder={t("search.search_tasks")}
      bind:value={filters.searchQuery}
      class={isMobile.current ? "w-full" : "w-56"}
    />

    <!-- Filter popover -->
    <Popover>
      <PopoverTrigger>
        <Button variant="outline" size="sm" class={hasActiveFilters ? "border-primary" : ""}>
          <Filter class="mr-1 h-4 w-4" />
          {t("common.filter")}
          {#if hasActiveFilters}
            <Badge variant="secondary" class="ml-1 h-5 px-1 text-[10px]">
              {filters.filterPriorities.size + filters.filterTypes.size + filters.filterAssignees.size + filters.filterTags.size}
            </Badge>
          {/if}
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-64" align="end">
        <div class="space-y-4">
          <div>
            <h4 class="mb-2 text-sm font-medium">{t("task.priority")}</h4>
            <div class="space-y-2">
              {#each PRIORITY_ORDER as p (p)}
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filters.filterPriorities.has(p)}
                    onCheckedChange={() => filters.togglePriorityFilter(p)}
                  />
                  <Badge variant="outline" class={priorityColorClass[p] ?? ""}>
                    {getPriorityLabel(p)}
                  </Badge>
                </label>
              {/each}
            </div>
          </div>

          <div>
            <h4 class="mb-2 text-sm font-medium">{t("task.type")}</h4>
            <div class="space-y-2">
              {#each (["bug", "feature", "task", "improvement", "epic"] as TaskType[]) as t (t)}
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filters.filterTypes.has(t)}
                    onCheckedChange={() => filters.toggleTypeFilter(t)}
                  />
                  {getTypeLabel(t)}
                </label>
              {/each}
            </div>
          </div>

          {#if availableAssignees.length > 0}
            <div>
              <h4 class="mb-2 text-sm font-medium">{t("task.assignee")}</h4>
              <div class="space-y-2 max-h-32 overflow-y-auto">
                {#each availableAssignees as a (a)}
                  <label class="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={filters.filterAssignees.has(a)}
                      onCheckedChange={() => filters.toggleAssigneeFilter(a)}
                    />
                    <span class="text-xs text-muted-foreground">{formatSender(a)}</span>
                  </label>
                {/each}
              </div>
            </div>
          {/if}

          {#if availableTags.length > 0}
            <div>
              <h4 class="mb-2 text-sm font-medium">{t("task.tags")}</h4>
              <div class="flex flex-wrap gap-2">
                {#each availableTags as tag (tag)}
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={filters.filterTags.has(tag)}
                      onCheckedChange={() => filters.toggleTagFilter(tag)}
                    />
                    <Badge variant="outline" class="text-[10px]">{tag}</Badge>
                  </label>
                {/each}
              </div>
            </div>
          {/if}

          <div class="border-t border-border pt-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.showArchived}
                onCheckedChange={() => filters.showArchived = !filters.showArchived}
              />
              <span class="text-sm">{t("list.show_archived")}</span>
            </label>
          </div>

          {#if hasActiveFilters}
            <Button variant="ghost" size="sm" class="w-full" onclick={filters.clearFilters}>
              {t("common.clear_filter")}
            </Button>
          {/if}
        </div>
      </PopoverContent>
    </Popover>

    {#if customFieldDefs.size > 0 && currentView === "list"}
      <Popover>
        <PopoverTrigger>
          <Button variant="outline" size="sm">
            {t("custom_field.title")}
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-56" align="end">
          <div class="space-y-2">
            {#each [...customFieldDefs.entries()] as [fieldName, definition] (fieldName)}
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={visibleCustomFields.has(fieldName)}
                  onCheckedChange={() => toggleCustomColumn(fieldName)}
                />
                <span>{definition.label}</span>
              </label>
            {/each}
          </div>
        </PopoverContent>
      </Popover>
    {/if}
  </div>

  <!-- Content -->
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
    <!-- Kanban view -->
    <KanbanBoard
      tasks={filters.filteredTasks}
      {selectedTaskIds}
      onTaskClick={(t) => goto(`/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(t.roomId)}`)}
      onTaskDrop={handleTaskDrop}
      onTaskReorder={handleTaskReorder}
      onToggleSelect={toggleTaskSelect}
    />
  {:else}
    <!-- Data Table view -->
    <div class="space-y-3">
      <!-- Mobile card list -->
      <div class="space-y-2 md:hidden">
        {#each pagination.paginatedTasks as task (task.roomId)}
          <div
            class="rounded-lg border border-border bg-card p-3 cursor-pointer {task.archived ? 'opacity-60' : ''} {selectedTaskIds.has(task.roomId) ? 'ring-2 ring-primary' : ''}"
            onclick={() => goto(`/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(task.roomId)}`)}
            role="button"
            tabindex={0}
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <button type="button" class="flex min-w-[44px] min-h-[44px] items-center justify-center" onclick={(e) => { e.stopPropagation(); toggleTaskSelect(task.roomId); }}>
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
                    <DropdownMenuItem onclick={() => toggleArchive(task, false)}>
                      <ArchiveRestore class="mr-2 h-4 w-4" />
                      {t("common.unarchive")}
                    </DropdownMenuItem>
                  {:else}
                    <DropdownMenuItem onclick={() => toggleArchive(task, true)}>
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

      <!-- Desktop table -->
      <div class="rounded-lg border border-border overflow-hidden hidden md:block">
        <Table>
          <TableHeader>
            <TableRow class="bg-muted/50 hover:bg-muted/50">
              <TableHead class="px-2 py-2 w-10">
                <Checkbox
                  checked={pagination.paginatedTasks.length > 0 && pagination.paginatedTasks.every(t => selectedTaskIds.has(t.roomId))}
                  onCheckedChange={toggleSelectAllOnPage}
                />
              </TableHead>
              <TableHead class="px-3 py-2">
                <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => filters.toggleSort("ticketId")}>
                  {t("list.ticket_id")}
                  {#if filters.sortKey === "ticketId"}
                    {#if filters.sortDir === "asc"}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
                  {:else}
                    <ArrowUpDown class="h-3 w-3 opacity-40" />
                  {/if}
                </button>
              </TableHead>
              <TableHead class="px-3 py-2">
                <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => filters.toggleSort("title")}>
                  {t("list.title")}
                  {#if filters.sortKey === "title"}
                    {#if filters.sortDir === "asc"}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
                  {:else}
                    <ArrowUpDown class="h-3 w-3 opacity-40" />
                  {/if}
                </button>
              </TableHead>
              <TableHead class="px-3 py-2">
                <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => filters.toggleSort("status")}>
                  {t("list.status")}
                  {#if filters.sortKey === "status"}
                    {#if filters.sortDir === "asc"}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
                  {:else}
                    <ArrowUpDown class="h-3 w-3 opacity-40" />
                  {/if}
                </button>
              </TableHead>
              <TableHead class="px-3 py-2">
                <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => filters.toggleSort("priority")}>
                  {t("list.priority")}
                  {#if filters.sortKey === "priority"}
                    {#if filters.sortDir === "asc"}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
                  {:else}
                    <ArrowUpDown class="h-3 w-3 opacity-40" />
                  {/if}
                </button>
              </TableHead>
              <TableHead class="px-3 py-2">
                <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => filters.toggleSort("type")}>
                  {t("list.type")}
                  {#if filters.sortKey === "type"}
                    {#if filters.sortDir === "asc"}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
                  {:else}
                    <ArrowUpDown class="h-3 w-3 opacity-40" />
                  {/if}
                </button>
              </TableHead>
              <TableHead class="px-3 py-2">{t("list.assignee")}</TableHead>
              {#each [...customFieldDefs.entries()].filter(([fieldName]) => visibleCustomFields.has(fieldName)) as [fieldName, definition] (fieldName)}
                <TableHead class="px-3 py-2">{definition.label}</TableHead>
              {/each}
              <TableHead class="px-3 py-2">{t("list.archive")}</TableHead>
              <TableHead class="px-3 py-2 w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each pagination.paginatedTasks as task, index (task.roomId)}
              <TableRow
                class="cursor-pointer {task.archived ? 'opacity-60' : ''} {selectedTaskIds.has(task.roomId) ? 'bg-primary/5' : ''}"
                onclick={() => goto(`/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(task.roomId)}`)}
                draggable="true"
                ondragstart={() => { tableDragTaskId = task.roomId; }}
                ondragover={(event) => { event.preventDefault(); }}
                ondrop={(event) => { event.preventDefault(); void handleTableDrop((pagination.currentPage - 1) * pagination.pageSize + index); }}
                role="button"
                tabindex={0}
              >
                <TableCell class="px-2 py-2" onclick={(e) => { e.stopPropagation(); toggleTaskSelect(task.roomId); }}>
                  <Checkbox checked={selectedTaskIds.has(task.roomId)} />
                </TableCell>
                <TableCell class="px-3 py-2">
                  {#if task.ticketId}
                    <span class="font-mono text-xs text-muted-foreground">{task.ticketId}</span>
                  {/if}
                </TableCell>
                <TableCell class="px-3 py-2">
                  <div class="flex items-center gap-1.5">
                    {#if task.type && typeIcon[task.type]}
                      {@const Icon = typeIcon[task.type]}
                      <Icon class="h-4 w-4 shrink-0 text-muted-foreground" />
                    {/if}
                    <span class="font-medium text-foreground">{task.title}</span>
                  </div>
                </TableCell>
                <TableCell class="px-3 py-2">
                  <Badge variant={statusVariant[task.status] ?? "outline"} class="text-[10px]">
                    {getStatusLabel(task.status)}
                  </Badge>
                </TableCell>
                <TableCell class="px-3 py-2">
                  {#if task.priority}
                    <Badge variant="outline" class="text-[10px] {priorityColorClass[task.priority] ?? ''}">
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  {/if}
                </TableCell>
                <TableCell class="px-3 py-2">
                  {#if task.type}
                    <span class="text-xs text-muted-foreground">{getTypeLabel(task.type)}</span>
                  {/if}
                </TableCell>
                <TableCell class="px-3 py-2">
                  {#if task.assignee}
                    <span class="text-xs text-muted-foreground">{formatSender(task.assignee)}</span>
                  {/if}
                </TableCell>
                {#each [...customFieldDefs.keys()].filter(fieldName => visibleCustomFields.has(fieldName)) as fieldName (fieldName)}
                  <TableCell class="px-3 py-2">
                    <span class="text-xs text-muted-foreground">{getCustomFieldDisplayValue(task.roomId, fieldName)}</span>
                  </TableCell>
                {/each}
                <TableCell class="px-3 py-2">
                  {#if task.archived}
                    <Badge variant="outline" class="text-[10px] bg-muted/50">
                      <Archive class="mr-0.5 h-3 w-3" />
                      {t("common.archived")}
                    </Badge>
                  {/if}
                </TableCell>
                <TableCell class="px-3 py-2" onclick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <button class="p-1 rounded hover:bg-accent" onclick={(e) => e.stopPropagation()}>
                        <MoreHorizontal class="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {#if task.archived}
                        <DropdownMenuItem onclick={() => toggleArchive(task, false)}>
                          <ArchiveRestore class="mr-2 h-4 w-4" />
                           {t("common.unarchive")}
                        </DropdownMenuItem>
                      {:else}
                        <DropdownMenuItem onclick={() => toggleArchive(task, true)}>
                          <Archive class="mr-2 h-4 w-4" />
                           {t("common.archive")}
                        </DropdownMenuItem>
                      {/if}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>

      <!-- Pagination -->
      {#if filters.sortedTasks.length > 0}
        <div class="flex items-center justify-between px-1 flex-wrap gap-2">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
             <span>{t("pagination.per_page")}</span>
            <select
              class="rounded border border-border bg-background px-2 py-1 text-sm"
              bind:value={pagination.pageSize}
              onchange={() => { pagination.currentPage = 1; }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
             <span>{t("pagination.total", { n: filters.sortedTasks.length })}</span>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.currentPage <= 1}
              onclick={() => pagination.currentPage--}
            >
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <span class="text-sm text-muted-foreground">
              {pagination.currentPage} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.currentPage >= pagination.totalPages}
              onclick={() => pagination.currentPage++}
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Bulk Action Bar -->
  <BulkActionBar
    selectedCount={selectedTaskIds.size}
    onClear={clearSelection}
    onBulkStatus={handleBulkStatus}
    onBulkPriority={handleBulkPriority}
    onBulkArchive={handleBulkArchive}
    onBulkTag={handleBulkTag}
  />
</div>
