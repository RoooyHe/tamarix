import type { Room, MatrixClient } from 'matrix-js-sdk';
import type { ApprovalState, ApprovalStatus, ApprovalConfig } from './types';
import { TAMARIX_EVENT_TYPES } from './types';
import { getStateEvent, sendStateEvent } from './state-primitives';

export async function setApproval(
	client: MatrixClient,
	taskRoomId: string,
	approval: ApprovalState
): Promise<void> {
	await sendStateEvent(client, taskRoomId, TAMARIX_EVENT_TYPES.APPROVAL, {
		status: approval.status,
		required_approvals: approval.requiredApprovals,
		current_approvals: approval.currentApprovals
	});
}

export function getApproval(room: Room): ApprovalState | null {
	const content = getStateEvent<{
		status: ApprovalStatus;
		required_approvals: number;
		current_approvals: number;
	}>(room, TAMARIX_EVENT_TYPES.APPROVAL);
	if (!content) return null;
	return {
		status: content.status,
		requiredApprovals: content.required_approvals,
		currentApprovals: content.current_approvals
	};
}

export async function setApprovalConfig(
	client: MatrixClient,
	projectRoomId: string,
	config: ApprovalConfig
): Promise<void> {
	await sendStateEvent(client, projectRoomId, TAMARIX_EVENT_TYPES.APPROVAL_CONFIG, {
		enabled: config.enabled,
		required_approvals: config.requiredApprovals
	});
}

export function getApprovalConfig(room: Room): ApprovalConfig {
	const content = getStateEvent<{ enabled?: boolean; required_approvals?: number }>(
		room,
		TAMARIX_EVENT_TYPES.APPROVAL_CONFIG
	);
	return {
		enabled: content?.enabled ?? false,
		requiredApprovals: content?.required_approvals ?? 1
	};
}
