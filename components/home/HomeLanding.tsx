"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowRight, BadgeCheck, Building2, CarFront, Clock3, Combine, CreditCard, Crop,
  FileImage, FileOutput, FileText, GraduationCap, IdCard, Landmark, Plane, RotateCw, Search,
  Scissors, ShieldCheck, Sparkles, Wand2,
} from "lucide-react";

import Hero from "@/components/home/Hero";
import StatsBar from "@/components/home/StatsBar";
import { useManishAI } from "@/components/ai/ManishAIProvider";
import { useTheme } from "@/components/theme/ThemeProvider";

const popularSearches = [
  { label: "PAN Card", href: "/search?q=PAN%20Card" },
  { label: "Aadhaar Services", href: "/search?q=Aadhaar" },
  { label: "Merge PDF", href: "/search?q=Merge%20PDF" },
  { label: "Compress PDF", href: "/search?q=Compress%20PDF" },
  { label: "Passport Photo", href: "/search?q=Passport%20Photo" },
  { label: "Remove Background", href: "/search?q=Background%20Remover" },
];

const whyDigiDesk = [
  { title: "Secure Workflows", description: "Use trusted digital flows for documents, services and daily online tasks.", icon: ShieldCheck },
  { title: "All-in-One Platform", description: "Government services, PDFs, images and AI assistance under one premium experience.", icon: Sparkles },
  { title: "Built for India", description: "Indian citizen workflows, service categories and practical digital needs in one place.", icon: Landmark },
];

const trustCards = [
  { title: "Trusted by Millions", description: "DigiDesk India is designed to feel fast, reliable and ready for everyday service demand.", icon: BadgeCheck },
  { title: "Private by Design", description: "Clear workflows, secure document handling and dependable service experiences.", icon: ShieldCheck },
  { title: "Available 24/7", description: "Use digital tools and service discovery at any time without friction.", icon: Clock3 },
];

const popularServices = [
  { title: "Aadhaar Services", description: "Download, Update & Verify Aadhaar", href: "/service/aadhaar", icon: IdCard, accent: "cyan" },
  { title: "PAN Card Services", description: "Apply New PAN, Correction & More", href: "/service/pan-card", icon: CreditCard, accent: "blue" },
  { title: "Passport Services", description: "Apply New Passport, Renewal & Tracking", href: "/service/passport", icon: Plane, accent: "violet" },
  { title: "Driving License", description: "Apply DL, Renewal, Status & More", href: "/service/driving-licence", icon: CarFront, accent: "amber" },
  { title: "Vehicle Services", description: "RC, Insurance, PUC & Challan", href: "/service", icon: Building2, accent: "emerald" },
  { title: "Education Services", description: "Results, Certificates & Admissions", href: "/education", icon: GraduationCap, accent: "rose" },
] as const;

const pdfTools = [
  { title: "Merge PDF", href: "/pdf-tools/merge-pdf", icon: Combine },
  { title: "Split PDF", href: "/pdf-tools/split", icon: Scissors },
  { title: "Compress PDF", href: "/pdf-tools/compress-pdf", icon: FileText },
  { title: "Rotate PDF", href: "/pdf-tools/rotate", icon: RotateCw },
  { title: "JPG to PDF", href: "/pdf-tools/jpg-to-pdf", icon: FileImage },
  { title: "PDF to JPG", href: "/pdf-tools/pdf-to-jpg", icon: FileImage },
  { title: "PDF to Word", href: "/pdf-tools/pdf-to-word", icon: FileOutput },
  { title: "Delete Pages", href: "/pdf-tools/delete-pages", icon: Scissors },
  { title: "Organize PDF", href: "/pdf-tools/organize-pdf", icon: Sparkles },
];

const imageTools = [
  { title: "Compress Image", href: "/image-tools/compress-image", icon: FileImage },
  { title: "Resize Image", href: "/image-tools/resize-image", icon: Sparkles },
  { title: "Crop Image", href: "/image-tools/crop-image", icon: Crop },
  { title: "Rotate Image", href: "/image-tools/rotate-image", icon: RotateCw },
  { title: "Convert Image", href: "/image-tools/convert-image", icon: FileImage },
  { title: "Watermark Image", href: "/image-tools/watermark-image", icon: ShieldCheck },
  { title: "Image to PDF", href: "/image-tools/image-to-pdf", icon: FileText },
  { title: "Passport Photo", href: "/image-tools/passport-photo", icon: Wand2 },
];

