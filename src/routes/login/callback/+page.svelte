<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { consumeSsoLoginState, loginWithToken } from "$lib/matrix/auth";
  import { onMount } from "svelte";
  import { t } from "$lib/i18n";

  let auth = getAuthContext();
  let error: string | null = $state(null);
  let isProcessing = $state(true);

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const loginToken = params.get("loginToken");
    const stateParam = params.get("state");
    const serverError = params.get("error") ?? params.get("error_description");

    if (serverError) {
      error = serverError;
      isProcessing = false;
      return;
    }

    if (!loginToken) {
      error = t("login.invalid_callback");
      isProcessing = false;
      return;
    }

    const ssoState = consumeSsoLoginState(stateParam);
    if (stateParam && !ssoState) {
      error = t("login.session_expired");
      isProcessing = false;
      return;
    }

    const baseUrl = ssoState?.baseUrl ?? sessionStorage.getItem("tamarix.sso_base_url");
    if (!baseUrl) {
      error = t("login.session_expired");
      isProcessing = false;
      return;
    }

    try {
      await loginWithToken(baseUrl, loginToken);
      sessionStorage.removeItem("tamarix.sso_base_url");
      goto(resolve((ssoState?.redirectTo ?? "/dashboard") as any), { replaceState: true });
    } catch (e) {
      error = e instanceof Error ? e.message : t("login.sso_failed");
      isProcessing = false;
    }
  });
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
  <div class="w-full max-w-sm space-y-4 text-center">
    <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl mx-auto">
      T
    </div>

    {#if isProcessing}
      <div class="space-y-2">
        <h2 class="text-lg font-semibold text-foreground">{t("login.completing")}</h2>
        <p class="text-sm text-muted-foreground">{t("login.verifying")}</p>
      </div>
    {:else if error}
      <div class="space-y-4">
        <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
        <a href={resolve("/login")} class="text-sm text-primary underline">{t("login.back_to_login")}</a>
      </div>
    {/if}
  </div>
</div>
