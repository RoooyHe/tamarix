import { getContext, setContext, onMount } from "svelte";
import { setLocale as i18nSetLocale, getCurrentLocale, initLocale, type Locale } from "$lib/i18n";

const UI_CONTEXT_KEY = "tamarix:ui";

function createUiState() {
  let sidebarOpen = $state(true);
  let currentView = $state<"list" | "board">("list");

  let theme = $state<"light" | "dark" | "system">("system");
  let prefersDark = $state(false);

  let resolvedTheme = $derived(
    theme === "system" ? (prefersDark ? "dark" : "light") : theme
  );

  let locale = $state<Locale>(getCurrentLocale());

  let initialized = $state(false);

  $effect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tamarix:theme");
      if (stored === "light" || stored === "dark" || stored === "system") {
        theme = stored;
      }
      initialized = true;
    }
  });

  $effect(() => {
    if (initialized && typeof window !== "undefined") {
      localStorage.setItem("tamarix:theme", theme);
    }
  });

  $effect(() => {
    if (typeof document === "undefined") return;
    if (resolvedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  });

  // Sync locale from i18n module
  $effect(() => {
    locale = getCurrentLocale();
  });

  onMount(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    prefersDark = mql.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersDark = e.matches;
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function setView(view: "list" | "board") {
    currentView = view;
  }

  function setTheme(t: "light" | "dark" | "system") {
    theme = t;
  }

  function toggleTheme() {
    if (theme === "system") {
      theme = resolvedTheme === "dark" ? "light" : "dark";
    } else {
      theme = theme === "dark" ? "light" : "dark";
    }
  }

  function setLocale(newLocale: Locale) {
    i18nSetLocale(newLocale);
    locale = newLocale;
  }

  return {
    get sidebarOpen() { return sidebarOpen; },
    set sidebarOpen(value: boolean) { sidebarOpen = value; },
    get currentView() { return currentView; },
    get theme() { return theme; },
    get resolvedTheme() { return resolvedTheme; },
    get locale() { return locale; },
    toggleSidebar,
    setView,
    setTheme,
    toggleTheme,
    setLocale
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
