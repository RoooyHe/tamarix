import { getContext, setContext } from "svelte";
import type { MatrixClient } from "matrix-js-sdk";
import type { VersionInfo } from "$lib/matrix/types";
import { setVersion as setVersionEvent, getVersions as getVersionsFromRoom } from "$lib/matrix/state-events";
import { onSyncUpdate } from "$lib/matrix/client";
import { t } from "$lib/i18n";

const VERSIONS_CONTEXT_KEY = "tamarix:versions";

function createVersionsState() {
  let versions = $state<VersionInfo[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let syncCleanup: (() => void) | null = null;

  function fetchVersions(client: MatrixClient, spaceRoomId: string) {
    isLoading = true;
    error = null;
    try {
      const room = client.getRoom(spaceRoomId);
      if (!room) {
        versions = [];
        return;
      }
      versions = getVersionsFromRoom(room);
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.load_projects");
    } finally {
      isLoading = false;
    }
  }

  async function createVersion(
    client: MatrixClient,
    spaceRoomId: string,
    version: VersionInfo
  ) {
    error = null;
    try {
      const versionKey = version.name.replace(/\s+/g, "_").toLowerCase();
      await setVersionEvent(client, spaceRoomId, versionKey, version);
      fetchVersions(client, spaceRoomId);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to create version";
    }
  }

  async function updateVersion(
    client: MatrixClient,
    spaceRoomId: string,
    versionKey: string,
    version: VersionInfo
  ) {
    error = null;
    try {
      await setVersionEvent(client, spaceRoomId, versionKey, version);
      fetchVersions(client, spaceRoomId);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to update version";
    }
  }

  function startSyncListener(client: MatrixClient, spaceRoomId: string) {
    stopSyncListener();
    syncCleanup = onSyncUpdate(client, () => {
      fetchVersions(client, spaceRoomId);
    });
  }

  function stopSyncListener() {
    if (syncCleanup) {
      syncCleanup();
      syncCleanup = null;
    }
  }

  return {
    get versions() { return versions; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    fetchVersions,
    createVersion,
    updateVersion,
    startSyncListener,
    stopSyncListener
  };
}

export type VersionsStore = ReturnType<typeof createVersionsState>;

export function setVersionsContext() {
  const versions = createVersionsState();
  setContext(VERSIONS_CONTEXT_KEY, versions);
  return versions;
}

export function getVersionsContext(): VersionsStore {
  return getContext<VersionsStore>(VERSIONS_CONTEXT_KEY);
}
