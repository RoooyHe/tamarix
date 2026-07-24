import { getContext, setContext } from 'svelte';
import type { MatrixClient } from 'matrix-js-sdk';
import type { Task, TaskStatus, Priority, TaskType } from '$lib/matrix/types';
import { measureSync } from '$lib/utils/performance';
import { t } from '$lib/i18n';
import { createTaskCache } from './task-cache';
import { createTaskWrites } from './task-writes';

const TASKS_CONTEXT_KEY = 'tamarix:tasks';

function createTasksState() {
	let tasks = $state<Task[]>([]);
	let isLoading = $state(false);
	let isRefreshing = $state(false);
	let error = $state<string | null>(null);
	let cacheVersion = $state(0);

	const cache = createTaskCache();
	const writes = createTaskWrites(cache);

	function emitTasks() {
		tasks = cache.getTasks();
		cacheVersion += 1;
	}

	function fetchTasksFromRooms(client: MatrixClient, projectRoomId?: string) {
		const showLoading = tasks.length === 0;
		isLoading = showLoading;
		isRefreshing = !showLoading;
		error = null;

		try {
			measureSync(
				'tasks.fetch_from_rooms',
				() => {
					cache.fetchFromRooms(client, projectRoomId);
					emitTasks();
				},
				{ projectRoomId, currentTasks: tasks.length }
			);
		} catch (e) {
			error = e instanceof Error ? e.message : t('error.load_tasks');
		} finally {
			isLoading = false;
			isRefreshing = false;
		}
	}

	function refreshTask(client: MatrixClient, roomId: string) {
		const changed = cache.refreshTask(client, roomId);
		if (changed) emitTasks();
	}

	function getTasksByProject(projectRoomId: string): Task[] {
		cacheVersion;
		return cache.getByProject(projectRoomId);
	}

	function getTaskById(taskId: string): Task | undefined {
		return cache.getById(taskId);
	}

	async function createTask(
		client: MatrixClient,
		projectRoomId: string,
		options: {
			name: string;
			topic?: string;
			status?: TaskStatus;
			priority?: Priority;
			type?: TaskType;
			assignee?: string;
			tags?: string[];
			encrypted?: boolean;
		}
	) {
		isLoading = tasks.length === 0;
		isRefreshing = tasks.length > 0;
		error = null;
		try {
			const roomId = await writes.createTask(client, projectRoomId, options);
			fetchTasksFromRooms(client, projectRoomId);
			return roomId;
		} catch (e) {
			error = e instanceof Error ? e.message : t('error.create_task');
		} finally {
			isLoading = false;
			isRefreshing = false;
		}
	}

	async function updateTaskStatus(
		client: MatrixClient,
		roomId: string,
		status: TaskStatus,
		projectRoomId?: string
	) {
		error = null;
		const result = await writes.updateTaskStatus(client, roomId, status, projectRoomId);
		if (result.error) error = result.error;
	}

	async function updateTaskPriority(client: MatrixClient, roomId: string, priority: Priority) {
		const result = await writes.updateTaskPriority(client, roomId, priority);
		if (result.error) error = result.error;
	}

	async function updateTaskType(client: MatrixClient, roomId: string, type: TaskType) {
		const result = await writes.updateTaskType(client, roomId, type);
		if (result.error) error = result.error;
	}

	async function updateTaskAssignee(
		client: MatrixClient,
		roomId: string,
		assignee: string | undefined
	) {
		const result = await writes.updateTaskAssignee(client, roomId, assignee);
		if (result.error) error = result.error;
	}

	async function updateTaskArchive(client: MatrixClient, roomId: string, archived: boolean) {
		const result = await writes.updateTaskArchive(client, roomId, archived);
		if (result.error) error = result.error;
	}

	async function updateTaskDescription(
		client: MatrixClient,
		roomId: string,
		body: string,
		formattedBody: string
	) {
		const result = await writes.updateTaskDescription(client, roomId, body, formattedBody);
		if (result.error) error = result.error;
	}

	async function updateTaskSortOrder(client: MatrixClient, roomId: string, sortOrder: string) {
		const result = await writes.updateTaskSortOrder(client, roomId, sortOrder);
		if (result.error) error = result.error;
	}

	async function updateTaskTags(client: MatrixClient, roomId: string, tags: string[]) {
		const result = await writes.updateTaskTags(client, roomId, tags);
		if (result.error) error = result.error;
	}

	async function updateTaskDueDate(client: MatrixClient, roomId: string, dueDate: string) {
		const result = await writes.updateTaskDueDate(client, roomId, dueDate);
		if (result.error) error = result.error;
	}

	async function bulkUpdateStatus(
		client: MatrixClient,
		roomIds: string[],
		status: TaskStatus,
		projectRoomId?: string
	) {
		error = null;
		const result = await writes.bulkUpdateStatus(client, roomIds, status, projectRoomId);
		if (result.error) error = result.error;
	}

	async function bulkUpdatePriority(
		client: MatrixClient,
		roomIds: string[],
		priority: Priority,
		projectRoomId?: string
	) {
		const result = await writes.bulkUpdatePriority(client, roomIds, priority, projectRoomId);
		if (result.error) error = result.error;
	}

	async function bulkArchive(client: MatrixClient, roomIds: string[], projectRoomId?: string) {
		const result = await writes.bulkArchive(client, roomIds, projectRoomId);
		if (result.error) error = result.error;
	}

	async function bulkAddTag(
		client: MatrixClient,
		roomIds: string[],
		tag: string,
		projectRoomId?: string
	) {
		const result = await writes.bulkAddTag(client, roomIds, tag, projectRoomId);
		if (result.error) error = result.error;
	}

	return {
		get tasks() {
			return tasks;
		},
		get isLoading() {
			return isLoading;
		},
		get isRefreshing() {
			return isRefreshing;
		},
		get error() {
			return error;
		},
		fetchTasksFromRooms,
		refreshTask,
		getTasksByProject,
		createTask,
		updateTaskStatus,
		updateTaskPriority,
		updateTaskType,
		updateTaskAssignee,
		updateTaskArchive,
		updateTaskDescription,
		updateTaskSortOrder,
		updateTaskTags,
		updateTaskDueDate,
		getTaskById,
		bulkUpdateStatus,
		bulkUpdatePriority,
		bulkArchive,
		bulkAddTag
	};
}

export type TasksStore = ReturnType<typeof createTasksState>;

export function setTasksContext() {
	const tasks = createTasksState();
	setContext(TASKS_CONTEXT_KEY, tasks);
	return tasks;
}

export function getTasksContext(): TasksStore {
	return getContext<TasksStore>(TASKS_CONTEXT_KEY);
}
