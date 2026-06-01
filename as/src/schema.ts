/**
 * Tamarix AS -- Schema Validator
 *
 * Compiles all JSON Schema definitions from the schemas/ directory using ajv,
 * and validates com.tamarix.* state event content against them.
 * Invalid events trigger a notice notification to the room.
 */

import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { sendNotice } from "./bot.js";
import { createLogger } from "./logger.js";

const log = createLogger("schema");

// Import schema JSON files
import taskStatusSchema from "./schemas/task-status.json" with { type: "json" };
import prioritySchema from "./schemas/priority.json" with { type: "json" };
import taskTypeSchema from "./schemas/task-type.json" with { type: "json" };
import descriptionSchema from "./schemas/description.json" with { type: "json" };
import worklogSchema from "./schemas/worklog.json" with { type: "json" };
import tagsSchema from "./schemas/tags.json" with { type: "json" };
import assigneeSchema from "./schemas/assignee.json" with { type: "json" };
import dueDateSchema from "./schemas/due-date.json" with { type: "json" };
import estimateSchema from "./schemas/estimate.json" with { type: "json" };
import ticketIdSchema from "./schemas/ticket-id.json" with { type: "json" };
import versionSchema from "./schemas/version.json" with { type: "json" };
import watcherSchema from "./schemas/watcher.json" with { type: "json" };
import notificationPrefsSchema from "./schemas/notification-prefs.json" with { type: "json" };
import relationSchema from "./schemas/relation.json" with { type: "json" };

/**
 * Map from event type (without com.tamarix. prefix) to schema.
 */
const SCHEMA_MAP: Record<string, object> = {
  "com.tamarix.task_status": taskStatusSchema,
  "com.tamarix.priority": prioritySchema,
  "com.tamarix.task_type": taskTypeSchema,
  "com.tamarix.description": descriptionSchema,
  "com.tamarix.worklog": worklogSchema,
  "com.tamarix.tags": tagsSchema,
  "com.tamarix.assignee": assigneeSchema,
  "com.tamarix.due_date": dueDateSchema,
  "com.tamarix.estimate": estimateSchema,
  "com.tamarix.ticket_id": ticketIdSchema,
  "com.tamarix.version": versionSchema,
  "com.tamarix.watcher": watcherSchema,
  "com.tamarix.notification_prefs": notificationPrefsSchema,
  "com.tamarix.relation": relationSchema
};

// Compile all schemas with ajv
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validators: Map<string, ValidateFunction> = new Map();

for (const [eventType, schema] of Object.entries(SCHEMA_MAP)) {
  const validate = ajv.compile(schema);
  validators.set(eventType, validate);
  log.info(`Compiled schema for ${eventType}`);
}

/**
 * Validate a state event's content against its JSON Schema.
 *
 * @returns true if valid, false if invalid
 */
export function validateEvent(eventType: string, content: unknown): { valid: boolean; errors?: string[] } {
  const validator = validators.get(eventType);
  if (!validator) {
    // No schema for this event type -- skip validation
    return { valid: true };
  }

  const valid = validator(content);
  if (valid) {
    return { valid: true };
  }

  const errors = (validator.errors ?? []).map(e =>
    `${e.instancePath || "/"} ${e.message ?? "invalid"}`
  );
  return { valid: false, errors };
}

/**
 * Handle a state event change with schema validation.
 * If invalid, send a notice to the room.
 */
export async function handleSchemaValidation(
  roomId: string,
  eventType: string,
  content: unknown,
  sender: string
): Promise<boolean> {
  const result = validateEvent(eventType, content);
  if (result.valid) {
    return true;
  }

  const errorList = result.errors?.join("; ") ?? "unknown error";
  log.warn(`Room ${roomId}: invalid ${eventType} from ${sender}: ${errorList}`);

  try {
    await sendNotice(
      roomId,
      `Schema validation failed for ${eventType}: ${errorList}`,
      `<b>Schema validation failed</b> for <code>${eventType}</code>: ${errorList}`
    );
  } catch (err) {
    log.error(`Room ${roomId}: failed to send schema validation notice: ${err}`);
  }

  return false;
}
