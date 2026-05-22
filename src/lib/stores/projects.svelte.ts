import { getContext, setContext } from "svelte";
import type { MatrixClient } from "matrix-js-sdk";
import { Preset, RoomCreateTypeField, RoomType } from "matrix-js-sdk";
import type { Project } from "$lib/matrix/types";
import { roomToProject, isSpaceRoom } from "$lib/matrix/room-utils";
import { onSyncUpdate } from "$lib/matrix/client";

const PROJECTS_CONTEXT_KEY = "tamarix:projects";

function createProjectsState() {
  let projects = $state<Project[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let syncCleanup: (() => void) | null = null;

  function fetchProjects(client: MatrixClient) {
    isLoading = true;
    error = null;
    try {
      const rooms = client.getRooms();
      const spaceRooms = rooms.filter(isSpaceRoom);
      projects = spaceRooms.map(roomToProject);
    } catch (e) {
      error = e instanceof Error ? e.message : "加载项目失败";
    } finally {
      isLoading = false;
    }
  }

  /**
   * Start listening for sync updates to automatically refresh project list.
   * Call this after login when the client is ready.
   */
  function startSyncListener(client: MatrixClient) {
    stopSyncListener();
    syncCleanup = onSyncUpdate(client, () => {
      fetchProjects(client);
    });
  }

  function stopSyncListener() {
    if (syncCleanup) {
      syncCleanup();
      syncCleanup = null;
    }
  }

  async function createProject(
    client: MatrixClient,
    name: string,
    description?: string
  ) {
    isLoading = true;
    error = null;
    try {
      const result = await client.createRoom({
        name,
        topic: description,
        preset: Preset.PrivateChat,
        creation_content: {
          [RoomCreateTypeField]: RoomType.Space
        },
        initial_state: []
      });

      fetchProjects(client);
      return result.room_id;
    } catch (e) {
      error = e instanceof Error ? e.message : "创建项目失败";
      return undefined;
    } finally {
      isLoading = false;
    }
  }

  function getProjectById(roomId: string): Project | undefined {
    return projects.find(p => p.roomId === roomId);
  }

  return {
    get projects() { return projects; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    fetchProjects,
    startSyncListener,
    stopSyncListener,
    createProject,
    getProjectById
  };
}

export type ProjectsStore = ReturnType<typeof createProjectsState>;

export function setProjectsContext() {
  const projects = createProjectsState();
  setContext(PROJECTS_CONTEXT_KEY, projects);
  return projects;
}

export function getProjectsContext(): ProjectsStore {
  return getContext<ProjectsStore>(PROJECTS_CONTEXT_KEY);
}
