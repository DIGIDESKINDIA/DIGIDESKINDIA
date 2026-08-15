"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Heart, Mail, MapPin, Phone } from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";

const quickLinks = [
  { name: "Home", href: "/" },
  { name: "Government Services", href: "/service" },
  { name: "PDF Tools", href: "/pdf-tools" },
  { name: "Image Tools", href: "/image-tools" },
  { name: "AI Assistant", href: "/ai" },
  { name: "Pricing", href: "/pricing" },
  { name: "Contact Us", href: "/contact" },
  { name: "Search", href: "/search" },
];

const pdfTools = [
  { name: "Compress PDF", href: "/pdf-tools/compress-pdf" },
  { name: "Merge PDF", href: "/pdf-tools/merge-pdf" },
  { name: "Split PDF", href: "/pdf-tools/split" },
  { name: "JPG to PDF", href: "/pdf-tools/jpg-to-pdf" },
  { name: "PDF to JPG", href: "/pdf-tools/pdf-to-jpg" },
  { name: "Delete Pages", href: "/pdf-tools/delete-pages" },
  { name: "More Tools", href: "/pdf-tools" },
];

const imageTools = [
  { name: "Compress Image", href: "/image-tools/compress-image" },
  { name: "Resize Image", href: "/image-tools/resize-image" },
  { name: "Crop Image", href: "/image-tools/crop-image" },
  { name: "Convert Image", href: "/image-tools/convert-image" },
  { name: "Remove Background", href: "/image-tools/remove-background" },
  { name: "Watermark Image", href: "/image-tools/watermark-image" },
  { name: "More Tools", href: "/image-tools" },
];

const governmentServices = [
  { name: "Aadhaar Services", href: "/service/aadhaar" },
  { name: "PAN Card", href: "/service/pan-card" },
  { name: "Passport", href: "/service/passport" },
  { name: "CSC Services", href: "/service/csc" },
  { name: "More Services", href: "/service" },
];

const support = [
  { name: "Help Center", href: "/help-center" },
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Terms & Conditions", href: "/terms" },
  { name: "Refund Policy", href: "/refund-policy" },
  { name: "Contact Us", href: "/contact" },
];

export default function Footer() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <footer className={isDark ? "bg-[#050B18] text-white" : "bg-slate-950 text-white"}>
      <div className={isDark ? "border-b border-white/10 bg-[linear-gradient(135deg,#050B18,#081225,#0B1428)]" : "border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-950 to-blue-950"}>
        <div className="mx-auto grid max-w-7xl gap-6 px-0 py-14 sm:px-5 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div className="flex flex-col items-start text-left">
            <Image
              src="/images/logo.png"
              alt="DigiDesk India"
              width={220}
              height={72}
              className="h-16 w-auto"
            />

            <p className="mt-5 max-w-2xl text-left text-base leading-8 text-slate-300">
              DigiDesk India is a premium digital services platform for government help,
              document tools, image tools, and instant AI assistance built for India.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <InfoPill icon={<Phone size={18} />} title="Support" value="+91 9696295457" />
            <InfoPill icon={<Mail size={18} />} title="Email" value="yoursdigideskindia@gmail.com" />
            <InfoPill icon={<MapPin size={18} />} title="Location" value="Kanpur, India" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-5">
          <FooterColumn title="Quick Links" items={quickLinks} />
          <FooterColumn title="PDF Tools" items={pdfTools} />
          <FooterColumn title="Image Tools" items={imageTools} />
          <FooterColumn title="Government Services" items={governmentServices} />
          <FooterColumn title="Support" items={support} />
        </div>
      </div>

      <div className={isDark ? "border-t border-white/10 bg-[#050B18]" : "border-t border-white/10 bg-slate-950/95"}>
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-6 text-sm text-slate-300 sm:items-center lg:flex-row">
          <p>© DigiDesk India. All rights reserved.</p>

          <p className="flex items-center gap-2 text-slate-200">
            Made with
            <Heart size={15} className="fill-red-500 text-red-500" />
            in India
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: Array<{ name: string; href: string }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-200">
        {title}
      </h3>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="group flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowUpRight
              size={15}
              className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-cyan-400"
            />
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function InfoPill({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex min-w-[250px] w-auto flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-cyan-300">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</p>
        <p className="mt-1 whitespace-nowrap text-sm font-semibold leading-snug text-white">
          {value}
        </p>
      </div>
    </div>
  );
}
