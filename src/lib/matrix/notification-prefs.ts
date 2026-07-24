import type { Room, MatrixClient } from 'matrix-js-sdk';
import type { NotificationPrefs } from './types';
import { TAMARIX_EVENT_TYPES } from './types';
import { getStateEvent, sendStateEvent } from './state-primitives';

export function getNotificationPrefs(room: Room): NotificationPrefs | null {
	const content = getStateEvent<{
		assign_notify: boolean;
		status_change_notify: boolean;
		due_remind: boolean;
		mention_notify: boolean;
		channels: ('in_app' | 'email')[];
	}>(room, TAMARIX_EVENT_TYPES.NOTIFICATION_PREFS);
	if (!content) return null;
	return {
		assignNotify: content.assign_notify,
		statusChangeNotify: content.status_change_notify,
		dueRemind: content.due_remind,
		mentionNotify: content.mention_notify,
		channels: content.channels
	};
}

export async function setNotificationPrefs(
	client: MatrixClient,
	roomId: string,
	prefs: NotificationPrefs
): Promise<void> {
	await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.NOTIFICATION_PREFS, {
		assign_notify: prefs.assignNotify,
		status_change_notify: prefs.statusChangeNotify,
		due_remind: prefs.dueRemind,
		mention_notify: prefs.mentionNotify,
		channels: prefs.channels
	});
}
