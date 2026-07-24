import { describe, it, expect } from 'vitest';
import {
	getBurndownData,
	getStatusDistribution,
	getTrendData,
	getAssigneeWorkload,
	getVersionProgress
} from './reports';
import type { Task, VersionInfo } from '$lib/matrix/types';

function makeTask(overrides: Partial<Task> = {}): Task {
	return {
		roomId: overrides.roomId ?? 'room-1',
		title: 'Test Task',
		status: 'todo',
		tags: [],
		createdAt: Date.now() - 86400000, // 1 day ago
		updatedAt: Date.now() - 86400000,
		...overrides
	};
}

describe('getStatusDistribution', () => {
	it('counts tasks by status', () => {
		const tasks = [
			makeTask({ status: 'todo' }),
			makeTask({ status: 'todo' }),
			makeTask({ status: 'done' }),
			makeTask({ status: 'in_progress' })
		];
		const dist = getStatusDistribution(tasks);
		expect(dist).toHaveLength(3);
		expect(dist.find((d) => d.status === 'todo')?.count).toBe(2);
		expect(dist.find((d) => d.status === 'in_progress')?.count).toBe(1);
		expect(dist.find((d) => d.status === 'done')?.count).toBe(1);
	});

	it('returns empty array for no tasks', () => {
		expect(getStatusDistribution([])).toEqual([]);
	});

	it('includes color for each status', () => {
		const dist = getStatusDistribution([makeTask({ status: 'todo' })]);
		expect(dist[0].color).toMatch(/^#/);
	});
});

describe('getAssigneeWorkload', () => {
	it('groups by assignee and sorts by count desc', () => {
		const tasks = [
			makeTask({ assignee: 'alice' }),
			makeTask({ assignee: 'alice' }),
			makeTask({ assignee: 'bob' }),
			makeTask({ assignee: undefined })
		];
		const workload = getAssigneeWorkload(tasks);
		expect(workload[0]).toEqual({ assignee: 'alice', count: 2 });
		expect(workload[1].assignee).toBe('bob');
		expect(workload[2].assignee).toBe('unassigned');
	});

	it('returns empty array for no tasks', () => {
		expect(getAssigneeWorkload([])).toEqual([]);
	});
});

describe('getTrendData', () => {
	it('returns correct number of days', () => {
		const points = getTrendData([], 7);
		expect(points).toHaveLength(7);
	});

	it('each point has date, created, completed', () => {
		const points = getTrendData([], 3);
		for (const point of points) {
			expect(point).toHaveProperty('date');
			expect(point).toHaveProperty('created');
			expect(point).toHaveProperty('completed');
		}
	});
});

describe('getBurndownData', () => {
	it('returns empty array for no tasks', () => {
		expect(getBurndownData([])).toEqual([]);
	});

	it('returns data points with expected fields', () => {
		const tasks = [makeTask({ createdAt: Date.now() - 86400000 * 5 })];
		const points = getBurndownData(tasks, 7);
		expect(points.length).toBeGreaterThan(0);
		for (const point of points) {
			expect(point).toHaveProperty('date');
			expect(point).toHaveProperty('remaining');
			expect(point).toHaveProperty('completed');
			expect(point).toHaveProperty('idealRemaining');
		}
	});
});

describe('getVersionProgress', () => {
	it('groups tasks by version tag', () => {
		const versions: VersionInfo[] = [{ name: 'v1.0', status: 'released' }];
		const tasks = [
			makeTask({ tags: ['v1.0'], status: 'done' }),
			makeTask({ tags: ['v1.0'], status: 'todo' })
		];
		const progress = getVersionProgress(tasks, versions);
		expect(progress).toHaveLength(1);
		const v1 = progress.find((p) => p.version === 'v1.0');
		expect(v1?.done).toBe(1);
		expect(v1?.todo).toBe(1);
	});

	it('identifies unversioned tasks', () => {
		const versions: VersionInfo[] = [{ name: 'v1.0', status: 'released' }];
		const tasks = [
			makeTask({ roomId: 'r1', tags: ['v1.0'], status: 'done' }),
			makeTask({ roomId: 'r2', tags: [], status: 'todo' })
		];
		const progress = getVersionProgress(tasks, versions);
		expect(progress).toHaveLength(2);
		const unversioned = progress.find((p) => p.version === 'unversioned');
		expect(unversioned).toBeDefined();
		expect(unversioned?.todo).toBe(1);
	});

	it('returns only unversioned when no versions', () => {
		const tasks = [makeTask({ tags: [] })];
		const progress = getVersionProgress(tasks, []);
		expect(progress).toHaveLength(1);
		expect(progress[0].version).toBe('unversioned');
	});
});
