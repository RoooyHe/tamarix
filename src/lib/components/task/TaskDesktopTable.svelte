<script lang="ts">
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Badge } from "$lib/components/ui/badge";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
  import { Archive, MoreHorizontal, ArchiveRestore, ChevronUp, ChevronDown, ArrowUpDown } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { Task, CustomFieldDefinition, CustomFieldValue } from "$lib/matrix/task-types";
import { getStatusLabel, getPriorityLabel, getTypeLabel } from "$lib/matrix/labels";
  import {  } from "$lib/matrix/task-types";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu";
  import { typeIcon, statusVariant, priorityColorClass, formatSender } from "./task-list-helpers";
  import type { SortKey } from "$lib/hooks/useTaskFilters.svelte";

  interface Pagination {
    currentPage: number;
    pageSize: number;
    totalPages: number;
  }

  interface Props {
    tasks: Task[];
    selectedTaskIds: Set<string>;
    onToggleSelect: (taskId: string) => void;
    onSelectAllOnPage: (pageIds: string[]) => void;
    onArchive: (task: Task, archived: boolean) => void;
    onTaskClick: (task: Task) => void;
    onTableDrop: (taskId: string, newIndex: number) => void;
    pagination: Pagination;
    sortKey: SortKey;
    sortDir: "asc" | "desc";
    onToggleSort: (key: SortKey) => void;
    customFieldDefs: Map<string, CustomFieldDefinition>;
    customFieldValuesByTask: Map<string, Map<string, CustomFieldValue>>;
    visibleCustomFields: Set<string>;
  }

  let {
    tasks,
    selectedTaskIds,
    onToggleSelect,
    onSelectAllOnPage,
    onArchive,
    onTaskClick,
    onTableDrop,
    pagination,
    sortKey,
    sortDir,
    onToggleSort,
    customFieldDefs,
    customFieldValuesByTask,
    visibleCustomFields,
  }: Props = $props();

  let dragTaskId = $state<string | null>(null);

  function getDisplayValue(taskId: string, fieldName: string): string {
    const value = customFieldValuesByTask.get(taskId)?.get(fieldName)?.value;
    return value === undefined || value === null ? "" : String(value);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent, index: number) {
    event.preventDefault();
    if (dragTaskId) {
      onTableDrop(dragTaskId, (pagination.currentPage - 1) * pagination.pageSize + index);
      dragTaskId = null;
    }
  }
</script>

<div class="rounded-lg border border-border overflow-hidden hidden md:block">
  <Table>
    <TableHeader>
      <TableRow class="bg-muted/50 hover:bg-muted/50">
        <TableHead class="px-2 py-2 w-10">
          <Checkbox
            checked={tasks.length > 0 && tasks.every(t => selectedTaskIds.has(t.roomId))}
            onCheckedChange={() => onSelectAllOnPage(tasks.map(t => t.roomId))}
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
      {#each tasks as task, index (task.roomId)}
        <TableRow
          class="cursor-pointer {task.archived ? 'opacity-60' : ''} {selectedTaskIds.has(task.roomId) ? 'bg-primary/5' : ''}"
          onclick={() => onTaskClick(task)}
          draggable="true"
          ondragstart={() => { dragTaskId = task.roomId; }}
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
              <span class="text-xs text-muted-foreground">{getDisplayValue(task.roomId, fieldName)}</span>
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
