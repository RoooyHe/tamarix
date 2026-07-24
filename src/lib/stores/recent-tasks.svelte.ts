import { getContext, setContext } from 'svelte';

const RECENT_TASKS_CONTEXT_KEY = 'tamarix:recent_tasks';
const STORAGE_KEY = 'tamarix:recent_tasks';
const MAX_ENTRIES = 20;

export interface RecentTaskEntry {
	taskId: string;
	taskTitle: string;
	projectRoomId: string;
	visitedAt: number;
}

function loadFromStorage(): RecentTaskEntry[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return JSON.parse(raw);
	} catch {
		/* ignore */
	}
	return [];
}

function saveToStorage(entries: RecentTaskEntry[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
	} catch {
		/* ignore */
	}
}

function createRecentTasksState() {
	let recentTasks = $state<RecentTaskEntry[]>(loadFromStorage());

	function addRecentTask(taskId: string, taskTitle: string, projectRoomId: string) {
		// Remove existing entry with same taskId
		const filtered = recentTasks.filter((t) => t.taskId !== taskId);
		recentTasks = [{ taskId, taskTitle, projectRoomId, visitedAt: Date.now() }, ...filtered].slice(
			0,
			MAX_ENTRIES
		);
		saveToStorage(recentTasks);
	}

	function getRecentTasks(limit = 5): RecentTaskEntry[] {
		return recentTasks.slice(0, limit);
	}

	function clearRecentTasks() {
		recentTasks = [];
		saveToStorage([]);
	}

	return {
		get recentTasks() {
			return recentTasks;
		},
		addRecentTask,
		getRecentTasks,
		clearRecentTasks
	};
}

export type RecentTasksStore = ReturnType<typeof createRecentTasksState>;

export function setRecentTasksContext() {
	const recentTasks = createRecentTasksState();
	setContext(RECENT_TASKS_CONTEXT_KEY, recentTasks);
	return recentTasks;
}

export function getRecentTasksContext(): RecentTasksStore {
	return getContext<RecentTasksStore>(RECENT_TASKS_CONTEXT_KEY);
}
