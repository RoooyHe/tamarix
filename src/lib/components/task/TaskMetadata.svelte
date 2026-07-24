<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Eye, EyeOff } from '@lucide/svelte';
	import { t } from '$lib/i18n';
	import type { Task, TaskStatus, Priority, TaskType } from '$lib/matrix/types';
	import type { MatrixClient } from 'matrix-js-sdk';
	import TaskStatusSelect from '$lib/components/task/TaskStatusSelect.svelte';
	import PrioritySelect from '$lib/components/task/PrioritySelect.svelte';
	import TaskTypeSelect from '$lib/components/task/TaskTypeSelect.svelte';
	import AssigneeSelect from '$lib/components/task/AssigneeSelect.svelte';

	interface Props {
		task: Task;
		client: MatrixClient | undefined | null;
		projectId: string;
		isWatching: boolean;
		onStatusChange: (status: TaskStatus) => void;
		onPriorityChange: (priority: Priority) => void;
		onTypeChange: (type: TaskType) => void;
		onAssigneeChange: (userId: string | undefined) => void;
		onToggleWatch: () => void;
	}

	let {
		task,
		client,
		projectId,
		isWatching,
		onStatusChange,
		onPriorityChange,
		onTypeChange,
		onAssigneeChange,
		onToggleWatch
	}: Props = $props();

	function formatSender(userId: string): string {
		const match = userId.match(/^@([^:]+):/);
		return match ? match[1] : userId;
	}
</script>

<div class="flex flex-wrap gap-3">
	<div class="flex items-center gap-2">
		<span class="text-xs text-muted-foreground">{t('task.status')}</span>
		<TaskStatusSelect
			value={task.status}
			currentStatus={task.status}
			onValueChange={onStatusChange}
		/>
	</div>
	<div class="flex items-center gap-2">
		<span class="text-xs text-muted-foreground">{t('task.priority')}</span>
		<PrioritySelect value={task.priority ?? 'medium'} onValueChange={onPriorityChange} />
	</div>
	<div class="flex items-center gap-2">
		<span class="text-xs text-muted-foreground">{t('task.type')}</span>
		<TaskTypeSelect value={task.type ?? 'task'} onValueChange={onTypeChange} />
	</div>
	{#if task.dueDate}
		<div class="flex items-center gap-2">
			<span class="text-xs text-muted-foreground">{t('task.due_date')}</span>
			<Badge variant="outline">{task.dueDate}</Badge>
		</div>
	{/if}
	<div class="flex items-center gap-2">
		<span class="text-xs text-muted-foreground">{t('task.assignee')}</span>
		{#if client && projectId}
			<AssigneeSelect
				{client}
				projectRoomId={projectId}
				value={task.assignee}
				onValueChange={onAssigneeChange}
			/>
		{:else if task.assignee}
			<Badge variant="outline">{formatSender(task.assignee)}</Badge>
		{/if}
	</div>
	<div class="flex items-center gap-2">
		<Button
			variant={isWatching ? 'secondary' : 'ghost'}
			size="sm"
			class="h-6 text-xs"
			onclick={onToggleWatch}
		>
			{#if isWatching}
				<EyeOff class="mr-1 h-3 w-3" />
				{t('task.unwatch')}
			{:else}
				<Eye class="mr-1 h-3 w-3" />
				{t('task.watch')}
			{/if}
		</Button>
	</div>
</div>
