import { getContext, setContext } from "svelte";

const UI_CONTEXT_KEY = "tamarix:ui";

function createUiState() {
  let sidebarOpen = $state(true);
  let currentView = $state<"list" | "board">("list");

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function setView(view: "list" | "board") {
    currentView = view;
  }

  return {
    get sidebarOpen() { return sidebarOpen; },
    set sidebarOpen(value: boolean) { sidebarOpen = value; },
    get currentView() { return currentView; },
    toggleSidebar,
    setView
  };
}

export type UiStore = ReturnType<typeof createUiState>;

export function setUiContext() {
  const ui = createUiState();
  setContext(UI_CONTEXT_KEY, ui);
  return ui;
}

export function getUiContext(): UiStore {
  return getContext<UiStore>(UI_CONTEXT_KEY);
}
