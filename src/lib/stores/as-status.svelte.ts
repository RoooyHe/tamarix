/**
 * Tamarix -- AS Status Store
 *
 * Monitors Application Service availability and provides
 * E2EE degradation status for the current task room.
 * Runs entirely client-side, pinging the AS health endpoint.
 */

import { onMount } from 'svelte';
import { asFetch } from '$lib/matrix/as-client';

const AS_STATUS_KEY = 'tamarix:as_status';

function createAsStatusState() {
	let asAvailable = $state(false);
	let asUrl = $state('');
	let lastChecked = $state<number | null>(null);
	let checking = $state(false);

	// E2EE status cache per room
	let e2eeStatusCache = $state<
		Map<
			string,
			{ encrypted: boolean; degraded_features: Array<{ id: string; description: string }> }
		>
	>(new Map());

	// Load saved AS URL
	onMount(() => {
		if (typeof localStorage !== 'undefined') {
			const saved = localStorage.getItem(AS_STATUS_KEY);
			if (saved) {
				asUrl = saved;
				checkHealth();
			}
		}
	});

	async function checkHealth(): Promise<boolean> {
		if (!asUrl) {
			asAvailable = false;
			return false;
		}

		checking = true;
		try {
			const data = await asFetch<{ status: string }>(asUrl, '/api/health');
			asAvailable = data.status === 'ok' || data.status === 'degraded';
		} catch {
			asAvailable = false;
		} finally {
			checking = false;
			lastChecked = Date.now();
		}

		return asAvailable;
	}

	function setAsUrl(url: string) {
		asUrl = url;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(AS_STATUS_KEY, url);
		}
		if (url) {
			checkHealth();
		} else {
			asAvailable = false;
		}
	}

	async function checkE2eeStatus(roomId: string): Promise<{
		encrypted: boolean;
		degraded_features: Array<{ id: string; description: string }>;
	} | null> {
		if (!asAvailable || !asUrl) return null;

		// Check cache
		const cached = e2eeStatusCache.get(roomId);
		if (cached) return cached;

		try {
			const data = await asFetch<{
				encrypted: boolean;
				degraded_features: Array<{ id: string; description: string }>;
			}>(asUrl, `/api/rooms/${encodeURIComponent(roomId)}/e2ee-status`);
			e2eeStatusCache.set(roomId, data);
			return data;
		} catch {
			// AS unavailable
		}

		return null;
	}

	function clearE2eeCache(roomId?: string) {
		if (roomId) {
			e2eeStatusCache.delete(roomId);
		} else {
			e2eeStatusCache.clear();
		}
	}

	return {
		get asAvailable() {
			return asAvailable;
		},
		get asUrl() {
			return asUrl;
		},
		get lastChecked() {
			return lastChecked;
		},
		get checking() {
			return checking;
		},
		checkHealth,
		setAsUrl,
		checkE2eeStatus,
		clearE2eeCache
	};
}

export type AsStatusStore = ReturnType<typeof createAsStatusState>;

let _instance: AsStatusStore | null = null;

export function getAsStatusStore(): AsStatusStore {
	if (!_instance) {
		_instance = createAsStatusState();
	}
	return _instance;
}
