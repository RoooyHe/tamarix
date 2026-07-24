import type { Room, MatrixClient } from 'matrix-js-sdk';
import type { IntegrationInfo } from './types';
import { TAMARIX_EVENT_TYPES } from './types';
import { sendStateEvent } from './state-primitives';

export async function setIntegration(
	client: MatrixClient,
	projectRoomId: string,
	integration: IntegrationInfo
): Promise<void> {
	await sendStateEvent(
		client,
		projectRoomId,
		TAMARIX_EVENT_TYPES.INTEGRATION,
		integration,
		integration.connectionId
	);
}

export function getIntegrations(room: Room): IntegrationInfo[] {
	const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.INTEGRATION as any);
	return events
		.map((e) => e.getContent() as IntegrationInfo)
		.filter((integration) => Boolean(integration.provider && integration.connectionId));
}

export async function removeIntegration(
	client: MatrixClient,
	projectRoomId: string,
	connectionId: string
): Promise<void> {
	await sendStateEvent(client, projectRoomId, TAMARIX_EVENT_TYPES.INTEGRATION, {}, connectionId);
}
