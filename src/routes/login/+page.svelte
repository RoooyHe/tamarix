<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Field, FieldLabel, FieldDescription } from "$lib/components/ui/field";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { discoverHomeserver, getLoginFlows } from "$lib/matrix/auth";
  import type { LoginFlow, ISSOFlow } from "matrix-js-sdk";
  import { goto } from "$app/navigation";
  import { t } from "$lib/i18n";

  let auth = getAuthContext();

  // Form state
  let homeserver = $state("matrix.org");
  let username = $state("");
  let password = $state("");

  // Discovery / flows state
  let discoveredBaseUrl: string | null = $state(null);
  let loginFlows: LoginFlow[] = $state([]);
  let supportsPassword = $state(false);
  let ssoFlows: ISSOFlow[] = $state([]);
  let discoveryError: string | null = $state(null);
  let isDiscovering = $state(false);
  let discoveryDone = $state(false);

  /** Check if a flow is an SSO flow */
  function isSSOFlow(flow: LoginFlow): flow is ISSOFlow {
    return flow.type === "m.login.sso" || flow.type === "m.login.cas";
  }

  /** Build SSO redirect URL for the given flow */
  function getSSORedirectUrl(flow: ISSOFlow): string {
    if (!discoveredBaseUrl) return "";
    // SSO redirect endpoint per spec:
    // GET /_matrix/client/v3/auth/{flow.type}/redirect?redirectUrl=...
    const base = discoveredBaseUrl.replace(/\/+$/, "");
    const flowType = flow.type; // "m.login.sso" or "m.login.cas"
    const redirectUrl = encodeURIComponent(window.location.origin + "/login/callback");
    return `${base}/_matrix/client/v3/auth/${encodeURIComponent(flowType)}/redirect?redirectUrl=${redirectUrl}`;
  }

  /** Trigger SSO login by redirecting the browser */
  function handleSSOLogin(flow: ISSOFlow) {
    const url = getSSORedirectUrl(flow);
    if (url) {
      window.location.href = url;
    }
  }

  /** Step 1: Discover homeserver and fetch login flows */
  async function handleDiscover(e: SubmitEvent) {
    e.preventDefault();
    isDiscovering = true;
    discoveryError = null;
    discoveryDone = false;
    loginFlows = [];
    supportsPassword = false;
    ssoFlows = [];

    try {
      // Auto-discover the real homeserver base URL via .well-known
      const baseUrl = await discoverHomeserver(homeserver);
      discoveredBaseUrl = baseUrl;

      // Store base URL in sessionStorage for SSO callback
      sessionStorage.setItem("tamarix.sso_base_url", baseUrl);

      // Fetch supported login flows
      const flows = await getLoginFlows(baseUrl);
      loginFlows = flows;

      // Categorize flows
      supportsPassword = flows.some(f => f.type === "m.login.password");
      ssoFlows = flows.filter(isSSOFlow);

      if (!supportsPassword && ssoFlows.length === 0) {
        discoveryError = t("login.no_supported_methods");
      }
    } catch (e) {
      discoveryError = e instanceof Error ? e.message : t("login.cannot_connect");
    } finally {
      isDiscovering = false;
      discoveryDone = true;
    }
  }

  /** Step 2: Login with password */
  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!discoveredBaseUrl) return;
    await auth.loginWithDiscoveredUrl(discoveredBaseUrl, username, password);
    if (auth.isLoggedIn) {
      goto("/dashboard", { replaceState: true });
    }
  }

  /** Reset to step 1 */
  function resetDiscovery() {
    discoveryDone = false;
    discoveredBaseUrl = null;
    loginFlows = [];
    supportsPassword = false;
    ssoFlows = [];
    discoveryError = null;
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
  <div class="w-full max-w-sm space-y-6">
    <!-- Logo -->
    <div class="flex flex-col items-center gap-2">
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
        T
      </div>
      <h1 class="text-2xl font-bold text-foreground">Tamarix</h1>
      <p class="text-sm text-muted-foreground">{t("login.subtitle")}</p>
    </div>

    {#if !discoveryDone}
      <!-- Step 1: Discover homeserver -->
      <form onsubmit={handleDiscover} class="space-y-4">
        <Field>
          <FieldLabel>Homeserver</FieldLabel>
          <Input
            bind:value={homeserver}
            type="text"
            placeholder="matrix.org"
            required
          />
          <FieldDescription>{t("login.homeserver_hint")}</FieldDescription>
        </Field>

        {#if discoveryError}
          <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {discoveryError}
          </div>
        {/if}

        <Button type="submit" class="w-full" disabled={isDiscovering}>
          {isDiscovering ? t("login.connecting") : t("login.connect")}
        </Button>
      </form>
    {:else}
      <!-- Step 2: Login with available methods -->
      <div class="space-y-4">
        <!-- Discovery info -->
        <div class="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
          <span class="font-medium">{homeserver}</span>
          {#if discoveredBaseUrl && discoveredBaseUrl !== `https://${homeserver}/`}
            <br />
            <span class="text-xs">{t("login.server_url", { url: discoveredBaseUrl })}</span>
          {/if}
        </div>

        {#if supportsPassword}
          <!-- Password login form -->
          <form onsubmit={handleSubmit} class="space-y-4">
            <Field>
              <FieldLabel>{t("login.username")}</FieldLabel>
              <Input
                bind:value={username}
                type="text"
                placeholder="@user:matrix.org"
                required
              />
            </Field>

            <Field>
              <FieldLabel>{t("login.password")}</FieldLabel>
              <Input
                bind:value={password}
                type="password"
                placeholder={t("login.password_placeholder")}
                required
              />
            </Field>

            {#if auth.error}
              <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {auth.error}
              </div>
            {/if}

            <Button type="submit" class="w-full" disabled={auth.isLoading}>
               {auth.isLoading ? t("login.logging_in") : t("login.login")}
            </Button>
          </form>
        {/if}

        {#if ssoFlows.length > 0}
          <!-- SSO login buttons -->
          {#if supportsPassword}
            <div class="relative flex items-center py-2">
              <div class="flex-grow border-t border-border"></div>
               <span class="mx-3 text-xs text-muted-foreground">{t("login.or")}</span>
              <div class="flex-grow border-t border-border"></div>
            </div>
          {/if}

          {#each ssoFlows as flow}
            {#if flow.identity_providers && flow.identity_providers.length > 0}
              <!-- SSO with specific identity providers -->
              {#each flow.identity_providers as provider}
                <Button
                  variant="outline"
                  class="w-full"
                  onclick={() => {
                    // SSO redirect with specific IdP
                    const base = discoveredBaseUrl?.replace(/\/+$/, "") ?? "";
                    const flowType = flow.type;
                    const idpId = provider.id;
                    const redirectUrl = encodeURIComponent(window.location.origin + "/login/callback");
                    window.location.href = `${base}/_matrix/client/v3/auth/${encodeURIComponent(flowType)}/redirect?idp=${encodeURIComponent(idpId)}&redirectUrl=${redirectUrl}`;
                  }}
                >
                   {t("login.login_via", { provider: provider.name })}
                </Button>
              {/each}
            {:else}
              <!-- Generic SSO button -->
              <Button
                variant="outline"
                class="w-full"
                onclick={() => handleSSOLogin(flow)}
              >
                 {t("login.login_via_sso")}
              </Button>
            {/if}
          {/each}
        {/if}

        {#if !supportsPassword && ssoFlows.length === 0}
          <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
             {t("login.no_supported_methods")}
          </div>
        {/if}

        <!-- Back button -->
        <Button variant="ghost" class="w-full text-sm" onclick={resetDiscovery}>
           {t("login.change_server")}
        </Button>
      </div>
    {/if}

    <p class="text-center text-xs text-muted-foreground">
     {t("login.agreement")}
    </p>
  </div>
</div>
