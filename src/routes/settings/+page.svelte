<script lang="ts">
  import { getAuthContext } from "$lib/stores/auth.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Separator } from "$lib/components/ui/separator";
  import { LogOut } from "@lucide/svelte";

  let auth = getAuthContext();
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-foreground">设置</h1>
    <p class="text-sm text-muted-foreground">账户与应用设置</p>
  </div>

  <Separator />

  <!-- Account Info -->
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-foreground">账户信息</h2>
    <div class="rounded-lg border border-border bg-card p-4 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">用户 ID</span>
        <span class="text-sm font-mono">{auth.userId ?? "未登录"}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">状态</span>
        <span class="text-sm text-green-500">已连接</span>
      </div>
    </div>
  </div>

  <Separator />

  <!-- Danger Zone -->
  <div class="space-y-4">
    <h2 class="text-lg font-semibold text-destructive">危险操作</h2>
    <div class="rounded-lg border border-destructive/30 bg-card p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-foreground">退出登录</p>
          <p class="text-xs text-muted-foreground">清除本地会话并返回登录页</p>
        </div>
        <Button variant="destructive" size="sm" onclick={() => auth.logout()}>
          <LogOut class="mr-2 h-4 w-4" />
          退出
        </Button>
      </div>
    </div>
  </div>
</div>
