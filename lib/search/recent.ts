// File: lib/search/recent.ts

import {
  MAX_RECENT_SEARCHES,
  SEARCH_STORAGE_KEY,
  type RecentSearch,
} from "./types";

/**
 * ==========================================================
 * Digital Desk India
 * Recent Search Manager
 * ==========================================================
 */

const isBrowser = () => typeof window !== "undefined";

/**
 * Get Recent Searches
 */
export function getRecentSearches(): RecentSearch[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(SEARCH_STORAGE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

/**
 * Save Recent Searches
 */
function saveRecentSearches(
  searches: RecentSearch[]
): void {
  if (!isBrowser()) return;

  localStorage.setItem(
    SEARCH_STORAGE_KEY,
    JSON.stringify(searches)
  );
}

/**
 * Add Search
 */
export function addRecentSearch(
  query: string
): RecentSearch[] {
  if (!isBrowser()) return [];

  const text = query.trim();

  if (!text) {
    return getRecentSearches();
  }

  const searches = getRecentSearches();

  const filtered = searches.filter(
    (item) =>
      item.query.toLowerCase() !==
      text.toLowerCase()
  );

  const next: RecentSearch[] = [
    {
      id: crypto.randomUUID(),
      query: text,
      createdAt: Date.now(),
    },
    ...filtered,
  ].slice(0, MAX_RECENT_SEARCHES);

  saveRecentSearches(next);

  return next;
}

/**
 * Remove Search
 */
export function removeRecentSearch(
  id: string
): RecentSearch[] {
  const next = getRecentSearches().filter(
    (item) => item.id !== id
  );

  saveRecentSearches(next);

  return next;
}

/**
 * Clear History
 */
export function clearRecentSearches(): void {
  if (!isBrowser()) return;

  localStorage.removeItem(
    SEARCH_STORAGE_KEY
  );
}

/**
 * Has History
 */
export function hasRecentSearches(): boolean {
  return getRecentSearches().length > 0;
}

/**
 * Latest Search
 */
export function latestSearch():
  | RecentSearch
  | undefined {
  return getRecentSearches()[0];
}

/**
 * Search Exists
 */
export function searchExists(
  query: string
): boolean {
  return getRecentSearches().some(
    (item) =>
      item.query.toLowerCase() ===
      query.trim().toLowerCase()
  );
}

/**
 * Limit History
 */
export function limitHistory(
  limit: number
): RecentSearch[] {
  const next = getRecentSearches().slice(
    0,
    limit
  );

  saveRecentSearches(next);

  return next;
}

/**
 * Search History
 */
export function searchHistory(
  keyword: string
): RecentSearch[] {
  const value = keyword.toLowerCase();

  return getRecentSearches().filter((item) =>
    item.query
      .toLowerCase()
      .includes(value)
  );
}

/**
 * Import History
 */
export function importRecentSearches(
  data: RecentSearch[]
): void {
  if (!Array.isArray(data)) return;

  const cleaned = data
    .filter(
      (item) =>
        item.query &&
        item.query.trim().length > 0
    )
    .slice(0, MAX_RECENT_SEARCHES);

  saveRecentSearches(cleaned);
}

/**
 * Export History
 */
export function exportRecentSearches(): string {
  return JSON.stringify(
    getRecentSearches(),
    null,
    2
  );
}

/**
 * Statistics
 */
export function recentSearchStats() {
  const items = getRecentSearches();

  return {
    total: items.length,
    newest: items[0] ?? null,
    oldest:
      items.length > 0
        ? items[items.length - 1]
        : null,
  };
}