<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import type { Task } from '$lib/matrix/types';
	import { getPriorityLabel } from '$lib/matrix/types';
	import { Bug, Sparkles, ListTodo, Wrench, Target, Calendar, Zap, Lock } from '@lucide/svelte';
	import type { LucideProps } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import { setDragData } from '$lib/utils/drag';
	import type { TaskDragData } from '$lib/utils/drag';
	import { useLongPress } from '$lib/utils/use-long-press.svelte';

	type IconComponent = Component<LucideProps>;

	interface Props {
		task: Task;
		selected?: boolean;
		onClick?: (task: Task) => void;
		onToggleSelect?: (taskId: string) => void;
		onDragStart?: (data: TaskDragData) => void;
		onDragEnd?: () => void;
	}

	let { task, selected = false, onClick, onToggleSelect, onDragStart, onDragEnd }: Props = $props();

	let isDragging = $state(false);

	// Long-press handler for touch selection
	let longPress = $derived(onToggleSelect ? useLongPress(() => onToggleSelect(task.roomId)) : null);

	const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
		todo: 'outline',
		in_progress: 'default',
		review: 'secondary',
		done: 'secondary',
		closed: 'outline'
	};

	const priorityColorClass: Record<string, string> = {
		critical: 'bg-red-500/20 text-red-500 border-red-500/30',
		high: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
		medium: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
		low: 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30'
	};

	const typeIcon: Record<string, IconComponent> = {
		bug: Bug,
		feature: Sparkles,
		task: ListTodo,
		improvement: Wrench,
		epic: Target
	};

	function handleDragStart(event: DragEvent) {
		isDragging = true;
		setDragData(event, { taskId: task.roomId, fromStatus: task.status });
		onDragStart?.({ taskId: task.roomId, fromStatus: task.status });
	}

	function handleDragEnd() {
		isDragging = false;
		onDragEnd?.();
	}

	function handleClick(event: MouseEvent) {
		if (event.shiftKey && onToggleSelect) {
			event.preventDefault();
			onToggleSelect(task.roomId);
		} else {
			onClick?.(task);
		}
	}
</script>

<Card
	class="cursor-grab select-none p-3 min-h-[44px] transition-shadow hover:shadow-md active:cursor-grabbing {isDragging
		? 'opacity-50 ring-2 ring-primary'
		: ''} {selected ? 'ring-2 ring-primary' : ''}"
	draggable="true"
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	onclick={handleClick}
	role="button"
	tabindex={0}
	{...longPress ?? {}}
>
	<!-- Selection checkbox + Title row -->
	<div class="flex items-start gap-2">
		{#if onToggleSelect}
			<button
				type="button"
				class="flex min-w-[44px] min-h-[44px] items-center justify-center pt-0.5"
				onclick={(e) => {
					e.stopPropagation();
					onToggleSelect(task.roomId);
				}}
			>
				<Checkbox checked={selected} />
			</button>
		{/if}
		{#if task.type && typeIcon[task.type]}
			{@const Icon = typeIcon[task.type]}
			<Icon class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
		{/if}
		{#if task.ticketId}
			<span class="font-mono text-[10px] text-muted-foreground">{task.ticketId}</span>
		{/if}
		<span class="text-sm font-medium leading-tight text-foreground line-clamp-2">
			{task.title}
		</span>
	</div>

	<!-- Priority + Assignee row -->
	<div class="mt-2 flex items-center gap-2">
		{#if task.priority}
			<Badge variant="outline" class="text-[10px] {priorityColorClass[task.priority] ?? ''}">
				{getPriorityLabel(task.priority)}
			</Badge>
		{/if}
		{#if task.encrypted}
			<Lock class="h-3 w-3 text-muted-foreground" />
		{/if}
		<div class="flex-1"></div>
		{#if task.assignee}
			<Avatar class="h-5 w-5 text-[8px]">
				<AvatarFallback>
					{task.assignee.split(':')[0].replace('@', '').slice(0, 2).toUpperCase()}
				</AvatarFallback>
			</Avatar>
		{/if}
	</div>

	<!-- Tags + Due date row -->
	{#if task.tags.length > 0 || task.dueDate || task.estimate}
		<div class="mt-2 flex flex-wrap items-center gap-1">
			{#each task.tags as tag}
				<Badge variant="secondary" class="text-[9px]">{tag}</Badge>
			{/each}
			{#if task.dueDate}
				<span class="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
					<Calendar class="h-3 w-3" />
					{new Date(task.dueDate).toLocaleDateString()}
				</span>
			{/if}
			{#if task.estimate}
				<span class="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
					<Zap class="h-3 w-3" />
					{task.estimate.points}{task.estimate.unit === 'story_points'
						? 'SP'
						: task.estimate.unit === 'hours'
							? 'h'
							: 'd'}
				</span>
			{/if}
		</div>
	{/if}
</Card>
