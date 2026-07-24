<script lang="ts">
	import { t } from '$lib/i18n';
	import type { Task } from '$lib/matrix/types';
	import { Badge } from '$lib/components/ui/badge';
	import { Users } from '@lucide/svelte';

	interface Props {
		tasks: Task[];
	}

	let { tasks }: Props = $props();

	interface WorkloadEntry {
		userId: string;
		displayName: string;
		todo: number;
		inProgress: number;
		review: number;
		done: number;
		total: number;
	}

	let workload = $derived(() => {
		const map = new Map<string, WorkloadEntry>();
		for (const task of tasks) {
			const key = task.assignee ?? 'unassigned';
			const existing = map.get(key) ?? {
				userId: key,
				displayName:
					key === 'unassigned' ? t('dashboard.unassigned') : (key.match(/^@([^:]+):/)?.[1] ?? key),
				todo: 0,
				inProgress: 0,
				review: 0,
				done: 0,
				total: 0
			};
			if (task.status === 'todo') existing.todo++;
			else if (task.status === 'in_progress') existing.inProgress++;
			else if (task.status === 'review') existing.review++;
			else existing.done++;
			existing.total++;
			map.set(key, existing);
		}
		return [...map.values()].sort((a, b) => b.total - a.total);
	});

	function formatInitial(userId: string): string {
		if (userId === 'unassigned') return '?';
		return (
			userId
				.match(/^@([^:]+):/)?.[1]
				?.charAt(0)
				.toUpperCase() ?? '?'
		);
	}

	const STATUS_COLORS = {
		todo: 'bg-muted-foreground/30',
		inProgress: 'bg-primary/60',
		review: 'bg-yellow-500/60',
		done: 'bg-green-500/60'
	} as const;
</script>

{#if workload().length > 0}
	<div>
		<h2 class="mb-3 text-lg font-semibold text-foreground flex items-center gap-2">
			<Users class="h-5 w-5 text-muted-foreground" />
			{t('dashboard.team_workload')}
		</h2>
		<div class="space-y-3">
			{#each workload() as member (member.userId)}
				<div class="rounded-lg border border-border bg-card p-3">
					<div class="flex items-center gap-3 mb-2">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium"
						>
							{formatInitial(member.userId)}
						</div>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium truncate">{member.displayName}</div>
							<div class="text-xs text-muted-foreground">
								{member.total}
								{t('dashboard.completion_rate')}
							</div>
						</div>
						<div class="text-sm font-semibold text-foreground">
							{member.total > 0 ? Math.round((member.done / member.total) * 100) : 0}%
						</div>
					</div>
					<!-- Stacked horizontal bar -->
					<div class="h-2 w-full rounded-full bg-muted overflow-hidden">
						{#if member.total > 0}
							<div class="flex h-full w-full">
								<div
									class="{STATUS_COLORS.todo} h-full transition-all"
									style="width: {(member.todo / member.total) * 100}%"
									title="{t('status.todo')}: {member.todo}"
								></div>
								<div
									class="{STATUS_COLORS.inProgress} h-full transition-all"
									style="width: {(member.inProgress / member.total) * 100}%"
									title="{t('status.in_progress')}: {member.inProgress}"
								></div>
								<div
									class="{STATUS_COLORS.review} h-full transition-all"
									style="width: {(member.review / member.total) * 100}%"
									title="{t('status.review')}: {member.review}"
								></div>
								<div
									class="{STATUS_COLORS.done} h-full transition-all"
									style="width: {(member.done / member.total) * 100}%"
									title="{t('status.done')}: {member.done}"
								></div>
							</div>
						{/if}
					</div>
					<div class="mt-1.5 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
						{#if member.todo > 0}
							<span>{t('status.todo')} {member.todo}</span>
						{/if}
						{#if member.inProgress > 0}
							<span>{t('status.in_progress')} {member.inProgress}</span>
						{/if}
						{#if member.review > 0}
							<span>{t('status.review')} {member.review}</span>
						{/if}
						{#if member.done > 0}
							<span>{t('status.done')} {member.done}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
