import { RoomEvent, type MatrixEvent, type Room, type IRoomTimelineData } from 'matrix-js-sdk';

type TimelineEventHandler = (
	event: MatrixEvent,
	room: Room | undefined,
	toStartOfTimeline: boolean | undefined,
	removed: boolean,
	data: IRoomTimelineData
) => void;

interface Subscription {
	id: string;
	handler: TimelineEventHandler;
}

let client: { on: Function; removeListener: Function } | null = null;
let subscriptions: Subscription[] = [];
let nextId = 0;
let listenerAttached = false;

function dispatch(
	event: MatrixEvent,
	room: Room | undefined,
	toStartOfTimeline: boolean | undefined,
	removed: boolean,
	data: IRoomTimelineData
) {
	for (const sub of subscriptions) {
		sub.handler(event, room, toStartOfTimeline, removed, data);
	}
}

function attachListener() {
	if (!client || listenerAttached) return;
	client.on(RoomEvent.Timeline, dispatch);
	listenerAttached = true;
}

function detachListener() {
	if (!client || !listenerAttached) return;
	client.removeListener(RoomEvent.Timeline, dispatch);
	listenerAttached = false;
}

/**
 * Initialize the timeline bus with a Matrix client.
 * Called once at app start (after client init).
 */
export function initTimelineBus(c: { on: Function; removeListener: Function }) {
	detachListener();
	client = c;
	attachListener();
}

/**
 * Stop the timeline bus and remove the listener.
 */
export function stopTimelineBus() {
	detachListener();
	client = null;
	subscriptions = [];
}

/**
 * Subscribe to all timeline events.
 * Returns an unsubscribe function.
 */
export function onTimelineEvent(handler: TimelineEventHandler): () => void {
	const id = `sub_${++nextId}`;
	subscriptions.push({ id, handler });
	attachListener();

	return () => {
		subscriptions = subscriptions.filter((s) => s.id !== id);
	};
}
