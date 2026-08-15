"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import MegaMenu, { menuData } from "./MegaMenu";

type NavItem = {
  label: string;
  href: string;
  hasDropdown?: boolean;
  dropdownType?: keyof typeof menuData;
  isNew?: boolean;
};

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Government Services",
    href: "/service",
    hasDropdown: true,
    dropdownType: "government",
  },
  {
    label: "PDF Tools",
    href: "/pdf-tools",
    hasDropdown: true,
    dropdownType: "pdf",
  },
  {
    label: "Image Tools",
    href: "/image-tools",
    hasDropdown: true,
    dropdownType: "image",
  },
  {
    label: "AI Assistant",
    href: "/ai",
    isNew: true,
  },
  {
    label: "CSC Services",
    href: "/service",
  },
  {
    label: "Pricing",
    href: "/pricing",
  },
  {
    label: "Contact Us",
    href: "/contact",
  },
];

export default function DesktopMenu() {
  const [openDropdown, setOpenDropdown] =
    useState<string | null>(null);

  const containerRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const closeDropdownLater = () => {
    window.setTimeout(() => {
      setOpenDropdown(null);
    }, 180);
  };

  return (
    <nav
      ref={containerRef}
      aria-label="Primary navigation"
      className="relative flex items-center justify-center gap-4 xl:gap-5"
    >
      {navItems.map((item) => {
        const hasDropdown =
          item.hasDropdown &&
          item.dropdownType !== undefined;

        const isOpen =
          openDropdown === item.label;

        return (
          <div
            key={item.label}
            className="relative flex items-center"
            onMouseEnter={() => {
              if (hasDropdown) {
                setOpenDropdown(item.label);
              }
            }}
            onMouseLeave={() => {
              if (hasDropdown) {
                closeDropdownLater();
              }
            }}
            onFocus={() => {
              if (hasDropdown) {
                setOpenDropdown(item.label);
              }
            }}
            onBlur={() => {
              if (hasDropdown) {
                closeDropdownLater();
              }
            }}
          >
            <Link
              href={item.href}
              className="
                inline-flex
                min-h-[42px]
                items-center
                gap-1
                whitespace-nowrap
                rounded-lg
                px-1
                text-[14px]
                font-semibold
                !text-slate-800
                transition
                duration-200
                hover:!text-blue-700
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500/30
                xl:text-[15px]
              "
            >
              <span>{item.label}</span>

              {item.isNew && (
                <span
                  className="
                    inline-flex
                    items-center
                    rounded-full
                    bg-gradient-to-r
                    from-[#6D28D9]
                    to-[#2563EB]
                    px-1.5
                    py-0.5
                    text-[9px]
                    font-extrabold
                    leading-none
                    text-white
                  "
                >
                  New
                </span>
              )}

              {hasDropdown && (
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-slate-500 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              )}
            </Link>

            {hasDropdown && isOpen && (
              <div
                className="
                  absolute
                  left-0
                  top-full
                  z-[100]
                  pt-3
                "
                onMouseEnter={() => {
                  setOpenDropdown(item.label);
                }}
              >
                <MegaMenu
                  type={item.dropdownType as string}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}