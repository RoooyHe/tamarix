<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Switch } from "$lib/components/ui/switch";
  import { Save } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import { setApprovalConfig, getApprovalConfig } from "$lib/matrix/approvals";
  import type { MatrixClient } from "matrix-js-sdk";

  interface Props {
    client: MatrixClient;
    projectId: string;
  }

  let { client, projectId }: Props = $props();

  let enabled = $state(false);
  let required = $state(1);

  function load() {
    const room = client.getRoom(projectId);
    if (room) {
      const config = getApprovalConfig(room);
      enabled = config.enabled;
      required = config.requiredApprovals;
    }
  }

  $effect(() => { load(); });

  async function handleSave() {
    await setApprovalConfig(client, projectId, {
      enabled,
      requiredApprovals: Math.max(1, required)
    });
    load();
  }
</script>

<div class="rounded-lg border border-border bg-card p-6 space-y-4">
  <div class="flex items-center justify-between gap-4">
    <div>
      <h2 class="text-lg font-semibold">{t("approval.config_title")}</h2>
      <p class="text-sm text-muted-foreground">{t("approval.config_desc")}</p>
    </div>
    <Switch bind:checked={enabled} id="approval-enabled" />
  </div>

  <div class="flex items-end gap-3">
    <div class="space-y-1">
      <label for="approval-required" class="text-xs font-medium">{t("approval.required")}</label>
      <Input
        id="approval-required"
        type="number"
        min="1"
        bind:value={required}
        disabled={!enabled}
        class="h-8 w-24 text-sm"
      />
    </div>
    <Button size="sm" onclick={handleSave}>
      <Save class="mr-1 h-3.5 w-3.5" />
      {t("project.settings.save")}
    </Button>
  </div>
</div>
