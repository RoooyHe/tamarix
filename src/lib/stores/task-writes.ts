import type { MatrixClient } from 'matrix-js-sdk';
import type { Task, TaskStatus, Priority, TaskType } from '$lib/matrix/types';
import { getStatusLabel } from '$lib/matrix/types';
import { canTransition } from '$lib/matrix/workflow';
import { getApproval, getApprovalConfig } from '$lib/matrix/approvals';
import { patchTask, bulkPatch, createTask as repoCreateTask } from '$lib/matrix/task-repository';
import { t } from '$lib/i18n';
import type { TaskCache } from './task-cache';

export function createTaskWrites(cache: TaskCache) {
	function applyLocalPatch(patch: Partial<Task> | null, roomId: string, previous?: Task): boolean {
		if (patch === null) {
			if (previous) {
				cache.upsert(previous);
			} else {
				cache.remove(roomId);
			}
			return true;
		}

		const current = cache.getByRoomId(roomId);
		if (!current) return false;

		cache.upsert({
			...current,
			...patch,
			updatedAt: Date.now()
		});
		return true;
	}

	function isApprovalBlocked(
		client: MatrixClient,
		roomId: string,
		from: TaskStatus,
		to: TaskStatus,
		projectRoomId?: string
	): boolean {
		if (!projectRoomId) return false;
		if (!['todo', 'in_progress'].includes(from)) return false;
		if (!['review', 'done'].includes(to)) return false;

		const projectRoom = client.getRoom(projectRoomId);
		if (!projectRoom) return false;
		const config = getApprovalConfig(projectRoom);
		if (!config.enabled) return false;

		const taskRoom = client.getRoom(roomId);
		if (!taskRoom) return true;
		return getApproval(taskRoom)?.status !== 'approved';
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
	): Promise<string | undefined> {
		return await repoCreateTask(client, projectRoomId, options);
	}

	async function updateTaskStatus(
		client: MatrixClient,
		roomId: string,
		status: TaskStatus,
		projectRoomId?: string
	): Promise<{ error?: string }> {
		const currentTask = cache.getByRoomId(roomId);
		if (currentTask && !canTransition(currentTask.status, status)) {
			return {
				error: t('error.invalid_transition', {
					from: getStatusLabel(currentTask.status),
					to: getStatusLabel(status)
				})
			};
		}
		if (
			currentTask &&
			isApprovalBlocked(client, roomId, currentTask.status, status, projectRoomId)
		) {
			return { error: t('error.approval_required') };
		}

		const previous = cache.getByRoomId(roomId);
		const ok = await patchTask(client, roomId, { status }, (patch) =>
			applyLocalPatch(patch, roomId, previous)
		);
		return ok ? {} : { error: t('error.update_status') };
	}

	async function updateTaskPriority(client: MatrixClient, roomId: string, priority: Priority) {
		const previous = cache.getByRoomId(roomId);
		const ok = await patchTask(client, roomId, { priority }, (patch) =>
			applyLocalPatch(patch, roomId, previous)
		);
		return ok ? {} : { error: t('error.update_status') };
	}

	async function updateTaskType(client: MatrixClient, roomId: string, type: TaskType) {
		const previous = cache.getByRoomId(roomId);
		const ok = await patchTask(client, roomId, { type }, (patch) =>
			applyLocalPatch(patch, roomId, previous)
		);
		return ok ? {} : { error: t('error.update_status') };
	}

	async function updateTaskAssignee(
		client: MatrixClient,
		roomId: string,
		assignee: string | undefined
	) {
		const previous = cache.getByRoomId(roomId);
		const ok = await patchTask(client, roomId, { assignee }, (patch) =>
			applyLocalPatch(patch, roomId, previous)
		);
		return ok ? {} : { error: t('error.update_status') };
	}

	async function updateTaskArchive(client: MatrixClient, roomId: string, archived: boolean) {
		const previous = cache.getByRoomId(roomId);
		const ok = await patchTask(
			client,
			roomId,
			{
				archived,
				archivedBy: client.getUserId() ?? undefined,
				archivedAt: new Date().toISOString()
			},
			(patch) => applyLocalPatch(patch, roomId, previous)
		);
		return ok ? {} : { error: t('error.update_status') };
	}

	async function updateTaskDescription(
		client: MatrixClient,
		roomId: string,
		body: string,
		formattedBody: string
	) {
		const previous = cache.getByRoomId(roomId);
		const ok = await patchTask(
			client,
			roomId,
			{
				description: body,
				formattedDescription: formattedBody
			},
			(patch) => applyLocalPatch(patch, roomId, previous)
		);
		return ok ? {} : { error: t('error.update_status') };
	}

	async function updateTaskSortOrder(client: MatrixClient, roomId: string, sortOrder: string) {
		const previous = cache.getByRoomId(roomId);
		const ok = await patchTask(client, roomId, { sortOrder }, (patch) =>
			applyLocalPatch(patch, roomId, previous)
		);
		return ok ? {} : { error: t('error.update_status') };
	}

	async function updateTaskTags(client: MatrixClient, roomId: string, tags: string[]) {
		const previous = cache.getByRoomId(roomId);
		const ok = await patchTask(client, roomId, { tags }, (patch) =>
			applyLocalPatch(patch, roomId, previous)
		);
		return ok ? {} : { error: t('error.update_status') };
	}

	async function updateTaskDueDate(client: MatrixClient, roomId: string, dueDate: string) {
		const previous = cache.getByRoomId(roomId);
		const ok = await patchTask(client, roomId, { dueDate }, (patch) =>
			applyLocalPatch(patch, roomId, previous)
		);
		return ok ? {} : { error: t('error.update_status') };
	}

	async function bulkUpdateStatus(
		client: MatrixClient,
		roomIds: string[],
		status: TaskStatus,
		projectRoomId?: string
	) {
		const blocked = roomIds.some((id) => {
			const currentTask = cache.getByRoomId(id);
			return currentTask
				? isApprovalBlocked(client, id, currentTask.status, status, projectRoomId)
				: false;
		});
		if (blocked) {
			return { error: t('error.approval_required') };
		}

		const patches = new Map(roomIds.map((id) => [id, { status } as Partial<Task>]));
		const previous = new Map(roomIds.map((id) => [id, cache.getByRoomId(id)] as const));
		const ok = await bulkPatch(client, patches, (revertPatches) => {
			if (revertPatches === null) {
				for (const [id, prev] of previous) {
					applyLocalPatch(prev ?? null, id, undefined);
				}
			} else {
				for (const [id, patch] of revertPatches) {
					applyLocalPatch(patch, id);
				}
			}
		});
		return ok ? {} : { error: t('error.update_status') };
	}

	async function bulkUpdatePriority(
		client: MatrixClient,
		roomIds: string[],
		priority: Priority,
		_projectRoomId?: string
	) {
		const patches = new Map(roomIds.map((id) => [id, { priority } as Partial<Task>]));
		const previous = new Map(roomIds.map((id) => [id, cache.getByRoomId(id)] as const));
		const ok = await bulkPatch(client, patches, (revertPatches) => {
			if (revertPatches === null) {
				for (const [id, prev] of previous) {
					applyLocalPatch(prev ?? null, id, undefined);
				}
			} else {
				for (const [id, patch] of revertPatches) {
					applyLocalPatch(patch, id);
				}
			}
		});
		return ok ? {} : { error: t('error.update_status') };
	}

	async function bulkArchive(client: MatrixClient, roomIds: string[], _projectRoomId?: string) {
		const patches = new Map(roomIds.map((id) => [id, { archived: true } as Partial<Task>]));
		const previous = new Map(roomIds.map((id) => [id, cache.getByRoomId(id)] as const));
		const ok = await bulkPatch(client, patches, (revertPatches) => {
			if (revertPatches === null) {
				for (const [id, prev] of previous) {
					applyLocalPatch(prev ?? null, id, undefined);
				}
			} else {
				for (const [id, patch] of revertPatches) {
					applyLocalPatch(patch, id);
				}
			}
		});
		return ok ? {} : { error: t('error.update_status') };
	}

	async function bulkAddTag(
		client: MatrixClient,
		roomIds: string[],
		tag: string,
		_projectRoomId?: string
	) {
		const patches = new Map<string, Partial<Task>>();
		const previous = new Map(roomIds.map((id) => [id, cache.getByRoomId(id)] as const));
		for (const id of roomIds) {
			const existingTask = cache.getByRoomId(id);
			const existingTags = existingTask?.tags ?? [];
			patches.set(id, { tags: [...new Set([...existingTags, tag])] });
		}
		const ok = await bulkPatch(client, patches, (revertPatches) => {
			if (revertPatches === null) {
				for (const [id, prev] of previous) {
					applyLocalPatch(prev ?? null, id, undefined);
				}
			} else {
				for (const [id, patch] of revertPatches) {
					applyLocalPatch(patch, id);
				}
			}
		});
		return ok ? {} : { error: t('error.update_status') };
	}

	return {
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
		bulkUpdateStatus,
		bulkUpdatePriority,
		bulkArchive,
		bulkAddTag
	};
}

export type TaskWrites = ReturnType<typeof createTaskWrites>;
