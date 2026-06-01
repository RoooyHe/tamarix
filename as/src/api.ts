/**
 * Tamarix AS -- HTTP API
 *
 * Provides REST endpoints for search, task listing,
 * project statistics, E2EE status, and health checks.
 */

import { getDb } from "./db.js";
import { searchTasksFTS, getTasksByProject, getProjectStats, getRoomIdByTicketId } from "./indexer.js";
import { getE2eeStatus } from "./e2ee-guard.js";
import { createLogger } from "./logger.js";
import { getStateEvent } from "./bot.js";
import {
  handleGitPush,
  parseGitHubPush,
  parseGitLabPush,
  verifyGitHubSignature,
  verifyGitLabToken,
  type GitProvider
} from "./git-bridge.js";

const log = createLogger("api");

let apiToken: string = "";

/**
 * Initialize the API with authentication token.
 */
export function initApi(token: string): void {
  apiToken = token;
}

/**
 * Verify API authentication.
 */
function verifyAuth(request: Request): boolean {
  if (!apiToken) return true; // No token configured = no auth required

  const auth = request.headers.get("Authorization");
  if (!auth) return false;

  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return false;

  return parts[1] === apiToken;
}

/**
 * Handle an incoming HTTP request.
 * Routes are matched against the URL pathname.
 */
export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Health check - no auth required
    if (path === "/api/health") {
      return handleHealth();
    }

    // All other endpoints require auth
    if (!verifyAuth(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Search
    if (path === "/api/search" && request.method === "GET") {
      return handleSearch(url);
    }

    // Task list
    if (path === "/api/tasks" && request.method === "GET") {
      return handleTasks(url);
    }

    // Stats
    if (path === "/api/stats" && request.method === "GET") {
      return handleStats(url);
    }

    // E2EE status
    if (path.startsWith("/api/rooms/") && path.endsWith("/e2ee-status") && request.method === "GET") {
      const roomId = decodeURIComponent(path.slice("/api/rooms/".length, -"/e2ee-status".length));
      return handleE2eeStatus(roomId);
    }

    if (path.startsWith("/api/git/config/") && request.method === "GET") {
      const projectId = decodeURIComponent(path.slice("/api/git/config/".length));
      return await handleGitConfig(projectId);
    }

    if (path === "/api/git/webhook" && request.method === "POST") {
      return await handleGitWebhook(request, url);
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    log.error(`API error for ${path}: ${err}`);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/health
 */
function handleHealth(): Response {
  const db = getDb();
  let dbOk = false;
  try {
    db.prepare("SELECT 1").get();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  return Response.json({
    status: dbOk ? "ok" : "degraded",
    bot: "connected",
    database: dbOk ? "ok" : "error",
    timestamp: new Date().toISOString()
  });
}

/**
 * GET /api/search?q={query}&project={roomId}&status={status}&assignee={userId}&limit={n}
 */
function handleSearch(url: URL): Response {
  const query = url.searchParams.get("q");
  if (!query) {
    return Response.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  const project = url.searchParams.get("project") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const assignee = url.searchParams.get("assignee") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  const results = searchTasksFTS(query, project, status, assignee, limit);
  return Response.json({ results, count: results.length });
}

/**
 * GET /api/tasks?project={roomId}&status={status}&page={n}&limit={n}
 */
function handleTasks(url: URL): Response {
  const project = url.searchParams.get("project");
  if (!project) {
    return Response.json({ error: "Missing query parameter 'project'" }, { status: 400 });
  }

  const status = url.searchParams.get("status") ?? undefined;
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  const results = getTasksByProject(project, status, page, limit);
  return Response.json({ results, page, limit });
}

/**
 * GET /api/stats?project={roomId}
 */
function handleStats(url: URL): Response {
  const project = url.searchParams.get("project");
  if (!project) {
    return Response.json({ error: "Missing query parameter 'project'" }, { status: 400 });
  }

  const stats = getProjectStats(project);
  return Response.json(stats);
}

/**
 * GET /api/rooms/{roomId}/e2ee-status
 */
async function handleE2eeStatus(roomId: string): Promise<Response> {
  const status = await getE2eeStatus(roomId);
  return Response.json(status);
}

interface GitConfig {
  provider: GitProvider;
  repoUrl: string;
  webhookSecret: string;
}

async function handleGitConfig(projectId: string): Promise<Response> {
  const config = await getStateEvent<GitConfig>(projectId, "com.tamarix.git_config");
  if (!config) return Response.json({ configured: false });
  return Response.json({
    configured: true,
    provider: config.provider,
    repoUrl: config.repoUrl,
    webhookUrl: `/api/git/webhook?project=${encodeURIComponent(projectId)}`
  });
}

async function handleGitWebhook(request: Request, url: URL): Promise<Response> {
  const projectId = url.searchParams.get("project");
  if (!projectId) {
    return Response.json({ error: "Missing query parameter 'project'" }, { status: 400 });
  }

  const config = await getStateEvent<GitConfig>(projectId, "com.tamarix.git_config");
  if (!config) {
    return Response.json({ error: "Git integration not configured" }, { status: 404 });
  }

  const rawBody = await request.text();
  const provider = detectGitProvider(request, config.provider);

  if (provider === "github") {
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyGitHubSignature(rawBody, signature, config.webhookSecret)) {
      return Response.json({ error: "Invalid GitHub signature" }, { status: 401 });
    }
  } else {
    const token = request.headers.get("x-gitlab-token");
    if (!verifyGitLabToken(token, config.webhookSecret)) {
      return Response.json({ error: "Invalid GitLab token" }, { status: 401 });
    }
  }

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const event = provider === "github" ? parseGitHubPush(body) : parseGitLabPush(body);
  if (!event) {
    return Response.json({ ok: true, ignored: true });
  }

  await handleGitPush(event, getRoomIdByTicketId);
  return Response.json({ ok: true, commits: event.commits.length });
}

function detectGitProvider(request: Request, fallback: GitProvider): GitProvider {
  if (request.headers.get("x-github-event")) return "github";
  if (request.headers.get("x-gitlab-event")) return "gitlab";
  return fallback;
}
