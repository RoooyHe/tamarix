import type { MatrixClient } from "matrix-js-sdk";
import { onSyncUpdate } from "./client-manager";
import { initTimelineBus, stopTimelineBus } from "./timeline-bus";

type RefreshFn = (client: MatrixClient) => void;

/**
 * Manages sync listeners for multiple stores.
 * Stores register their refresh callback via `subscribe()`.
 * The layout calls `start(client)` / `stop()` on login/logout.
 *
 * Usage:
 * ```
 * const sync = createSyncManager();
 * sync.subscribe((client) => projects.fetchProjects(client));
 * sync.subscribe((client) => tasks.fetchTasksFromRooms(client, projectId));
 * sync.start(client);
 * // ...
 * sync.stop();
 * ```
 */
export function createSyncManager() {
  let fns: RefreshFn[] = [];
  let cleanup: (() => void) | null = null;

  /**
   * Register a refresh callback. Called on every sync tick.
   * Returns an unsubscribe function.
   */
  function subscribe(fn: RefreshFn): () => void {
    fns.push(fn);
    return () => {
      fns = fns.filter(f => f !== fn);
    };
  }

  /**
   * Start listening for sync updates. All registered callbacks
   * are invoked (debounced at 250ms) on each sync tick.
   * Automatically stops any previous listener.
   */
  function start(client: MatrixClient) {
    stop();
    initTimelineBus(client);
    cleanup = onSyncUpdate(client, () => {
      for (const fn of fns) {
        fn(client);
      }
    }, { debounceMs: 250 });
  }

  /**
   * Stop listening for sync updates and clear the listener.
   */
  function stop() {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    stopTimelineBus();
  }

  return { subscribe, start, stop };
}

export type SyncManager = ReturnType<typeof createSyncManager>;