// File: lib/search/index.ts

import type { SearchItem } from "./types";

export const SEARCH_INDEX: SearchItem[] = [
  /* -------------------------------------------------------------------------- */
  /* GOVERNMENT SERVICES                                                        */
  /* -------------------------------------------------------------------------- */

  {
    id: "pan-card",
    title: "PAN Card Services",
    slug: "pan-card",
    href: "/service/pan-card",
    description: "New PAN, Correction & Status",
    category: "government",
    keywords: [
      "pan",
      "pan card",
      "income tax",
      "nsdl",
      "uti",
    ],
    popularity: 99,
    priority: "featured",
    featured: true,
    icon: "Landmark",
  },

  /* -------------------------------------------------------------------------- */
  /* PDF STUDIO                                                                 */
  /* -------------------------------------------------------------------------- */

  {
    id: "merge-pdf",
    title: "Merge PDF",
    slug: "merge-pdf",
    href: "/pdf-tools/merge-pdf",
    description: "Merge PDF files",
    category: "pdf",
    keywords: [
      "merge",
      "combine",
      "pdf",
    ],
    popularity: 100,
    priority: "featured",
    featured: true,
    icon: "FileText",
  },

  {
    id: "split-pdf",
    title: "Split PDF",
    slug: "split-pdf",
    href: "/pdf-tools/split",
    description: "Split PDF",
    category: "pdf",
    keywords: [
      "split",
      "pdf",
    ],
    popularity: 98,
    priority: "featured",
    icon: "FileText",
  },

  {
    id: "compress-pdf",
    title: "Compress PDF",
    slug: "compress-pdf",
    href: "/pdf-tools/compress-pdf",
    description: "Compress PDF Size",
    category: "pdf",
    keywords: [
      "compress",
      "reduce",
      "pdf",
    ],
    popularity: 100,
    priority: "featured",
    featured: true,
    icon: "FileText",
  },

  /* -------------------------------------------------------------------------- */
  /* IMAGE STUDIO                                                               */
  /* -------------------------------------------------------------------------- */

  {
    id: "passport-photo",
    title: "Passport Size Photo",
    slug: "passport-photo",
    href: "/image-tools/passport-photo",
    description: "Create Passport Photo",
    category: "image",
    keywords: [
      "passport",
      "photo",
      "photo maker",
    ],
    popularity: 100,
    priority: "featured",
    featured: true,
    icon: "Image",
  },

  {
    id: "background-remover",
    title: "Background Remover",
    slug: "background-remover",
    href: "/image-tools/remove-background",
    description: "AI Background Removal",
    category: "image",
    keywords: [
      "background",
      "remove",
      "ai",
      "image",
    ],
    popularity: 99,
    priority: "featured",
    featured: true,
    icon: "Image",
  },

  {
    id: "image-compress",
    title: "Compress Image",
    slug: "image-compress",
    href: "/image-tools/compress-image",
    description: "Compress Images",
    category: "image",
    keywords: [
      "compress",
      "image",
      "jpg",
      "png",
    ],
    popularity: 95,
    priority: "high",
    icon: "Image",
  },

  /* -------------------------------------------------------------------------- */
  /* AI STUDIO                                                                  */
  /* -------------------------------------------------------------------------- */

  {
    id: "manish-ai",
    title: "Manish AI",
    slug: "manish-ai",
    href: "/ai",
    description: "Digital Desk AI Assistant",
    category: "ai",
    keywords: [
      "ai",
      "assistant",
      "chat",
      "gemini",
      "manish",
    ],
    popularity: 100,
    priority: "featured",
    featured: true,
    icon: "Bot",
  },

  {
    id: "resume-ai",
    title: "AI Resume Builder",
    slug: "resume-ai",
    href: "/ai/resume",
    description: "Generate Resume",
    category: "ai",
    keywords: [
      "resume",
      "cv",
      "ai",
    ],
    popularity: 92,
    priority: "high",
    icon: "Bot",
  },
];
