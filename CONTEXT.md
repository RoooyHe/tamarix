# Tamarix Domain Glossary

## Matrix State Layer

- **event-types** — custom Matrix event type constants (`TAMARIX_EVENT_TYPES`). No dependencies. Lives in `src/lib/matrix/event-types.ts`.
- **task-types** — all domain interfaces and type aliases (Task, Project, WorklogEntry, etc.) plus ordering constants. No dependencies. Lives in `src/lib/matrix/task-types.ts`.
- **labels** — i18n-coupled label helpers (`getStatusLabel`, `getPriorityLabel`, `getTypeLabel`). Depends on `$lib/i18n` and `task-types`. Lives in `src/lib/matrix/labels.ts`.
- **types** — barrel re-export of `event-types`, `task-types`, and `labels`. Backward-compatible. Lives in `src/lib/matrix/types.ts`.
- **state-primitives** — low-level Matrix state CRUD seam (`getStateEvent`, `sendStateEvent`). All domain modules depend on this. Lives in `src/lib/matrix/state-primitives.ts`.
- **templates** — task template CRUD (create, get, delete). Templates define default fields for new tasks. Lives in `src/lib/matrix/templates.ts`.
- **custom-fields** — custom field definition and value CRUD. Project-level definitions, task-level values. Lives in `src/lib/matrix/custom-fields.ts`.
- **approvals** — approval state and config CRUD. Task-level approval status, project-level approval policy. Lives in `src/lib/matrix/approvals.ts`.
- **approval-sync** — approval reaction counting, sync-from-reactions, request/approve/reject handlers. Testable without Svelte. Lives in `src/lib/matrix/approval-sync.ts`.
- **sort-order** — task sort order state. Lives in `src/lib/matrix/sort-order.ts`.
- **external-links** — external link CRUD on tasks (URLs with labels). Lives in `src/lib/matrix/external-links.ts`.
- **git-config** — Git provider configuration per project. Lives in `src/lib/matrix/git-config.ts`.
- **integrations** — third-party integration CRUD per project. Lives in `src/lib/matrix/integrations.ts`.

## Task Data Layer

- **task-repository** — core task CRUD: `getTask`, `getTasks`, `patchTask`, `bulkPatch`, `createTask`. Depends on state-primitives. Lives in `src/lib/matrix/task-repository.ts`.
- **project-repository** — project room CRUD: `createProjectRoom`, `updateProjectRoom`, `archiveProjectRoom`. Template room creation, SpaceChild events. Lives in `src/lib/matrix/project-repository.ts`.
- **watchers** — watcher CRUD: `getWatchers`, `addWatcher`, `removeWatcher`. Lives in `src/lib/matrix/watchers.ts`.
- **task-versions** — task version get/set: `getTaskVersion`, `setTaskVersion`. Lives in `src/lib/matrix/task-versions.ts`.
- **worklog-service** — worklog CRUD: `getWorklogs`, `addWorklog`, `removeWorklog`. Lives in `src/lib/matrix/worklog-service.ts`.
- **project-versions** — project version milestones: `getVersions`, `setVersion`. Lives in `src/lib/matrix/project-versions.ts`.
- **notification-prefs** — notification preference CRUD: `getNotificationPrefs`, `setNotificationPrefs`. Lives in `src/lib/matrix/notification-prefs.ts`.

## Event Layer

- **timeline-bus** — singleton event bus for `RoomEvent.Timeline`. Single listener on the Matrix client, dispatches to typed subscribers. Initialized by sync manager on login, destroyed on logout. Lives in `src/lib/matrix/timeline-bus.ts`.
- **notification-timeline** — timeline listener that generates notifications from status changes, assignments, and mentions. Depends on timeline-bus and watchers. Lives in `src/lib/matrix/notification-timeline.ts`.
- **due-checker** — periodic timer that checks tasks for due-date reminders. Persists reminded IDs to localStorage. Lives in `src/lib/matrix/due-checker.ts`.

## Store Layer

- **task-cache** — in-memory task cache with signature-based diffing. Maps, indexing, room refresh, query. Non-reactive, testable in isolation. Lives in `src/lib/stores/task-cache.ts`.
- **task-writes** — all task mutations (single + bulk) with optimistic update and rollback. Depends on task-cache. Non-reactive, testable in isolation. Lives in `src/lib/stores/task-writes.ts`.
- **tasks store** — thin Svelte reactive wrapper. Wires cache↔writes, owns `$state`, exposes public API. Lives in `src/lib/stores/tasks.svelte.ts`.
- **recent-tasks** — localStorage-backed recent task list. Cross-component state shared between task detail and dashboard. Lives in `src/lib/stores/recent-tasks.svelte.ts`.
- **account** — threePid management with multi-step bind flow. Context-based, set in layout. Lives in `src/lib/stores/account.svelte.ts`.
- **integrations** — third-party integration connections via AS API. Context-based, set in layout. Lives in `src/lib/stores/integrations.svelte.ts`.

### Collapsed stores (consumers use local state + repository directly)
- ~~versions store~~ — was pure delegation to `getVersions`/`setVersion`. Consumers now manage local `$state` and call repository functions.
- ~~worklogs store~~ — was pure delegation to `getWorklogs`/`addWorklog`/`removeWorklog`. Inlined into `WorklogPanel.svelte`.

## AS Communication Layer

- **as-client** — shared HTTP client for Application Service API calls. Handles URL normalization, timeout, and error normalization. Single seam for all AS HTTP communication. Lives in `src/lib/matrix/as-client.ts`.

## Credential Lifecycle

- **client-manager** — single seam for entire Matrix client lifecycle: login, SSO token login, restore, logout, sync start/stop, `onSyncUpdate`. Owns `STORAGE_KEYS`, `persistCredentials`, `initAndStart`, `startClientSync`. No global singleton — client lives inside the manager closure. Lives in `src/lib/matrix/client-manager.ts`.
- **auth** — auth operations: registration, SSO flow, homeserver discovery, login flows. Delegates credential persistence and client init to `client-manager`. Owns `SSO_STATE_KEY`. Lives in `src/lib/matrix/auth.ts`.
- **auth store** — Svelte reactive wrapper around `client-manager`. Calls `manager.login()`, `manager.loginWithToken()`, `manager.restore()`, `manager.logout()` and syncs state. Lives in `src/lib/stores/auth.svelte.ts`.
