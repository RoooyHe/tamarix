/**
 * Tamarix AS -- Git Bridge
 *
 * Listens for Git webhook events (GitHub / GitLab) and posts
 * commit-linking messages to the corresponding task rooms.
 *
 * When a commit message contains a task reference pattern (e.g. TAM-42),
 * the bridge finds the matching task room via the ticket-id index and
 * sends an m.notice message linking the commit.
 */

import { createLogger } from "./logger.js";
import { getBot } from "./bot.js";
import { createHmac, timingSafeEqual } from "node:crypto";

const log = createLogger("git-bridge");

/** Pattern to match task references in commit messages: TAM-42, PROJ-123, etc. */
const TASK_REF_PATTERN = /\b([A-Z][A-Z0-9]*)-(\d+)\b/g;

/** Supported Git provider types */
export type GitProvider = "github" | "gitlab";

/** Normalized push event payload */
export interface GitPushEvent {
  provider: GitProvider;
  repo: string;
  branch: string;
  commits: Array<{
    id: string;
    message: string;
    author: string;
    url?: string;
  }>;
}

/**
 * Extract task references from a commit message.
 * Returns an array of ticket ID strings (e.g. ["TAM-42", "TAM-99"]).
 */
export function extractTaskRefs(message: string): string[] {
  const refs: string[] = [];
  let match: RegExpExecArray | null;
  const pattern = new RegExp(TASK_REF_PATTERN.source, "g");
  while ((match = pattern.exec(message)) !== null) {
    refs.push(match[1] + "-" + match[2]);
  }
  return [...new Set(refs)];
}

/**
 * Send a commit-linked notice to a task room.
 */
async function notifyTaskRoom(
  roomId: string,
  commit: { id: string; message: string; author: string; url?: string },
  repo: string,
  branch: string,
  provider: GitProvider
): Promise<void> {
  const shortId = commit.id.substring(0, 7);
  const firstLine = commit.message.split("\n")[0];
  const providerLabel = provider === "github" ? "GitHub" : "GitLab";

  const body = `[${providerLabel}] ${repo}@${branch}: ${shortId} - ${firstLine} (${commit.author})`;
  const htmlBody = `<p><strong>[${providerLabel}]</strong> <code>${repo}</code>@<code>${branch}</code>: ` +
    `<a href="${commit.url ?? "#"}">${shortId}</a> - ${escapeHtml(firstLine)} <em>(${escapeHtml(commit.author)})</em></p>`;

  await getBot().sendMessage(roomId, {
    msgtype: "m.notice",
    body,
    format: "org.matrix.custom.html",
    formatted_body: htmlBody
  });
}

/**
 * Process a Git push event: find task references in commit messages
 * and post notifications to the corresponding task rooms.
 *
 * @param event - Normalized push event
 * @param resolveRoom - Function to resolve a ticket ID to a Matrix room ID
 */
export async function handleGitPush(
  event: GitPushEvent,
  resolveRoom: (ticketId: string) => string | null
): Promise<void> {
  log.info(`Processing push event: ${event.repo}@${event.branch}, ${event.commits.length} commit(s)`);

  for (const commit of event.commits) {
    const refs = extractTaskRefs(commit.message);
    if (refs.length === 0) continue;

    log.info(`Commit ${commit.id.substring(0, 7)} references tasks: ${refs.join(", ")}`);

    for (const ticketId of refs) {
      const roomId = resolveRoom(ticketId);
      if (!roomId) {
        log.debug(`No room found for ticket: ${ticketId}`);
        continue;
      }

      try {
        await notifyTaskRoom(roomId, commit, event.repo, event.branch, event.provider);
        log.info(`Notified room ${roomId} about commit ${commit.id.substring(0, 7)}`);
      } catch (err) {
        log.error(`Failed to notify room ${roomId}: ${err}`);
      }
    }
  }
}

/**
 * Parse a GitHub webhook push event payload into a normalized GitPushEvent.
 */
export function parseGitHubPush(body: Record<string, unknown>): GitPushEvent | null {
  const repo = (body.repository as Record<string, string>)?.full_name ?? "";
  const ref = (body.ref as string) ?? "";
  const branch = ref.replace("refs/heads/", "");

  const rawCommits = (body.commits as Array<Record<string, string>>) ?? [];
  if (rawCommits.length === 0) return null;

  return {
    provider: "github",
    repo,
    branch,
    commits: rawCommits.map(c => ({
      id: c.id ?? "",
      message: c.message ?? "",
      author: getAuthorName(c.author),
      url: c.url ?? undefined
    }))
  };
}

/**
 * Parse a GitLab webhook push event payload into a normalized GitPushEvent.
 */
export function parseGitLabPush(body: Record<string, unknown>): GitPushEvent | null {
  const repo = (body.project as Record<string, string>)?.path_with_namespace ?? "";
  const ref = (body.ref as string) ?? "";
  const branch = ref.replace("refs/heads/", "");

  const rawCommits = (body.commits as Array<Record<string, string>>) ?? [];
  if (rawCommits.length === 0) return null;

  return {
    provider: "gitlab",
    repo,
    branch,
    commits: rawCommits.map(c => ({
      id: c.id ?? "",
      message: c.message ?? "",
      author: getAuthorName(c.author),
      url: c.url ?? undefined
    }))
  };
}

export function verifyGitHubSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = signature.slice("sha256=".length);
  const computed = createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const computedBuffer = Buffer.from(computed, "hex");
  if (expectedBuffer.length !== computedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, computedBuffer);
}

export function verifyGitLabToken(token: string | null, secret: string): boolean {
  if (!token) return false;
  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(secret);
  if (tokenBuffer.length !== secretBuffer.length) return false;
  return timingSafeEqual(tokenBuffer, secretBuffer);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getAuthorName(author: unknown): string {
  if (typeof author === "string") return author;
  if (author && typeof author === "object" && "name" in author) {
    return String((author as { name?: unknown }).name ?? "");
  }
  return "";
}
