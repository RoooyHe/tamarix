import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTaskWrites } from './task-writes';
import { createTaskCache } from './task-cache';
import type { Task } from '$lib/matrix/types';

function makeTask(overrides: Partial<Task> = {}): Task {
	return {
		roomId: overrides.roomId ?? 'room-1',
		title: 'Test Task',
		status: 'todo',
		tags: [],
		createdAt: Date.now(),
		updatedAt: Date.now(),
		...overrides
	};
}

describe('createTaskWrites', () => {
	let cache: ReturnType<typeof createTaskCache>;
	let writes: ReturnType<typeof createTaskWrites>;

	beforeEach(() => {
		cache = createTaskCache();
		writes = createTaskWrites(cache);
	});

	describe('applyLocalPatch (via updateTaskStatus)', () => {
		it('returns error for invalid transition', async () => {
			cache.upsert(makeTask({ roomId: 'r1', status: 'done' }));
			const mockClient = { sendStateEvent: vi.fn() } as any;
			const result = await writes.updateTaskStatus(mockClient, 'r1', 'todo');
			expect(result.error).toBeDefined();
		});

		it('applies valid transition optimistically', async () => {
			cache.upsert(makeTask({ roomId: 'r1', status: 'todo' }));
			const mockClient = {
				sendStateEvent: vi.fn().mockResolvedValue(undefined),
				getRoom: vi.fn().mockReturnValue(null)
			} as any;
			await writes.updateTaskStatus(mockClient, 'r1', 'in_progress');
			expect(cache.getByRoomId('r1')?.status).toBe('in_progress');
		});
	});

	describe('updateTaskPriority', () => {
		it('updates priority optimistically', async () => {
			cache.upsert(makeTask({ roomId: 'r1', priority: 'low' }));
			const mockClient = {
				sendStateEvent: vi.fn().mockResolvedValue(undefined)
			} as any;
			await writes.updateTaskPriority(mockClient, 'r1', 'high');
			expect(cache.getByRoomId('r1')?.priority).toBe('high');
		});
	});

	describe('updateTaskTags', () => {
		it('updates tags optimistically', async () => {
			cache.upsert(makeTask({ roomId: 'r1', tags: ['old'] }));
			const mockClient = {
				sendStateEvent: vi.fn().mockResolvedValue(undefined)
			} as any;
			await writes.updateTaskTags(mockClient, 'r1', ['new', 'tags']);
			expect(cache.getByRoomId('r1')?.tags).toEqual(['new', 'tags']);
		});
	});
});
