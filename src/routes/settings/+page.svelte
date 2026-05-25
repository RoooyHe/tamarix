<script lang="ts">
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import { LogOut } from "@lucide/svelte";
  import { t } from "$lib/i18n";

  let auth = getAuthContext();
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
