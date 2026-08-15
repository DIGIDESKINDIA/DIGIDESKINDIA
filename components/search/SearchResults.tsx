// File: components/search/SearchResults.tsx

"use client";

import Link from "next/link";
import {
  SearchResponse,
  SearchResult,
  SEARCH_CATEGORIES,
} from "@/lib/search/types";

import {
  Search,
  ArrowRight,
  Star,
  Sparkles,
  FileText,
  ImageIcon,
  Bot,
  Landmark,
  Briefcase,
  GraduationCap,
  Calculator,
  Building2,
  Newspaper,
} from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";

interface Props {
  query: string;
  response: SearchResponse;
}

const ICONS = {
  government: Landmark,
  pdf: FileText,
  image: ImageIcon,
  ai: Bot,
  document: FileText,
  calculator: Calculator,
  jobs: Briefcase,
  education: GraduationCap,
  business: Building2,
  "cyber-cafe": Building2,
  blog: Newspaper,
};

export default function SearchResults({
  query,
  response,
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const validResults = response.results.filter(
    (result) =>
      result.item.href === "/ai" ||
      result.item.href === "/ai/resume" ||
      result.item.href.startsWith("/service/") ||
      result.item.href.startsWith("/pdf-tools/") ||
      result.item.href.startsWith("/image-tools/")
  );

  const grouped = validResults.reduce<
    Record<string, SearchResult[]>
  >((acc, item) => {
    if (!acc[item.item.category]) {
      acc[item.item.category] = [];
    }

    acc[item.item.category].push(item);

    return acc;
  }, {});

  return (
    <section className="mx-auto max-w-7xl px-5 py-10">

      {/* Search Summary */}

      <div className={isDark ? "rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_20px_50px_rgba(2,6,23,0.3)]" : "rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"}>

        <div className="flex flex-wrap items-center justify-between gap-6">

          <div>

            <div className="flex items-center gap-3">

              <Search
                size={22}
                className="text-blue-600"
              />

              <h2 className={isDark ? "text-3xl font-black text-white" : "text-3xl font-black text-slate-900"}>

                Search Results

              </h2>

            </div>

            <p className={isDark ? "mt-3 text-slate-300" : "mt-3 text-slate-600"}>

              {validResults.length} results found for

              <span className="ml-2 rounded-lg bg-blue-100 px-3 py-1 font-bold text-blue-700">

                {query || "Everything"}

              </span>

            </p>

          </div>

          <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-cyan-600 px-6 py-4 text-white">

            <p className="text-sm opacity-90">
              Digital Desk Search
            </p>

            <h3 className="text-3xl font-black">

              {validResults.length}

            </h3>

          </div>

        </div>

      </div>

      {/* Empty State */}

      {validResults.length === 0 && (

        <div className={isDark ? "mt-10 rounded-3xl border border-dashed border-white/10 bg-white/5 py-24 text-center" : "mt-10 rounded-3xl border border-dashed border-slate-300 bg-white py-24 text-center"}>

          <Search
            className="mx-auto text-slate-300"
            size={60}
          />

          <h2 className={isDark ? "mt-6 text-3xl font-black text-white" : "mt-6 text-3xl font-black text-slate-800"}>

            No Results Found

          </h2>

          <p className={isDark ? "mx-auto mt-4 max-w-xl text-slate-300" : "mx-auto mt-4 max-w-xl text-slate-500"}>

            Try searching for Aadhaar, PAN Card,
            Compress PDF, Passport Photo,
            Background Remover or Manish AI.

          </p>

        </div>

      )}

      {/* Featured Results */}

      {validResults.length > 0 && (

        <section className="mt-10">

          <div className="mb-6 flex items-center gap-3">

            <Star
              size={22}
              className="text-yellow-500"
            />

            <h3 className="text-2xl font-black">

              Featured Results

            </h3>

          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

            {validResults
              .filter((item) => item.item.featured)
              .slice(0, 6)
              .map((result) => (
                <FeaturedCard
                  key={result.item.id}
                  result={result}
                />
              ))}

          </div>

        </section>

      )}

      {/* Category Sections */}

      {Object.entries(grouped).map(
        ([category, results]) => {

          const config =
            SEARCH_CATEGORIES[
              category as keyof typeof SEARCH_CATEGORIES
            ];

          const Icon =
            ICONS[
              category as keyof typeof ICONS
            ] || Sparkles;

          return (
            <section
              key={category}
              className="mt-14"
            >

              <div className="mb-6 flex items-center gap-3">

                <Icon
                  size={24}
                  className="text-blue-600"
                />

                <h2 className="text-2xl font-black text-slate-900">

                  {config.title}

                </h2>

              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

                {results.map((item) => (
                  <SearchCard
                    key={item.item.id}
                    result={item}
                  />
                ))}

              </div>

            </section>
          );
        }
      )}

    </section>
  );
}

/* ===========================
   Featured Card
=========================== */

function FeaturedCard({
  result,
}: {
  result: SearchResult;
}) {
  const item = result.item;

  return (
    <Link
      href={item.href}
      className="group rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
    >
      <div className="flex items-center justify-between">

        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">

          Featured

        </span>

        <ArrowRight
          className="transition group-hover:translate-x-1"
          size={18}
        />

      </div>

      <h3 className="mt-6 text-2xl font-black text-slate-900">

        {item.title}

      </h3>

      <p className="mt-3 text-slate-600">

        {item.description}

      </p>

      <div className="mt-6 flex items-center justify-between">

        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold shadow">

          {item.category}

        </span>

        <span className="text-sm text-slate-500">

          Popularity {item.popularity}

        </span>

      </div>

    </Link>
  );
}
/* ==========================================================
   Search Result Card
========================================================== */

function SearchCard({
  result,
}: {
  result: SearchResult;
}) {
  const item = result.item;

  const Icon =
    ICONS[
      item.category as keyof typeof ICONS
    ] || Sparkles;

  const priorityColor =
    item.priority === "featured"
      ? "bg-emerald-100 text-emerald-700"
      : item.priority === "high"
      ? "bg-blue-100 text-blue-700"
      : item.priority === "medium"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-700";

  return (
    <Link
      href={item.href}
      className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-500 hover:shadow-2xl"
    >
      {/* Header */}

      <div className="flex items-start justify-between">

        <div className="flex items-center gap-4">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg">

            <Icon size={24} />

          </div>

          <div>

            <h3 className="text-xl font-bold text-slate-900 transition group-hover:text-blue-700">

              {item.title}

            </h3>

            <p className="mt-1 text-sm text-slate-500">

              {SEARCH_CATEGORIES[item.category].title}

            </p>

          </div>

        </div>

        <ArrowRight
          size={20}
          className="text-slate-400 transition-all group-hover:translate-x-1 group-hover:text-blue-600"
        />

      </div>

      {/* Description */}

      <p className="mt-6 leading-7 text-slate-600">

        {item.description}

      </p>

      {/* Keywords */}

      {item.keywords.length > 0 && (

        <div className="mt-6 flex flex-wrap gap-2">

          {item.keywords
            .slice(0, 5)
            .map((keyword) => (

              <span
                key={keyword}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
              >

                {keyword}

              </span>

            ))}

        </div>

      )}

      {/* Footer */}

      <div className="mt-8 flex items-center justify-between">

        <div className="flex items-center gap-2">

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${priorityColor}`}
          >

            {item.priority.toUpperCase()}

          </span>

          {item.new && (

            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">

              NEW

            </span>

          )}

        </div>

        <span className="text-sm font-semibold text-slate-500">

          Score {Math.round(result.score)}

        </span>

      </div>

    </Link>
  );
}

/* ==========================================================
   Statistics
========================================================== */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SearchStatistics({
  response,
}: {
  response: SearchResponse;
}) {
  const government =
    response.results.filter(
      (i) => i.item.category === "government"
    ).length;

  const pdf =
    response.results.filter(
      (i) => i.item.category === "pdf"
    ).length;

  const image =
    response.results.filter(
      (i) => i.item.category === "image"
    ).length;

  const ai =
    response.results.filter(
      (i) => i.item.category === "ai"
    ).length;

  return (
    <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">

      <StatCard
        title="Government"
        value={government}
        icon={<Landmark size={24} />}
        color="from-blue-600 to-cyan-500"
      />

      <StatCard
        title="PDF Studio"
        value={pdf}
        icon={<FileText size={24} />}
        color="from-red-600 to-orange-500"
      />

      <StatCard
        title="Image Studio"
        value={image}
        icon={<ImageIcon size={24} />}
        color="from-green-600 to-emerald-500"
      />

      <StatCard
        title="Manish AI"
        value={ai}
        icon={<Bot size={24} />}
        color="from-violet-600 to-purple-500"
      />

    </section>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-slate-500">

            {title}

          </p>

          <h3 className="mt-2 text-3xl font-black text-slate-900">

            {value}

          </h3>

        </div>

        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-xl`}
        >

          {icon}

        </div>

      </div>

    </div>
  );
}
/* ==========================================================
   Empty Search State
========================================================== */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EmptyState({
  query,
}: {
  query: string;
}) {
  return (
    <section className="mt-16 rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-20 text-center">

      <Search
        size={72}
        className="mx-auto text-slate-300"
      />

      <h2 className="mt-8 text-4xl font-black text-slate-900">
        No results found
      </h2>

      <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
        We couldn&apos;t find anything matching
        <span className="mx-2 rounded-lg bg-blue-100 px-3 py-1 font-bold text-blue-700">
          {query}
        </span>
      </p>

      <div className="mt-10 flex flex-wrap justify-center gap-3">

        {[
          "Aadhaar",
          "PAN Card",
          "Passport",
          "Compress PDF",
          "Merge PDF",
          "Passport Photo",
          "Background Remover",
          "Resume Builder",
          "Manish AI",
          "Government Jobs",
        ].map((item) => (
          <Link
            key={item}
            href={`/search?q=${encodeURIComponent(item)}`}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold transition hover:border-blue-600 hover:text-blue-700 hover:shadow-lg"
          >
            {item}
          </Link>
        ))}

      </div>

    </section>
  );
}

