/**
 * Tamarix AS -- State Event Handlers
 *
 * Owns the com.tamarix.* event dispatch table. Each handler
 * processes a specific state event type: validates schema,
 * updates the search index, and triggers notifications.
 *
 * Extracted from index.ts to improve locality and testability.
 */

import { type MatrixClient, getStateEvent } from "./bot.js";
import { handleStatusChange } from "./workflow.js";
import { handleSchemaValidation } from "./schema.js";
import { upsertTask, setTaskArchived } from "./task-index.js";
import { upsertWorklog } from "./worklog-index.js";
import { upsertVersion, upsertTaskVersion } from "./version-index.js";
import { handleAssigneeNotification, handleStatusNotification } from "./notifier.js";
import { addWatcher } from "./watcher.js";
import { resolveProjectParent } from "./room-utils.js";
import { createLogger } from "./logger.js";

const log = createLogger("state-handlers");

// --- TAMARIX event type prefix ---
export const TAMARIX_PREFIX = "com.tamarix.";

// --- Handler type ---
export type StateEventHandler = (
  roomId: string,
  stateKey: string,
  content: Record<string, unknown>,
  sender: string,
  prevContent: Record<string, unknown> | null
) => Promise<void> | void;

// --- Helper: resolve task metadata for notifications ---
async function getTaskNotificationMetadata(roomId: string, client?: MatrixClient): Promise<{
  projectRoomId: string;
  ticketId: string;
  title: string;
}> {
  const ticket = await getStateEvent<{ id: string }>(roomId, "com.tamarix.ticket_id");
  const name = await getStateEvent<{ name: string }>(roomId, "m.room.name");
  const parent = await resolveProjectParent(roomId, client);
  return {
    projectRoomId: parent,
    ticketId: ticket?.id ?? roomId,
    title: name?.name ?? roomId
  };
}

// --- State event type handlers ---
export const STATE_HANDLERS: Record<string, StateEventHandler> = {
  "com.tamarix.task_status": async (roomId, _sk, content, sender, prevContent) => {
    handleSchemaValidation(roomId, "com.tamarix.task_status", content, sender);

    const newStatus = content.status as string;
    const oldStatus = prevContent?.status as string | undefined;
    if (oldStatus && newStatus) {
      await handleStatusChange(roomId, sender, newStatus, oldStatus);
    }

    upsertTask(roomId, "", { status: newStatus });

    const metadata = await getTaskNotificationMetadata(roomId);
    await handleStatusNotification(
      roomId,
      metadata.projectRoomId,
      metadata.ticketId,
      metadata.title,
      oldStatus ?? "",
      newStatus,
      sender
    );
  },

  "com.tamarix.priority": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.priority", content, sender);
    upsertTask(roomId, "", { priority: content.level as string });
  },

  "com.tamarix.task_type": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.task_type", content, sender);
    upsertTask(roomId, "", { taskType: content.type as string });
  },

  "com.tamarix.description": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.description", content, sender);
    upsertTask(roomId, "", { title: content.body as string });
  },

  "com.tamarix.assignee": async (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.assignee", content, sender);
    upsertTask(roomId, "", { assignee: content.user_id as string });

    if (content.user_id) {
      const metadata = await getTaskNotificationMetadata(roomId);
      await handleAssigneeNotification(
        roomId,
        metadata.ticketId,
        metadata.title,
        content.user_id as string,
        sender
      );
    }
  },

  "com.tamarix.due_date": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.due_date", content, sender);
    upsertTask(roomId, "", { dueDate: content.date as string });
  },

  "com.tamarix.estimate": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.estimate", content, sender);
  },

  "com.tamarix.tags": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.tags", content, sender);
  },

  "com.tamarix.ticket_id": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.ticket_id", content, sender);
    upsertTask(roomId, "", { ticketId: content.id as string });
  },

  "com.tamarix.worklog": (roomId, stateKey, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.worklog", content, sender);
    upsertWorklog(
      roomId,
      stateKey,
      content.user_id as string,
      content.hours as number,
      content.note as string,
      Date.parse(content.logged_at as string) || Date.now()
    );
  },

  "com.tamarix.version": (roomId, stateKey, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.version", content, sender);
    upsertVersion(
      roomId,
      stateKey,
      content.name as string,
      content.status as string,
      content.release_date as string | undefined,
      content.description as string | undefined
    );
  },

  "com.tamarix.task_version": (roomId, stateKey, _content, _sender) => {
    upsertTaskVersion(roomId, stateKey);
  },

  "com.tamarix.watcher": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.watcher", content, sender);
    const userId = content.user_id as string;
    if (userId) {
      addWatcher(roomId, userId);
    }
  },

  "com.tamarix.notification_prefs": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.notification_prefs", content, sender);
  },

  "com.tamarix.relation": (roomId, _sk, content, sender) => {
    handleSchemaValidation(roomId, "com.tamarix.relation", content, sender);
  },

  "com.tamarix.task_archived": (roomId, _sk, content, _sender) => {
    const archived = content.archived as boolean;
    setTaskArchived(roomId, archived);
  }
};

/**
 * Dispatch a state event to the appropriate handler.
 * Returns true if a handler was found and executed.
 */
export async function handleStateEvent(
  roomId: string,
  stateKey: string,
  eventType: string,
  content: Record<string, unknown>,
  sender: string,
  prevContent: Record<string, unknown> | null
): Promise<boolean> {
  const handler = STATE_HANDLERS[eventType];
  if (!handler) return false;

  try {
    await handler(roomId, stateKey, content, sender, prevContent);
    return true;
  } catch (err) {
    log.error(`Error handling ${eventType} in ${roomId}: ${err}`);
    return false;
  }
}

/**
 * Extract prev_content from a Matrix event.
 */
export function getPrevContent(event: {
  prev_content?: Record<string, unknown>;
  unsigned?: { prev_content?: Record<string, unknown> };
}): Record<string, unknown> | null {
  return event.prev_content ?? event.unsigned?.prev_content ?? null;
}
