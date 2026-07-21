import { getContext, setContext } from "svelte";
import type { MatrixClient } from "matrix-js-sdk";
import type { WorklogEntry } from "$lib/matrix/types";
import { addWorklog as addWorklogEvent, removeWorklog as removeWorklogEvent, getWorklogs as getWorklogsFromRoom } from "$lib/matrix/task-repository";
import { t } from "$lib/i18n";

const WORKLOGS_CONTEXT_KEY = "tamarix:worklogs";

function createWorklogsState() {
  let worklogs = $state<WorklogEntry[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  function loadWorklogs(client: MatrixClient, roomId: string) {
    isLoading = true;
    error = null;
    try {
      const room = client.getRoom(roomId);
      if (!room) {
        worklogs = [];
        return;
      }
      worklogs = getWorklogsFromRoom(room);
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.load_tasks");
    } finally {
      isLoading = false;
    }
  }

  async function addWorklogEntry(client: MatrixClient, roomId: string, entry: WorklogEntry) {
    error = null;
    try {
      await addWorklogEvent(client, roomId, entry);
      loadWorklogs(client, roomId);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to add worklog";
    }
  }

  async function removeWorklogEntry(client: MatrixClient, roomId: string, stateKey: string) {
    error = null;
    try {
      await removeWorklogEvent(client, roomId, stateKey);
      loadWorklogs(client, roomId);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to remove worklog";
    }
  }

  let totalHours = $derived(
    worklogs.reduce((sum, w) => sum + w.hours, 0)
  );

  /** Estimate vs actual comparison */
  function getEstimateVsActual(estimateHours: number | undefined): { estimated: number; actual: number; diff: number } {
    const estimated = estimateHours ?? 0;
    const actual = totalHours;
    return { estimated, actual, diff: estimated - actual };
  }

  return {
    get worklogs() { return worklogs; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    get totalHours() { return totalHours; },
    loadWorklogs,
    addWorklogEntry,
    removeWorklogEntry,
    getEstimateVsActual
  };
}

export type WorklogsStore = ReturnType<typeof createWorklogsState>;

export function setWorklogsContext() {
  const worklogs = createWorklogsState();
  setContext(WORKLOGS_CONTEXT_KEY, worklogs);
  return worklogs;
}

export function getWorklogsContext(): WorklogsStore {
  return getContext<WorklogsStore>(WORKLOGS_CONTEXT_KEY);
}
