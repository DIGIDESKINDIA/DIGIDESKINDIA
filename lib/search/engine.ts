// File: lib/search/engine.ts

import { SEARCH_INDEX } from "./index";
import type {
  SearchCategory,
  SearchEngineOptions,
  SearchItem,
  SearchResponse,
} from "./types";

/**
 * ==========================================================
 * Digital Desk India
 * Global Search Engine
 * ==========================================================
 */

export class SearchEngine {
  private items: SearchItem[];

  constructor(items: SearchItem[] = SEARCH_INDEX) {
    this.items = items;
  }

  /**
   * Public Search API
   */

  search(
    query: string,
    options: SearchEngineOptions = {}
  ): SearchResponse {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return {
        query,
        total: 0,
        results: [],
      };
    }

    let data = [...this.items];

    if (options.category) {
      data = data.filter(
        (item) => item.category === options.category
      );
    }

    const ranked = data
      .map((item) => ({
        item,
        score: this.calculateScore(item, keyword),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const limit =
      options.limit ??
      20;

    return {
      query,
      total: ranked.length,
      results: ranked.slice(0, limit),
    };
  }

  /**
   * Featured Tools
   */

  featured(limit = 8): SearchItem[] {
    return this.items
      .filter((i) => i.featured)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  /**
   * Category Search
   */

  category(category: SearchCategory) {
    return this.items.filter(
      (item) => item.category === category
    );
  }

  /**
   * Popular Tools
   */

  popular(limit = 20) {
    return [...this.items]
      .sort(
        (a, b) =>
          b.popularity - a.popularity
      )
      .slice(0, limit);
  }

  /**
   * Suggestions
   */

  suggestions(
    keyword: string,
    limit = 8
  ): SearchItem[] {
    return this.search(keyword, {
      limit,
    }).results.map((r) => r.item);
  }

  /**
   * Search by Slug
   */

  findBySlug(slug: string) {
    return this.items.find(
      (item) => item.slug === slug
    );
  }

  /**
   * Search by ID
   */

  findById(id: string) {
    return this.items.find(
      (item) => item.id === id
    );
  }

  /**
   * Related Tools
   */

  related(
    item: SearchItem,
    limit = 6
  ): SearchItem[] {
    return this.items
      .filter(
        (i) =>
          i.id !== item.id &&
          i.category === item.category
      )
      .sort(
        (a, b) =>
          b.popularity - a.popularity
      )
      .slice(0, limit);
  }

  /**
   * Calculate Ranking Score
   */

  private calculateScore(
    item: SearchItem,
    keyword: string
  ): number {
    let score = 0;

    const title =
      item.title.toLowerCase();

    const desc =
      item.description.toLowerCase();

    const slug =
      item.slug.toLowerCase();

    if (title === keyword)
      score += 500;

    if (slug === keyword)
      score += 450;

    if (title.startsWith(keyword))
      score += 350;

    if (slug.startsWith(keyword))
      score += 320;

    if (
      title.includes(keyword)
    )
      score += 220;

    if (
      desc.includes(keyword)
    )
      score += 120;

    item.keywords.forEach((k) => {
      const value =
        k.toLowerCase();

      if (value === keyword)
        score += 260;

      else if (
        value.startsWith(keyword)
      )
        score += 180;

      else if (
        value.includes(keyword)
      )
        score += 120;
    });

    score += item.popularity;

    if (item.featured)
      score += 40;

    switch (item.priority) {
      case "featured":
        score += 50;
        break;

      case "high":
        score += 30;
        break;

      case "medium":
        score += 15;
        break;

      default:
        break;
    }

    return score;
  }
}

/**
 * ==========================================================
 * Singleton Instance
 * ==========================================================
 */

export const searchEngine =
  new SearchEngine();

/**
 * ==========================================================
 * Utility Helpers
 * ==========================================================
 */

export function searchAll(
  query: string,
  options?: SearchEngineOptions
) {
  return searchEngine.search(
    query,
    options
  );
}

export function featuredTools(
  limit?: number
) {
  return searchEngine.featured(
    limit
  );
}

export function popularTools(
  limit?: number
) {
  return searchEngine.popular(
    limit
  );
}

export function searchSuggestions(
  keyword: string,
  limit?: number
) {
  return searchEngine.suggestions(
    keyword,
    limit
  );
}

export function toolsByCategory(
  category: SearchCategory
) {
  return searchEngine.category(
    category
  );
}

export function relatedTools(
  item: SearchItem,
  limit?: number
) {
  return searchEngine.related(
    item,
    limit
  );
}

export function getToolBySlug(
  slug: string
) {
  return searchEngine.findBySlug(
    slug
  );
}

export function getToolById(
  id: string
) {
  return searchEngine.findById(id);
}