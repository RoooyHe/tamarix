<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { X, Archive, Tag } from '@lucide/svelte';
	import { t } from '$lib/i18n';
	import type { TaskStatus, Priority } from '$lib/matrix/types';
	import {
		TASK_STATUS_ORDER,
		PRIORITY_ORDER,
		getStatusLabel,
		getPriorityLabel
	} from '$lib/matrix/types';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';

	interface Props {
		selectedCount: number;
		onClear: () => void;
		onBulkStatus: (status: TaskStatus) => void;
		onBulkPriority: (priority: Priority) => void;
		onBulkArchive: () => void;
		onBulkTag: (tag: string) => void;
	}

	let { selectedCount, onClear, onBulkStatus, onBulkPriority, onBulkArchive, onBulkTag }: Props =
		$props();

	let isMobile = new IsMobile();

	let newTag = $state('');

	function handleAddTag() {
		if (newTag.trim()) {
			onBulkTag(newTag.trim());
			newTag = '';
		}
	}
</script>

{#if selectedCount > 0}
	<div
		class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 shadow-lg {isMobile.current
			? 'max-w-[calc(100vw-2rem)] overflow-x-auto'
			: ''}"
	>
		<Badge variant="secondary" class="text-xs shrink-0">
			{t('bulk.selected', { n: selectedCount })}
		</Badge>

		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="outline" size="sm" class="h-8 text-xs shrink-0">{t('bulk.status')}</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				{#each TASK_STATUS_ORDER as status}
					<DropdownMenuItem onclick={() => onBulkStatus(status)}>
						{getStatusLabel(status)}
					</DropdownMenuItem>
				{/each}
			</DropdownMenuContent>
		</DropdownMenu>

		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="outline" size="sm" class="h-8 text-xs shrink-0"
					>{t('bulk.priority')}</Button
				>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				{#each PRIORITY_ORDER as priority}
					<DropdownMenuItem onclick={() => onBulkPriority(priority)}>
						{getPriorityLabel(priority)}
					</DropdownMenuItem>
				{/each}
			</DropdownMenuContent>
		</DropdownMenu>

		<div class="flex items-center gap-1 shrink-0">
			<input
				type="text"
				bind:value={newTag}
				placeholder={t('bulk.add_tag')}
				class="h-8 w-20 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						handleAddTag();
					}
				}}
			/>
			<Button
				variant="outline"
				size="sm"
				class="h-8 w-8 text-xs p-0"
				onclick={handleAddTag}
				disabled={!newTag.trim()}
			>
				<Tag class="h-3 w-3" />
			</Button>
		</div>

		<Button
			variant="outline"
			size="sm"
			class="h-8 text-xs text-destructive hover:text-destructive shrink-0"
			onclick={onBulkArchive}
		>
			<Archive class="h-3 w-3 mr-1" />
			{t('bulk.archive')}
		</Button>

		<Button variant="ghost" size="icon" class="h-8 w-8 shrink-0" onclick={onClear}>
			<X class="h-3.5 w-3.5" />
		</Button>
	</div>
{/if}
