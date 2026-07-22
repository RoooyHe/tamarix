<script lang="ts">
  import type { MatrixClient } from "matrix-js-sdk";
  import type { WorklogEntry } from "$lib/matrix/types";
  import { addWorklog, removeWorklog, getWorklogs } from "$lib/matrix/worklog-service";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Field, FieldLabel } from "$lib/components/ui/field";
  import { Separator } from "$lib/components/ui/separator";
  import { Avatar, AvatarFallback } from "$lib/components/ui/avatar";
  import { Progress } from "$lib/components/ui/progress";
  import { Badge } from "$lib/components/ui/badge";
  import { Trash2, Plus } from "@lucide/svelte";
  import { t } from "$lib/i18n";

  interface Props {
    client: MatrixClient;
    roomId: string;
    estimateHours?: number;
  }

  let { client, roomId, estimateHours }: Props = $props();

  let worklogs = $state<WorklogEntry[]>([]);
  let error = $state<string | null>(null);

  let totalHours = $derived(worklogs.reduce((sum, w) => sum + w.hours, 0));

  function getEstimateVsActual(estimate: number | undefined) {
    const estimated = estimate ?? 0;
    const actual = totalHours;
    return { estimated, actual, diff: estimated - actual };
  }

  function loadWorklogs() {
    error = null;
    try {
      const room = client.getRoom(roomId);
      if (!room) {
        worklogs = [];
        return;
      }
      worklogs = getWorklogs(room);
    } catch (e) {
      error = e instanceof Error ? e.message : t("error.load_tasks");
    }
  }

  async function addWorklogEntry(entry: WorklogEntry) {
    error = null;
    try {
      await addWorklog(client, roomId, entry);
      loadWorklogs();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to add worklog";
    }
  }

  async function removeWorklogEntry(stateKey: string) {
    error = null;
    try {
      await removeWorklog(client, roomId, stateKey);
      loadWorklogs();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to remove worklog";
    }
  }

  let newHours = $state("");
  let newNote = $state("");

  function formatSender(sender: string): string {
    const match = sender.match(/^@([^:]+):/);
    return match ? match[1] : sender;
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleString();
  }

  async function handleAddWorklog() {
    const hours = parseFloat(newHours);
    if (isNaN(hours) || hours <= 0) return;

    const userId = client.getUserId() ?? "";
    const entry: WorklogEntry = {
      userId,
      hours,
      note: newNote.trim() || undefined,
      loggedAt: Date.now()
    };

    await addWorklogEntry(entry);
    newHours = "";
    newNote = "";
  }

  async function handleDeleteWorklog(entry: WorklogEntry) {
    const stateKey = `${entry.userId}_${entry.loggedAt}`;
    await removeWorklogEntry(stateKey);
  }

  // Load worklogs when mounted
  $effect(() => {
    if (client && roomId) {
      loadWorklogs();
    }
  });

  let estimateVsActual = $derived(getEstimateVsActual(estimateHours));
  let progressPercent = $derived(
    estimateVsActual.estimated > 0
      ? Math.min(100, Math.round((estimateVsActual.actual / estimateVsActual.estimated) * 100))
      : 0
  );
</script>

<div class="space-y-4">
  <!-- Estimate vs Actual -->
  {#if estimateVsActual.estimated > 0}
    <div class="space-y-2">
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-foreground">{t("worklog.estimate_vs_actual")}</span>
        <span class="font-medium">{estimateVsActual.actual}h / {estimateVsActual.estimated}h</span>
      </div>
      <Progress value={progressPercent} class="h-2" />
      {#if estimateVsActual.actual > estimateVsActual.estimated}
        <p class="text-xs text-destructive">
          {Math.round(estimateVsActual.actual - estimateVsActual.estimated)}h {t("worklog.estimate_vs_actual").toLowerCase()}
        </p>
      {/if}
    </div>
    <Separator />
  {/if}

  <!-- Add worklog form -->
  <div class="space-y-3">
    <h4 class="text-sm font-medium">{t("worklog.add")}</h4>
    <div class="flex gap-2">
      <div class="w-32">
        <Input
          type="number"
          step="0.5"
          min="0.5"
          placeholder={t("worklog.hours_placeholder")}
          bind:value={newHours}
        />
      </div>
      <div class="flex-1">
        <Input
          placeholder={t("worklog.note_placeholder")}
          bind:value={newNote}
        />
      </div>
      <Button
        size="icon"
        onclick={handleAddWorklog}
        disabled={!newHours || parseFloat(newHours) <= 0}
      >
        <Plus class="h-4 w-4" />
      </Button>
    </div>
  </div>

  <Separator />

  <!-- Worklog list -->
  {#if worklogs.length === 0}
    <div class="text-sm text-muted-foreground text-center py-4">
      {t("worklog.no_worklogs")}
    </div>
  {:else}
    <div class="space-y-2">
      <div class="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t("worklog.title")}</span>
        <span>{t("worklog.total")}: {totalHours}h</span>
      </div>
      {#each worklogs as entry (entry.userId + entry.loggedAt)}
        <div class="flex items-start gap-3 rounded-lg border border-border p-3">
          <Avatar class="h-6 w-6 mt-0.5">
            <AvatarFallback class="text-xs">
              {formatSender(entry.userId).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">{formatSender(entry.userId)}</span>
              <span class="text-xs text-muted-foreground">{formatTime(entry.loggedAt)}</span>
            </div>
            {#if entry.note}
              <p class="text-sm text-muted-foreground mt-0.5">{entry.note}</p>
            {/if}
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <Badge>{entry.hours}h</Badge>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              onclick={() => handleDeleteWorklog(entry)}
              title={t("worklog.delete")}
            >
              <Trash2 class="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if error}
    <div class="text-sm text-destructive text-center py-2">
      {error}
    </div>
  {/if}
</div>
