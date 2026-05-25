<script lang="ts">
  import type { MatrixClient } from "matrix-js-sdk";
  import type { Task, RelationType } from "$lib/matrix/types";
  import { TAMARIX_EVENT_TYPES } from "$lib/matrix/types";
  import { getStateEvent, sendStateEvent } from "$lib/matrix/state-events";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Avatar, AvatarFallback } from "$lib/components/ui/avatar";
  import { t } from "$lib/i18n";
  import { Plus, X, Link2, Copy, ArrowRightLeft, GitBranch } from "@lucide/svelte";

  interface Props {
    client: MatrixClient;
    roomId: string;
    /** All project tasks for searching when adding relations */
    allTasks?: Task[];
  }

  let { client, roomId, allTasks = [] }: Props = $props();

  interface RelationEntry {
    relType: RelationType;
    targetRoom: string;
    /** Resolved target task (if found in allTasks) */
    targetTask?: Task;
  }

  let relations = $state<RelationEntry[]>([]);
  let showAddForm = $state(false);
  let newRelType: RelationType = $state("relates");
  let newTargetSearch = $state("");

  /** Load relations from state events */
  $effect(() => {
    loadRelations();
  });

  function loadRelations() {
    const room = client.getRoom(roomId);
    if (!room) return;

    // Read all relation state events (using different state_keys)
    const stateEvents = room.currentState.getStateEvents(TAMARIX_EVENT_TYPES.RELATION as any);
    const loaded: RelationEntry[] = [];

    for (const event of stateEvents) {
      const content = event.getContent();
      if (content?.rel_type && content?.target_room) {
        const targetTask = allTasks.find(t => t.roomId === content.target_room);
        loaded.push({
          relType: content.rel_type as RelationType,
          targetRoom: content.target_room,
          targetTask
        });
      }
    }

    relations = loaded;
  }

  async function addRelation() {
    if (!newTargetSearch.trim()) return;

    // Find matching task
    const targetTask = allTasks.find(t =>
      t.roomId === newTargetSearch.trim() ||
      t.ticketId === newTargetSearch.trim() ||
      t.title.toLowerCase().includes(newTargetSearch.toLowerCase())
    );
    if (!targetTask) return;

    await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.RELATION, {
      rel_type: newRelType,
      target_room: targetTask.roomId
    }, targetTask.roomId); // use target room as state_key for uniqueness

    loadRelations();
    showAddForm = false;
    newTargetSearch = "";
    newRelType = "relates";
  }

  async function removeRelation(entry: RelationEntry) {
    // Send empty content to effectively remove the relation
    await sendStateEvent(client, roomId, TAMARIX_EVENT_TYPES.RELATION, {}, entry.targetRoom);
    loadRelations();
  }

  function formatSender(userId: string): string {
    const match = userId.match(/^@([^:]+):/);
    return match ? match[1] : userId;
  }

  const relTypeIcon: Record<string, typeof Link2> = {
    blocks: X,
    duplicates: Copy,
    relates: Link2,
    subtask_of: GitBranch
  };

  function relTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      blocks: t("relation.blocks"),
      duplicates: t("relation.duplicates"),
      relates: t("relation.relates"),
      subtask_of: t("relation.subtask_of")
    };
    return labels[type] ?? type;
  }
</script>

<div class="space-y-3">
  {#if relations.length > 0}
    <div class="space-y-2">
      {#each relations as entry (entry.targetRoom)}
        <div class="flex items-center gap-2 rounded-md border border-border p-2">
          {#if relTypeIcon[entry.relType]}
            <svelte:component this={relTypeIcon[entry.relType]} class="h-4 w-4 text-muted-foreground shrink-0" />
          {:else}
            <Link2 class="h-4 w-4 text-muted-foreground shrink-0" />
          {/if}
          <Badge variant="outline" class="text-[10px]">{relTypeLabel(entry.relType)}</Badge>
          {#if entry.targetTask}
            <a
              href="/project/{entry.targetTask.projectRoomId ?? ''}/task/{entry.targetTask.roomId}"
              class="text-sm text-foreground hover:underline truncate flex-1"
            >
              {#if entry.targetTask.ticketId}
                <span class="font-mono text-xs text-muted-foreground mr-1">{entry.targetTask.ticketId}</span>
              {/if}
              {entry.targetTask.title}
            </a>
          {:else}
            <span class="text-sm text-muted-foreground truncate flex-1">{entry.targetRoom}</span>
          {/if}
          <button
            class="shrink-0 rounded-sm p-1 hover:bg-accent"
            onclick={() => removeRelation(entry)}
            title={t("common.delete")}
          >
            <X class="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-sm text-muted-foreground text-center py-4">
      {t("common.no_results")}
    </div>
  {/if}

  <!-- Add relation -->
  {#if showAddForm}
    <div class="space-y-2 rounded-md border border-border p-3">
      <div class="flex items-center gap-2">
        <select
          class="rounded border border-input bg-background px-2 py-1 text-sm"
          bind:value={newRelType}
        >
          <option value="relates">{relTypeLabel("relates")}</option>
          <option value="blocks">{relTypeLabel("blocks")}</option>
          <option value="duplicates">{relTypeLabel("duplicates")}</option>
          <option value="subtask_of">{relTypeLabel("subtask_of")}</option>
        </select>
        <input
          type="text"
          class="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
          placeholder="Search by title, ID, or room ID..."
          bind:value={newTargetSearch}
          onkeydown={(e) => { if (e.key === "Enter") addRelation(); }}
        />
      </div>
      <div class="flex justify-end gap-2">
        <Button variant="outline" size="sm" onclick={() => { showAddForm = false; newTargetSearch = ""; }}>
          {t("common.cancel")}
        </Button>
        <Button size="sm" onclick={addRelation} disabled={!newTargetSearch.trim()}>
          {t("common.create")}
        </Button>
      </div>

      <!-- Quick match results -->
      {#if newTargetSearch.trim()}
        {@const matches = allTasks.filter(t =>
          t.roomId !== roomId &&
          (t.title.toLowerCase().includes(newTargetSearch.toLowerCase()) ||
          (t.ticketId ?? "").toLowerCase().includes(newTargetSearch.toLowerCase()))
        ).slice(0, 5)}
        {#if matches.length > 0}
          <div class="space-y-1">
            {#each matches as match (match.roomId)}
              <button
                class="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent text-left"
                onclick={() => { newTargetSearch = match.roomId; }}
              >
                {#if match.ticketId}
                  <span class="font-mono text-xs text-muted-foreground">{match.ticketId}</span>
                {/if}
                <span class="truncate">{match.title}</span>
              </button>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  {:else}
    <Button variant="outline" size="sm" class="w-full" onclick={() => showAddForm = true}>
      <Plus class="mr-1 h-4 w-4" />
      {t("task.relations")}
    </Button>
  {/if}
</div>
