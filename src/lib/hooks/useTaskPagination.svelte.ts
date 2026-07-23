import type { Task } from "$lib/matrix/task-types";

/**
 * Composable hook for task list pagination state.
 *
 * Usage:
 *   let filters = useTaskFilters(...);
 *   let pagination = useTaskPagination(() => filters.sortedTasks);
 *   // Use pagination.pageSize, pagination.currentPage, pagination.paginatedTasks, etc.
 *   // Reset page when filters change:
 *   $effect(() => { filters.searchQuery; pagination.resetPage(); });
 */
export function useTaskPagination(getSortedTasks: () => Task[]) {
  let pageSize = $state(20);
  let currentPage = $state(1);

  let totalPages = $derived(Math.max(1, Math.ceil(getSortedTasks().length / pageSize)));

  let paginatedTasks = $derived(
    getSortedTasks().slice((currentPage - 1) * pageSize, currentPage * pageSize)
  );

  function resetPage() {
    currentPage = 1;
  }

  return {
    get pageSize() { return pageSize; },
    set pageSize(v: number) { pageSize = v; },
    get currentPage() { return currentPage; },
    set currentPage(v: number) { currentPage = v; },
    get totalPages() { return totalPages; },
    get paginatedTasks() { return paginatedTasks; },
    resetPage
  };
}

export type TaskPagination = ReturnType<typeof useTaskPagination>;