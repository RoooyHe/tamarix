import type { Task, TaskStatus, Priority, TaskType } from '$lib/matrix/types';
import { TASK_STATUS_ORDER, PRIORITY_ORDER } from '$lib/matrix/types';
import { searchTasks } from '$lib/matrix/search';
import { computeSortAtPosition, SORT_MAX } from '$lib/utils/sort-order';
import type { MatrixClient } from 'matrix-js-sdk';

export type SortKey = 'manual' | 'ticketId' | 'title' | 'status' | 'priority' | 'type';

/**
 * Composable hook for task filtering, sorting, and search state.
 *
 * Usage:
 *   let filters = useTaskFilters(() => tasks.getTasksByProject(projectId), () => auth.client);
 *   // Use filters.searchQuery, filters.filteredTasks, filters.sortedTasks, etc.
 */
export function useTaskFilters(
	getTasks: () => Task[],
	getClient: () => MatrixClient | undefined | null
) {
	// ── Filter state ──────────────────────────────────────────────
	let searchQuery = $state('');
	let filterPriorities = $state<Set<Priority>>(new Set());
	let filterTypes = $state<Set<TaskType>>(new Set());
	let filterAssignees = $state<Set<string>>(new Set());
	let filterTags = $state<Set<string>>(new Set());
	let showArchived = $state(false);

	// ── Sort state ────────────────────────────────────────────────
	let sortKey = $state<SortKey>('status');
	let sortDir = $state<'asc' | 'desc'>('asc');

	// ── Derived: filtered tasks ──────────────────────────────────
	let filteredTasks = $derived.by(() => {
		const projectTasks = getTasks();
		let result = projectTasks;

		// Search filter (supports structured syntax: status:done priority:high keyword)
		if (searchQuery.trim()) {
			result = searchTasks(result, searchQuery, getClient() ?? undefined);
		}

		// Priority filter
		if (filterPriorities.size > 0) {
			result = result.filter((t) => t.priority && filterPriorities.has(t.priority));
		}

		// Type filter
		if (filterTypes.size > 0) {
			result = result.filter((t) => t.type && filterTypes.has(t.type));
		}

		// Assignee filter
		if (filterAssignees.size > 0) {
			result = result.filter((t) => t.assignee && filterAssignees.has(t.assignee));
		}

		// Tags filter
		if (filterTags.size > 0) {
			result = result.filter((t) => t.tags.some((tag) => filterTags.has(tag)));
		}

		// Archive filter — hide archived by default
		if (!showArchived) {
			result = result.filter((t) => !t.archived);
		}

		return result;
	});

	// ── Derived: sorted tasks (for list view) ────────────────────
	let sortedTasks = $derived.by(() => {
		const arr = [...filteredTasks];
		const statusOrder = TASK_STATUS_ORDER;
		const priorityOrder = PRIORITY_ORDER;

		arr.sort((a, b) => {
			let cmp = 0;

			switch (sortKey) {
				case 'manual':
					cmp = (a.sortOrder ?? SORT_MAX).localeCompare(b.sortOrder ?? SORT_MAX);
					break;
				case 'ticketId':
					cmp = (a.ticketId ?? '').localeCompare(b.ticketId ?? '');
					break;
				case 'title':
					cmp = a.title.localeCompare(b.title);
					break;
				case 'status':
					cmp = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
					break;
				case 'priority': {
					const ai = a.priority ? priorityOrder.indexOf(a.priority) : 99;
					const bi = b.priority ? priorityOrder.indexOf(b.priority) : 99;
					cmp = ai - bi;
					break;
				}
				case 'type': {
					cmp = (a.type ?? '').localeCompare(b.type ?? '');
					break;
				}
			}

			return sortDir === 'asc' ? cmp : -cmp;
		});

		return arr;
	});

	// ── Actions ──────────────────────────────────────────────────

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	function togglePriorityFilter(p: Priority) {
		const next = new Set(filterPriorities);
		if (next.has(p)) next.delete(p);
		else next.add(p);
		filterPriorities = next;
	}

	function toggleTypeFilter(t: TaskType) {
		const next = new Set(filterTypes);
		if (next.has(t)) next.delete(t);
		else next.add(t);
		filterTypes = next;
	}

	function toggleAssigneeFilter(userId: string) {
		const next = new Set(filterAssignees);
		if (next.has(userId)) next.delete(userId);
		else next.add(userId);
		filterAssignees = next;
	}

	function toggleTagFilter(tag: string) {
		const next = new Set(filterTags);
		if (next.has(tag)) next.delete(tag);
		else next.add(tag);
		filterTags = next;
	}

	function clearFilters() {
		searchQuery = '';
		filterPriorities = new Set();
		filterTypes = new Set();
		filterAssignees = new Set();
		filterTags = new Set();
		showArchived = false;
		sortKey = 'status';
		sortDir = 'asc';
	}

	return {
		get searchQuery() {
			return searchQuery;
		},
		set searchQuery(v: string) {
			searchQuery = v;
		},
		get filterPriorities() {
			return filterPriorities;
		},
		set filterPriorities(v: Set<Priority>) {
			filterPriorities = v;
		},
		get filterTypes() {
			return filterTypes;
		},
		set filterTypes(v: Set<TaskType>) {
			filterTypes = v;
		},
		get filterAssignees() {
			return filterAssignees;
		},
		set filterAssignees(v: Set<string>) {
			filterAssignees = v;
		},
		get filterTags() {
			return filterTags;
		},
		set filterTags(v: Set<string>) {
			filterTags = v;
		},
		get showArchived() {
			return showArchived;
		},
		set showArchived(v: boolean) {
			showArchived = v;
		},
		get sortKey() {
			return sortKey;
		},
		set sortKey(v: SortKey) {
			sortKey = v;
		},
		get sortDir() {
			return sortDir;
		},
		set sortDir(v: 'asc' | 'desc') {
			sortDir = v;
		},
		get filteredTasks() {
			return filteredTasks;
		},
		get sortedTasks() {
			return sortedTasks;
		},
		toggleSort,
		togglePriorityFilter,
		toggleTypeFilter,
		toggleAssigneeFilter,
		toggleTagFilter,
		clearFilters
	};
}

export type TaskFilters = ReturnType<typeof useTaskFilters>;