/* ==========================================================
   Recent Searches
========================================================== */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RecentSearches() {
  const recent = [
    "Compress PDF",
    "PAN Card",
    "Passport",
    "Remove Background",
    "Income Certificate",
    "Resume Builder",
  ];

  return (
    <section className="mt-16">

      <div className="mb-6 flex items-center gap-3">

        <Search
          size={22}
          className="text-blue-600"
        />

        <h2 className="text-2xl font-black text-slate-900">
          Recent Searches
        </h2>

      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        {recent.map((item) => (

          <Link
            key={item}
            href={`/search?q=${encodeURIComponent(item)}`}
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-1 hover:border-blue-600 hover:shadow-xl"
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">

                  Recent Search

                </p>

                <h3 className="mt-1 font-bold text-slate-900">

                  {item}

                </h3>

              </div>

              <ArrowRight
                size={18}
                className="transition group-hover:translate-x-1"
              />

            </div>

          </Link>

        ))}

      </div>

    </section>
  );
}

/* ==========================================================
   Popular Categories
========================================================== */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PopularCategories() {
  const categories = [
    {
      title: "Government Services",
      href: "/government-services",
      icon: Landmark,
      color: "from-blue-600 to-cyan-500",
    },
    {
      title: "PDF Studio",
      href: "/pdf-tools",
      icon: FileText,
      color: "from-red-600 to-orange-500",
    },
    {
      title: "Image Studio",
      href: "/image-tools",
      icon: ImageIcon,
      color: "from-green-600 to-emerald-500",
    },
    {
      title: "Manish AI",
      href: "/ai",
      icon: Bot,
      color: "from-violet-600 to-purple-500",
    },
    {
      title: "Jobs",
      href: "/jobs",
      icon: Briefcase,
      color: "from-indigo-600 to-blue-500",
    },
    {
      title: "Education",
      href: "/education",
      icon: GraduationCap,
      color: "from-teal-600 to-green-500",
    },
  ];

  return (
    <section className="mt-16">

      <div className="mb-6 flex items-center gap-3">

        <Sparkles
          className="text-amber-500"
          size={22}
        />

        <h2 className="text-2xl font-black">

          Popular Categories

        </h2>

      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

        {categories.map((category) => {

          const Icon = category.icon;

          return (

            <Link
              key={category.title}
              href={category.href}
              className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-2 hover:border-blue-500 hover:shadow-xl"
            >

              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${category.color} text-white shadow-lg`}
              >

                <Icon size={28} />

              </div>

              <h3 className="mt-6 text-xl font-black text-slate-900">

                {category.title}

              </h3>

              <p className="mt-3 text-slate-600">

                Explore all services in this category.

              </p>

            </Link>

          );

        })}

      </div>

    </section>
  );
}
/* ==========================================================
   Quick Access Section
========================================================== */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function QuickAccess() {
  const items = [
    {
      title: "Aadhaar Services",
      href: "/government-services/aadhaar",
      icon: Landmark,
      color: "text-blue-600",
    },
    {
      title: "Compress PDF",
      href: "/pdf/compress",
      icon: FileText,
      color: "text-red-600",
    },
    {
      title: "Passport Photo",
      href: "/image/passport-photo",
      icon: ImageIcon,
      color: "text-green-600",
    },
    {
      title: "Manish AI",
      href: "/ai",
      icon: Bot,
      color: "text-violet-600",
    },
  ];

  return (
    <section className="mt-16">

      <div className="mb-6 flex items-center gap-3">

        <Sparkles
          size={22}
          className="text-amber-500"
        />

        <h2 className="text-2xl font-black text-slate-900">
          Quick Access
        </h2>

      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

        {items.map((item) => {

          const Icon = item.icon;

          return (

            <Link
              key={item.title}
              href={item.href}
              className="group rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:border-blue-500 hover:shadow-xl"
            >

              <Icon
                size={30}
                className={item.color}
              />

              <h3 className="mt-5 text-lg font-bold text-slate-900">

                {item.title}

              </h3>

              <div className="mt-5 flex items-center gap-2 text-blue-600">

                <span className="text-sm font-semibold">

                  Open Tool

                </span>

                <ArrowRight
                  size={16}
                  className="transition group-hover:translate-x-1"
                />

              </div>

            </Link>

          );

        })}

      </div>

    </section>
  );
}

/* ==========================================================
   Search Footer
========================================================== */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SearchFooter() {
  return (
    <section className="mt-20 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 px-10 py-12 text-center text-white">

      <h2 className="text-4xl font-black">

        Didn&apos;t find what you were looking for?

      </h2>

      <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-blue-100">

        Digital Desk India is continuously expanding with
        Government Services, PDF Studio, Image Studio,
        AI Tools, Education, Jobs, Business Tools,
        Cyber Cafe Management and much more.

      </p>

      <div className="mt-10 flex flex-wrap justify-center gap-5">

        <Link
          href="/service"
          className="rounded-2xl bg-white px-8 py-4 font-bold text-blue-700 transition hover:scale-105"
        >
          Browse Services
        </Link>

        <Link
          href="/contact"
          className="rounded-2xl border border-white/30 px-8 py-4 font-bold text-white transition hover:bg-white/10"
        >
          Contact Us
        </Link>

      </div>

    </section>
  );
}

/* ==========================================================
   File Completion Notes

   The main SearchResults component should render
   these sections where appropriate:

   - <SearchStatistics response={response} />
   - <RecentSearches />
   - <PopularCategories />
   - <QuickAccess />
   - <SearchFooter />

   For example, inside SearchResults after the
   featured/category results:

   {response.total > 0 && (
     <>
       <SearchStatistics response={response} />
       <RecentSearches />
       <PopularCategories />
       <QuickAccess />
     </>
   )}

   {response.total === 0 && (
     <>
       <EmptyState query={query} />
       <PopularCategories />
       <QuickAccess />
     </>
   )}

   <SearchFooter />

========================================================== */