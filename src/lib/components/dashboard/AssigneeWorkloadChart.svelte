<script lang="ts">
  import { ChartContainer, ChartTooltip, type ChartConfig } from "$lib/components/ui/chart";
  import { Chart, Bars, Grid, Axis, Tooltip } from "layerchart";
  import { scaleLinear, scaleBand } from "d3-scale";
  import { t } from "$lib/i18n";
  import type { AssigneeWorkloadItem } from "$lib/stores/reports.svelte";

  // Tooltip.Context is a namespace export; cast to any for TS compatibility in templates
  const TooltipContext = Tooltip.Context as any;

  interface Props {
    data: AssigneeWorkloadItem[];
    height?: number;
  }

  let { data, height = 300 }: Props = $props();

  const chartConfig: ChartConfig = {
    count: { label: t("reports.assignee_workload"), color: "hsl(var(--chart-2))" }
  };

  // Transform data for the chart
  let chartData = $derived(
    data.map(d => ({
      assignee: d.assignee,
      count: d.count
    }))
  );

  let padding = { top: 10, right: 20, bottom: 40, left: 60 };
</script>

{#if data.length === 0}
  <div class="flex items-center justify-center h-48 text-sm text-muted-foreground">
    {t("reports.chart_no_data")}
  </div>
{:else}
  <ChartContainer config={chartConfig} style="height: {height}px;">
    <Chart
      {padding}
      data={chartData}
      x="count"
      y="assignee"
      xScale={scaleLinear()}
      yScale={scaleBand().padding(0.25)}
    >
      <Grid x={true} />
      <Axis placement="bottom" />
      <Axis placement="left" />
      <Bars
        fill="var(--color-count)"
        radius={3}
        rounded="right"
      />
      <TooltipContext mode="band" let:state>
        {#if state.data}
          <ChartTooltip />
        {/if}
      </TooltipContext>
    </Chart>
  </ChartContainer>
{/if}
