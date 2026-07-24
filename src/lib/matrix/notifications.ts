import type { MatrixEvent } from 'matrix-js-sdk';
import type { NotificationType } from './types';
import { TAMARIX_EVENT_TYPES } from './types';

/**
 * Parse a Matrix state event into notification data.
 * Returns null if the event type is not notification-relevant.
 */
export function parseNotificationFromEvent(
	event: MatrixEvent,
	currentUser: string
): { type: NotificationType; taskId: string; taskTitle: string; triggeredBy: string } | null {
	const sender = event.getSender()!;
	const eventType = event.getType();
	const roomId = event.getRoomId()!;

	// Skip self-triggered events
	if (sender === currentUser) return null;

	if (eventType === TAMARIX_EVENT_TYPES.ASSIGNEE) {
		const content = event.getContent();
		const assignedUser = content.user_id as string | undefined;
		if (assignedUser === currentUser) {
			return { type: 'assign', taskId: roomId, taskTitle: roomId, triggeredBy: sender };
		}
	}

	if (eventType === TAMARIX_EVENT_TYPES.TASK_STATUS) {
		return { type: 'status_change', taskId: roomId, taskTitle: roomId, triggeredBy: sender };
	}

	return null;
}

/**
 * Check if a due date is approaching within the threshold.
 * @param dueDate ISO date string
 * @param remindBeforeMs Milliseconds before due to trigger reminder (default: 1 day)
 * @returns true if the task is due soon (or overdue but within 7 days)
 */
export function isDueSoon(dueDate: string, remindBeforeMs: number = 24 * 60 * 60 * 1000): boolean {
	const now = Date.now();
	const due = new Date(dueDate).getTime();
	const diff = due - now;
	return diff < remindBeforeMs && diff > -7 * remindBeforeMs;
}
