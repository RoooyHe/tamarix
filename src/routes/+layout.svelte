<script lang="ts">
	import '../app.css';
	import { setAuthContext, getAuthContext } from '$lib/stores/auth.svelte';
	import { setTasksContext } from '$lib/stores/tasks.svelte';
	import { setProjectsContext } from '$lib/stores/projects.svelte';
	import { setCommentsContext } from '$lib/stores/comments.svelte';
	import { setNotificationsContext } from '$lib/stores/notifications.svelte';
	import { setRecentTasksContext } from '$lib/stores/recent-tasks.svelte';
	import { setIntegrationsContext } from '$lib/stores/integrations.svelte';
	import { setAccountContext } from '$lib/stores/account.svelte';
	import { setUiContext } from '$lib/stores/ui.svelte';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import KeyboardShortcuts from '$lib/components/common/KeyboardShortcuts.svelte';
	import CommandPalette from '$lib/components/common/CommandPalette.svelte';
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { initLocale, t } from '$lib/i18n';
	import { createSyncManager } from '$lib/matrix/sync-manager';
	import { useKeyboard } from '$lib/hooks/use-keyboard';

	let { children } = $props();
	const RESTORE_BLOCKING_TIMEOUT_MS = 1500;

	// Set up all stores at layout level
	let auth = setAuthContext();
	let tasks = setTasksContext();
	let projects = setProjectsContext();
	let comments = setCommentsContext();
	let notifications = setNotificationsContext();
	let recentTasks = setRecentTasksContext();
	let integrations = setIntegrationsContext();
	let account = setAccountContext();
	let ui = setUiContext();

	// Sync manager: stores register refresh callbacks, layout manages lifecycle
	let syncManager = createSyncManager();
	syncManager.subscribe((client) => projects.fetchProjects(client));

	let isRestoring = $state(true);
	let shortcutsOpen = $state({ value: false });
	let commandPaletteOpen = $state({ value: false });

	const handleKeydown = useKeyboard({
		get isLoggedIn() {
			return auth.isLoggedIn;
		},
		shortcutsOpen,
		commandPaletteOpen
	});

	onMount(async () => {
		initLocale();
		// Try to restore previous session
		const restorePromise = auth.restore();
		await Promise.race([
			restorePromise,
			new Promise<void>((resolve) => setTimeout(resolve, RESTORE_BLOCKING_TIMEOUT_MS))
		]);
		isRestoring = false;
		void restorePromise.catch(() => undefined);
	});

	// Watch for login state changes to load data, start sync listeners, and redirect
	$effect(() => {
		const isLoggedIn = auth.isLoggedIn;
		const client = auth.client;

		untrack(() => {
			if (isLoggedIn && client) {
				projects.fetchProjects(client);
				syncManager.start(client);
				notifications.startSyncListener(client);
				notifications.startDueCheck(() => tasks.tasks);
			} else {
				syncManager.stop();
				notifications.stopSyncListener();
				notifications.stopDueCheck();
			}
		});
	});
</script>

<svelte:head>
	<title>Tamarix</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

{#if isRestoring}
	<div class="flex h-screen items-center justify-center bg-background">
		<div class="text-muted-foreground">{t('restore.restoring')}</div>
	</div>
{:else if auth.isLoggedIn}
	<AppShell>
		{@render children()}
	</AppShell>
{:else}
	{@render children()}
{/if}

<KeyboardShortcuts bind:open={shortcutsOpen.value} />
<CommandPalette bind:open={commandPaletteOpen.value} />
