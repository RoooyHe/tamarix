<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Link2, Plus, X } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { ExternalLink } from "$lib/matrix/task-types";

  interface Props {
    links: ExternalLink[];
    onAdd: (url: string, label: string) => Promise<{ error?: string }>;
    onRemove: (stateKey: string) => Promise<void>;
  }

  let { links, onAdd, onRemove }: Props = $props();

  let newUrl = $state("");
  let newLabel = $state("");
  let urlError = $state("");

  async function handleAdd() {
    if (!newUrl.trim() || !newLabel.trim()) return;
    const result = await onAdd(newUrl.trim(), newLabel.trim());
    if (result.error) {
      urlError = t("external_link.invalid_url");
      return;
    }
    urlError = "";
    newUrl = "";
    newLabel = "";
  }

  function getFaviconUrl(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
    } catch {
      return "";
    }
  }
</script>

<div>
  <h3 class="text-sm font-medium mb-2">{t("external_link.title")}</h3>
  {#if links.length > 0}
    <div class="space-y-1.5 mb-3">
      {#each links as link (link.stateKey ?? link.url)}
        {@const faviconUrl = getFaviconUrl(link.url)}
        <div class="flex items-center gap-2 text-sm">
          {#if faviconUrl}
            <img src={faviconUrl} alt="" class="h-3.5 w-3.5 shrink-0 rounded-sm" />
          {:else}
            <Link2 class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {/if}
          <a href={link.url} target="_blank" rel="noopener noreferrer" class="text-primary hover:underline truncate">
            {link.label}
          </a>
          <Button
            variant="ghost"
            size="icon"
            class="h-5 w-5 shrink-0"
            title={t("external_link.delete")}
            onclick={() => onRemove(link.stateKey ?? link.url)}
          >
            <X class="h-3 w-3" />
          </Button>
        </div>
      {/each}
    </div>
  {:else}
    <p class="text-xs text-muted-foreground mb-2">{t("external_link.no_links")}</p>
  {/if}
  <div class="flex gap-2">
    <Input
      class="h-7 text-xs"
      placeholder={t("external_link.label")}
      bind:value={newLabel}
    />
    <Input
      class="h-7 text-xs flex-1 {urlError ? 'border-red-500' : ''}"
      placeholder={t("external_link.url")}
      bind:value={newUrl}
    />
    {#if urlError}
      <span class="text-[10px] text-red-500">{urlError}</span>
    {/if}
    <Button
      size="sm"
      variant="outline"
      class="h-7 text-xs gap-1 shrink-0"
      disabled={!newUrl.trim() || !newLabel.trim()}
      onclick={handleAdd}
    >
      <Plus class="h-3 w-3" />
      {t("external_link.add")}
    </Button>
  </div>
</div>
