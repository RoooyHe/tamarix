import { describe, it, expect, beforeEach } from 'vitest';
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

describe('createTaskCache', () => {
	let cache: ReturnType<typeof createTaskCache>;

	beforeEach(() => {
		cache = createTaskCache();
	});

	describe('upsert and getTasks', () => {
		it('adds a task and retrieves it', () => {
			const task = makeTask({ roomId: 'r1', title: 'Task 1' });
			cache.upsert(task);
			expect(cache.getTasks()).toHaveLength(1);
			expect(cache.getTasks()[0].title).toBe('Task 1');
		});

		it('does not duplicate on re-upsert', () => {
			cache.upsert(makeTask({ roomId: 'r1' }));
			cache.upsert(makeTask({ roomId: 'r1', title: 'Updated' }));
			expect(cache.getTasks()).toHaveLength(1);
			expect(cache.getTasks()[0].title).toBe('Updated');
		});

		it('maintains insertion order', () => {
			cache.upsert(makeTask({ roomId: 'r3' }));
			cache.upsert(makeTask({ roomId: 'r1' }));
			cache.upsert(makeTask({ roomId: 'r2' }));
			const ids = cache.getTasks().map((t) => t.roomId);
			expect(ids).toEqual(['r3', 'r1', 'r2']);
		});
	});

	describe('remove', () => {
		it('removes a task', () => {
			cache.upsert(makeTask({ roomId: 'r1' }));
			cache.remove('r1');
			expect(cache.getTasks()).toHaveLength(0);
		});

		it('is safe to remove non-existent task', () => {
			expect(() => cache.remove('nonexistent')).not.toThrow();
		});
	});

	describe('getByRoomId', () => {
		it('returns task by roomId', () => {
			cache.upsert(makeTask({ roomId: 'r1', title: 'Found' }));
			expect(cache.getByRoomId('r1')?.title).toBe('Found');
		});

		it('returns undefined for unknown roomId', () => {
			expect(cache.getByRoomId('unknown')).toBeUndefined();
		});
	});

	describe('getByProject', () => {
		it('returns tasks for a project', () => {
			cache.upsert(makeTask({ roomId: 'r1', projectRoomId: 'p1' }));
			cache.upsert(makeTask({ roomId: 'r2', projectRoomId: 'p1' }));
			cache.upsert(makeTask({ roomId: 'r3', projectRoomId: 'p2' }));
			expect(cache.getByProject('p1')).toHaveLength(2);
			expect(cache.getByProject('p2')).toHaveLength(1);
		});

		it('returns empty for unknown project', () => {
			expect(cache.getByProject('unknown')).toEqual([]);
		});
	});

	describe('getById', () => {
		it('finds by roomId', () => {
			cache.upsert(makeTask({ roomId: 'r1' }));
			expect(cache.getById('r1')).toBeDefined();
		});

		it('finds by ticketId', () => {
			cache.upsert(makeTask({ roomId: 'r1', ticketId: 'TAM-42' }));
			expect(cache.getById('TAM-42')).toBeDefined();
		});

		it('returns undefined for unknown id', () => {
			expect(cache.getById('unknown')).toBeUndefined();
		});
	});

	describe('project index management', () => {
		it('cleans old project index on project change', () => {
			cache.upsert(makeTask({ roomId: 'r1', projectRoomId: 'p1' }));
			expect(cache.getByProject('p1')).toHaveLength(1);

			cache.upsert(makeTask({ roomId: 'r1', projectRoomId: 'p2' }));
			expect(cache.getByProject('p1')).toHaveLength(0);
			expect(cache.getByProject('p2')).toHaveLength(1);
		});

		it('cleans project index on remove', () => {
			cache.upsert(makeTask({ roomId: 'r1', projectRoomId: 'p1' }));
			cache.remove('r1');
			expect(cache.getByProject('p1')).toHaveLength(0);
		});
	});
});
