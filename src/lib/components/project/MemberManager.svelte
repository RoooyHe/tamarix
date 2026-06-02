<script lang="ts">
  import { onMount } from "svelte";
  import type { MatrixClient } from "matrix-js-sdk";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Badge } from "$lib/components/ui/badge";
  import MatrixAvatar from "$lib/components/common/MatrixAvatar.svelte";
  import { Copy, UserPlus, X } from "@lucide/svelte";
  import { t } from "$lib/i18n";

  interface Props {
    client: MatrixClient;
    spaceRoomId: string;
  }

  let { client, spaceRoomId }: Props = $props();

  let members = $state<Array<{ userId: string; membership: string; powerLevel: number }>>([]);
  let inviteUserId = $state("");
  let isInviting = $state(false);
  let copyNotice = $state<string | null>(null);

  onMount(() => {
    loadMembers();
  });

  function loadMembers() {
    const room = client.getRoom(spaceRoomId);
    if (!room) {
      members = [];
      return;
    }
    members = room.getJoinedMembers().map(m => ({
      userId: m.userId,
      membership: "join",
      powerLevel: room.getMember(m.userId)?.powerLevel ?? 0
    }));
  }

  function formatSender(userId: string): string {
    const match = userId.match(/^@([^:]+):/);
    return match ? match[1] : userId;
  }

  function getRoleLabel(powerLevel: number): string {
    if (powerLevel >= 100) return t("project.members.role") + ": Admin";
    if (powerLevel >= 50) return t("project.members.role") + ": Moderator";
    return t("project.members.role") + ": Member";
  }

  async function handleInvite() {
    if (!inviteUserId.trim() || isInviting) return;
    isInviting = true;
    try {
      let userId = inviteUserId.trim();
      // Auto-prefix @ if not present
      if (!userId.startsWith("@")) {
        const homeserver = client.getHomeserverUrl().replace(/^https?:\/\//, "");
        userId = `@${userId}:${homeserver}`;
      }
      await client.invite(spaceRoomId, userId);
      inviteUserId = "";
      loadMembers();
    } catch (e) {
      console.error("Failed to invite:", e);
    } finally {
      isInviting = false;
    }
  }

  async function handleRemove(userId: string) {
    try {
      await client.kick(spaceRoomId, userId, "Removed from project");
      loadMembers();
    } catch (e) {
      console.error("Failed to remove:", e);
    }
  }

  async function copyInviteLink() {
    const url = new URL("/invite", window.location.origin);
    url.searchParams.set("roomId", spaceRoomId);
    await navigator.clipboard.writeText(url.toString());
    copyNotice = t("invite.link_copied");
    setTimeout(() => { copyNotice = null; }, 2500);
  }
</script>

<div class="space-y-4">
  <!-- Invite form -->
  <div class="flex gap-2">
    <Input
      bind:value={inviteUserId}
      placeholder="@user:matrix.org"
      class="flex-1"
      onkeydown={(e) => { if (e.key === "Enter") handleInvite(); }}
    />
    <Button onclick={handleInvite} disabled={isInviting || !inviteUserId.trim()}>
      <UserPlus class="mr-1 h-4 w-4" />
      {t("project.members.invite")}
    </Button>
    <Button variant="outline" onclick={copyInviteLink} title={t("invite.copy_link")}>
      <Copy class="h-4 w-4" />
    </Button>
  </div>

  {#if copyNotice}
    <p class="text-xs text-muted-foreground">{copyNotice}</p>
  {/if}

  <!-- Member list -->
  {#if members.length === 0}
    <p class="text-sm text-muted-foreground text-center py-4">{t("common.loading")}</p>
  {:else}
    <div class="space-y-2">
      {#each members as member (member.userId)}
        <div class="flex items-center gap-3 rounded-lg border border-border p-3">
          <MatrixAvatar userId={member.userId} size="sm" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">{formatSender(member.userId)}</div>
            <div class="text-xs text-muted-foreground truncate">{member.userId}</div>
          </div>
          <Badge variant={member.powerLevel >= 100 ? "default" : "outline"} class="shrink-0">
            {getRoleLabel(member.powerLevel)}
          </Badge>
          {#if member.powerLevel < 100}
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 shrink-0"
              onclick={() => handleRemove(member.userId)}
              title={t("project.members.remove")}
            >
              <X class="h-3.5 w-3.5 text-destructive" />
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
