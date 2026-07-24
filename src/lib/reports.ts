import type { Task, TaskStatus } from '$lib/matrix/types';
import type { VersionInfo } from '$lib/matrix/types';
import { TASK_STATUS_ORDER } from '$lib/matrix/types';

// --- Data Types ---

export interface BurndownDataPoint {
	date: string;
	remaining: number;
	completed: number;
	idealRemaining?: number;
}

export interface StatusDistributionItem {
	status: TaskStatus;
	count: number;
	color: string;
}

export interface TrendDataPoint {
	date: string;
	created: number;
	completed: number;
}

export interface AssigneeWorkloadItem {
	assignee: string;
	count: number;
}

export interface VersionProgressItem {
	version: string;
	todo: number;
	in_progress: number;
	review: number;
	done: number;
	closed: number;
}

// --- Color mapping ---

const STATUS_COLORS: Record<TaskStatus, string> = {
	todo: '#94a3b8',
	in_progress: '#3b82f6',
	review: '#f59e0b',
	done: '#22c55e',
	closed: '#a855f7'
};

// --- Computation functions ---

export function getBurndownData(tasks: Task[], days: number = 30): BurndownDataPoint[] {
	if (tasks.length === 0) return [];

	const now = Date.now();
	const dayMs = 86400000;
	const points: BurndownDataPoint[] = [];

	// Find earliest creation date
	const earliest = Math.min(...tasks.map((t) => t.createdAt));
	const startDay = new Date(Math.min(earliest, now - (days - 1) * dayMs));
	startDay.setHours(0, 0, 0, 0);

	const totalDays = Math.ceil((now - startDay.getTime()) / dayMs) + 1;

	// Ideal burndown line: from total to 0 over totalDays
	const totalTasks = tasks.length;

	for (let i = 0; i < totalDays; i++) {
		const dayStart = new Date(startDay.getTime() + i * dayMs);
		const dayEnd = new Date(dayStart.getTime() + dayMs);
		const dateStr = `${dayStart.getMonth() + 1}/${dayStart.getDate()}`;

		// Tasks created before end of this day
		const createdBefore = tasks.filter((t) => t.createdAt < dayEnd.getTime());
		// Tasks completed (done/closed) before end of this day
		const completedBefore = tasks.filter(
			(t) => (t.status === 'done' || t.status === 'closed') && t.updatedAt < dayEnd.getTime()
		);

		const remaining = createdBefore.length - completedBefore.length;
		const idealRemaining = Math.max(0, totalTasks - (totalTasks / totalDays) * (i + 1));

		points.push({
			date: dateStr,
			remaining: Math.max(0, remaining),
			completed: completedBefore.length,
			idealRemaining: Math.round(idealRemaining * 10) / 10
		});
	}

	return points;
}

export function getStatusDistribution(tasks: Task[]): StatusDistributionItem[] {
	const counts: Partial<Record<TaskStatus, number>> = {};
	for (const task of tasks) {
		counts[task.status] = (counts[task.status] || 0) + 1;
	}

	return TASK_STATUS_ORDER.filter((s) => (counts[s] || 0) > 0).map((status) => ({
		status,
		count: counts[status] || 0,
		color: STATUS_COLORS[status]
	}));
}

export function getTrendData(tasks: Task[], days: number = 30): TrendDataPoint[] {
	const now = Date.now();
	const dayMs = 86400000;
	const points: TrendDataPoint[] = [];

	for (let i = days - 1; i >= 0; i--) {
		const dayStart = new Date(now - i * dayMs);
		dayStart.setHours(0, 0, 0, 0);
		const dayEnd = new Date(dayStart.getTime() + dayMs);
		const dateStr = `${dayStart.getMonth() + 1}/${dayStart.getDate()}`;

		const created = tasks.filter(
			(t) => t.createdAt >= dayStart.getTime() && t.createdAt < dayEnd.getTime()
		).length;

		const completed = tasks.filter(
			(t) =>
				(t.status === 'done' || t.status === 'closed') &&
				t.updatedAt >= dayStart.getTime() &&
				t.updatedAt < dayEnd.getTime()
		).length;

		points.push({ date: dateStr, created, completed });
	}

	return points;
}

export function getAssigneeWorkload(tasks: Task[]): AssigneeWorkloadItem[] {
	const counts: Record<string, number> = {};
	for (const task of tasks) {
		const key = task.assignee || 'unassigned';
		counts[key] = (counts[key] || 0) + 1;
	}

	return Object.entries(counts)
		.map(([assignee, count]) => ({ assignee, count }))
		.sort((a, b) => b.count - a.count);
}

export function getVersionProgress(tasks: Task[], versions: VersionInfo[]): VersionProgressItem[] {
	// Group tasks by their version (from version state event state_key)
	// For now, use version name matching on task tags or version field
	const items: VersionProgressItem[] = [];

	for (const version of versions) {
		// Count tasks in this version by checking version assignment
		// Tasks are linked to versions via com.tamarix.version state event on the task room
		// For simplicity, count from version's task list if available
		const vTasks = tasks.filter((t) => t.tags?.some((tag) => tag === version.name));

		items.push({
			version: version.name,
			todo: vTasks.filter((t) => t.status === 'todo').length,
			in_progress: vTasks.filter((t) => t.status === 'in_progress').length,
			review: vTasks.filter((t) => t.status === 'review').length,
			done: vTasks.filter((t) => t.status === 'done').length,
			closed: vTasks.filter((t) => t.status === 'closed').length
		});
	}

	// Add "unversioned" group
	const versionedTaskIds = new Set(
		versions.flatMap((v) =>
			tasks.filter((t) => t.tags?.some((tag) => tag === v.name)).map((t) => t.roomId)
		)
	);
	const unversioned = tasks.filter((t) => !versionedTaskIds.has(t.roomId));
	if (unversioned.length > 0) {
		items.push({
			version: 'unversioned',
			todo: unversioned.filter((t) => t.status === 'todo').length,
			in_progress: unversioned.filter((t) => t.status === 'in_progress').length,
			review: unversioned.filter((t) => t.status === 'review').length,
			done: unversioned.filter((t) => t.status === 'done').length,
			closed: unversioned.filter((t) => t.status === 'closed').length
		});
	}

	return items;
}
