<script lang="ts">
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { getAsStatusStore } from "$lib/stores/as-status.svelte";
  import { getUiContext } from "$lib/stores/ui.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Separator } from "$lib/components/ui/separator";
  import { LogOut, Settings, Sun, Moon, Monitor, Globe } from "@lucide/svelte";
  import { t } from "$lib/i18n";

  let auth = getAuthContext();
  let ui = getUiContext();
  let asStatus = getAsStatusStore();

  let asUrlInput = $state(asStatus.asUrl);
  let healthCheckResult = $state<"ok" | "failed" | null>(null);

  async function checkAsHealth() {
    const ok = await asStatus.checkHealth();
    healthCheckResult = ok ? "ok" : "failed";
    setTimeout(() => { healthCheckResult = null; }, 3000);
  }

  function saveAsUrl() {
    asStatus.setAsUrl(asUrlInput);
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
        <label class="text-sm font-medium text-foreground">{t("as.url")}</label>
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
