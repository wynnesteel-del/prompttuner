import { useCallback, useState } from "react";

/**
 * Favorites (pinned) + recently used templates, persisted in localStorage.
 * No database migration needed, so existing features are untouched.
 * When you add Supabase auth later, swap these two keys for a user_template_prefs table.
 */
const FAV_KEY = "pt.templates.favorites.v1";
const RECENT_KEY = "pt.templates.recent.v1";
const MAX_RECENT = 5;

function read(key: string): number[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return []; // private mode / blocked storage: degrade gracefully
  }
}

function write(key: string, value: number[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / privacy errors */
  }
}

export function useTemplatePrefs() {
  const [favorites, setFavorites] = useState<number[]>(() => read(FAV_KEY));
  const [recent, setRecent] = useState<number[]>(() => read(RECENT_KEY));

  // Write to storage synchronously (not in an effect): "Use Template" navigates away
  // immediately, and an effect would never run on the unmounted page.
  const isFavorite = useCallback((id: number) => favorites.includes(id), [favorites]);

  const toggleFavorite = useCallback((id: number) => {
    const next = read(FAV_KEY);
    const updated = next.includes(id) ? next.filter((x) => x !== id) : [id, ...next];
    write(FAV_KEY, updated);
    setFavorites(updated);
  }, []);

  const markUsed = useCallback((id: number) => {
    const updated = [id, ...read(RECENT_KEY).filter((x) => x !== id)].slice(0, MAX_RECENT);
    write(RECENT_KEY, updated);
    setRecent(updated);
  }, []);

  const clearRecent = useCallback(() => {
    write(RECENT_KEY, []);
    setRecent([]);
  }, []);

  return { favorites, recent, isFavorite, toggleFavorite, markUsed, clearRecent };
}
