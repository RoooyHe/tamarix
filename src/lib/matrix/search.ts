import type { Task, TaskStatus, Priority, TaskType } from "./types";

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
 *   - Mixed: "status:done priority:high keyword" — intersection of all conditions
 */
export function searchTasks(tasks: Task[], query: string): Task[] {
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

interface ParsedFilters {
  status?: TaskStatus;
  priority?: Priority;
  type?: TaskType;
  assignee?: string;
  tag?: string;
}

interface ParsedQuery {
  filters: ParsedFilters;
  keywords: string[];
}

function parseQuery(query: string): ParsedQuery {
  const filters: ParsedFilters = {};
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
