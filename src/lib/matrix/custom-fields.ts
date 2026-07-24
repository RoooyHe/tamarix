import type { Room, MatrixClient } from 'matrix-js-sdk';
import type { CustomFieldDefinition, CustomFieldType, CustomFieldValue } from './types';
import { TAMARIX_EVENT_TYPES } from './types';
import { sendStateEvent } from './state-primitives';

export async function setCustomFieldDefinition(
	client: MatrixClient,
	spaceRoomId: string,
	fieldName: string,
	definition: CustomFieldDefinition
): Promise<void> {
	await sendStateEvent(
		client,
		spaceRoomId,
		TAMARIX_EVENT_TYPES.CUSTOM_FIELD,
		{
			label: definition.label,
			type: definition.type,
			options: definition.options ?? [],
			required: definition.required ?? false
		},
		fieldName
	);
}

export function getCustomFieldDefinitions(room: Room): Map<string, CustomFieldDefinition> {
	const result = new Map<string, CustomFieldDefinition>();
	const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.CUSTOM_FIELD as any);
	for (const e of events) {
		const c = e.getContent() as {
			label: string;
			type: CustomFieldType;
			options?: string[];
			required?: boolean;
		};
		if (!c.label) continue;
		result.set(e.getStateKey()!, {
			label: c.label,
			type: c.type,
			options: c.options?.length ? c.options : undefined,
			required: c.required ?? undefined
		});
	}
	return result;
}

export async function deleteCustomFieldDefinition(
	client: MatrixClient,
	spaceRoomId: string,
	fieldName: string
): Promise<void> {
	await sendStateEvent(client, spaceRoomId, TAMARIX_EVENT_TYPES.CUSTOM_FIELD, {}, fieldName);
}

export async function setCustomFieldValue(
	client: MatrixClient,
	taskRoomId: string,
	fieldName: string,
	value: string | number
): Promise<void> {
	await sendStateEvent(
		client,
		taskRoomId,
		TAMARIX_EVENT_TYPES.CUSTOM_FIELD_VALUE,
		{
			value
		},
		fieldName
	);
}

export function getCustomFieldValues(room: Room): Map<string, CustomFieldValue> {
	const result = new Map<string, CustomFieldValue>();
	const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.CUSTOM_FIELD_VALUE as any);
	for (const e of events) {
		const c = e.getContent() as { value: string | number };
		if (c.value === undefined) continue;
		result.set(e.getStateKey()!, { value: c.value });
	}
	return result;
}
