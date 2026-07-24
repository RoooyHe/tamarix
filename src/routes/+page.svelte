<script lang="ts">
	import { getAuthContext } from '$lib/stores/auth.svelte';
	import { t } from '$lib/i18n';
	import { goto } from '$app/navigation';

	let auth = getAuthContext();

	// Redirect based on auth state
	$effect(() => {
		if (auth.isLoggedIn) {
			goto('/dashboard', { replaceState: true });
		} else {
			goto('/login', { replaceState: true });
		}
	});
</script>

<div class="flex h-screen items-center justify-center bg-background">
	<div class="text-muted-foreground">{t('common.loading')}</div>
</div>
