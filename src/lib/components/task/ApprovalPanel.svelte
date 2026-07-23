<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { ThumbsUp, ThumbsDown } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { ApprovalState, ApprovalConfig } from "$lib/matrix/task-types";
  import ApprovalBadge from "$lib/components/task/ApprovalBadge.svelte";

  interface Props {
    approvalState: ApprovalState | null;
    approvalConfig: ApprovalConfig;
    onRequestApproval: () => Promise<void>;
    onApprove: () => Promise<void>;
    onReject: () => Promise<void>;
  }

  let { approvalState, approvalConfig, onRequestApproval, onApprove, onReject }: Props = $props();
</script>

<div>
  <h3 class="text-sm font-medium mb-2">{t("approval.title")}</h3>
  {#if approvalState}
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <ApprovalBadge
          status={approvalState.status}
          currentApprovals={approvalState.currentApprovals}
          requiredApprovals={approvalState.requiredApprovals}
        />
      </div>
      {#if approvalState.status === "pending"}
        <div class="flex gap-2">
          <Button size="sm" variant="outline" class="h-7 text-xs gap-1" onclick={onApprove}>
            <ThumbsUp class="h-3 w-3" />
            {t("approval.approve")}
          </Button>
          <Button size="sm" variant="outline" class="h-7 text-xs gap-1" onclick={onReject}>
            <ThumbsDown class="h-3 w-3" />
            {t("approval.reject")}
          </Button>
        </div>
      {/if}
    </div>
  {:else}
    <Button size="sm" variant="outline" class="h-7 text-xs" onclick={onRequestApproval}>
      {t("approval.request")}
    </Button>
  {/if}
</div>
