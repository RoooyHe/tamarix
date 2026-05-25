/**
 * Lightweight i18n system for Svelte 5.
 *
 * Reactive locale state is managed in ui.svelte.ts (which uses $state runes).
 * This module provides pure functions and the translation registry.
 *
 * Usage:
 *   import { t, setLocale, getCurrentLocale, initLocale } from "$lib/i18n";
 *   t("status.todo")          // -> "待办" or "To Do"
 *   t("pagination.total", { n: 42 })  // -> "共 42 条" or "42 total"
 */

import zh from "./locales/zh";
import en from "./locales/en";

export type Locale = "zh" | "en";
export type TranslationDict = Record<string, string>;

// --- Locale registry (pure data, no runes) ---
const localeRegistry = new Map<Locale, TranslationDict>();
localeRegistry.set("zh", zh);
localeRegistry.set("en", en);

// Module-level locale variable — reactivity is driven by ui.svelte.ts
// which calls setLocale() and triggers $effect re-computation in components.
let _currentLocale: Locale = "zh";

// --- Internal API for ui.svelte.ts ---
export function _getLocale(): Locale {
  return _currentLocale;
}

export function _setLocale(locale: Locale): void {
  _currentLocale = locale;
}

// --- Public API ---

/**
 * Translate a key with optional interpolation.
 * Supports `{{param}}` placeholders.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = localeRegistry.get(_currentLocale) ?? zh;
  let value = dict[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    }
  }

  return value;
}

/**
 * Get the current locale.
 */
export function getCurrentLocale(): Locale {
  return _currentLocale;
}

/**
 * Set the current locale. Persists to localStorage and updates <html lang>.
 */
export function setLocale(locale: Locale) {
  _currentLocale = locale;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("tamarix:locale", locale);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

/**
 * Register a custom locale dictionary.
 * Merges with any existing keys for that locale.
 */
export function registerLocale(locale: Locale, dict: TranslationDict) {
  const existing = localeRegistry.get(locale) ?? {};
  localeRegistry.set(locale, { ...existing, ...dict });
}

/**
 * Initialize locale from localStorage (call once at app startup).
 */
export function initLocale() {
  if (typeof localStorage === "undefined") return;
  const stored = localStorage.getItem("tamarix:locale");
  if (stored === "zh" || stored === "en") {
    _currentLocale = stored;
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = _currentLocale;
  }
}
