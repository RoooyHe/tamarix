import type { TaskStatus } from './types';

/**
 * Whitelist of valid status transitions.
 * Each key maps to an array of statuses that can be transitioned to.
 */
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
	todo: ['in_progress', 'closed'],
	in_progress: ['review', 'todo', 'closed'],
	review: ['done', 'in_progress', 'closed'],
	done: ['closed'],
	closed: []
};

/**
 * Check whether a status transition is allowed by the workflow rules.
 */
export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
	if (from === to) return true; // no-op is always allowed
	return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get the list of statuses that can be transitioned to from the current status.
 */
export function getAllowedNextStatuses(current: TaskStatus): TaskStatus[] {
	return VALID_TRANSITIONS[current] ?? [];
}
