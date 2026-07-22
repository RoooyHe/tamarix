<script lang="ts">
  import { onMount } from "svelte";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getAccountContext } from "$lib/stores/account.svelte";
  import { getAsStatusStore } from "$lib/stores/as-status.svelte";
  import { getIntegrationsContext } from "$lib/stores/integrations.svelte";
  import { getUiContext } from "$lib/stores/ui.svelte";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Separator } from "$lib/components/ui/separator";
  import { Link, LogOut, Monitor, Moon, Plug, Shield, Sun, Trash2, Globe } from "@lucide/svelte";
  import { t } from "$lib/i18n";
  import type { IntegrationProvider } from "$lib/integrations/types";

  let auth = getAuthContext();
  let account = getAccountContext();
  let ui = getUiContext();
  let asStatus = getAsStatusStore();
  let integrations = getIntegrationsContext();

  let asUrlInput = $state(asStatus.asUrl);
  let healthCheckResult = $state<"ok" | "failed" | null>(null);
  let emailInput = $state("");
  let emailNotice = $state<string | null>(null);

  onMount(() => {
    if (auth.client) {
      void account.loadThreePids(auth.client);
    }
    if (asStatus.asUrl) {
      void integrations.loadConnections(asStatus.asUrl);
    }
  });

  async function checkAsHealth() {
    const ok = await asStatus.checkHealth();
    healthCheckResult = ok ? "ok" : "failed";
    setTimeout(() => { healthCheckResult = null; }, 3000);
  }

  function saveAsUrl() {
    asStatus.setAsUrl(asUrlInput);
    void integrations.loadConnections(asUrlInput);
  }

  async function requestEmailBind() {
    if (!auth.client || !emailInput) return;
    const session = await account.requestEmailBind(auth.client, emailInput);
    if (session) {
      emailNotice = t("account.email_verification_sent");
    }
  }

  async function confirmEmailBind() {
    if (!auth.client) return;
    const ok = await account.confirmEmailBind(auth.client);
    if (ok) {
      emailInput = "";
      emailNotice = t("account.email_bound");
    }
  }

  async function removeThreePid(medium: "email" | "msisdn", address: string) {
    if (!auth.client) return;
    await account.removeThreePid(auth.client, medium, address);
  }

  async function connectProvider(provider: IntegrationProvider) {
    const url = await integrations.startOAuth(asStatus.asUrl, provider);
    if (url) {
      window.location.href = url;
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
    <p class="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
  </div>

  <Separator />

  <!-- Account Info -->
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-foreground">{t("settings.account_info")}</h2>
    <div class="rounded-lg border border-border bg-card p-4 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">{t("settings.user_id")}</span>
        <span class="text-sm font-mono">{auth.userId ?? t("settings.not_logged_in")}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">{t("settings.connection_status")}</span>
        <span class="text-sm text-green-500">{t("settings.connected")}</span>
      </div>
    </div>
  </div>

  <Separator />

  <!-- Account Security -->
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-foreground">{t("account.title")}</h2>
        <p class="text-sm text-muted-foreground">{t("account.subtitle")}</p>
      </div>
      <Button variant="outline" size="sm" onclick={() => auth.client && account.loadThreePids(auth.client)}>
        <Shield class="h-4 w-4" />
        {t("common.loading")}
      </Button>
    </div>

    <div class="rounded-lg border border-border bg-card p-4 space-y-4">
      {#if account.error}
        <Alert variant="destructive">
          <AlertDescription>{account.error}</AlertDescription>
        </Alert>
      {/if}

      {#if emailNotice}
        <Alert>
          <AlertDescription>{emailNotice}</AlertDescription>
        </Alert>
      {/if}

      <div class="space-y-2">
        <p class="text-sm font-medium text-foreground">{t("account.bind_email")}</p>
        <div class="flex gap-2">
          <Input type="email" bind:value={emailInput} placeholder="name@example.com" class="flex-1" />
          <Button variant="outline" size="sm" onclick={requestEmailBind} disabled={!emailInput || account.isSaving}>
            <Link class="h-4 w-4" />
            {t("account.send_verification")}
          </Button>
        </div>
      </div>

      {#if account.pendingEmailSession}
        <div class="flex items-center justify-between gap-3 rounded-md border border-border p-3">
          <div>
            <p class="text-sm font-medium text-foreground">{t("account.waiting_email")}</p>
            <p class="text-xs text-muted-foreground">{account.pendingEmailSession.address}</p>
          </div>
          <Button size="sm" onclick={confirmEmailBind} disabled={account.isSaving}>
            {t("account.confirm_bound")}
          </Button>
        </div>
      {/if}

      <div class="space-y-2">
        <p class="text-sm font-medium text-foreground">{t("account.identifiers")}</p>
        {#if account.isLoading}
          <p class="text-sm text-muted-foreground">{t("common.loading")}</p>
        {:else if account.threePids.length === 0}
          <p class="text-sm text-muted-foreground">{t("account.no_identifiers")}</p>
        {:else}
          <div class="space-y-2">
            {#each account.threePids as item (`${item.medium}:${item.address}`)}
              <div class="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <Badge variant="secondary">{item.medium}</Badge>
                    <p class="truncate text-sm font-medium text-foreground">{item.address}</p>
                  </div>
                  <p class="text-xs text-muted-foreground">{t("account.identifier_visible")}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => removeThreePid(item.medium as "email" | "msisdn", item.address)}
                  disabled={account.isSaving}
                >
                  <Trash2 class="h-4 w-4" />
                  {t("account.unbind")}
                </Button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <Separator />

  <!-- Appearance -->
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-foreground">{t("settings.appearance")}</h2>
    <div class="rounded-lg border border-border bg-card p-4 space-y-4">
      <!-- Theme -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-foreground">{t("settings.theme")}</p>
        </div>
        <div class="flex gap-1">
          <Button
            variant={ui.theme === "light" ? "default" : "outline"}
            size="sm"
            onclick={() => ui.setTheme("light")}
          >
            <Sun class="h-4 w-4" />
          </Button>
          <Button
            variant={ui.theme === "dark" ? "default" : "outline"}
            size="sm"
            onclick={() => ui.setTheme("dark")}
          >
            <Moon class="h-4 w-4" />
          </Button>
          <Button
            variant={ui.theme === "system" ? "default" : "outline"}
            size="sm"
            onclick={() => ui.setTheme("system")}
          >
            <Monitor class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Language -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-foreground">{t("settings.language")}</p>
        </div>
        <div class="flex gap-1">
          <Button
            variant={ui.locale === "zh" ? "default" : "outline"}
            size="sm"
            onclick={() => ui.setLocale("zh")}
          >
            <Globe class="h-4 w-4" />
            {t("menu.language_zh")}
          </Button>
          <Button
            variant={ui.locale === "en" ? "default" : "outline"}
            size="sm"
            onclick={() => ui.setLocale("en")}
          >
            <Globe class="h-4 w-4" />
            {t("menu.language_en")}
          </Button>
        </div>
      </div>

      <!-- Search Source -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-foreground">{t("as.search_source")}</p>
          <p class="text-xs text-muted-foreground">Local search uses client-side filtering. AS search uses the Application Service backend index for better performance on large datasets.</p>
        </div>
        <div class="flex gap-1">
          <Button
            variant={ui.searchSource === "local" ? "default" : "outline"}
            size="sm"
            onclick={() => ui.setSearchSource("local")}
          >
            {t("as.search_local")}
          </Button>
          <Button
            variant={ui.searchSource === "as" ? "default" : "outline"}
            size="sm"
            onclick={() => ui.setSearchSource("as")}
          >
            {t("as.search_as")}
          </Button>
        </div>
      </div>
    </div>
  </div>

  <Separator />

  <!-- Application Service -->
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-foreground">{t("as.section_title")}</h2>
    <p class="text-sm text-muted-foreground">{t("as.section_desc")}</p>
    <div class="rounded-lg border border-border bg-card p-4 space-y-4">
      <div class="space-y-2">
        <p class="text-sm font-medium text-foreground">{t("as.url")}</p>
        <div class="flex gap-2">
          <Input
            type="url"
            bind:value={asUrlInput}
            placeholder={t("as.url_placeholder")}
            class="flex-1"
          />
          <Button variant="outline" size="sm" onclick={saveAsUrl}>
            {t("common.save")}
          </Button>
        </div>
      </div>

      <!-- Health Check -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-foreground">{t("as.health_check")}</p>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" onclick={checkAsHealth}>
            {t("as.health_check")}
          </Button>
          {#if healthCheckResult === "ok"}
            <span class="text-sm text-green-500">{t("as.health_ok")}</span>
          {:else if healthCheckResult === "failed"}
            <span class="text-sm text-red-500">{t("as.health_failed")}</span>
          {/if}
        </div>
      </div>

      <!-- AS Status -->
      {#if asStatus.asUrl}
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted-foreground">Status</span>
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full {asStatus.asAvailable ? 'bg-green-500' : 'bg-red-500'}"></span>
            <span class="text-sm {asStatus.asAvailable ? 'text-green-500' : 'text-red-500'}">
              {asStatus.asAvailable ? t("as.status_online") : t("as.status_offline")}
            </span>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <Separator />

  <!-- Integrations -->
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-foreground">{t("integrations.title")}</h2>
        <p class="text-sm text-muted-foreground">{t("integrations.subtitle")}</p>
      </div>
      <Button variant="outline" size="sm" onclick={() => integrations.loadConnections(asStatus.asUrl)} disabled={integrations.isLoading}>
        <Plug class="h-4 w-4" />
        {t("integrations.refresh")}
      </Button>
    </div>

    {#if integrations.error}
      <Alert variant="destructive">
        <AlertDescription>{integrations.error}</AlertDescription>
      </Alert>
    {/if}

    <div class="grid gap-3 md:grid-cols-2">
      {#each integrations.providers as provider (provider.id)}
        {@const connection = integrations.getConnection(provider.id)}
        <div class="rounded-lg border border-border bg-card p-4 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-foreground">{provider.name}</h3>
              <p class="text-xs text-muted-foreground">{t(provider.descriptionKey)}</p>
            </div>
            <Badge variant={connection ? "default" : "secondary"}>
              {connection ? t("integrations.connected") : t("integrations.available")}
            </Badge>
          </div>

          {#if connection}
            <div class="space-y-1">
              <p class="text-sm text-foreground">{connection.displayName}</p>
              {#if connection.lastSyncAt}
                <p class="text-xs text-muted-foreground">{t("integrations.last_sync", { time: connection.lastSyncAt })}</p>
              {/if}
            </div>
          {:else}
            <p class="text-xs text-muted-foreground">{t("integrations.requires_as")}</p>
          {/if}

          <Button
            variant="outline"
            size="sm"
            onclick={() => connectProvider(provider.id)}
            disabled={!asStatus.asUrl}
          >
            <Plug class="h-4 w-4" />
            {connection ? t("integrations.reconnect") : t("integrations.connect")}
          </Button>
        </div>
      {/each}
    </div>
  </div>

  <Separator />

  <!-- Danger Zone -->
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-destructive">{t("settings.danger_zone")}</h2>
    <div class="rounded-lg border border-destructive/30 bg-card p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-foreground">{t("menu.logout")}</p>
          <p class="text-xs text-muted-foreground">{t("settings.logout_desc")}</p>
        </div>
        <Button variant="destructive" size="sm" onclick={() => auth.logout()}>
          <LogOut class="mr-2 h-4 w-4" />
          {t("settings.logout")}
        </Button>
      </div>
    </div>
  </div>
</div>
