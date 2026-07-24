import { describe, it, expect, vi } from 'vitest';
import { getStateEvent, sendStateEvent } from './state-primitives';

function mockRoom(events: Record<string, unknown> = {}) {
	return {
		currentState: {
			getStateEvents: vi.fn((eventType: string, stateKey: string) => {
				const key = `${eventType}:${stateKey}`;
				return events[key] ?? null;
			})
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

function mockEvent(content: unknown) {
	return { getContent: () => content };
}

describe('state-primitives', () => {
	describe('getStateEvent', () => {
		it('returns content when event exists', () => {
			const room = mockRoom({
				'm.room.name:': mockEvent({ name: 'Test Room' })
			});
			const result = getStateEvent<{ name: string }>(room, 'm.room.name');
			expect(result).toEqual({ name: 'Test Room' });
		});

		it('returns null when event does not exist', () => {
			const room = mockRoom({});
			const result = getStateEvent(room, 'm.room.name');
			expect(result).toBeNull();
		});

		it('passes empty string as default stateKey', () => {
			const room = mockRoom({});
			getStateEvent(room, 'm.room.name');
			expect(room.currentState.getStateEvents).toHaveBeenCalledWith('m.room.name', '');
		});

		it('passes custom stateKey when provided', () => {
			const room = mockRoom({
				'com.tamarix.custom_field:story_points': mockEvent({ value: 5 })
			});
			const result = getStateEvent<{ value: number }>(
				room,
				'com.tamarix.custom_field',
				'story_points'
			);
			expect(result).toEqual({ value: 5 });
			expect(room.currentState.getStateEvents).toHaveBeenCalledWith(
				'com.tamarix.custom_field',
				'story_points'
			);
		});
	});

	describe('sendStateEvent', () => {
		it('calls client.sendStateEvent with correct arguments', async () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const client = { sendStateEvent: vi.fn().mockResolvedValue(undefined) } as any;
			await sendStateEvent(client, '!room:example.com', 'com.tamarix.test', { foo: 'bar' });
			expect(client.sendStateEvent).toHaveBeenCalledWith(
				'!room:example.com',
				'com.tamarix.test',
				{ foo: 'bar' },
				''
			);
		});

		it('passes custom stateKey', async () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const client = { sendStateEvent: vi.fn().mockResolvedValue(undefined) } as any;
			await sendStateEvent(
				client,
				'!room:example.com',
				'com.tamarix.test',
				{ value: 42 },
				'my_key'
			);
			expect(client.sendStateEvent).toHaveBeenCalledWith(
				'!room:example.com',
				'com.tamarix.test',
				{ value: 42 },
				'my_key'
			);
		});

		it('propagates errors from client', async () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const client = {
				sendStateEvent: vi.fn().mockRejectedValue(new Error('Network error'))
			} as any;
			await expect(
				sendStateEvent(client, '!room:example.com', 'com.tamarix.test', {})
			).rejects.toThrow('Network error');
		});
	});
});
