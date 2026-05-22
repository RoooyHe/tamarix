<script lang="ts">
  import { Avatar, AvatarFallback, AvatarImage } from "$lib/components/ui/avatar";
  import type { MatrixClient } from "matrix-js-sdk";

  interface Props {
    client?: MatrixClient | null;
    userId?: string;
    displayName?: string;
    avatarUrl?: string;
    size?: "xs" | "sm" | "md" | "lg";
  }

  let { client, userId, displayName, avatarUrl, size = "md" }: Props = $props();

  const sizeClasses = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg"
  };

  let imgSrc = $derived.by(() => {
    if (!client || !avatarUrl) return "";
    try {
      return client.mxcUrlToHttp(avatarUrl, 96, 96, "crop") ?? "";
    } catch {
      return "";
    }
  });

  let initials = $derived.by(() => {
    if (displayName) {
      return displayName.slice(0, 2).toUpperCase();
    }
    if (userId) {
      const localpart = userId.split(":")[0].replace("@", "");
      return localpart.slice(0, 2).toUpperCase();
    }
    return "?";
  });
</script>

<Avatar class={sizeClasses[size]}>
  {#if imgSrc}
    <AvatarImage src={imgSrc} alt={displayName ?? userId ?? ""} />
  {/if}
  <AvatarFallback>{initials}</AvatarFallback>
</Avatar>
