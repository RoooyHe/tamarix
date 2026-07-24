<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { AlertTriangle, Home, RefreshCw } from '@lucide/svelte';

	let status = $derived($page.status);
	let error = $derived($page.error);

	function handleReload() {
		window.location.reload();
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<div class="w-full max-w-md space-y-6 text-center">
		<div class="flex justify-center">
			<div class="rounded-full bg-destructive/10 p-4">
				<AlertTriangle class="h-10 w-10 text-destructive" />
			</div>
		</div>

		<div class="space-y-2">
			<h1 class="text-4xl font-bold text-foreground">
				{status ?? 'Error'}
			</h1>
			<p class="text-lg text-muted-foreground">
				{#if status === 404}
					Page not found
				{:else if status === 403}
					Access denied
				{:else if status === 500}
					Internal server error
				{:else}
					Something went wrong
				{/if}
			</p>
		</div>

		{#if error?.message}
			<p class="rounded-md bg-muted px-4 py-2 font-mono text-sm text-muted-foreground">
				{error.message}
			</p>
		{/if}

		<div class="flex justify-center gap-3">
			<Button variant="outline" href="/">
				<Home class="mr-2 h-4 w-4" />
				Home
			</Button>
			<Button onclick={handleReload}>
				<RefreshCw class="mr-2 h-4 w-4" />
				Reload
			</Button>
		</div>
	</div>
</div>
