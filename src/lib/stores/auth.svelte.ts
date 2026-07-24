import { getContext, setContext } from 'svelte';
import type { MatrixClient } from 'matrix-js-sdk';
import { createClientManager, type ClientManager } from '$lib/matrix/client-manager';

const AUTH_CONTEXT_KEY = 'tamarix:auth';

function createAuthState() {
	let isLoggedIn = $state(false);
	let userId = $state<string | null>(null);
	let client = $state<MatrixClient | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	const manager = createClientManager();

	function syncState() {
		userId = manager.getUserId();
		client = manager.getClient();
		isLoggedIn = manager.hasClient();
	}

	async function login(baseUrl: string, username: string, password: string) {
		isLoading = true;
		error = null;
		try {
			await manager.login(baseUrl, username, password);
			syncState();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Login failed';
			isLoggedIn = false;
		} finally {
			isLoading = false;
		}
	}

	/** Login via SSO token (called after SSO redirect callback) */
	async function loginWithToken(baseUrl: string, loginToken: string) {
		isLoading = true;
		error = null;
		try {
			await manager.loginWithToken(baseUrl, loginToken);
			syncState();
		} catch (e) {
			error = e instanceof Error ? e.message : 'SSO login failed';
			isLoggedIn = false;
		} finally {
			isLoading = false;
		}
	}

	async function restore() {
		isLoading = true;
		error = null;
		try {
			const restoredUserId = await manager.restore();
			if (restoredUserId) {
				syncState();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Session restore failed';
		} finally {
			isLoading = false;
		}
	}

	async function logout() {
		try {
			await manager.logout();
		} catch {
			// Ignore
		}
		syncState();
	}

	return {
		get isLoggedIn() {
			return isLoggedIn;
		},
		get userId() {
			return userId;
		},
		get client() {
			return client;
		},
		get isLoading() {
			return isLoading;
		},
		get error() {
			return error;
		},
		login,
		loginWithToken,
		restore,
		logout
	};
}

export type AuthStore = ReturnType<typeof createAuthState>;

export function setAuthContext() {
	const auth = createAuthState();
	setContext(AUTH_CONTEXT_KEY, auth);
	return auth;
}

export function getAuthContext(): AuthStore {
	return getContext<AuthStore>(AUTH_CONTEXT_KEY);
}
