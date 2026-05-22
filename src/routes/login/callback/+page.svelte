<script lang="ts">
  import { goto } from "$app/navigation";
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { loginWithToken } from "$lib/matrix/auth";
  import { onMount } from "svelte";

  let auth = getAuthContext();
  let error: string | null = $state(null);
  let isProcessing = $state(true);

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const loginToken = params.get("loginToken");

    if (!loginToken) {
      error = "无效的登录回调：缺少 loginToken 参数";
      isProcessing = false;
      return;
    }

    // Retrieve the stored homeserver URL from the discovery step
    const baseUrl = sessionStorage.getItem("tamarix.sso_base_url");
    if (!baseUrl) {
      error = "会话已过期，请重新登录";
      isProcessing = false;
      return;
    }

    try {
      await loginWithToken(baseUrl, loginToken);
      goto("/dashboard", { replaceState: true });
    } catch (e) {
      error = e instanceof Error ? e.message : "SSO 登录失败";
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
        <h2 class="text-lg font-semibold text-foreground">正在完成登录...</h2>
        <p class="text-sm text-muted-foreground">请稍候，正在验证您的身份</p>
      </div>
    {:else if error}
      <div class="space-y-4">
        <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
        <a href="/login" class="text-sm text-primary underline">返回登录页面</a>
      </div>
    {/if}
  </div>
</div>
