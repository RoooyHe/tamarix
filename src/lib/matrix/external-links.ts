import type { Room, MatrixClient } from 'matrix-js-sdk';
import type { ExternalLink } from './types';
import { TAMARIX_EVENT_TYPES } from './types';
import { sendStateEvent } from './state-primitives';

export async function addExternalLink(
	client: MatrixClient,
	taskRoomId: string,
	link: ExternalLink
): Promise<void> {
	const stateKey = link.label.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now();
	await sendStateEvent(
		client,
		taskRoomId,
		TAMARIX_EVENT_TYPES.EXTERNAL_LINK,
		{
			url: link.url,
			label: link.label
		},
		stateKey
	);
}

export function getExternalLinks(room: Room): ExternalLink[] {
	const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.EXTERNAL_LINK as any);
	return events
		.map((e) => {
			const c = e.getContent() as { url: string; label: string };
			return { url: c.url, label: c.label, stateKey: e.getStateKey() ?? undefined };
		})
		.filter((l) => l.url && l.label);
}

export async function removeExternalLink(
	client: MatrixClient,
	taskRoomId: string,
	stateKey: string
): Promise<void> {
	await sendStateEvent(client, taskRoomId, TAMARIX_EVENT_TYPES.EXTERNAL_LINK, {}, stateKey);
}