function SectionBlock({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "light" | "dark" }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section
      className={
        tone === "dark"
          ? "bg-[#081225] py-20"
          : tone === "light"
          ? (isDark ? "bg-[#0B1428] py-20" : "bg-slate-50 py-20")
          : (isDark ? "bg-[#050B18] py-20" : "bg-white py-20")
      }
    >
      <div className="mx-auto max-w-7xl px-5">{children}</div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="max-w-3xl">
      <span
        className={
          isDark
            ? "inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-100"
            : "inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700"
        }
      >
        {eyebrow}
      </span>
      <h2
        className={
          isDark
            ? "mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl"
            : "mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl"
        }
      >
        {title}
      </h2>
      <p className={isDark ? "mt-4 text-base leading-8 text-slate-300 sm:text-lg" : "mt-4 text-base leading-8 text-slate-600 sm:text-lg"}>
        {description}
      </p>
    </div>
  );
}

type ServiceAccent = "blue" | "cyan" | "violet" | "amber" | "emerald" | "rose";

function ServiceCard({ href, title, description, icon, accent = "blue" }: { href: string; title: string; description: string; icon: ReactNode; accent?: ServiceAccent }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const accentStyles = {
    blue: "from-blue-600 to-indigo-500 text-blue-100 ring-blue-400/20 shadow-blue-500/20",
    cyan: "from-cyan-500 to-sky-500 text-cyan-100 ring-cyan-300/25 shadow-cyan-500/20",
    violet: "from-violet-600 to-fuchsia-500 text-violet-100 ring-violet-400/20 shadow-violet-500/20",
    amber: "from-amber-500 to-orange-500 text-amber-50 ring-amber-300/25 shadow-amber-500/20",
    emerald: "from-emerald-500 to-teal-500 text-emerald-50 ring-emerald-300/25 shadow-emerald-500/20",
    rose: "from-rose-500 to-pink-500 text-rose-50 ring-rose-300/25 shadow-rose-500/20",
  }[accent];

  return (
    <Link
      href={href}
      className={
        isDark
          ? "group rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_14px_32px_rgba(2,6,23,0.28)] transition hover:-translate-y-1 hover:border-blue-400/30 hover:shadow-[0_20px_42px_rgba(37,99,235,0.18)]"
          : "group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
      }
    >
      <div className="flex items-center justify-between gap-4">
        <div
          className={
            isDark
                ? `relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${accentStyles} shadow-lg ring-4 transition duration-300 group-hover:rotate-2 group-hover:scale-105`
                : `relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${accentStyles} shadow-lg ring-4 transition duration-300 group-hover:rotate-2 group-hover:scale-105`
          }
        >
            <span className="absolute inset-1 rounded-xl border border-white/30" />
            <span className="absolute -right-3 -top-3 h-7 w-7 rounded-full bg-white/20 blur-md" />
            <span className="relative drop-shadow-md">{icon}</span>
        </div>
        <span
          className={
            isDark
              ? "rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-slate-300"
              : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
          }
        >
          View
        </span>
      </div>
      <h3 className={isDark ? "mt-4 text-base font-bold text-white" : "mt-4 text-base font-bold text-slate-900"}>
        {title}
      </h3>
      <p className={isDark ? "mt-2 text-xs leading-5 text-slate-300" : "mt-2 text-xs leading-5 text-slate-600"}>{description}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-cyan-300">
        Open
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function ToolCard({
  href, title, icon, accent, compact = false,
}: {
  href: string; title: string;
  icon: ComponentType<{ size?: number }>;
  accent: "pdf" | "image"; compact?: boolean;
}) {
  const Icon = icon;
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Link
      href={href}
        className={
        isDark
          ? `group flex min-h-[178px] flex-col rounded-2xl border border-white/10 bg-white/5 ${compact ? "p-3.5" : "p-4"} shadow-[0_14px_32px_rgba(2,6,23,0.28)] transition hover:-translate-y-1 hover:border-blue-400/25 hover:shadow-[0_20px_42px_rgba(37,99,235,0.16)]`
          : `group flex min-h-[178px] flex-col rounded-2xl border border-slate-200 bg-white ${compact ? "p-3.5" : "p-4"} shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg`
      }
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-[0_8px_18px_rgba(14,165,233,0.18)] ring-4 ring-blue-500/10 ${
          accent === "pdf" ? "bg-gradient-to-br from-blue-700 to-sky-500" : "bg-gradient-to-br from-emerald-600 to-cyan-500"
        }`}>
        <Icon size={20} />
      </div>
      <h3 className={isDark ? "mt-3 text-sm font-bold text-white" : "mt-3 text-sm font-bold text-slate-900"}>{title}</h3>
      <p className={isDark ? "mt-1.5 flex-1 text-xs leading-5 text-slate-300" : "mt-1.5 flex-1 text-xs leading-5 text-slate-600"}>
        Secure tool workflow on a live DigiDesk India route.
      </p>
      <div className={`mt-3 inline-flex items-center gap-2 text-xs font-bold ${accent === "pdf" ? "text-blue-700 dark:text-cyan-300" : "text-emerald-700 dark:text-emerald-300"}`}>
        Open Tool
        <ArrowRight size={15} className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default function HomeLanding() {
  const { enabled, setOpen } = useManishAI();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  };

  return (
    <main className={isDark ? "overflow-hidden bg-[#050B18]" : "overflow-hidden bg-slate-50"}>
      <Hero />

      <StatsBar />

      {/* Popular Searches */}
      <SectionBlock tone="light">
        <SectionHeading
          eyebrow="Popular Searches"
          title="Quick paths to the most-used tools and services"
          description="Jump into common tasks with existing search functionality and live routes."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          {popularSearches.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={
                isDark
                  ? "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-blue-400/30 hover:bg-white/10"
                  : "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
      </SectionBlock>

      {/* Search Bar */}
      <section className={isDark ? "border-y border-white/10 bg-[#081225]/80 backdrop-blur" : "border-y border-slate-200 bg-white/90 backdrop-blur"}>
        <div className="mx-auto max-w-7xl px-5 py-8">
          <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <div>
              <p className={isDark ? "text-xl font-black text-white" : "text-xl font-black text-slate-900"}>What do you want to do today?</p>
            </div>
            <div className={isDark ? "flex items-center rounded-2xl border border-white/10 bg-[#0F1B33] px-4 py-2.5 shadow-[0_18px_50px_rgba(2,6,23,0.3)]" : "flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm"}>
              <Search size={18} className={isDark ? "text-slate-400" : "text-slate-400"} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search PDF tools, government services, image tools..."
                className={isDark ? "h-12 flex-1 bg-transparent px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500" : "h-12 flex-1 bg-transparent px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400"}
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-700 to-cyan-500 px-6 py-3 font-bold text-white shadow-[0_12px_36px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5"
            >
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Popular Services */}
      <SectionBlock>
        <SectionHeading
          eyebrow="Popular Services"
          title="Core services people use every day"
          description="Built for real citizen workflows with practical access to essential digital utilities."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {popularServices.map((service) => {
            const Icon = service.icon;
            return (
              <ServiceCard
                key={service.title}
                href={service.href}
                title={service.title}
                description={service.description}
                icon={<Icon size={23} strokeWidth={1.9} />}
                accent={service.accent}
              />
            );
          })}
        </div>
      </SectionBlock>

      {/* PDF / Image / AI Tools */}
      <section className={isDark ? "bg-[#050B18] py-20" : "bg-white py-20"}>
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-6 lg:grid-cols-3">

            <Link
              href="/pdf-tools"
              className="group relative overflow-hidden rounded-[28px] border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-pink-500/10 p-8 shadow-[0_20px_60px_rgba(244,63,94,0.15)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(244,63,94,0.22)]"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-rose-500/20 blur-3xl transition group-hover:bg-rose-500/30" />
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-pink-600 text-white shadow-lg">
                  <FileText size={26} />
                </div>
                <h3 className="mt-6 text-2xl font-black text-white">PDF Tools</h3>
                <p className={isDark ? "mt-3 text-base leading-7 text-slate-300" : "mt-3 text-base leading-7 text-slate-600"}>All-in-one solution for your PDF needs</p>
                <div className="mt-6 inline-flex items-center gap-2 font-bold text-rose-300">Explore PDF Tools <ArrowRight size={18} className="transition group-hover:translate-x-1" /></div>
              </div>
            </Link>

            <Link
              href="/image-tools"
              className="group relative overflow-hidden rounded-[28px] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-8 shadow-[0_20px_60px_rgba(6,182,212,0.15)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(6,182,212,0.22)]"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl transition group-hover:bg-cyan-500/30" />
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg">
                  <FileImage size={26} />
                </div>
                <h3 className="mt-6 text-2xl font-black text-white">Image Tools</h3>
                <p className={isDark ? "mt-3 text-base leading-7 text-slate-300" : "mt-3 text-base leading-7 text-slate-600"}>Edit, convert & optimize images easily</p>
                <div className="mt-6 inline-flex items-center gap-2 font-bold text-cyan-300">Explore Image Tools <ArrowRight size={18} className="transition group-hover:translate-x-1" /></div>
              </div>
            </Link>

            <Link
              href={enabled ? "#" : "/ai"}
              onClick={(e) => { if (enabled) { e.preventDefault(); setOpen(true); } }}
              className="group relative overflow-hidden rounded-[28px] border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-purple-500/10 p-8 shadow-[0_20px_60px_rgba(139,92,246,0.15)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(139,92,246,0.22)]"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl transition group-hover:bg-violet-500/30" />
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg">
                  <Sparkles size={26} />
                </div>
                <h3 className="mt-6 text-2xl font-black text-white">AI Assistant</h3>
                <p className={isDark ? "mt-3 text-base leading-7 text-slate-300" : "mt-3 text-base leading-7 text-slate-600"}>Ask Manish AI for smart assistance</p>
                <div className="mt-6 inline-flex items-center gap-2 font-bold text-violet-300">Chat with AI <ArrowRight size={18} className="transition group-hover:translate-x-1" /></div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Government Services */}
      <SectionBlock>
        <SectionHeading
          eyebrow="Government Services"
          title="A premium category view for important citizen services"
          description="Explore high-demand categories without the feel of a traditional government portal."
        />
        <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(205px,1fr))] gap-4">
          {[
            { title: "Central Services", description: "PAN, Aadhaar, Passport and identity-related national services.", icon: Landmark, href: "/service" },
            { title: "State Services", description: "Certificates, scholarship and citizen-document workflows.", icon: BadgeCheck, href: "/service" },
            { title: "Utility Services", description: "Digital assistance for forms, document handling and support tasks.", icon: FileText, href: "/service" },
            { title: "Revenue Services", description: "Verification, approvals and revenue-related digital processes.", icon: Building2, href: "/service" },
          ].map((service) => {
            const Icon = service.icon;
            return (
              <ServiceCard
                key={service.title}
                href={service.href}
                title={service.title}
                description={service.description}
                icon={<Icon size={23} strokeWidth={1.9} />}
              />
            );
          })}
        </div>
      </SectionBlock>

      {/* PDF Tools */}
      <SectionBlock tone="default">
        <SectionHeading
          eyebrow="Popular PDF Tools"
          title="Fast document utilities for everyday workflows"
          description="All cards below are mapped to existing live PDF routes."
        />
        <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(185px,1fr))] gap-4">
          {pdfTools.map((tool) => (
            <ToolCard key={tool.title} href={tool.href} title={tool.title} icon={tool.icon} accent="pdf" compact />
          ))}
        </div>
      </SectionBlock>

      {/* Image Tools */}
      <SectionBlock tone="light">
        <SectionHeading
          eyebrow="Image Tools"
          title="Essential image workflows in one clean grid"
          description="Compression, conversion, document prep and passport-photo utilities in production routes."
        />
        <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(185px,1fr))] gap-4">
          {imageTools.map((tool) => (
            <ToolCard key={tool.title} href={tool.href} title={tool.title} icon={tool.icon} accent="image" />
          ))}
        </div>
      </SectionBlock>

      {/* AI Assistant */}
      {enabled && (
        <SectionBlock tone="dark">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                Meet Manish AI
              </span>
              <h2 className="mt-6 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                Meet Manish AI
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Your intelligent digital assistant for everyday services.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
                {["How do I apply for PAN Card?", "Compress this PDF", "Create passport photo"].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-start lg:justify-end">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-3 rounded-2xl bg-white px-7 py-4 text-base font-bold text-blue-700 shadow-[0_18px_50px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.26)]"
              >
                Ask Manish
                <ArrowRight size={19} />
              </button>
            </div>
          </div>
        </SectionBlock>
      )}

      {/* Why DigiDesk */}
      <SectionBlock>
        <SectionHeading
          eyebrow="Why DigiDesk"
          title="Designed like one premium digital platform"
          description="Every section is built to feel fast, trustworthy and useful across services, tools and support."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {whyDigiDesk.map((item) => {
            const Icon = item.icon;
            return (
              <ServiceCard
                key={item.title}
                href="/service"
                title={item.title}
                description={item.description}
                icon={<Icon size={23} strokeWidth={1.9} />}
              />
            );
          })}
        </div>
      </SectionBlock>

      {/* Trust & Security */}
      <SectionBlock tone="light">
        <SectionHeading
          eyebrow="Trust & Security"
          title="A serious platform for real digital work"
          description="Professional design, dependable tools and service discovery built for everyday confidence."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {trustCards.map((item) => {
            const Icon = item.icon;
            return (
              <ServiceCard
                key={item.title}
                href="/service"
                title={item.title}
                description={item.description}
                icon={<Icon size={24} />}
              />
            );
          })}
        </div>
      </SectionBlock>

      {/* Final CTA */}
      <SectionBlock tone="dark">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_24px_60px_rgba(2,6,23,0.35)] lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div>
            <h2 className="text-3xl font-black text-white sm:text-4xl">
              Everything digital. One trusted platform.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Move from discovery to action with DigiDesk India across services,
              document tools, image workflows and AI assistance.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 lg:mt-0">
            <Link
              href="/service"
              className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-700 to-cyan-500 px-6 py-3.5 text-base font-bold text-white shadow-[0_12px_36px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5"
            >
              Explore Services
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-base font-bold text-white transition hover:-translate-y-0.5 hover:border-blue-400/30"
            >
              Search Platform
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </SectionBlock>

      {/* Footer Links */}
      <section className={isDark ? "border-t border-white/10 bg-[#081225] py-12" : "border-t border-slate-200 bg-slate-50 py-12"}>
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className={isDark ? "text-lg font-bold text-white" : "text-lg font-bold text-slate-900"}>DigiDesk India</h3>
              <p className={isDark ? "mt-3 text-sm text-slate-400" : "mt-3 text-sm text-slate-600"}>
                Trusted digital services platform for Indian citizens.
              </p>
            </div>
            <div>
              <h3 className={isDark ? "text-lg font-bold text-white" : "text-lg font-bold text-slate-900"}>Services</h3>
              <ul className="mt-3 space-y-2">
                {popularServices.slice(0, 4).map((service) => (
                  <li key={service.title}>
                    <Link href={service.href} className={isDark ? "text-sm text-slate-400 hover:text-white" : "text-sm text-slate-600 hover:text-blue-700"}>{service.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className={isDark ? "text-lg font-bold text-white" : "text-lg font-bold text-slate-900"}>PDF Tools</h3>
              <ul className="mt-3 space-y-2">
                {pdfTools.slice(0, 4).map((tool) => (
                  <li key={tool.title}>
                    <Link href={tool.href} className={isDark ? "text-sm text-slate-400 hover:text-white" : "text-sm text-slate-600 hover:text-blue-700"}>{tool.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className={isDark ? "text-lg font-bold text-white" : "text-lg font-bold text-slate-900"}>Image Tools</h3>
              <ul className="mt-3 space-y-2">
                {imageTools.slice(0, 4).map((tool) => (
                  <li key={tool.title}>
                    <Link href={tool.href} className={isDark ? "text-sm text-slate-400 hover:text-white" : "text-sm text-slate-600 hover:text-blue-700"}>{tool.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
