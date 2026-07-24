import { describe, it, expect } from 'vitest';
import { canTransition, getAllowedNextStatuses, VALID_TRANSITIONS } from './workflow';
import type { TaskStatus } from './types';

describe('canTransition', () => {
	it('allows same-state transition (no-op)', () => {
		for (const status of Object.keys(VALID_TRANSITIONS) as TaskStatus[]) {
			expect(canTransition(status, status)).toBe(true);
		}
	});

	it('allows valid transitions from todo', () => {
		expect(canTransition('todo', 'in_progress')).toBe(true);
		expect(canTransition('todo', 'closed')).toBe(true);
	});

	it('allows valid transitions from in_progress', () => {
		expect(canTransition('in_progress', 'review')).toBe(true);
		expect(canTransition('in_progress', 'todo')).toBe(true);
		expect(canTransition('in_progress', 'closed')).toBe(true);
	});

	it('allows valid transitions from review', () => {
		expect(canTransition('review', 'done')).toBe(true);
		expect(canTransition('review', 'in_progress')).toBe(true);
		expect(canTransition('review', 'closed')).toBe(true);
	});

	it('allows valid transitions from done', () => {
		expect(canTransition('done', 'closed')).toBe(true);
	});

	it('rejects invalid transitions', () => {
		expect(canTransition('todo', 'done')).toBe(false);
		expect(canTransition('todo', 'review')).toBe(false);
		expect(canTransition('done', 'todo')).toBe(false);
		expect(canTransition('done', 'in_progress')).toBe(false);
		expect(canTransition('closed', 'todo')).toBe(false);
		expect(canTransition('closed', 'done')).toBe(false);
		expect(canTransition('in_progress', 'done')).toBe(false);
		expect(canTransition('review', 'todo')).toBe(false);
	});
});

describe('getAllowedNextStatuses', () => {
	it('returns correct statuses for todo', () => {
		expect(getAllowedNextStatuses('todo')).toEqual(['in_progress', 'closed']);
	});

	it('returns correct statuses for in_progress', () => {
		expect(getAllowedNextStatuses('in_progress')).toEqual(['review', 'todo', 'closed']);
	});

	it('returns correct statuses for review', () => {
		expect(getAllowedNextStatuses('review')).toEqual(['done', 'in_progress', 'closed']);
	});

	it('returns correct statuses for done', () => {
		expect(getAllowedNextStatuses('done')).toEqual(['closed']);
	});

	it('returns empty array for closed', () => {
		expect(getAllowedNextStatuses('closed')).toEqual([]);
	});
});
