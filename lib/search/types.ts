// File: lib/search/types.ts

/**
 * ==========================================================
 * Digital Desk India
 * Global Search Type Definitions
 * ==========================================================
 */

export type SearchCategory =
  | "government"
  | "pdf"
  | "image"
  | "ai"
  | "document"
  | "calculator"
  | "jobs"
  | "education"
  | "business"
  | "cyber-cafe"
  | "blog";

export type SearchPriority =
  | "low"
  | "medium"
  | "high"
  | "featured";

export interface SearchKeyword {
  value: string;
}

export interface SearchItem {

  /**
   * Unique identifier
   */
  id: string;

  /**
   * Display title
   */
  title: string;

  /**
   * Search slug
   */
  slug: string;

  /**
   * Internal Route
   */
  href: string;

  /**
   * Short description
   */
  description: string;

  /**
   * Search Category
   */
  category: SearchCategory;

  /**
   * Search Keywords
   */
  keywords: string[];

  /**
   * Popularity Score
   */
  popularity: number;

  /**
   * Priority
   */
  priority: SearchPriority;

  /**
   * Hero / Featured Tool
   */
  featured?: boolean;

  /**
   * Recently Added
   */
  new?: boolean;

  /**
   * Search Icon Name
   */
  icon?: string;

  /**
   * Search Image
   */
  image?: string;

  /**
   * Badge
   */
  badge?: string;

  /**
   * Optional Group
   */

  group?: string;

  /**
   * Optional State
   */

  state?: string;

  /**
   * Tags
   */

  tags?: string[];

  /**
   * SEO Title
   */

  seoTitle?: string;

  /**
   * SEO Description
   */

  seoDescription?: string;

}

export interface SearchResult {

  item: SearchItem;

  score: number;

}

export interface SearchSection {

  title: string;

  category: SearchCategory;

  items: SearchItem[];

}

export interface SearchResponse {

  query: string;

  total: number;

  results: SearchResult[];

}

export interface RecentSearch {

  id: string;

  query: string;

  createdAt: number;

}

export interface SearchSuggestion {

  title: string;

  href: string;

  icon?: string;

  category: SearchCategory;

}

export interface SearchEngineOptions {

  limit?: number;

  includeFeatured?: boolean;

  category?: SearchCategory;

}

export interface SearchCategoryConfig {

  id: SearchCategory;

  title: string;

  color: string;

  icon: string;

}

export const SEARCH_CATEGORIES: Record<
  SearchCategory,
  SearchCategoryConfig
> = {

  government: {
    id: "government",
    title: "Government Services",
    color: "#2563eb",
    icon: "Landmark",
  },

  pdf: {
    id: "pdf",
    title: "PDF Studio",
    color: "#dc2626",
    icon: "FileText",
  },

  image: {
    id: "image",
    title: "Image Studio",
    color: "#16a34a",
    icon: "Image",
  },

  ai: {
    id: "ai",
    title: "Manish AI",
    color: "#7c3aed",
    icon: "Bot",
  },

  document: {
    id: "document",
    title: "Document Studio",
    color: "#0891b2",
    icon: "FileBadge",
  },

  calculator: {
    id: "calculator",
    title: "Calculators",
    color: "#ca8a04",
    icon: "Calculator",
  },

  jobs: {
    id: "jobs",
    title: "Jobs",
    color: "#2563eb",
    icon: "Briefcase",
  },

  education: {
    id: "education",
    title: "Education",
    color: "#0f766e",
    icon: "GraduationCap",
  },

  business: {
    id: "business",
    title: "Business Tools",
    color: "#4338ca",
    icon: "Building2",
  },

  "cyber-cafe": {
    id: "cyber-cafe",
    title: "Cyber Cafe",
    color: "#059669",
    icon: "Monitor",
  },

  blog: {
    id: "blog",
    title: "Blogs",
    color: "#ea580c",
    icon: "Newspaper",
  },

};

export const SEARCH_STORAGE_KEY =
  "digitaldesk_recent_searches";

export const MAX_RECENT_SEARCHES = 10;

export const DEFAULT_SEARCH_LIMIT = 20;

export const FEATURED_SEARCH_LIMIT = 8;