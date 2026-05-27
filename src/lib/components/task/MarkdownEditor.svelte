<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Toggle } from "$lib/components/ui/toggle";
  import { Bold, Italic, Code, Link, List, Eye, Pencil } from "@lucide/svelte";
  import { marked } from "marked";
  import { t } from "$lib/i18n";

  interface Props {
    initialBody?: string;
    onsave: (body: string, formattedBody: string) => Promise<void> | void;
    editable?: boolean;
  }

  let { initialBody = "", onsave, editable = true }: Props = $props();

  let body = $state(initialBody);
  let isEditing = $state(false);
  let isSaving = $state(false);
  let previewHtml = $state("");

  // Sync body when initialBody changes externally
  $effect(() => {
    body = initialBody;
  });

  // Render preview whenever body changes
  $effect(() => {
    if (body) {
      try {
        previewHtml = marked.parse(body, { async: false }) as string;
      } catch {
        previewHtml = `<p>${body}</p>`;
      }
    } else {
      previewHtml = "";
    }
  });

  function toggleEditing() {
    isEditing = !isEditing;
  }

  function insertMarkdown(prefix: string, suffix: string = "") {
    const textarea = document.querySelector(`[data-markdown-editor]`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.substring(start, end);

    body = body.substring(0, start) + prefix + selected + suffix + body.substring(end);

    // Restore cursor position
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + prefix.length + selected.length + suffix.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }

  async function handleSave() {
    if (isSaving) return;
    isSaving = true;
    try {
      const formatted = marked.parse(body, { async: false }) as string;
      await onsave(body, formatted);
      isEditing = false;
    } finally {
      isSaving = false;
    }
  }

  function handleCancel() {
    body = initialBody;
    isEditing = false;
  }

  // Show edit mode if no content yet
  let hasContent = $derived(body.trim().length > 0 || initialBody.trim().length > 0);
</script>

<div class="space-y-2">
  {#if editable && (!hasContent || isEditing)}
    <!-- Editing mode -->
    <div class="space-y-2">
      <!-- Toolbar -->
      <div class="flex items-center gap-1 border border-border rounded-md p-1">
        <Toggle size="sm" onclick={() => insertMarkdown("**", "**")} title={t("markdown.toolbar.bold")}>
          <Bold class="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onclick={() => insertMarkdown("*", "*")} title={t("markdown.toolbar.italic")}>
          <Italic class="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onclick={() => insertMarkdown("`", "`")} title={t("markdown.toolbar.code")}>
          <Code class="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onclick={() => insertMarkdown("[", "](url)")} title={t("markdown.toolbar.link")}>
          <Link class="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onclick={() => insertMarkdown("- ")} title={t("markdown.toolbar.list")}>
          <List class="h-4 w-4" />
        </Toggle>
      </div>

      <!-- Editor + Preview tabs -->
      <div class="border border-border rounded-md">
        <textarea
          data-markdown-editor
          bind:value={body}
          class="w-full min-h-[120px] p-3 bg-background text-sm resize-y focus:outline-none"
          placeholder={t("task.description_placeholder")}
        ></textarea>
      </div>

      {#if body.trim()}
        <div class="border border-border rounded-md p-3">
          <div class="text-xs text-muted-foreground mb-2">{t("markdown.preview")}</div>
          <div class="prose prose-sm dark:prose-invert max-w-none">
            {@html previewHtml}
          </div>
        </div>
      {/if}

      <div class="flex gap-2">
        <Button size="sm" onclick={handleSave} disabled={isSaving}>
          {isSaving ? t("common.saving") : t("common.save")}
        </Button>
        <Button variant="outline" size="sm" onclick={handleCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  {:else if hasContent}
    <!-- View mode -->
    <div class="group relative">
      <div class="prose prose-sm dark:prose-invert max-w-none">
        {@html previewHtml}
      </div>
      {#if editable}
        <Button
          variant="ghost"
          size="sm"
          class="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onclick={toggleEditing}
        >
          <Pencil class="h-3 w-3 mr-1" />
          {t("common.edit")}
        </Button>
      {/if}
    </div>
  {:else if editable}
    <Button variant="outline" size="sm" onclick={() => isEditing = true}>
      <Pencil class="h-3 w-3 mr-1" />
      {t("common.edit")}
    </Button>
  {/if}
</div>
