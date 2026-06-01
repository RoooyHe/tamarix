<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
  } from "$lib/components/ui/dialog";
  import { t } from "$lib/i18n";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  let { open = $bindable(false), onOpenChange }: Props = $props();

  function handleOpenChange(value: boolean) {
    open = value;
    onOpenChange?.(value);
  }

  const shortcuts = [
    { key: "?", description: t("shortcuts.open") },
    { key: "N", description: t("shortcuts.new_task") },
    { key: "E", description: t("shortcuts.edit") },
    { key: "Cmd+K", description: t("shortcuts.search") },
    { key: "Esc", description: t("shortcuts.close") },
    { key: "1-5", description: t("shortcuts.set_status") },
    { key: "T", description: t("shortcuts.toggle_tag") },
    { key: "A", description: t("shortcuts.assign") },
    { key: "D", description: t("shortcuts.due_date") },
    { key: "/", description: t("shortcuts.focus_search") }
  ];
</script>

<Dialog bind:open onOpenChange={handleOpenChange}>
  <DialogContent class="sm:max-w-[400px]">
    <DialogHeader>
      <DialogTitle>{t("shortcuts.title")}</DialogTitle>
      <DialogDescription>{t("shortcuts.title")}</DialogDescription>
    </DialogHeader>
    <div class="space-y-2">
      {#each shortcuts as shortcut}
        <div class="flex items-center justify-between py-1.5">
          <span class="text-sm text-foreground">{shortcut.description}</span>
          <kbd class="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
            {shortcut.key}
          </kbd>
        </div>
      {/each}
    </div>
  </DialogContent>
</Dialog>
