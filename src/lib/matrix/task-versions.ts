import type { Room, MatrixClient } from 'matrix-js-sdk';
import { TAMARIX_EVENT_TYPES } from './types';
import { getStateEvent, sendStateEvent } from './state-primitives';

export function getTaskVersion(room: Room): string | null {
	const content = getStateEvent<{ version: string }>(room, TAMARIX_EVENT_TYPES.TASK_VERSION);
	return content?.version ?? null;
}

export async function setTaskVersion(
	client: MatrixClient,
	roomId: string,
	versionKey: string
): Promise<void> {
	await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.TASK_VERSION, { version: versionKey });
}
