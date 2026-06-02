import { getContext, setContext } from "svelte";
import type { MatrixClient } from "matrix-js-sdk";
import { Preset, RoomCreateTypeField, RoomType, EventType } from "matrix-js-sdk";
import type { Project } from "$lib/matrix/types";
import { roomToProject, isSpaceRoom } from "$lib/matrix/room-utils";
import { onSyncUpdate } from "$lib/matrix/client";
import { measureSync } from "$lib/utils/performance";
import { t } from "$lib/i18n";

const PROJECTS_CONTEXT_KEY = "tamarix:projects";

export type ProjectTemplate = "basic" | "kanban" | "scrum";

const TEMPLATE_ROOMS: Record<string, string[]> = {
  kanban: ["Backlog", "Selected", "In Progress", "Done"],
  scrum: ["Todo", "In Progress", "Review", "Done"]
};

/** m.room.encryption initial_state entry for E2EE rooms */
const ENCRYPTION_EVENT = {
  type: EventType.RoomEncryption,
  state_key: "",
  content: { algorithm: "m.megolm.v1.aes-sha2" }
} as const;

function createProjectsState() {
  let projects = $state<Project[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let syncCleanup: (() => void) | null = null;

  function fetchProjects(client: MatrixClient) {
    isLoading = projects.length === 0;
    error = null;
    try {
      projects = measureSync("projects.fetch", () => {
        const rooms = client.getRooms();
        const spaceRooms = rooms.filter(isSpaceRoom);
        return spaceRooms.map(roomToProject);
      }, { currentProjects: projects.length });
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.load_projects");
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
    }, { debounceMs: 250 });
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
    description?: string,
    template: ProjectTemplate = "basic",
    encrypted?: boolean
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
        initial_state: encrypted
          ? [{ type: EventType.RoomEncryption, state_key: "", content: { algorithm: "m.megolm.v1.aes-sha2" } }]
          : []
      });

      const spaceRoomId = result.room_id;
      const domain = client.getDomain();

      // Create template child rooms
      const rooms = TEMPLATE_ROOMS[template];
      if (rooms) {
        for (const roomName of rooms) {
          const initial_state: Record<string, unknown>[] = [
            { type: EventType.SpaceParent, state_key: spaceRoomId!, content: { via: [domain!] } }
          ];
          if (encrypted) {
            initial_state.push({ ...ENCRYPTION_EVENT });
          }
          const roomResult = await client.createRoom({
            name: roomName,
            preset: Preset.PrivateChat,
            initial_state: initial_state as any
          });
          // Add child to space
          await client.sendStateEvent(
            spaceRoomId!,
            EventType.SpaceChild,
            { via: [domain!], order: String(rooms.indexOf(roomName)).padStart(3, "0") },
            roomResult.room_id!
          );
        }
      }

      fetchProjects(client);
      return spaceRoomId;
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.create_project");
    } finally {
      isLoading = false;
    }
  }

  function getProjectById(roomId: string): Project | undefined {
    return projects.find(p => p.roomId === roomId);
  }

  async function updateProject(
    client: MatrixClient,
    roomId: string,
    options: { name?: string; topic?: string }
  ) {
    error = null;
    try {
      if (options.name) {
        await client.setRoomName(roomId, options.name);
      }
      if (options.topic !== undefined) {
        await client.setRoomTopic(roomId, options.topic);
      }
      fetchProjects(client);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to update project";
    }
  }

  async function archiveProject(client: MatrixClient, roomId: string) {
    error = null;
    try {
      await client.setRoomTopic(roomId, `[archived] ${projects.find(p => p.roomId === roomId)?.description ?? ""}`);
      fetchProjects(client);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to archive project";
    }
  }

  return {
    get projects() { return projects; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    fetchProjects,
    startSyncListener,
    stopSyncListener,
    createProject,
    getProjectById,
    updateProject,
    archiveProject
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
