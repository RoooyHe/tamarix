import type { Room, MatrixClient } from 'matrix-js-sdk';
import type { TaskTemplate, TaskStatus, Priority, TaskType } from './types';
import { TAMARIX_EVENT_TYPES } from './types';
import { sendStateEvent } from './state-primitives';

export async function createTaskTemplate(
	client: MatrixClient,
	spaceRoomId: string,
	template: TaskTemplate
): Promise<void> {
	const stateKey = template.name.replace(/\s+/g, '_').toLowerCase();
	await sendStateEvent(
		client,
		spaceRoomId,
		TAMARIX_EVENT_TYPES.TASK_TEMPLATE,
		{
			name: template.name,
			default_title: template.defaultTitle ?? '',
			default_description: template.defaultDescription ?? '',
			default_status: template.defaultStatus ?? '',
			default_priority: template.defaultPriority ?? '',
			default_type: template.defaultType ?? '',
			default_tags: template.defaultTags ?? []
		},
		stateKey
	);
}

export function getTaskTemplates(room: Room): TaskTemplate[] {
	const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.TASK_TEMPLATE as any);
	return events.map((e) => {
		const c = e.getContent() as {
			name: string;
			default_title?: string;
			default_description?: string;
			default_status?: string;
			default_priority?: string;
			default_type?: string;
			default_tags?: string[];
		};
		return {
			name: c.name,
			defaultTitle: c.default_title || undefined,
			defaultDescription: c.default_description || undefined,
			defaultStatus: (c.default_status as TaskStatus) || undefined,
			defaultPriority: (c.default_priority as Priority) || undefined,
			defaultType: (c.default_type as TaskType) || undefined,
			defaultTags: c.default_tags?.length ? c.default_tags : undefined
		};
	});
}

export async function deleteTaskTemplate(
	client: MatrixClient,
	spaceRoomId: string,
	stateKey: string
): Promise<void> {
	await sendStateEvent(client, spaceRoomId, TAMARIX_EVENT_TYPES.TASK_TEMPLATE, {}, stateKey);
}
