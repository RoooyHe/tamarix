import { describe, it, expect } from 'vitest';
import { generateNextTicketId } from './ticket-id';

function makeEvent(content: any) {
	return {
		getContent: () => content,
		getStateKey: () => '',
		getId: () => 'eventId',
		getTs: () => Date.now()
	};
}

function makeMockRoom(roomId: string, ticketId?: string, parentProjectId = 'project-1') {
	return {
		roomId,
		name: `Task ${roomId}`,
		currentState: {
			getStateEvents: (eventType: string, _stateKey?: string) => {
				if (eventType === 'com.tamarix.task_status') {
					return makeEvent({ status: 'todo' });
				}
				if (eventType === 'com.tamarix.ticket_id' && ticketId) {
					return makeEvent({ id: ticketId });
				}
				if (eventType === 'm.space.parent') {
					const event = makeEvent({});
					event.getStateKey = () => parentProjectId;
					return [event];
				}
				return null;
			}
		}
	};
}

function makeMockClient(rooms: any[]) {
	return {
		getRooms: () => rooms
	} as any;
}

describe('generateNextTicketId', () => {
	it('returns TAM-1 for empty project', async () => {
		const client = makeMockClient([]);
		const result = await generateNextTicketId(client, 'project-1');
		expect(result).toBe('TAM-1');
	});

	it('returns max+1 for existing tickets', async () => {
		const rooms = [
			makeMockRoom('r1', 'TAM-3'),
			makeMockRoom('r2', 'TAM-7'),
			makeMockRoom('r3', 'TAM-1')
		];
		const client = makeMockClient(rooms);
		const result = await generateNextTicketId(client, 'project-1');
		expect(result).toBe('TAM-8');
	});

	it('ignores rooms from other projects', async () => {
		const rooms = [
			makeMockRoom('r1', 'TAM-5', 'project-1'),
			makeMockRoom('r-other', 'TAM-99', 'other-project')
		];
		const client = makeMockClient(rooms);
		const result = await generateNextTicketId(client, 'project-1');
		expect(result).toBe('TAM-6');
	});
});
