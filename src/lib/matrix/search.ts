import type { Task, TaskStatus, Priority, TaskType } from "./types";
import { getCustomFieldValues } from "./custom-fields";
import type { MatrixClient } from "matrix-js-sdk";

/**
 * Parse a search query string into structured filters and keywords.
 *
 * Supported syntax:
 *   - Plain text: full-text fuzzy match across title, description, ticketId
 *   - status:todo — filter by exact status
 *   - priority:high — filter by exact priority
 *   - type:bug — filter by exact type
 *   - assignee:alice — filter by assignee (partial match on user ID)
 *   - tag:frontend — filter by tag
 *   - custom:fieldName:value — filter by custom field value
 *   - Mixed: "status:done priority:high keyword" — intersection of all conditions
 */
export function searchTasks(tasks: Task[], query: string, client?: MatrixClient): Task[] {
  if (!query.trim()) return tasks;

  const { filters, keywords } = parseQuery(query);

  return tasks.filter(task => {
    // Apply structured filters
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.type && task.type !== filters.type) return false;
    if (filters.assignee) {
      if (!task.assignee) return false;
      if (!task.assignee.toLowerCase().includes(filters.assignee.toLowerCase())) return false;
    }
    if (filters.tag) {
      if (!task.tags.some(t => t.toLowerCase().includes(filters.tag!.toLowerCase()))) return false;
    }

    // Apply custom field filters
    if (filters.customFields.size > 0 && client) {
      const room = client.getRoom(task.roomId);
      if (!room) return false;
      const customValues = getCustomFieldValues(room);
      for (const [fieldName, expectedValue] of filters.customFields) {
        const fieldValue = customValues.get(fieldName);
        if (!fieldValue) return false;
        const actual = String(fieldValue.value).toLowerCase();
        if (!actual.includes(expectedValue.toLowerCase())) return false;
      }
    }

    // Apply keyword fuzzy match
    if (keywords.length > 0) {
      const combined = [
        task.title,
        task.description ?? "",
        task.ticketId ?? ""
      ].join(" ").toLowerCase();

      if (!keywords.every(kw => combined.includes(kw.toLowerCase()))) return false;
    }

    return true;
  });
}

/**
 * Search tasks via the AS HTTP API.
 * Falls back to local search on failure.
 */
export async function searchViaAS(
  query: string,
  asUrl: string,
  filters?: {
    project?: string;
    status?: string;
    assignee?: string;
    limit?: number;
  }
): Promise<{ results: AsSearchResult[]; count: number } | null> {
  if (!asUrl) return null;

  try {
    const params = new URLSearchParams({ q: query });
    if (filters?.project) params.set("project", filters.project);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.assignee) params.set("assignee", filters.assignee);
    if (filters?.limit) params.set("limit", String(filters.limit));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${asUrl}/api/search?${params.toString()}`, {
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * AS search result structure (mirrors SQLite tasks table columns).
 */
export interface AsSearchResult {
  room_id: string;
  project_room_id: string;
  ticket_id: string | null;
  title: string | null;
  status: string;
  priority: string | null;
  task_type: string | null;
  assignee: string | null;
  due_date: string | null;
  encrypted: number;
  archived: number;
}

interface ParsedFilters {
  status?: TaskStatus;
  priority?: Priority;
  type?: TaskType;
  assignee?: string;
  tag?: string;
  customFields: Map<string, string>;
}

interface ParsedQuery {
  filters: ParsedFilters;
  keywords: string[];
}

function parseQuery(query: string): ParsedQuery {
  const filters: ParsedFilters = { customFields: new Map() };
  const keywords: string[] = [];

  const tokens = query.trim().split(/\s+/);

  const validStatuses = new Set<string>(["todo", "in_progress", "review", "done", "closed"]);
  const validPriorities = new Set<string>(["critical", "high", "medium", "low"]);
  const validTypes = new Set<string>(["bug", "feature", "task", "improvement", "epic"]);

  for (const token of tokens) {
    const colonIdx = token.indexOf(":");
    if (colonIdx > 0) {
      const key = token.slice(0, colonIdx).toLowerCase();
      const value = token.slice(colonIdx + 1);

      switch (key) {
        case "status":
          if (validStatuses.has(value)) filters.status = value as TaskStatus;
          break;
        case "priority":
          if (validPriorities.has(value)) filters.priority = value as Priority;
          break;
        case "type":
          if (validTypes.has(value)) filters.type = value as TaskType;
          break;
        case "assignee":
          filters.assignee = value;
          break;
        case "tag":
          filters.tag = value;
          break;
        case "custom": {
          // custom:fieldName:value
          const innerColonIdx = value.indexOf(":");
          if (innerColonIdx > 0) {
            const fieldName = value.slice(0, innerColonIdx);
            const fieldValue = value.slice(innerColonIdx + 1);
            filters.customFields.set(fieldName, fieldValue);
          }
          break;
        }
        default:
          keywords.push(token);
          break;
      }
    } else {
      keywords.push(token);
    }
  }

  return { filters, keywords };
}
