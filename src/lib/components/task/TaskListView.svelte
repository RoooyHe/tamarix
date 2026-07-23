<script lang="ts">
  import type { Task, CustomFieldDefinition, CustomFieldValue } from "$lib/matrix/task-types";
  import type { MatrixClient } from "matrix-js-sdk";
  import type { SortKey } from "$lib/hooks/useTaskFilters.svelte";
  import { getCustomFieldDefinitions, getCustomFieldValues } from "$lib/matrix/custom-fields";
  import TaskMobileList from "./TaskMobileList.svelte";
  import TaskDesktopTable from "./TaskDesktopTable.svelte";
  import TaskPagination from "./TaskPagination.svelte";

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
    sortKey,
    sortDir,
    onToggleSort,
  }: Props = $props();

  // Custom field state
  let customFieldDefs = $state<Map<string, CustomFieldDefinition>>(new Map());
  let customFieldValuesByTask = $state<Map<string, Map<string, CustomFieldValue>>>(new Map());
  let visibleCustomFields = $state<Set<string>>(new Set());

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
</script>

<div class="space-y-3">
  <TaskMobileList
    tasks={paginatedTasks}
    {selectedTaskIds}
    {onToggleSelect}
    {onArchive}
    {onTaskClick}
  />

  <TaskDesktopTable
    tasks={paginatedTasks}
    {selectedTaskIds}
    {onToggleSelect}
    {onSelectAllOnPage}
    {onArchive}
    {onTaskClick}
    {onTableDrop}
    {pagination}
    {sortKey}
    {sortDir}
    {onToggleSort}
    {customFieldDefs}
    {customFieldValuesByTask}
    {visibleCustomFields}
  />

  <TaskPagination totalCount={sortedTasks.length} {pagination} />
</div>
