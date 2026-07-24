/**
 * Tamarix AS -- HTTP API
 *
 * Provides REST endpoints for search, task listing,
 * project statistics, E2EE status, and health checks.
 *
 * Routes are defined as a table for readability and testability.
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

// ─── Auth ────────────────────────────────────────────────────────

function verifyAuth(request: Request): boolean {
  if (!apiToken) return true;

  const auth = request.headers.get("Authorization");
  if (!auth) return false;

  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return false;

  return parts[1] === apiToken;
}

// ─── Route table ─────────────────────────────────────────────────

type RouteHandler = (request: Request, url: URL, params: Record<string, string>) => Promise<Response> | Response;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
  auth: boolean;
}

function route(method: string, path: string, handler: RouteHandler, auth = true): Route {
  const paramNames: string[] = [];
  const regex = path.replace(/:(\w+)/g, (_match, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  return { method, pattern: new RegExp(`^${regex}$`), paramNames, handler, auth };
}

const routes: Route[] = [
  // Health — no auth
  route("GET", "/api/health", () => handleHealth(), false),

  // Search
  route("GET", "/api/search", (_req, url) => handleSearch(url)),

  // Tasks
  route("GET", "/api/tasks", (_req, url) => handleTasks(url)),

  // Stats
  route("GET", "/api/stats", (_req, url) => handleStats(url)),

  // E2EE status
  route("GET", "/api/rooms/:roomId/e2ee-status", (_req, _url, p) => handleE2eeStatus(p.roomId)),

  // Git config
  route("GET", "/api/git/config/:projectId", (_req, _url, p) => handleGitConfig(p.projectId)),

  // Git webhook
  route("POST", "/api/git/webhook", (req, url) => handleGitWebhook(req, url)),
];

// ─── Router ──────────────────────────────────────────────────────

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    for (const r of routes) {
      if (request.method !== r.method) continue;

      const match = path.match(r.pattern);
      if (!match) continue;

      // Build params object
      const params: Record<string, string> = {};
      for (let i = 0; i < r.paramNames.length; i++) {
        params[r.paramNames[i]] = decodeURIComponent(match[i + 1]);
      }

      // Auth check (health endpoint skips auth)
      if (r.auth && !verifyAuth(request)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      return await r.handler(request, url, params);
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    log.error(`API error for ${path}: ${err}`);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── Handlers ────────────────────────────────────────────────────

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

function handleStats(url: URL): Response {
  const project = url.searchParams.get("project");
  if (!project) {
    return Response.json({ error: "Missing query parameter 'project'" }, { status: 400 });
  }

  const stats = getProjectStats(project);
  return Response.json(stats);
}

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
