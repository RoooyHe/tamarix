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
  import { Bug, Sparkles, ListTodo, Wrench, Target, Filter, ArrowUpDown, LayoutGrid, List, Archive, MoreHorizontal, ArchiveRestore } from "@lucide/svelte";
  import type { LucideProps } from "@lucide/svelte";
  import type { Component } from "svelte";
  import type { Task, TaskStatus, Priority, TaskType } from "$lib/matrix/types";
  import { TASK_STATUS_LABELS, PRIORITY_LABELS, TASK_TYPE_LABELS, TASK_STATUS_ORDER, PRIORITY_ORDER } from "$lib/matrix/types";

  type IconComponent = Component<LucideProps>;

  let auth = getAuthContext();
  let tasks = getTasksContext();
  let projects = getProjectsContext();

  let projectId = $derived(decodeURIComponent($page.params.id ?? ""));
  let project = $derived(projects.getProjectById(projectId));

  // View state
  let currentView = $state<"list" | "board">("list");

  // Sort state
  type SortKey = "ticketId" | "title" | "status" | "priority" | "type";
  let sortKey = $state<SortKey>("status");
  let sortDir = $state<"asc" | "desc">("asc");

  // Filter state
  let searchQuery = $state("");
  let filterPriorities = $state<Set<Priority>>(new Set());
  let filterTypes = $state<Set<TaskType>>(new Set());
  let filterAssignees = $state<Set<string>>(new Set());
  let filterTags = $state<Set<string>>(new Set());
  let showArchived = $state(false);

  onMount(() => {
    if (auth.client) {
      tasks.fetchTasksFromRooms(auth.client, projectId);
    }
  });

  let projectTasks = $derived(tasks.tasks);

  // Filtered tasks
  let filteredTasks = $derived.by(() => {
    let result = projectTasks;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.ticketId ?? "").toLowerCase().includes(q)
      );
    }

    // Priority filter
    if (filterPriorities.size > 0) {
      result = result.filter(t => t.priority && filterPriorities.has(t.priority));
    }

    // Type filter
    if (filterTypes.size > 0) {
      result = result.filter(t => t.type && filterTypes.has(t.type));
    }

    // Assignee filter
    if (filterAssignees.size > 0) {
      result = result.filter(t => t.assignee && filterAssignees.has(t.assignee));
    }

    // Tags filter
    if (filterTags.size > 0) {
      result = result.filter(t => t.tags.some(tag => filterTags.has(tag)));
    }

    // Archive filter — hide archived by default
    if (!showArchived) {
      result = result.filter(t => !t.archived);
    }

    return result;
  });

  // Sorted tasks (for list view)
  let sortedTasks = $derived.by(() => {
    const arr = [...filteredTasks];

    const statusOrder = TASK_STATUS_ORDER;
    const priorityOrder = PRIORITY_ORDER;

    arr.sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case "ticketId":
          cmp = (a.ticketId ?? "").localeCompare(b.ticketId ?? "");
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "status":
          cmp = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          break;
        case "priority": {
          const ai = a.priority ? priorityOrder.indexOf(a.priority) : 99;
          const bi = b.priority ? priorityOrder.indexOf(b.priority) : 99;
          cmp = ai - bi;
          break;
        }
        case "type": {
          cmp = (a.type ?? "").localeCompare(b.type ?? "");
          break;
        }
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return arr;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = "asc";
    }
  }

  function handleTaskDrop(taskId: string, targetStatus: TaskStatus) {
    if (!auth.client) return;
    tasks.updateTaskStatus(auth.client, taskId, targetStatus, projectId);
  }

  async function handleCreateTask(data: { name: string; topic?: string; status: TaskStatus; priority: Priority; type: TaskType }) {
    if (!auth.client) return;
    await tasks.createTask(auth.client, projectId, {
      name: data.name,
      topic: data.topic,
      status: data.status,
      priority: data.priority,
      type: data.type
    });
  }

  function togglePriorityFilter(p: Priority) {
    const next = new Set(filterPriorities);
    if (next.has(p)) {
      next.delete(p);
    } else {
      next.add(p);
    }
    filterPriorities = next;
  }

  function toggleTypeFilter(t: TaskType) {
    const next = new Set(filterTypes);
    if (next.has(t)) {
      next.delete(t);
    } else {
      next.add(t);
    }
    filterTypes = next;
  }

  function toggleAssigneeFilter(a: string) {
    const next = new Set(filterAssignees);
    if (next.has(a)) {
      next.delete(a);
    } else {
      next.add(a);
    }
    filterAssignees = next;
  }

  function toggleTagFilter(tag: string) {
    const next = new Set(filterTags);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    filterTags = next;
  }

  async function toggleArchive(task: Task, archived: boolean) {
    if (!auth.client) return;
    const { setArchive } = await import("$lib/matrix/state-events");
    await setArchive(auth.client, task.roomId, archived);
    tasks.fetchTasksFromRooms(auth.client, projectId);
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

  let hasActiveFilters = $derived(filterPriorities.size > 0 || filterTypes.size > 0 || filterAssignees.size > 0 || filterTags.size > 0 || showArchived || searchQuery.trim() !== "");

  function clearFilters() {
    searchQuery = "";
    filterPriorities = new Set();
    filterTypes = new Set();
    filterAssignees = new Set();
    filterTags = new Set();
    showArchived = false;
  }

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
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-foreground">{project?.name ?? "项目"}</h1>
      {#if project?.description}
        <p class="text-sm text-muted-foreground">{project.description}</p>
      {/if}
    </div>
    <TaskCreateDialog onSubmit={handleCreateTask} />
  </div>

  <!-- Toolbar: view tabs + search + filter -->
  <div class="flex items-center gap-3">
    <Tabs bind:value={currentView}>
      <TabsList>
        <TabsTrigger value="list">
          <List class="mr-1 h-4 w-4" />
          列表
        </TabsTrigger>
        <TabsTrigger value="board">
          <LayoutGrid class="mr-1 h-4 w-4" />
          看板
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <div class="flex-1"></div>

    <!-- Search -->
    <Input
      type="search"
      placeholder="搜索任务..."
      bind:value={searchQuery}
      class="w-56"
    />

    <!-- Filter popover -->
    <Popover>
      <PopoverTrigger>
        <Button variant="outline" size="sm" class={hasActiveFilters ? "border-primary" : ""}>
          <Filter class="mr-1 h-4 w-4" />
          过滤
          {#if hasActiveFilters}
            <Badge variant="secondary" class="ml-1 h-5 px-1 text-[10px]">
              {filterPriorities.size + filterTypes.size + filterAssignees.size + filterTags.size}
            </Badge>
          {/if}
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-64" align="end">
        <div class="space-y-4">
          <div>
            <h4 class="mb-2 text-sm font-medium">优先级</h4>
            <div class="space-y-2">
              {#each PRIORITY_ORDER as p}
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filterPriorities.has(p)}
                    onCheckedChange={() => togglePriorityFilter(p)}
                  />
                  <Badge variant="outline" class={priorityColorClass[p] ?? ""}>
                    {PRIORITY_LABELS[p]}
                  </Badge>
                </label>
              {/each}
            </div>
          </div>

          <div>
            <h4 class="mb-2 text-sm font-medium">类型</h4>
            <div class="space-y-2">
              {#each (["bug", "feature", "task", "improvement", "epic"] as TaskType[]) as t}
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filterTypes.has(t)}
                    onCheckedChange={() => toggleTypeFilter(t)}
                  />
                  {TASK_TYPE_LABELS[t]}
                </label>
              {/each}
            </div>
          </div>

          {#if availableAssignees.length > 0}
            <div>
              <h4 class="mb-2 text-sm font-medium">指派人</h4>
              <div class="space-y-2 max-h-32 overflow-y-auto">
                {#each availableAssignees as a}
                  <label class="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={filterAssignees.has(a)}
                      onCheckedChange={() => toggleAssigneeFilter(a)}
                    />
                    <span class="text-xs text-muted-foreground">{formatSender(a)}</span>
                  </label>
                {/each}
              </div>
            </div>
          {/if}

          {#if availableTags.length > 0}
            <div>
              <h4 class="mb-2 text-sm font-medium">标签</h4>
              <div class="flex flex-wrap gap-2">
                {#each availableTags as tag}
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={filterTags.has(tag)}
                      onCheckedChange={() => toggleTagFilter(tag)}
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
                checked={showArchived}
                onCheckedChange={() => showArchived = !showArchived}
              />
              <span class="text-sm">显示已归档</span>
            </label>
          </div>

          {#if hasActiveFilters}
            <Button variant="ghost" size="sm" class="w-full" onclick={clearFilters}>
              清除过滤
            </Button>
          {/if}
        </div>
      </PopoverContent>
    </Popover>
  </div>

  <!-- Content -->
  {#if tasks.isLoading}
    <div class="space-y-2">
      {#each Array(5) as _}
        <Skeleton class="h-16 w-full" />
      {/each}
    </div>
  {:else if projectTasks.length === 0}
    <div class="rounded-lg border border-border bg-card p-12 text-center">
      <p class="text-muted-foreground">暂无任务</p>
      <p class="mt-1 text-sm text-muted-foreground">点击「新建任务」创建第一个任务</p>
    </div>
  {:else if currentView === "board"}
    <!-- Kanban view -->
    <KanbanBoard
      tasks={filteredTasks}
      onTaskClick={(t) => goto(`/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(t.roomId)}`)}
      onTaskDrop={handleTaskDrop}
    />
  {:else}
    <!-- Data Table view -->
    <div class="rounded-lg border border-border overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-muted/50">
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => toggleSort("ticketId")}>
                编号
                <ArrowUpDown class="h-3 w-3" />
              </button>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => toggleSort("title")}>
                标题
                <ArrowUpDown class="h-3 w-3" />
              </button>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => toggleSort("status")}>
                状态
                <ArrowUpDown class="h-3 w-3" />
              </button>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => toggleSort("priority")}>
                优先级
                <ArrowUpDown class="h-3 w-3" />
              </button>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => toggleSort("type")}>
                类型
                <ArrowUpDown class="h-3 w-3" />
              </button>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">指派人</th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">归档</th>
            <th class="px-3 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {#each sortedTasks as task (task.roomId)}
            <tr
              class="border-b border-border transition-colors hover:bg-accent/50 {task.archived ? 'opacity-60' : ''}"
              onclick={() => goto(`/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(task.roomId)}`)}
              role="button"
              tabindex={0}
            >
              <td class="px-3 py-2">
                {#if task.ticketId}
                  <span class="font-mono text-xs text-muted-foreground">{task.ticketId}</span>
                {/if}
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-1.5">
                  {#if task.type && typeIcon[task.type]}
                    {@const Icon = typeIcon[task.type]}
                    <Icon class="h-4 w-4 shrink-0 text-muted-foreground" />
                  {/if}
                  <span class="font-medium text-foreground">{task.title}</span>
                </div>
              </td>
              <td class="px-3 py-2">
                <Badge variant={statusVariant[task.status] ?? "outline"} class="text-[10px]">
                  {TASK_STATUS_LABELS[task.status]}
                </Badge>
              </td>
              <td class="px-3 py-2">
                {#if task.priority}
                  <Badge variant="outline" class="text-[10px] {priorityColorClass[task.priority] ?? ''}">
                    {PRIORITY_LABELS[task.priority]}
                  </Badge>
                {/if}
              </td>
              <td class="px-3 py-2">
                {#if task.type}
                  <span class="text-xs text-muted-foreground">{TASK_TYPE_LABELS[task.type]}</span>
                {/if}
              </td>
              <td class="px-3 py-2">
                {#if task.assignee}
                  <span class="text-xs text-muted-foreground">{formatSender(task.assignee)}</span>
                {/if}
              </td>
              <td class="px-3 py-2">
                {#if task.archived}
                  <Badge variant="outline" class="text-[10px] bg-muted/50">
                    <Archive class="mr-0.5 h-3 w-3" />
                    已归档
                  </Badge>
                {/if}
              </td>
              <td class="px-3 py-2" onclick={(e) => e.stopPropagation()}>
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
                        取消归档
                      </DropdownMenuItem>
                    {:else}
                      <DropdownMenuItem onclick={() => toggleArchive(task, true)}>
                        <Archive class="mr-2 h-4 w-4" />
                        归档
                      </DropdownMenuItem>
                    {/if}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
