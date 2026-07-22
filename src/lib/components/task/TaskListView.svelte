<script lang="ts">
  import { goto } from "$app/navigation";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Popover, PopoverContent, PopoverTrigger } from "$lib/components/ui/popover";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
  import { Bug, Sparkles, ListTodo, Wrench, Target, Archive, MoreHorizontal, ArchiveRestore, ChevronUp, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight } from "@lucide/svelte";
  import type { LucideProps } from "@lucide/svelte";
  import type { Component } from "svelte";
  import type { Task, TaskStatus, Priority, TaskType, CustomFieldDefinition, CustomFieldValue } from "$lib/matrix/types";
  import { getStatusLabel, getPriorityLabel, getTypeLabel } from "$lib/matrix/types";
  import { t } from "$lib/i18n";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu";
  import { getCustomFieldDefinitions, getCustomFieldValues } from "$lib/matrix/custom-fields";
  import type { MatrixClient } from "matrix-js-sdk";
  import type { SortKey } from "$lib/hooks/useTaskFilters.svelte";

  type IconComponent = Component<LucideProps>;

  interface Pagination {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    paginatedTasks: Task[];
    resetPage: () => void;
  }

  interface Props {
    tasks: Task[];
    sortedTasks: Task[];
    paginatedTasks: Task[];
    pagination: Pagination;
    selectedTaskIds: Set<string>;
    onToggleSelect: (taskId: string) => void;
    onSelectAllOnPage: (pageIds: string[]) => void;
    onArchive: (task: Task, archived: boolean) => void;
    onTaskClick: (task: Task) => void;
    onTableDrop: (taskId: string, newIndex: number) => void;
    client: MatrixClient | undefined | null;
    projectId: string;
    isMobile: boolean;
    sortKey: SortKey;
    sortDir: "asc" | "desc";
    onToggleSort: (key: SortKey) => void;
  }

  let {
    tasks,
    sortedTasks,
    paginatedTasks,
    pagination,
    selectedTaskIds,
    onToggleSelect,
    onSelectAllOnPage,
    onArchive,
    onTaskClick,
    onTableDrop,
    client,
    projectId,
    isMobile,
    sortKey,
    sortDir,
    onToggleSort,
  }: Props = $props();

  // Custom field state — loaded internally
  let customFieldDefs = $state<Map<string, CustomFieldDefinition>>(new Map());
  let customFieldValuesByTask = $state<Map<string, Map<string, CustomFieldValue>>>(new Map());
  let visibleCustomFields = $state<Set<string>>(new Set());

  let tableDragTaskId = $state<string | null>(null);

  $effect(() => {
    if (!client || !projectId) return;

    const projectRoom = client.getRoom(projectId);
    if (projectRoom) {
      const defs = getCustomFieldDefinitions(projectRoom);
      customFieldDefs = defs;
      if (visibleCustomFields.size === 0 && defs.size > 0) {
        visibleCustomFields = new Set(defs.keys());
      }
    }

    const values = new Map<string, Map<string, CustomFieldValue>>();
    for (const task of tasks) {
      const room = client.getRoom(task.roomId);
      if (room) values.set(task.roomId, getCustomFieldValues(room));
    }
    customFieldValuesByTask = values;
  });

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

  function handleDragStart(taskId: string) {
    tableDragTaskId = taskId;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent, index: number) {
    event.preventDefault();
    if (tableDragTaskId) {
      onTableDrop(tableDragTaskId, (pagination.currentPage - 1) * pagination.pageSize + index);
      tableDragTaskId = null;
    }
  }

  function formatSender(userId: string): string {
    const match = userId.match(/^@([^:]+):/);
    return match ? match[1] : userId;
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

  function sortIcon(key: SortKey) {
    if (sortKey === key) {
      return sortDir === "asc" ? ChevronUp : ChevronDown;
    }
    return ArrowUpDown;
  }
</script>

<div class="space-y-3">
  <!-- Mobile card list -->
  <div class="space-y-2 md:hidden">
    {#each paginatedTasks as task (task.roomId)}
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

  <!-- Desktop table -->
  <div class="rounded-lg border border-border overflow-hidden hidden md:block">
    <Table>
      <TableHeader>
        <TableRow class="bg-muted/50 hover:bg-muted/50">
          <TableHead class="px-2 py-2 w-10">
            <Checkbox
              checked={paginatedTasks.length > 0 && paginatedTasks.every(t => selectedTaskIds.has(t.roomId))}
              onCheckedChange={() => onSelectAllOnPage(paginatedTasks.map(t => t.roomId))}
            />
          </TableHead>
          <TableHead class="px-3 py-2">
            <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => onToggleSort("ticketId")}>
              {t("list.ticket_id")}
              {#if sortKey === "ticketId"}
                {#if sortDir === "asc"}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
              {:else}
                <ArrowUpDown class="h-3 w-3 opacity-40" />
              {/if}
            </button>
          </TableHead>
          <TableHead class="px-3 py-2">
            <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => onToggleSort("title")}>
              {t("list.title")}
              {#if sortKey === "title"}
                {#if sortDir === "asc"}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
              {:else}
                <ArrowUpDown class="h-3 w-3 opacity-40" />
              {/if}
            </button>
          </TableHead>
          <TableHead class="px-3 py-2">
            <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => onToggleSort("status")}>
              {t("list.status")}
              {#if sortKey === "status"}
                {#if sortDir === "asc"}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
              {:else}
                <ArrowUpDown class="h-3 w-3 opacity-40" />
              {/if}
            </button>
          </TableHead>
          <TableHead class="px-3 py-2">
            <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => onToggleSort("priority")}>
              {t("list.priority")}
              {#if sortKey === "priority"}
                {#if sortDir === "asc"}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
              {:else}
                <ArrowUpDown class="h-3 w-3 opacity-40" />
              {/if}
            </button>
          </TableHead>
          <TableHead class="px-3 py-2">
            <button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => onToggleSort("type")}>
              {t("list.type")}
              {#if sortKey === "type"}
                {#if sortDir === "asc"}<ChevronUp class="h-3 w-3" />{:else}<ChevronDown class="h-3 w-3" />{/if}
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
        {#each paginatedTasks as task, index (task.roomId)}
          <TableRow
            class="cursor-pointer {task.archived ? 'opacity-60' : ''} {selectedTaskIds.has(task.roomId) ? 'bg-primary/5' : ''}"
            onclick={() => onTaskClick(task)}
            draggable="true"
            ondragstart={() => handleDragStart(task.roomId)}
            ondragover={handleDragOver}
            ondrop={(e) => handleDrop(e, index)}
            role="button"
            tabindex={0}
          >
            <TableCell class="px-2 py-2" onclick={(e) => { e.stopPropagation(); onToggleSelect(task.roomId); }}>
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
            </TableCell>
          </TableRow>
        {/each}
      </TableBody>
    </Table>
  </div>

  <!-- Pagination -->
  {#if sortedTasks.length > 0}
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
         <span>{t("pagination.total", { n: sortedTasks.length })}</span>
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
