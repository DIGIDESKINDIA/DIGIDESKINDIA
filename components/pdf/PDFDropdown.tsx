"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

export type PDFDropdownItem = {
  name: string;
  href: string;
  icon?: LucideIcon;
  description?: string;
  badge?: string;
};

type PDFDropdownProps = {
  label: string;
  href?: string;
  items: PDFDropdownItem[];
  icon?: LucideIcon;
  active?: boolean;
  width?: "normal" | "wide";
};

export default function PDFDropdown({
  label,
  href,
  items,
  icon: Icon,
  active = false,
  width = "normal",
}: PDFDropdownProps) {
  return (
    <div className="group relative">
      {/* MAIN NAV ITEM */}
      <div
        className={[
          "flex cursor-pointer items-center gap-1.5",
          "border-b-2 px-1 py-5",
          "font-semibold transition-colors duration-200",
          active
            ? "border-cyan-400 text-yellow-300"
            : "border-transparent text-white hover:border-cyan-400 hover:text-yellow-300",
        ].join(" ")}
      >
        {Icon && (
          <Icon
            size={17}
            strokeWidth={2}
            className="shrink-0"
          />
        )}

        {href ? (
          <Link href={href}>
            {label}
          </Link>
        ) : (
          <span>{label}</span>
        )}

        <ChevronDown
          size={17}
          strokeWidth={2.2}
          className="transition-transform duration-200 group-hover:rotate-180"
        />
      </div>

      {/* INVISIBLE HOVER BRIDGE */}
      <div className="pointer-events-none absolute left-0 top-full h-3 w-full group-hover:pointer-events-auto" />

      {/* DROPDOWN */}
      <div
        className={[
          "invisible absolute left-0 top-full z-[100]",
          "translate-y-2 opacity-0",
          "transition-all duration-200",
          "group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
          width === "wide"
            ? "w-[330px]"
            : "w-[285px]",
        ].join(" ")}
      >
        <div className="overflow-hidden rounded-b-xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">

          {/* TOP ACCENT */}
          <div className="h-[3px] bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600" />

          {/* ITEMS */}
          <div className="py-2">
            {items.map((item) => {
              const ItemIcon = item.icon;

              return (
                <Link
                  key={`${item.name}-${item.href}`}
                  href={item.href}
                  className="group/item flex items-center gap-3 px-4 py-3 text-slate-700 transition-colors hover:bg-blue-50"
                >
                  {/* ICON */}
                  {ItemIcon ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover/item:bg-blue-100">
                      <ItemIcon size={18} />
                    </div>
                  ) : (
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-slate-400 transition-transform group-hover/item:translate-x-0.5 group-hover/item:text-blue-600"
                    />
                  )}

                  {/* TEXT */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-medium text-slate-700 group-hover/item:text-blue-700">
                        {item.name}
                      </span>

                      {item.badge && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {ItemIcon && (
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-slate-300 transition-all group-hover/item:translate-x-0.5 group-hover/item:text-blue-600"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* FOOTER */}
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <p className="text-[11px] font-medium text-slate-400">
              Digital Desk • Fast, simple and secure tools
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}