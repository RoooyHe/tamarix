/**
 * Composable hook for task selection state.
 *
 * Usage:
 *   let selection = useTaskSelection();
 *   // Use selection.selectedTaskIds, selection.toggleTaskSelect, etc.
 */
export function useTaskSelection() {
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

  function toggleSelectAllOnPage(pageIds: string[]) {
    const allSelected = pageIds.every((id) => selectedTaskIds.has(id));
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

  return {
    get selectedTaskIds() {
      return selectedTaskIds;
    },
    toggleTaskSelect,
    clearSelection,
    toggleSelectAllOnPage,
  };
}
