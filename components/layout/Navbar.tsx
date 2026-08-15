"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Search, X } from "lucide-react";

import TopBar from "./TopBar";
import DesktopMenu from "./DesktopMenu";
import MobileMenu from "./MobileMenu";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setSticky(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <TopBar />

      <header
        className={`sticky top-0 z-40 border-b border-slate-200 bg-[#FFFFFF] transition-all duration-300 ${
          sticky ? "shadow-lg" : ""
        }`}
      >
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-5 lg:py-3">
          <div className="flex items-center justify-between gap-3 lg:gap-4">
            {/* LOGO */}
            <Link
              href="/"
              className="flex shrink-0 items-center"
            >
              <Image
                src="/images/logo.png"
                alt="DigiDesk India"
                width={190}
                height={54}
                className="h-[46px] w-auto lg:h-[50px]"
                priority
              />
            </Link>

            {/* DESKTOP NAVIGATION */}
            <div className="hidden flex-1 justify-center xl:flex">
              <DesktopMenu />
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex items-center gap-3 xl:gap-4">
              {/* SEARCH */}
              <Link
                href="/search"
                aria-label="Search"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <Search size={18} />
              </Link>

              {/* THEME */}
              <ThemeToggle />

              {/* LOGIN */}
              <Link
                href="/login"
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                Login
              </Link>

              {/* SIGN UP */}
              <Link
                href="/login"
                className="rounded-full bg-gradient-to-r from-[#6D28D9] to-[#2563EB] px-5 py-2.5 text-sm font-bold text-white whitespace-nowrap shadow-[0_12px_36px_rgba(109,40,217,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(109,40,217,0.32)] focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              >
                Sign Up
              </Link>
            </div>

            {/* MOBILE MENU BUTTON */}
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className="rounded-xl border border-slate-200 bg-white p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 xl:hidden"
              aria-label={
                open
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              aria-expanded={open}
            >
              {open ? (
                <X size={22} />
              ) : (
                <Menu size={22} />
              )}
            </button>
          </div>
        </div>

        <MobileMenu
          open={open}
          onClose={() => setOpen(false)}
        />
      </header>
    </>
  );
}