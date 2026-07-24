import type { Room, MatrixClient } from 'matrix-js-sdk';

/**
 * Read a custom Tamarix state event from a room.
 */
export function getStateEvent<T>(room: Room, eventType: string, stateKey: string = ''): T | null {
	const event = room.currentState.getStateEvents(eventType as any, stateKey);
	if (!event) return null;
	return event.getContent() as T;
}

/**
 * Send a custom Tamarix state event to a room.
 */
export async function sendStateEvent<T>(
	client: MatrixClient,
	roomId: string,
	eventType: string,
	content: T,
	stateKey: string = ''
): Promise<void> {
	await client.sendStateEvent(roomId, eventType as any, content as any, stateKey);
}
