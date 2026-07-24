import { getContext, setContext } from 'svelte';
import type { MatrixClient } from 'matrix-js-sdk';
import type { Project } from '$lib/matrix/types';
import { roomToProject, isSpaceRoom } from '$lib/matrix/room-utils';
import { measureSync } from '$lib/utils/performance';
import { t } from '$lib/i18n';
import {
	createProjectRoom,
	updateProjectRoom,
	archiveProjectRoom,
	type ProjectTemplate
} from '$lib/matrix/project-repository';

export type { ProjectTemplate } from '$lib/matrix/project-repository';

const PROJECTS_CONTEXT_KEY = 'tamarix:projects';

function createProjectsState() {
	let projects = $state<Project[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	function fetchProjects(client: MatrixClient) {
		isLoading = projects.length === 0;
		error = null;
		try {
			projects = measureSync(
				'projects.fetch',
				() => {
					const rooms = client.getRooms();
					const spaceRooms = rooms.filter(isSpaceRoom);
					return spaceRooms.map(roomToProject);
				},
				{ currentProjects: projects.length }
			);
		} catch (e) {
			error = e instanceof Error ? e.message : t('error.load_projects');
		} finally {
			isLoading = false;
		}
	}

	async function createProject(
		client: MatrixClient,
		name: string,
		description?: string,
		template: ProjectTemplate = 'basic',
		encrypted?: boolean
	) {
		isLoading = true;
		error = null;
		try {
			const spaceRoomId = await createProjectRoom(client, name, description, template, encrypted);
			fetchProjects(client);
			return spaceRoomId;
		} catch (e) {
			error = e instanceof Error ? e.message : t('error.create_project');
		} finally {
			isLoading = false;
		}
	}

	function getProjectById(roomId: string): Project | undefined {
		return projects.find((p) => p.roomId === roomId);
	}

	async function updateProject(
		client: MatrixClient,
		roomId: string,
		options: { name?: string; topic?: string }
	) {
		error = null;
		try {
			await updateProjectRoom(client, roomId, options);
			fetchProjects(client);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update project';
		}
	}

	async function archiveProject(client: MatrixClient, roomId: string) {
		error = null;
		try {
			const current = projects.find((p) => p.roomId === roomId);
			await archiveProjectRoom(client, roomId, current?.description);
			fetchProjects(client);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to archive project';
		}
	}

	return {
		get projects() {
			return projects;
		},
		get isLoading() {
			return isLoading;
		},
		get error() {
			return error;
		},
		fetchProjects,
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
