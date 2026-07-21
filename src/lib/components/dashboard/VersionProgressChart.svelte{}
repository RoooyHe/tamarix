<script lang="ts">
  import { ChartContainer, ChartTooltip, type ChartConfig } from "$lib/components/ui/chart";
  import { BarChart, Tooltip } from "layerchart";
  import { t } from "$lib/i18n";
  import type { VersionProgressItem } from "$lib/reports";

  // Tooltip.Context is a namespace export; cast to any for TS compatibility in templates
  const TooltipContext = Tooltip.Context as any;

  interface Props {
    data: VersionProgressItem[];
    height?: number;
  }

  let { data, height = 300 }: Props = $props();

  const chartConfig: ChartConfig = {
    todo: { label: t("status.todo"), color: "#94a3b8" },
    in_progress: { label: t("status.in_progress"), color: "#3b82f6" },
    review: { label: t("status.review"), color: "#f59e0b" },
    done: { label: t("status.done"), color: "#22c55e" },
    closed: { label: t("status.closed"), color: "#a855f7" }
  };

  const statusKeys = ["todo", "in_progress", "review", "done", "closed"] as const;
  const statusColors = ["#94a3b8", "#3b82f6", "#f59e0b", "#22c55e", "#a855f7"];

  // Build series array for BarChart with stack layout
  let series = $derived(
    statusKeys.map((key, i) => ({
      key,
      value: (d: VersionProgressItem) => d[key],
      color: statusColors[i],
    }))
  );
</script>

{#if data.length === 0}
  <div class="flex items-center justify-center h-48 text-sm text-muted-foreground">
    {t("reports.chart_no_data")}
  </div>
{:else}
  <ChartContainer config={chartConfig} style="height: {height}px;">
    <BarChart
      {data}
      x="version"
      y="count"
      {series}
      seriesLayout="stack"
      orientation="vertical"
    >
      <TooltipContext mode="band" let:state>
        {#if state.data}
          <ChartTooltip />
        {/if}
      </TooltipContext>
    </BarChart>
  </ChartContainer>

  <!-- Legend -->
  <div class="flex flex-wrap items-center gap-3 mt-3 px-2">
    {#each Object.entries(chartConfig) as [key, cfg] (key)}
      <div class="flex items-center gap-1.5 text-xs">
        <div class="h-2.5 w-2.5 rounded-sm shrink-0" style="background: {(cfg as any).color}"></div>
        <span class="text-muted-foreground">{(cfg as any).label}</span>
      </div>
    {/each}
  </div>
{/if}
