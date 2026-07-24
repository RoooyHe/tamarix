<script lang="ts">
  import { GitBranch } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { CommitLink } from "$lib/stores/task-details";

  interface Props {
    commits: CommitLink[];
  }

  let { commits }: Props = $props();
</script>

<div>
  <h3 class="text-sm font-medium mb-2">{t("git.commits")}</h3>
  {#if commits.length > 0}
    <div class="space-y-1.5">
      {#each commits as commit (commit.eventId)}
        <div class="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
          <GitBranch class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span class="font-mono text-muted-foreground">{commit.hash}</span>
          <span class="truncate text-foreground">{commit.message}</span>
          <span class="ml-auto shrink-0 text-muted-foreground">{commit.provider} · {commit.branch}</span>
        </div>
      {/each}
    </div>
  {:else}
    <p class="text-xs text-muted-foreground">{t("git.no_commits")}</p>
  {/if}
</div>
