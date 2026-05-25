<script lang="ts">
  import type { MatrixClient } from "matrix-js-sdk";
  import { TAMARIX_EVENT_TYPES } from "$lib/matrix/types";
  import { getStatusLabel, getPriorityLabel, getTypeLabel } from "$lib/matrix/types";
  import { Avatar, AvatarFallback } from "$lib/components/ui/avatar";
  import { t } from "$lib/i18n";
  import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "$lib/components/ui/collapsible";
  import { Button } from "$lib/components/ui/button";
  import { ChevronDown } from "@lucide/svelte";

  interface Props {
    client: MatrixClient;
    roomId: string;
  }

  let { client, roomId }: Props = $props();

  interface HistoryEntry {
    eventType: string;
    sender: string;
    timestamp: number;
    /** Human-readable description of the change */
    description: string;
  }

  let entries = $state<HistoryEntry[]>([]);
  let isLoading = $state(false);
  let expanded = $state(false);
  const VISIBLE_COUNT = 5;
  let visibleEntries = $derived(expanded ? entries : entries.slice(0, VISIBLE_COUNT));
  let hasMore = $derived(entries.length > VISIBLE_COUNT);

  /** Load state event history from the room timeline */
  $effect(() => {
    loadHistory();
  });

  async function loadHistory() {
    isLoading = true;
    try {
      const room = client.getRoom(roomId);
      if (!room) {
        isLoading = false;
        return;
      }

      // Get live timeline events and filter for Tamarix state events
      const timeline = room.getLiveTimeline();
      const events = timeline.getEvents();

      const tamarixPrefix = "com.tamarix.";
      const historyEntries: HistoryEntry[] = [];

      for (const event of events) {
        const eventType = event.getType() ?? "";
        if (!eventType.startsWith(tamarixPrefix)) continue;
        if (event.isRedacted()) continue;

        const sender = event.getSender() ?? "";
        const timestamp = event.getTs() ?? 0;
        const description = describeEvent(eventType, event.getContent());

        historyEntries.push({
          eventType,
          sender,
          timestamp,
          description
        });
      }

      // Sort by timestamp descending (newest first)
      historyEntries.sort((a, b) => b.timestamp - a.timestamp);
      entries = historyEntries;
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      isLoading = false;
    }
  }

  /** Generate a human-readable description for a state event */
  function describeEvent(eventType: string, content: Record<string, any>): string {
    switch (eventType) {
      case TAMARIX_EVENT_TYPES.TASK_STATUS:
        return `${t("task.status")}: ${content.status ? getStatusLabel(content.status) : "?"}`;
      case TAMARIX_EVENT_TYPES.PRIORITY:
        return `${t("task.priority")}: ${content.level ? getPriorityLabel(content.level) : "?"}`;
      case TAMARIX_EVENT_TYPES.TASK_TYPE:
        return `${t("task.type")}: ${content.type ? getTypeLabel(content.type) : "?"}`;
      case TAMARIX_EVENT_TYPES.DUE_DATE:
        return `${t("task.due_date")}: ${content.date ?? "?"}`;
      case TAMARIX_EVENT_TYPES.ESTIMATE:
        return `${t("task.estimate")}: ${content.points ?? "?"} ${content.unit ?? ""}`;
      case TAMARIX_EVENT_TYPES.TAGS:
        return `${t("task.tags")}: ${(content.tags ?? []).join(", ")}`;
      case TAMARIX_EVENT_TYPES.TICKET_ID:
        return `${t("history.ticket_id")}: ${content.id ?? "?"}`;
      case TAMARIX_EVENT_TYPES.ASSIGNEE:
        return `${t("task.assignee")}: ${content.user_id ?? "?"}`;
      case TAMARIX_EVENT_TYPES.TASK_ARCHIVED:
        return content.archived ? t("common.archive") : t("common.unarchive");
      case TAMARIX_EVENT_TYPES.RELATION:
        return `${t("task.relations")}: ${content.rel_type ?? "?"} ${t("history.relation_to")} ${content.target_room ?? "?"}`;
      default:
        return eventType;
    }
  }

  /** Format a Matrix user ID for display: @user:domain -> user */
  function formatSender(sender: string): string {
    const match = sender.match(/^@([^:]+):/);
    return match ? match[1] : sender;
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleString();
  }

  function getInitials(userId: string): string {
    const match = userId.match(/^@([^:]+):/);
    return match ? match[1].slice(0, 2).toUpperCase() : userId.slice(0, 2).toUpperCase();
  }
</script>

{#if isLoading}
  <div class="flex items-center justify-center py-8">
    <span class="text-sm text-muted-foreground">{t("common.loading")}</span>
  </div>
{:else if entries.length === 0}
  <div class="flex items-center justify-center py-8">
    <span class="text-sm text-muted-foreground">{t("common.no_results")}</span>
  </div>
{:else}
  <div class="relative space-y-0">
    {#each visibleEntries as entry (entry.timestamp)}
      <div class="flex gap-3 pb-4">
        <!-- Timeline line -->
        <div class="flex flex-col items-center">
          <Avatar class="h-7 w-7 text-[9px]">
            <AvatarFallback>{getInitials(entry.sender)}</AvatarFallback>
          </Avatar>
          <div class="w-px flex-1 bg-border mt-1"></div>
        </div>
        <!-- Content -->
        <div class="flex-1 min-w-0 pt-0.5">
          <div class="flex items-baseline gap-2">
            <span class="text-sm font-medium text-foreground">{formatSender(entry.sender)}</span>
            <span class="text-xs text-muted-foreground">{formatTime(entry.timestamp)}</span>
          </div>
          <p class="text-sm text-muted-foreground">{entry.description}</p>
        </div>
      </div>
    {/each}
  </div>
  {#if hasMore}
    <Collapsible bind:open={expanded}>
      {#if !expanded}
        <CollapsibleTrigger>
          <Button variant="ghost" size="sm" class="w-full text-xs text-muted-foreground">
            <ChevronDown class="mr-1 h-3 w-3" />
            {t("history.show_all", { n: entries.length })}
          </Button>
        </CollapsibleTrigger>
      {/if}
    </Collapsible>
  {/if}
{/if}
