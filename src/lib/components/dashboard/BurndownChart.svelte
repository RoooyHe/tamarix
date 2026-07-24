<script lang="ts">
	import { ChartContainer, ChartTooltip, type ChartConfig } from '$lib/components/ui/chart';
	import { Chart, Area, Spline, Grid, Axis, Tooltip } from 'layerchart';
	import { scaleLinear, scalePoint } from 'd3-scale';
	import { curveMonotoneX } from 'd3-shape';
	import { t } from '$lib/i18n';
	import type { BurndownDataPoint } from '$lib/reports';

	// Tooltip.Context is a namespace export; cast to any for TS compatibility in templates
	const TooltipContext = Tooltip.Context as any;

	interface Props {
		data: BurndownDataPoint[];
		height?: number;
	}

	let { data, height = 300 }: Props = $props();

	const chartConfig: ChartConfig = {
		remaining: { label: t('reports.burndown_remaining'), color: 'hsl(var(--chart-1))' },
		idealRemaining: { label: t('reports.burndown_ideal'), color: 'hsl(var(--chart-3))' }
	};

	let padding = { top: 10, right: 20, bottom: 30, left: 40 };
</script>

{#if data.length === 0}
	<div class="flex items-center justify-center h-48 text-sm text-muted-foreground">
		{t('reports.chart_no_data')}
	</div>
{:else}
	<ChartContainer config={chartConfig} style="height: {height}px;">
		<Chart
			{padding}
			{data}
			x="date"
			y="remaining"
			xScale={scalePoint().padding(0.5)}
			yScale={scaleLinear()}
		>
			<Grid y={true} />
			<Axis placement="bottom" ticks={6} />
			<Axis placement="left" />
			<Area
				fill="var(--color-remaining)"
				fillOpacity={0.15}
				stroke="var(--color-remaining)"
				strokeWidth={2}
				curve={curveMonotoneX}
				line
			/>
			{#if data[0]?.idealRemaining !== undefined}
				<Spline
					stroke="var(--color-idealRemaining)"
					strokeWidth={1.5}
					style="stroke-dasharray: 6 3"
					curve={curveMonotoneX}
					y="idealRemaining"
				/>
			{/if}
			<TooltipContext mode="band" let:state>
				{#if state.data}
					<ChartTooltip />
				{/if}
			</TooltipContext>
		</Chart>
	</ChartContainer>
{/if}
