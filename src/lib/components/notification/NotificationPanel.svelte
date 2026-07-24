<script lang="ts">
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Badge } from '$lib/components/ui/badge';
	import { Bell, CheckCheck } from '@lucide/svelte';
	import { getNotificationsContext } from '$lib/stores/notifications.svelte';
	import { goto } from '$app/navigation';
	import { t } from '$lib/i18n';

	let notifications = getNotificationsContext();
	let open = $state(false);

	function handleNotificationClick(taskId: string) {
		open = false;
		// Navigate to task - need to find the project first
		goto(`/dashboard`);
	}

	function handleMarkAllRead() {
		notifications.markAllRead();
	}
</script>

<Popover bind:open>
	<PopoverTrigger>
		<Button variant="ghost" size="icon" class="h-8 w-8 relative">
			<Bell class="h-4 w-4" />
			{#if notifications.unreadCount > 0}
				<Badge
					variant="destructive"
					class="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
				>
					{notifications.unreadCount > 9 ? '9+' : notifications.unreadCount}
				</Badge>
			{/if}
		</Button>
	</PopoverTrigger>
	<PopoverContent align="end" class="w-80 p-0">
		<div class="flex items-center justify-between px-4 py-3 border-b">
			<h3 class="text-sm font-semibold">{t('notification.title')}</h3>
			{#if notifications.unreadCount > 0}
				<Button variant="ghost" size="sm" class="h-7 px-2 text-xs" onclick={handleMarkAllRead}>
					<CheckCheck class="mr-1 h-3 w-3" />
					{t('notification.mark_all_read')}
				</Button>
			{/if}
		</div>
		<ScrollArea class="max-h-80">
			{#if notifications.notifications.length === 0}
				<div class="flex items-center justify-center py-8">
					<p class="text-sm text-muted-foreground">{t('notification.empty')}</p>
				</div>
			{:else}
				<div class="flex flex-col">
					{#each notifications.notifications as notification (notification.id)}
						<button
							class="flex items-start gap-3 px-4 py-3 hover:bg-accent/50 text-left transition-colors {notification.read
								? 'opacity-60'
								: ''}"
							onclick={() => {
								notifications.markAsRead(notification.id);
								handleNotificationClick(notification.taskId);
							}}
						>
							<div class="mt-0.5">
								{#if notification.type === 'assign'}
									<div class="h-2 w-2 rounded-full bg-blue-500"></div>
								{:else if notification.type === 'status_change'}
									<div class="h-2 w-2 rounded-full bg-green-500"></div>
								{:else if notification.type === 'mention'}
									<div class="h-2 w-2 rounded-full bg-yellow-500"></div>
								{:else if notification.type === 'due_remind'}
									<div class="h-2 w-2 rounded-full bg-red-500"></div>
								{/if}
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm">
									{t('notification.' + notification.type)}
								</p>
								<p class="text-xs text-muted-foreground truncate">{notification.taskTitle}</p>
								<p class="text-xs text-muted-foreground mt-0.5">
									{new Date(notification.triggeredAt).toLocaleString()}
								</p>
							</div>
							{#if !notification.read}
								<div class="mt-1">
									<div class="h-2 w-2 rounded-full bg-primary"></div>
								</div>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</ScrollArea>
	</PopoverContent>
</Popover>
