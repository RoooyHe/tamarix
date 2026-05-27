<script lang="ts">
  import { SidebarProvider, SidebarInset } from "$lib/components/ui/sidebar";
  import AppSidebar from "./AppSidebar.svelte";
  import AppHeader from "./AppHeader.svelte";

  let { children } = $props();
</script>

<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    <AppHeader />
    <main class="flex-1 overflow-auto p-2 md:p-4">
      {@render children()}
    </main>
  </SidebarInset>
</SidebarProvider>
