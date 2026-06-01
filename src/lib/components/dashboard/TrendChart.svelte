<script lang="ts">
  import { ChartContainer, ChartTooltip, type ChartConfig } from "$lib/components/ui/chart";
  import { Chart, Area, Spline, Grid, Axis, Tooltip } from "layerchart";
  import { scaleLinear, scalePoint } from "d3-scale";
  import { curveMonotoneX } from "d3-shape";
  import { t } from "$lib/i18n";
  import type { TrendDataPoint } from "$lib/stores/reports.svelte";

  // Tooltip.Context is a namespace export; cast to any for TS compatibility in templates
  const TooltipContext = Tooltip.Context as any;

  interface Props {
    data: TrendDataPoint[];
    height?: number;
  }

  let { data, height = 300 }: Props = $props();

  const chartConfig: ChartConfig = {
    created: { label: t("reports.trend.created"), color: "hsl(var(--chart-1))" },
    completed: { label: t("reports.trend.completed"), color: "hsl(var(--chart-4))" }
  };

  let padding = { top: 10, right: 20, bottom: 30, left: 40 };
</script>

{#if data.length === 0}
  <div class="flex items-center justify-center h-48 text-sm text-muted-foreground">
    {t("reports.chart_no_data")}
  </div>
{:else}
  <ChartContainer config={chartConfig} style="height: {height}px;">
    <Chart
      {padding}
      {data}
      x="date"
      y="created"
      xScale={scalePoint().padding(0.5)}
      yScale={scaleLinear()}
    >
      <Grid y={true} />
      <Axis placement="bottom" ticks={6} />
      <Axis placement="left" />
      <Area
        fill="var(--color-created)"
        fillOpacity={0.1}
        stroke="var(--color-created)"
        strokeWidth={2}
        curve={curveMonotoneX}
        line
      />
      <Spline
        stroke="var(--color-completed)"
        strokeWidth={2}
        style="stroke-dasharray: 4 2"
        curve={curveMonotoneX}
        y="completed"
      />
      <TooltipContext mode="band" let:state>
        {#if state.data}
          <ChartTooltip />
        {/if}
      </TooltipContext>
    </Chart>
  </ChartContainer>
{/if}
