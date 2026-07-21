import type { Room, MatrixClient } from "matrix-js-sdk";
import type {
  TaskStatus, Priority, TaskType,
  TaskTemplate, CustomFieldDefinition, CustomFieldType,
  CustomFieldValue, ApprovalState, ApprovalStatus, ApprovalConfig,
  ExternalLink, SortOrderState, GitConfig, IntegrationInfo
} from "./types";
import { TAMARIX_EVENT_TYPES } from "./types";

/**
 * Read a custom Tamarix state event from a room.
 */
export function getStateEvent<T>(
  room: Room,
  eventType: string,
  stateKey: string = ""
): T | null {
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
  stateKey: string = ""
): Promise<void> {
  await client.sendStateEvent(roomId, eventType as any, content as any, stateKey);
}

// ============================================================
// P4: Task Template
// ============================================================

export async function createTaskTemplate(
  client: MatrixClient,
  spaceRoomId: string,
  template: TaskTemplate
): Promise<void> {
  const stateKey = template.name.replace(/\s+/g, "_").toLowerCase();
  await sendStateEvent(client, spaceRoomId, TAMARIX_EVENT_TYPES.TASK_TEMPLATE, {
    name: template.name,
    default_title: template.defaultTitle ?? "",
    default_description: template.defaultDescription ?? "",
    default_status: template.defaultStatus ?? "",
    default_priority: template.defaultPriority ?? "",
    default_type: template.defaultType ?? "",
    default_tags: template.defaultTags ?? []
  }, stateKey);
}

export function getTaskTemplates(room: Room): TaskTemplate[] {
  const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.TASK_TEMPLATE as any);
  return events.map(e => {
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

// ============================================================
// P4: Custom Field
// ============================================================

export async function setCustomFieldDefinition(
  client: MatrixClient,
  spaceRoomId: string,
  fieldName: string,
  definition: CustomFieldDefinition
): Promise<void> {
  await sendStateEvent(client, spaceRoomId, TAMARIX_EVENT_TYPES.CUSTOM_FIELD, {
    label: definition.label,
    type: definition.type,
    options: definition.options ?? [],
    required: definition.required ?? false
  }, fieldName);
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
  await sendStateEvent(client, taskRoomId, TAMARIX_EVENT_TYPES.CUSTOM_FIELD_VALUE, {
    value
  }, fieldName);
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

// ============================================================
// P4: Approval
// ============================================================

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

// ============================================================
// P4: Sort Order
// ============================================================

export async function setSortOrder(
  client: MatrixClient,
  taskRoomId: string,
  order: string
): Promise<void> {
  await sendStateEvent(client, taskRoomId, TAMARIX_EVENT_TYPES.SORT_ORDER, { order });
}

export function getSortOrder(room: Room): string | null {
  const content = getStateEvent<SortOrderState>(room, TAMARIX_EVENT_TYPES.SORT_ORDER);
  return content?.order ?? null;
}

// ============================================================
// P4: External Link
// ============================================================

export async function addExternalLink(
  client: MatrixClient,
  taskRoomId: string,
  link: ExternalLink
): Promise<void> {
  const stateKey = link.label.replace(/\s+/g, "_").toLowerCase() + "_" + Date.now();
  await sendStateEvent(client, taskRoomId, TAMARIX_EVENT_TYPES.EXTERNAL_LINK, {
    url: link.url,
    label: link.label
  }, stateKey);
}

export function getExternalLinks(room: Room): ExternalLink[] {
  const events = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.EXTERNAL_LINK as any);
  return events
    .map(e => {
      const c = e.getContent() as { url: string; label: string };
      return { url: c.url, label: c.label, stateKey: e.getStateKey() ?? undefined };
    })
    .filter(l => l.url && l.label);
}

export async function removeExternalLink(
  client: MatrixClient,
  taskRoomId: string,
  stateKey: string
): Promise<void> {
  await sendStateEvent(client, taskRoomId, TAMARIX_EVENT_TYPES.EXTERNAL_LINK, {}, stateKey);
}

// ============================================================
// P4: Git Integration
// ============================================================

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

// ============================================================
// P6: Third-party Integrations
// ============================================================

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
    .map(e => e.getContent() as IntegrationInfo)
    .filter(integration => Boolean(integration.provider && integration.connectionId));
}

export async function removeIntegration(
  client: MatrixClient,
  projectRoomId: string,
  connectionId: string
): Promise<void> {
  await sendStateEvent(client, projectRoomId, TAMARIX_EVENT_TYPES.INTEGRATION, {}, connectionId);
}