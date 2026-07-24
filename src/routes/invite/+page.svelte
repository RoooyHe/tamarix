<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { getAuthContext } from '$lib/stores/auth.svelte';
	import { formatMatrixError } from '$lib/matrix/errors';
	import { t } from '$lib/i18n';

	let auth = getAuthContext();
	let roomId = $state<string | null>(null);
	let projectId = $state<string | null>(null);
	let viaServers = $state<string[]>([]);
	let isJoining = $state(false);
	let error = $state<string | null>(null);
	let joined = $state(false);
	let loginUrl = $state('/login');
	let registerUrl = $state('/register');

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		roomId = params.get('roomId') ?? params.get('room_id');
		projectId = params.get('projectId') ?? params.get('project_id') ?? roomId;
		viaServers = params
			.getAll('via')
			.flatMap((value) => value.split(','))
			.filter(Boolean);
		const redirectTo = encodeURIComponent('/invite' + window.location.search);
		loginUrl = resolve(`/login?redirectTo=${redirectTo}` as any);
		registerUrl = resolve(`/register?redirectTo=${redirectTo}` as any);

		if (auth.isLoggedIn) {
			void acceptInvite();
		}
	});

	async function acceptInvite() {
		if (!auth.client || !roomId) return;

		isJoining = true;
		error = null;
		try {
			await auth.client.joinRoom(roomId, viaServers.length > 0 ? { viaServers } : undefined);
			joined = true;
			await goto(resolve('/project/[id]', { id: projectId ?? roomId }));
		} catch (e) {
			error = formatMatrixError(e, t('invite.join_failed'));
		} finally {
			isJoining = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<div class="w-full max-w-md space-y-6 text-center">
		<div
			class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl mx-auto"
		>
			T
		</div>

		<div class="space-y-2">
			<h1 class="text-2xl font-bold text-foreground">{t('invite.title')}</h1>
			<p class="text-sm text-muted-foreground">{t('invite.subtitle')}</p>
		</div>

		{#if !roomId}
			<Alert variant="destructive">
				<AlertDescription>{t('invite.invalid')}</AlertDescription>
			</Alert>
		{:else if !auth.isLoggedIn}
			<div class="rounded-lg border border-border bg-card p-4 space-y-4 text-left">
				<div class="space-y-1">
					<p class="text-sm font-medium text-foreground">{t('invite.target')}</p>
					<p class="break-all font-mono text-xs text-muted-foreground">{roomId}</p>
				</div>
				<div class="flex gap-2">
					<Button class="flex-1" href={loginUrl}>{t('login.login')}</Button>
					<Button class="flex-1" variant="outline" href={registerUrl}
						>{t('register.create_account')}</Button
					>
				</div>
			</div>
		{:else if isJoining}
			<p class="text-sm text-muted-foreground">{t('invite.joining')}</p>
		{:else if joined}
			<p class="text-sm text-muted-foreground">{t('invite.joined')}</p>
		{/if}

		{#if error}
			<Alert variant="destructive">
				<AlertDescription>{error}</AlertDescription>
			</Alert>
			<Button variant="outline" onclick={acceptInvite} disabled={isJoining}>
				{t('invite.retry')}
			</Button>
		{/if}
	</div>
</div>
