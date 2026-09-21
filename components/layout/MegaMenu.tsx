"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CreditCard,
  FileCheck,
  FileText,
  GraduationCap,
  ImageIcon,
  Landmark,
  Plane,
  TrainFront,
} from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";

type Props = {
  type: string;
};

export type MenuItem = {
  icon: ComponentType<{ size?: number }>;
  title: string;
  href: string;
};

export type MenuCategory = {
  title: string;
  description: string;
  color: string;
  items: MenuItem[];
};

export const menuData: Record<string, MenuCategory> = {
  government: {
    title: "Government Services",
    description: "Popular Government & CSC Services",
    color: "from-blue-600 to-cyan-500",
    items: [
      {
        icon: CreditCard,
        title: "PAN Card",
        href: "/service/pan-card",
      },
      {
        icon: FileCheck,
        title: "Aadhaar",
        href: "/service/aadhaar",
      },
      {
        icon: Landmark,
        title: "Income Certificate",
        href: "/service/income-certificate",
      },
      {
        icon: Landmark,
        title: "Caste Certificate",
        href: "/service/caste-certificate",
      },
      {
        icon: GraduationCap,
        title: "Scholarship",
        href: "/service/scholarship",
      },
      {
        icon: Plane,
        title: "Passport",
        href: "/service/passport",
      },
      {
        icon: TrainFront,
        title: "Train Ticket",
        href: "/service/train-ticket",
      },
      {
        icon: ArrowRight,
        title: "View All Services",
        href: "/service",
      },
    ],
  },

  pdf: {
    title: "PDF Tools",
    description: "Professional PDF Utilities",
    color: "from-red-600 to-orange-500",
    items: [
      {
        icon: FileText,
        title: "Compress PDF",
        href: "/pdf-tools/compress-pdf",
      },
      {
        icon: FileText,
        title: "Merge PDF",
        href: "/pdf-tools/merge-pdf",
      },
      {
        icon: FileText,
        title: "Split PDF",
        href: "/pdf-tools/split",
      },
      {
        icon: FileText,
        title: "Word to PDF",
        href: "/pdf-tools",
      },
      {
        icon: FileText,
        title: "PDF to Word",
        href: "/pdf-tools/pdf-to-word",
      },
      {
        icon: FileText,
        title: "OCR PDF",
        href: "/pdf-tools",
      },
      {
        icon: FileText,
        title: "Protect PDF",
        href: "/pdf-tools",
      },
      {
        icon: ArrowRight,
        title: "All PDF Tools",
        href: "/pdf-tools",
      },
    ],
  },

  image: {
    title: "Image Tools",
    description: "AI Powered Image Utilities",
    color: "from-green-600 to-emerald-500",
    items: [
      {
        icon: ImageIcon,
        title: "Compress Image",
        href: "/image-tools",
      },
      {
        icon: ImageIcon,
        title: "Resize Image",
        href: "/image-tools",
      },
      {
        icon: ImageIcon,
        title: "Passport Photo",
        href: "/image-tools/passport-photo",
      },
      {
        icon: ImageIcon,
        title: "Background Remove",
        href: "/image-tools/remove-background",
      },
      {
        icon: ImageIcon,
        title: "AI Enhance",
        href: "/image-tools",
      },
      {
        icon: ImageIcon,
        title: "Image to PDF",
        href: "/pdf-tools/jpg-to-pdf",
      },
      {
        icon: ImageIcon,
        title: "Crop Image",
        href: "/image-tools",
      },
      {
        icon: ArrowRight,
        title: "All Image Tools",
        href: "/image-tools",
      },
    ],
  },

  ai: {
    title: "AI Tools",
    description: "Next Generation AI",
    color: "from-violet-600 to-fuchsia-600",
    items: [
      {
        icon: Bot,
        title: "Manish AI",
        href: "/ai",
      },
      {
        icon: Bot,
        title: "Resume AI",
        href: "/ai",
      },
      {
        icon: Bot,
        title: "Letter Writer",
        href: "/ai",
      },
      {
        icon: Bot,
        title: "Essay Writer",
        href: "/ai",
      },
      {
        icon: Bot,
        title: "Translator",
        href: "/ai",
      },
      {
        icon: Bot,
        title: "Grammar Checker",
        href: "/ai",
      },
      {
        icon: Bot,
        title: "Image Generator",
        href: "/ai",
      },
      {
        icon: ArrowRight,
        title: "All AI Tools",
        href: "/ai",
      },
    ],
  },

  csc: {
    title: "CSC Services",
    description: "Citizen Service Center",
    color: "from-sky-600 to-blue-700",
    items: [
      {
        icon: Landmark,
        title: "Jan Seva Kendra",
        href: "/service",
      },
      {
        icon: Landmark,
        title: "Bill Payment",
        href: "/service/electricity-bill",
      },
      {
        icon: Landmark,
        title: "Typing Work",
        href: "/service/typing",
      },
      {
        icon: Landmark,
        title: "Online Forms",
        href: "/service",
      },
      {
        icon: Landmark,
        title: "Document Scan",
        href: "/service",
      },
      {
        icon: Landmark,
        title: "Print Services",
        href: "/service",
      },
      {
        icon: Landmark,
        title: "Photo Copy",
        href: "/service",
      },
      {
        icon: ArrowRight,
        title: "All CSC Services",
        href: "/service",
      },
    ],
  },
};

export default function MegaMenu({ type }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const menu = menuData[type as keyof typeof menuData];

  if (!menu) return null;

  return (
    <div
      className={
        "absolute top-full left-0 z-50 mt-2 w-[540px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border shadow-2xl" +
        (isDark
          ? " border-white/10 bg-[#0b1428] text-white"
          : " border-slate-200 bg-white text-slate-900")
      }
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${menu.color} p-6 text-white`}>
        <h2 className="text-2xl font-black">{menu.title}</h2>
        <p className="mt-1 text-sm opacity-90">{menu.description}</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 p-5">
        {menu.items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className={
                "group flex items-center gap-3 rounded-xl p-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500/50" +
                (isDark
                  ? " hover:bg-white/5 hover:text-blue-300"
                  : " hover:bg-slate-50 hover:text-blue-700")
              }
            >
              <div
                className={
                  "flex h-10 w-10 items-center justify-center rounded-lg" +
                  (isDark
                    ? " bg-white/10 text-blue-300"
                    : " bg-slate-100 text-blue-700")
                }
              >
                <Icon size={20} />
              </div>
              {item.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}