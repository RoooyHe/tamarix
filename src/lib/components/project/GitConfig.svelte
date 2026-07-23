<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Save, RefreshCw } from "@lucide/svelte";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
  } from "$lib/components/ui/select";
  import { t } from "$lib/i18n";
  import type { GitProvider } from "$lib/matrix/task-types";
  import { setGitConfig, getGitConfig } from "$lib/matrix/git-config";
  import { generateWebhookSecret } from "$lib/utils/crypto";
  import type { MatrixClient } from "matrix-js-sdk";

  interface Props {
    client: MatrixClient;
    projectId: string;
  }

  let { client, projectId }: Props = $props();

  let provider: GitProvider = $state("github");
  let repoUrl = $state("");
  let webhookSecret = $state("");
  let webhookUrl = $derived(`/api/git/webhook?project=${encodeURIComponent(projectId)}`);

  function load() {
    const room = client.getRoom(projectId);
    if (room) {
      const config = getGitConfig(room);
      if (config) {
        provider = config.provider;
        repoUrl = config.repoUrl;
        webhookSecret = config.webhookSecret;
      }
    }
  }

  $effect(() => { load(); });

  function handleGenerateSecret() {
    webhookSecret = generateWebhookSecret();
  }

  async function handleSave() {
    if (!repoUrl.trim() || !webhookSecret.trim()) return;
    await setGitConfig(client, projectId, {
      provider,
      repoUrl: repoUrl.trim(),
      webhookSecret: webhookSecret.trim()
    });
    load();
  }
</script>

<div class="rounded-lg border border-border bg-card p-6 space-y-4">
  <h2 class="text-lg font-semibold">{t("git.title")}</h2>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div class="space-y-1">
      <label class="text-xs font-medium">{t("git.provider")}</label>
      <Select type="single" bind:value={provider}>
        <SelectTrigger class="h-8 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="github">{t("git.provider.github")}</SelectItem>
          <SelectItem value="gitlab">{t("git.provider.gitlab")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="space-y-1">
      <label for="git-repo-url" class="text-xs font-medium">{t("git.repo_url")}</label>
      <Input id="git-repo-url" bind:value={repoUrl} placeholder="https://github.com/org/repo" class="h-8 text-sm" />
    </div>
  </div>

  <div class="space-y-1">
    <label for="git-webhook-url" class="text-xs font-medium">{t("git.webhook_url")}</label>
    <Input id="git-webhook-url" value={webhookUrl} readonly class="h-8 font-mono text-xs" />
  </div>

  <div class="flex items-end gap-2">
    <div class="space-y-1 flex-1">
      <label for="git-webhook-secret" class="text-xs font-medium">{t("git.webhook_secret")}</label>
      <Input id="git-webhook-secret" bind:value={webhookSecret} class="h-8 font-mono text-xs" />
    </div>
    <Button type="button" variant="outline" size="sm" onclick={handleGenerateSecret}>
      <RefreshCw class="mr-1 h-3.5 w-3.5" />
      {t("git.generate_secret")}
    </Button>
    <Button size="sm" onclick={handleSave} disabled={!repoUrl.trim() || !webhookSecret.trim()}>
      <Save class="mr-1 h-3.5 w-3.5" />
      {t("git.save_config")}
    </Button>
  </div>
</div>
