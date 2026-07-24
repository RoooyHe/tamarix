import type { Room, MatrixClient } from 'matrix-js-sdk';
import type { GitConfig } from './types';
import { TAMARIX_EVENT_TYPES } from './types';
import { getStateEvent, sendStateEvent } from './state-primitives';

export async function setGitConfig(
	client: MatrixClient,
	projectRoomId: string,
	config: GitConfig
): Promise<void> {
	await sendStateEvent(client, projectRoomId, TAMARIX_EVENT_TYPES.GIT_CONFIG, config);
}

export function getGitConfig(room: Room): GitConfig | null {
	return getStateEvent<GitConfig>(room, TAMARIX_EVENT_TYPES.GIT_CONFIG);
}
