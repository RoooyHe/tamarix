import { isInputElement } from "$lib/utils/keyboard";
import { TASK_STATUS_ORDER } from "$lib/matrix/task-types";

interface WritableState {
  value: boolean;
}

/**
 * Global keyboard shortcuts handler.
 * Returns a keydown event handler to attach to `svelte:window`.
 */
export function useKeyboard(opts: {
  isLoggedIn: boolean;
  shortcutsOpen: WritableState;
  commandPaletteOpen: WritableState;
}): (e: KeyboardEvent) => void {
  const { isLoggedIn, shortcutsOpen, commandPaletteOpen } = opts;

  return (e: KeyboardEvent) => {
    const isCmdK = (e.metaKey || e.ctrlKey) && e.key === "k";
    const isEsc = e.key === "Escape";

    if (isCmdK) {
      e.preventDefault();
      commandPaletteOpen.value = !commandPaletteOpen.value;
      return;
    }

    if (isEsc) {
      if (shortcutsOpen.value) {
        shortcutsOpen.value = false;
        return;
      }
      if (commandPaletteOpen.value) {
        commandPaletteOpen.value = false;
        return;
      }
      return;
    }

    if (isInputElement(e.target as HTMLElement)) return;

    if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      shortcutsOpen.value = !shortcutsOpen.value;
      return;
    }

    if (!isLoggedIn) return;

    if (e.key === "n" || e.key === "N") {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "new_task" } }));
        return;
      }
    }

    if (e.key === "e" || e.key === "E") {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "edit" } }));
        return;
      }
    }

    if (e.key >= "1" && e.key <= "5" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const statusIndex = parseInt(e.key) - 1;
      if (statusIndex < TASK_STATUS_ORDER.length) {
        const targetStatus = TASK_STATUS_ORDER[statusIndex];
        window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "set_status", status: targetStatus } }));
      }
      return;
    }

    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "focus_search" } }));
      return;
    }

    if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "toggle_tag" } }));
      return;
    }

    if ((e.key === "a" || e.key === "A") && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "assign" } }));
      return;
    }

    if ((e.key === "d" || e.key === "D") && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("tamarix:shortcut", { detail: { action: "due_date" } }));
      return;
    }
  };
}
