<script lang="ts">
	import { ChartContainer, type ChartConfig } from '$lib/components/ui/chart';
	import { ArcChart } from 'layerchart';
	import { t } from '$lib/i18n';
	import type { StatusDistributionItem } from '$lib/reports';

	interface Props {
		data: StatusDistributionItem[];
		height?: number;
	}

	let { data, height = 280 }: Props = $props();

	const chartConfig: ChartConfig = {
		todo: { label: t('status.todo'), color: '#94a3b8' },
		in_progress: { label: t('status.in_progress'), color: '#3b82f6' },
		review: { label: t('status.review'), color: '#f59e0b' },
		done: { label: t('status.done'), color: '#22c55e' },
		closed: { label: t('status.closed'), color: '#a855f7' }
	};

	// Build series array for ArcChart
	let series = $derived(
		data.map((d) => ({
			key: d.status,
			label: chartConfig[d.status as keyof typeof chartConfig]?.label ?? d.status,
			value: d.count,
			color: d.color
		}))
	);

	let total = $derived(data.reduce((sum, d) => sum + d.count, 0));
</script>

{#if data.length === 0 || total === 0}
	<div class="flex items-center justify-center h-48 text-sm text-muted-foreground">
		{t('reports.chart_no_data')}
	</div>
{:else}
	<ChartContainer config={chartConfig} style="height: {height}px;">
		<ArcChart {data} {series} innerRadius={0.55} padAngle={0.02} />
	</ChartContainer>

	<!-- Legend -->
	<div class="flex flex-wrap items-center gap-3 mt-3 px-2">
		{#each data as item (item.status)}
			<div class="flex items-center gap-1.5 text-xs">
				<div class="h-2.5 w-2.5 rounded-sm shrink-0" style="background: {item.color}"></div>
				<span class="text-muted-foreground"
					>{chartConfig[item.status as keyof typeof chartConfig]?.label ?? item.status}</span
				>
				<span class="font-medium text-foreground">{item.count}</span>
			</div>
		{/each}
	</div>
{/if}
