<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { AuthType } from "matrix-js-sdk";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Field, FieldDescription, FieldLabel } from "$lib/components/ui/field";
  import {
    checkUsernameAvailable,
    discoverHomeserver,
    registerWithPassword,
    type RegistrationResult
  } from "$lib/matrix/auth";
  import { formatMatrixError } from "$lib/matrix/errors";
  import {
    createAuthDict,
    getCurrentUiaStep,
    getStageLabel,
    getUiaSteps,
    type UiaSession
  } from "$lib/matrix/uia";
  import { t } from "$lib/i18n";

  let homeserver = $state("matrix.org");
  let discoveredBaseUrl = $state<string | null>(null);
  let username = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let registrationToken = $state("");
  let acceptedTerms = $state(false);
  let error = $state<string | null>(null);
  let usernameStatus = $state<"idle" | "checking" | "available" | "unavailable">("idle");
  let isDiscovering = $state(false);
  let isSubmitting = $state(false);
  let uiaSession = $state<UiaSession | null>(null);

  let currentStep = $derived(uiaSession ? getCurrentUiaStep(uiaSession) : null);
  let steps = $derived(uiaSession ? getUiaSteps(uiaSession) : []);
  let canSubmitBase = $derived(username.length > 0 && password.length > 0 && password === confirmPassword);

  function getRedirectTo(): string {
    const params = new URLSearchParams(window.location.search);
    return params.get("redirectTo") || "/dashboard";
  }

  async function handleDiscover(e: SubmitEvent) {
    e.preventDefault();
    isDiscovering = true;
    error = null;
    uiaSession = null;

    try {
      discoveredBaseUrl = await discoverHomeserver(homeserver);
    } catch (e) {
      error = formatMatrixError(e, t("login.cannot_connect"));
    } finally {
      isDiscovering = false;
    }
  }

  async function handleUsernameCheck() {
    if (!discoveredBaseUrl || !username) return;
    usernameStatus = "checking";
    error = null;

    try {
      const available = await checkUsernameAvailable(discoveredBaseUrl, username);
      usernameStatus = available ? "available" : "unavailable";
    } catch (e) {
      usernameStatus = "unavailable";
      error = formatMatrixError(e, t("register.username_unavailable"));
    }
  }

  async function submitRegistration(auth?: Record<string, unknown>) {
    if (!discoveredBaseUrl) return;
    if (password !== confirmPassword) {
      error = t("register.password_mismatch");
      return;
    }

    isSubmitting = true;
    error = null;

    try {
      const result = await registerWithPassword({
        baseUrl: discoveredBaseUrl,
        username,
        password,
        auth
      });
      await handleRegistrationResult(result);
    } catch (e) {
      error = formatMatrixError(e, t("register.failed"));
    } finally {
      isSubmitting = false;
    }
  }

  async function handleRegistrationResult(result: RegistrationResult) {
    if (result.kind === "success") {
      await goto(resolve(getRedirectTo() as any), { replaceState: true });
      return;
    }

    if (result.kind === "inhibit_login") {
      await goto(resolve("/login"), { replaceState: true });
      return;
    }

    uiaSession = result.session;
    const step = getCurrentUiaStep(result.session);
    if (step?.type === AuthType.Dummy) {
      await submitRegistration(createAuthDict(AuthType.Dummy, result.session.session));
    }
  }

  async function handleRegister(e: SubmitEvent) {
    e.preventDefault();
    await submitRegistration();
  }

  async function handleContinueUia() {
    if (!uiaSession || !currentStep) return;

    if (currentStep.type === AuthType.Terms) {
      if (!acceptedTerms) {
        error = t("register.accept_terms_required");
        return;
      }
      await submitRegistration(createAuthDict(AuthType.Terms, uiaSession.session));
      return;
    }

    if (
      currentStep.type === AuthType.RegistrationToken ||
      currentStep.type === "org.matrix.msc3231.login.registration_token"
    ) {
      if (!registrationToken.trim()) {
        error = t("register.token_required");
        return;
      }
      await submitRegistration(createAuthDict(currentStep.type, uiaSession.session, { token: registrationToken.trim() }));
      return;
    }

    if (currentStep.type === AuthType.Dummy) {
      await submitRegistration(createAuthDict(AuthType.Dummy, uiaSession.session));
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
  <div class="w-full max-w-md space-y-6">
    <div class="flex flex-col items-center gap-2">
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
        T
      </div>
      <h1 class="text-2xl font-bold text-foreground">{t("register.title")}</h1>
      <p class="text-sm text-muted-foreground">{t("register.subtitle")}</p>
    </div>

    <form onsubmit={handleDiscover} class="space-y-4">
      <Field>
        <FieldLabel>{t("login.homeserver")}</FieldLabel>
        <Input bind:value={homeserver} type="text" placeholder="matrix.org" required />
        <FieldDescription>{t("login.homeserver_hint")}</FieldDescription>
      </Field>
      <Button type="submit" class="w-full" disabled={isDiscovering}>
        {isDiscovering ? t("login.connecting") : t("login.connect")}
      </Button>
    </form>

    {#if discoveredBaseUrl}
      <form onsubmit={handleRegister} class="space-y-4">
        <div class="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
          <span class="font-medium">{homeserver}</span>
          <br />
          <span class="text-xs">{t("login.server_url", { url: discoveredBaseUrl })}</span>
        </div>

        <Field>
          <FieldLabel>{t("login.username")}</FieldLabel>
          <div class="flex gap-2">
            <Input bind:value={username} type="text" required />
            <Button type="button" variant="outline" onclick={handleUsernameCheck} disabled={usernameStatus === "checking"}>
              {usernameStatus === "checking" ? t("common.loading") : t("register.check_username")}
            </Button>
          </div>
          {#if usernameStatus === "available"}
            <FieldDescription>{t("register.username_available")}</FieldDescription>
          {:else if usernameStatus === "unavailable"}
            <FieldDescription>{t("register.username_unavailable")}</FieldDescription>
          {/if}
        </Field>

        <Field>
          <FieldLabel>{t("login.password")}</FieldLabel>
          <Input bind:value={password} type="password" required />
        </Field>

        <Field>
          <FieldLabel>{t("register.confirm_password")}</FieldLabel>
          <Input bind:value={confirmPassword} type="password" required />
          {#if confirmPassword && password !== confirmPassword}
            <FieldDescription>{t("register.password_mismatch")}</FieldDescription>
          {/if}
        </Field>

        <Button type="submit" class="w-full" disabled={!canSubmitBase || isSubmitting}>
          {isSubmitting ? t("register.registering") : t("register.create_account")}
        </Button>
      </form>
    {/if}

    {#if uiaSession}
      <div class="rounded-lg border border-border bg-card p-4 space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-foreground">{t("register.verification_required")}</h2>
            <p class="text-xs text-muted-foreground">{t("register.verification_desc")}</p>
          </div>
          {#if currentStep}
            <Badge variant="outline">{getStageLabel(currentStep.type)}</Badge>
          {/if}
        </div>

        <div class="flex flex-wrap gap-2">
          {#each steps as step (step.type)}
            <Badge variant={step.completed ? "default" : "secondary"}>
              {getStageLabel(step.type)}
            </Badge>
          {/each}
        </div>

        {#if currentStep?.type === AuthType.Terms}
          <label class="flex items-start gap-2 text-sm text-foreground">
            <input type="checkbox" bind:checked={acceptedTerms} class="mt-1" />
            <span>{t("register.accept_terms")}</span>
          </label>
          <Button class="w-full" onclick={handleContinueUia} disabled={isSubmitting}>
            {t("register.continue")}
          </Button>
        {:else if currentStep?.type === AuthType.RegistrationToken || currentStep?.type === "org.matrix.msc3231.login.registration_token"}
          <Field>
            <FieldLabel>{t("register.registration_token")}</FieldLabel>
            <Input bind:value={registrationToken} type="text" />
            <FieldDescription>{t("register.registration_token_desc")}</FieldDescription>
          </Field>
          <Button class="w-full" onclick={handleContinueUia} disabled={isSubmitting}>
            {t("register.continue")}
          </Button>
        {:else if currentStep?.supported}
          <Button class="w-full" onclick={handleContinueUia} disabled={isSubmitting}>
            {t("register.continue")}
          </Button>
        {:else if currentStep}
          <Alert variant="destructive">
            <AlertDescription>
              {t("register.unsupported_stage", { stage: currentStep.type })}
            </AlertDescription>
          </Alert>
        {/if}
      </div>
    {/if}

    {#if error}
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    {/if}

    <p class="text-center text-xs text-muted-foreground">
      <a href={resolve("/login")} class="text-primary underline">{t("login.back_to_login")}</a>
    </p>
  </div>
</div>
