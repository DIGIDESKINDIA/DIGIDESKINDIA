"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Menu,
  Search,
  User,
  Bot,
  X,
  ChevronDown,
  ChevronRight,
  Home,
  Landmark,
  FileText,
  ImageIcon,
  BriefcaseBusiness,
  Files,
  Scissors,
  Combine,
  FileImage,
  Minimize2,
  ScanLine,
  UserRound,
  Sparkles,
  ArrowRight,
  FileType2,
  Sheet,
  Presentation,
  Gauge,
  RotateCw,
  ShieldCheck,
  Signature,
} from "lucide-react";

/* ======================================================
   TYPES
====================================================== */

type DropdownItem = {
  name: string;
  description?: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string;
};

type NavItem = {
  name: string;
  href?: string;
  icon: React.ReactNode;
  children?: DropdownItem[];
};

/* ======================================================
   GOVERNMENT SERVICES
====================================================== */

const governmentServices: DropdownItem[] = [
  {
    name: "PAN Card",
    description: "PAN application & services",
    href: "/service/pan-card",
    icon: <FileText size={18} />,
  },
  {
    name: "Aadhaar Services",
    description: "Aadhaar related assistance",
    href: "/service/aadhaar",
    icon: <UserRound size={18} />,
  },
  {
    name: "Passport",
    description: "Passport application help",
    href: "/service/passport",
    icon: <Files size={18} />,
  },
  {
    name: "Driving Licence",
    description: "DL related services",
    href: "/service/driving-licence",
    icon: <Files size={18} />,
  },
  {
    name: "Voter ID",
    description: "Voter services & guidance",
    href: "/service/voter-id",
    icon: <UserRound size={18} />,
  },
];

/* ======================================================
   CSC SERVICES
====================================================== */

const cscServices: DropdownItem[] = [
  {
    name: "Online Forms",
    description: "Government & exam forms",
    href: "/#services",
    icon: <FileText size={18} />,
  },
  {
    name: "Certificates",
    description: "Digital certificate services",
    href: "/#services",
    icon: <Files size={18} />,
  },
  {
    name: "Government Schemes",
    description: "Scheme information & assistance",
    href: "/#services",
    icon: <Landmark size={18} />,
  },
  {
    name: "All Services",
    description: "Explore Digital Desk services",
    href: "/#services",
    icon: <ArrowRight size={18} />,
  },
];

/* ======================================================
   PDF TOOLS
====================================================== */

const mainPDFTools: DropdownItem[] = [
  {
    name: "All PDF Tools",
    description: "Open complete PDF toolbox",
    href: "/pdf-tools",
    icon: <Sparkles size={18} />,
  },
  {
    name: "Merge PDF",
    description: "Combine multiple PDF files",
    href: "/pdf-tools/merge-pdf",
    icon: <Combine size={18} />,
    badge: "Popular",
  },
  {
    name: "Split PDF",
    description: "Separate PDF pages",
    href: "/pdf-tools/split",
    icon: <Scissors size={18} />,
  },
  {
    name: "Rotate PDF",
    description: "Rotate PDF pages",
    href: "/pdf-tools/rotate",
    icon: <RotateCw size={18} />,
  },
  {
    name: "Sign PDF",
    description: "Place signatures and approval fields",
    href: "/sign-pdf",
    icon: <Signature size={18} />,
    badge: "New",
  },
  {
    name: "JPG to PDF",
    description: "Convert images into PDF",
    href: "/pdf-tools/jpg-to-pdf",
    icon: <FileImage size={18} />,
  },
  {
    name: "PDF to Word",
    description: "Convert PDF into editable Word",
    href: "/pdf-tools/pdf-to-word",
    icon: <FileText size={18} />,
  },
];

/* ======================================================
   COMPRESS PDF
====================================================== */

const compressPDFTools: DropdownItem[] = [
  {
    name: "Compress PDF",
    description: "Automatic PDF compression",
    href: "/pdf-tools/compress-pdf",
    icon: <Minimize2 size={18} />,
    badge: "Popular",
  },
  {
  name: "Increase PDF Size",
  description: "Increase PDF to your required size",
  href: "/pdf-tools/increase-pdf-size",
  icon: <Gauge size={18} />,
},
];

/* ======================================================
   CONVERT TO PDF
====================================================== */

const convertToPDFTools: DropdownItem[] = [
  {
    name: "Word to PDF",
    description: "DOC & DOCX to PDF",
    href: "/pdf-tools/word-to-pdf",
    icon: <FileType2 size={18} />,
    badge: "New",
  },
  {
    name: "Excel to PDF",
    description: "XLS & XLSX to PDF",
    href: "/pdf-tools/excel-to-pdf",
    icon: <Sheet size={18} />,
    badge: "New",
  },
  {
    name: "PowerPoint to PDF",
    description: "PPT & PPTX to PDF",
    href: "/pdf-tools/powerpoint-to-pdf",
    icon: <Presentation size={18} />,
    badge: "New",
  },
  {
    name: "JPG to PDF",
    description: "JPG & JPEG images to PDF",
    href: "/pdf-tools/jpg-to-pdf",
    icon: <FileImage size={18} />,
  },
];

/* ======================================================
   CONVERT FROM PDF
====================================================== */

const convertFromPDFTools: DropdownItem[] = [
  {
    name: "PDF to Excel",
    description: "PDF tables to XLSX",
    href: "/pdf-tools/pdf-to-excel",
    icon: <Sheet size={18} />,
    badge: "New",
  },
  {
    name: "PDF to PowerPoint",
    description: "PDF to PPTX presentation",
    href: "/pdf-tools/pdf-to-powerpoint",
    icon: <Presentation size={18} />,
    badge: "New",
  },
  {
    name: "PDF to JPG",
    description: "Convert PDF pages to JPG",
    href: "/pdf-tools/pdf-to-jpg",
    icon: <FileImage size={18} />,
  },
];

/* ======================================================
   IMAGE TOOLS
====================================================== */

const imageTools: DropdownItem[] = [
  {
    name: "Passport Photo",
    description: "Create passport size photos",
    href: "/image-tools/passport-photo",
    icon: <ScanLine size={18} />,
    badge: "Popular",
  },
  {
    name: "Remove Background",
    description: "Remove image backgrounds",
    href: "/image-tools/remove-background",
    icon: <Scissors size={18} />,
  },
];

/* ======================================================
   MAIN NAVIGATION
====================================================== */

const navItems: NavItem[] = [
  {
    name: "Government",
    href: "#services",
    icon: <Landmark size={18} />,
    children: governmentServices,
  },
  {
    name: "CSC",
    href: "#services",
    icon: <BriefcaseBusiness size={18} />,
    children: cscServices,
  },
  {
    name: "PDF Tools",
    href: "/pdf-tools",
    icon: <FileText size={18} />,
    children: mainPDFTools,
  },
  {
    name: "Compress PDF",
    href: "/pdf-tools/compress-pdf",
    icon: <Minimize2 size={18} />,
    children: compressPDFTools,
  },
  {
    name: "Convert to PDF",
    href: "/pdf-tools",
    icon: <FileType2 size={18} />,
    children: convertToPDFTools,
  },
  {
    name: "Convert from PDF",
    href: "/pdf-tools",
    icon: <Files size={18} />,
    children: convertFromPDFTools,
  },
  {
    name: "Image Tools",
    href: "/image-tools/passport-photo",
    icon: <ImageIcon size={18} />,
    children: imageTools,
  },
];

/* ======================================================
   DESKTOP DROPDOWN
====================================================== */

function DesktopDropdown({
  item,
}: {
  item: NavItem;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="
        relative
        flex
        min-w-0
        flex-1
      "
      onMouseEnter={() => {
        setOpen(true);
      }}
      onMouseLeave={() => {
        setOpen(false);
      }}
    >
      {/* MAIN NAV ITEM */}

      <Link
        href={item.href || "#"}
        className={`
          flex
          h-[64px]
          w-full
          min-w-0
          items-center
          justify-center
          gap-2
          border-r
          border-white/10
          px-2
          text-[15px]
          font-bold
          text-white
          transition-all
          duration-200
          hover:bg-white/15
          2xl:px-3
          2xl:text-[16px]
          ${open ? "bg-white/15" : ""}
        `}
      >
        <span className="shrink-0">
          {item.icon}
        </span>

        <span className="whitespace-nowrap">
          {item.name}
        </span>

        {item.children && (
          <ChevronDown
            size={15}
            className={`
              shrink-0
              transition-transform
              duration-200
              ${open ? "rotate-180" : ""}
            `}
          />
        )}
      </Link>

      {/* DROPDOWN + INVISIBLE HOVER BRIDGE */}

      {item.children && open && (
        <div
          className="
            absolute
            left-0
            top-full
            z-[99999]
            w-[320px]
            pt-3
          "
          onMouseEnter={() => {
            setOpen(true);
          }}
          onMouseLeave={() => {
            setOpen(false);
          }}
        >
          {/* Invisible bridge between navbar and dropdown */}

          <div
            className="
              absolute
              left-0
              right-0
              top-0
              h-4
            "
          />

          {/* ACTUAL DROPDOWN */}

          <div
            className="
              relative
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-1.5
              shadow-[0_18px_50px_-15px_rgba(15,23,42,0.28)]
            "
          >
            {/* DROPDOWN ARROW */}

            <div
              className="
                absolute
                -top-2
                left-8
                h-4
                w-4
                rotate-45
                border-l
                border-t
                border-slate-200
                bg-white
              "
            />

            {/* HEADER */}

            <div
              className="
                relative
                mb-1
                flex
                items-center
                justify-between
                rounded-xl
                bg-gradient-to-r
                from-blue-50
                to-cyan-50
                px-3.5
                py-2.5
              "
            >
              <div>
                <p
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.18em]
                    text-blue-500
                  "
                >
                  DigiDesk India
                </p>

                <p
                  className="
                    mt-0.5
                    text-[17px]
                    font-bold
                    leading-tight
                    text-slate-900
                  "
                >
                  {item.name}
                </p>
              </div>

              <div
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  bg-white
                  text-blue-600
                  shadow-sm
                "
              >
                {item.icon}
              </div>
            </div>

            {/* SERVICES */}

            <div
              className="
                max-h-[390px]
                overflow-y-auto
                overscroll-contain
              "
            >
              {item.children.map((child) => (
                <Link
                  key={`${item.name}-${child.name}`}
                  href={child.href}
                  onClick={() => {
                    setOpen(false);
                  }}
                  className="
                    group/link
                    flex
                    cursor-pointer
                    items-center
                    gap-2.5
                    rounded-xl
                    px-2.5
                    py-2
                    transition-all
                    duration-200
                    hover:bg-blue-50
                  "
                >
                  {/* ICON */}

                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-slate-100
                      text-slate-600
                      transition-all
                      duration-200
                      group-hover/link:bg-blue-600
                      group-hover/link:text-white
                    "
                  >
                    {child.icon}
                  </div>

                  {/* TEXT */}

                  <div className="min-w-0 flex-1">
                    <div
                      className="
                        flex
                        items-center
                        gap-1.5
                      "
                    >
                      <p
                        className="
                          truncate
                          text-[13px]
                          font-bold
                          leading-tight
                          text-slate-800
                          transition-colors
                          group-hover/link:text-blue-700
                        "
                      >
                        {child.name}
                      </p>

                      {child.badge && (
                        <span
                          className={`
                            shrink-0
                            rounded-full
                            px-1.5
                            py-0.5
                            text-[7px]
                            font-bold
                            uppercase
                            ${
                              child.badge ===
                              "Popular"
                                ? "bg-emerald-100 text-emerald-700"
                                : child.badge ===
                                    "Custom"
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-blue-100 text-blue-700"
                            }
                          `}
                        >
                          {child.badge}
                        </span>
                      )}
                    </div>

                    {child.description && (
                      <p
                        className="
                          mt-0.5
                          truncate
                          text-[10px]
                          leading-tight
                          text-slate-500
                        "
                      >
                        {child.description}
                      </p>
                    )}
                  </div>

                  {/* RIGHT ARROW */}

                  <ChevronRight
                    size={14}
                    className="
                      shrink-0
                      text-slate-300
                      transition-all
                      duration-200
                      group-hover/link:translate-x-0.5
                      group-hover/link:text-blue-600
                    "
                  />
                </Link>
              ))}
            </div>

            {/* FOOTER */}

            {item.href && (
              <Link
                href={item.href}
                onClick={() => {
                  setOpen(false);
                }}
                className="
                  mt-1
                  flex
                  items-center
                  justify-between
                  border-t
                  border-slate-100
                  px-3
                  py-2
                  text-[11px]
                  font-bold
                  text-blue-600
                  transition-colors
                  hover:bg-blue-50
                "
              >
                <span>
                  Open {item.name}
                </span>

                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================================================
   NAVBAR
====================================================== */

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileDropdown, setMobileDropdown] =
    useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const toggleMobileDropdown = (name: string) => {
    setMobileDropdown((current) =>
      current === name ? null : name
    );
  };

  return (
    <>
      {/* ==================================================
          ANNOUNCEMENT BAR
      ================================================== */}

      <div className="relative overflow-hidden bg-gradient-to-r from-blue-800 via-blue-600 to-cyan-500 text-white">
        <div className="mx-auto flex min-h-9 w-full max-w-[1600px] items-center justify-center px-4 py-2 text-center text-xs font-medium sm:text-sm">
          <Sparkles
            size={15}
            className="mr-2 hidden sm:block"
          />

          <span>
            100+ Government Services • PDF Tools • Image
            Tools • AI Assistant
          </span>

          <span className="ml-2 hidden rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold sm:inline">
            DIGITAL DESK
          </span>
        </div>
      </div>

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">
        {/* TOP HEADER */}

        <div
          className="
            mx-auto flex h-[92px] w-full
            max-w-[1600px]
            items-center gap-6
            px-5
            2xl:px-7
          "
        >
          {/* LOGO */}

          <Link
            href="/"
            className="group flex shrink-0 items-center gap-3"
          >
            <div className="relative">
              <Image
                src="/images/logo.png"
                alt="Digital Desk"
                width={224}
                height={64}
                priority
                className="h-16 w-auto transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            <div className="hidden sm:block">
              <h1 className="text-xl font-black tracking-tight text-slate-900 lg:text-[26px]">
                Digital{" "}
                <span className="text-blue-600">
                  Desk
                </span>
              </h1>

              <p className="mt-0.5 text-[11px] font-medium text-slate-500 lg:text-xs">
                One Platform For Every Digital Service
              </p>
            </div>
          </Link>

          {/* Spacer pushes actions to right */}

          <div className="flex-1" />

          {/* DESKTOP ACTIONS */}

          <div className="hidden items-center justify-end gap-4 xl:flex">
            {/* SEARCH */}

            <div className="group flex h-[54px] w-[250px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 transition-all duration-300 focus-within:w-[290px] focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
              <Search
                size={20}
                className="shrink-0 text-slate-400 transition group-focus-within:text-blue-600"
              />

              <input
                type="search"
                placeholder="Search services..."
                className="w-full bg-transparent px-3 text-[15px] font-medium text-slate-700 outline-none placeholder:text-slate-400"
              />

              <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">
                /
              </span>
            </div>

            {/* ASK MANISH */}

            <button
              type="button"
              className="
                group flex h-[54px]
                items-center gap-2
                rounded-2xl
                bg-gradient-to-r from-cyan-500 to-blue-600
                px-7
                text-[16px] font-bold text-white
                shadow-md shadow-blue-500/20
                transition-all duration-300
                hover:-translate-y-0.5
                hover:shadow-lg
                hover:shadow-blue-500/30
              "
            >
              <Bot
                size={20}
                className="transition-transform group-hover:rotate-6"
              />

              Ask Manish
            </button>

            {/* LOGIN - RIGHT SIDE */}

            <Link
              href="/login"
              className="
                flex h-[54px]
                items-center justify-center gap-2
                rounded-2xl
                border border-blue-200
                bg-white
                px-7
                text-[16px] font-bold text-blue-700
                transition-all duration-300
                hover:border-blue-600
                hover:bg-blue-600
                hover:text-white
              "
            >
              <User size={20} />

              Login
            </Link>
          </div>

          {/* MOBILE ACTIONS */}

          <div className="flex items-center gap-1 xl:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="rounded-xl p-2.5 text-slate-700 transition hover:bg-slate-100"
              aria-label="Search"
            >
              <Search size={22} />
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl p-2.5 text-slate-800 transition hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu size={27} />
            </button>
          </div>
        </div>

        {/* MOBILE SEARCH */}

        {searchOpen && (
          <div className="border-t border-slate-100 bg-white p-3 xl:hidden">
            <div className="mx-auto flex max-w-7xl items-center rounded-xl border border-blue-200 bg-slate-50 px-4">
              <Search
                size={18}
                className="text-blue-600"
              />

              <input
                autoFocus
                type="search"
                placeholder="Search PAN, PDF Tools, Passport..."
                className="w-full bg-transparent px-3 py-3 text-sm outline-none"
              />
            </div>
          </div>
        )}

        {/* ==================================================
            DESKTOP BLUE NAVIGATION
        ================================================== */}

        <div className="hidden border-t border-white/10 bg-gradient-to-r from-blue-800 via-blue-700 to-cyan-700 xl:block">
          <nav className="mx-auto flex w-full max-w-[1600px] items-stretch px-0">
            {/* HOME */}

            <Link
              href="/"
              className="
                flex h-[64px] shrink-0
                items-center justify-center gap-2
                border-l border-r border-white/10
                px-5
                text-[16px] font-bold text-white
                transition-all duration-200
                hover:bg-white/15
                2xl:px-6
                2xl:text-[17px]
              "
            >
              <Home size={19} />

              <span className="whitespace-nowrap">
                Home
              </span>
            </Link>

            {/* DROPDOWN NAV ITEMS */}

            <div className="flex min-w-0 flex-1 items-stretch">
              {navItems.map((item) => (
                <DesktopDropdown
                  key={item.name}
                  item={item}
                />
              ))}
            </div>

            {/* CONTACT - RIGHT EDGE */}

            <Link
              href="/#contact"
              className="
                flex h-[64px] shrink-0
                items-center justify-center
                whitespace-nowrap
                border-l border-r border-white/10
                px-6
                text-[16px] font-bold text-white
                transition-all duration-200
                hover:bg-white/15
                2xl:px-8
                2xl:text-[17px]
              "
            >
              Contact
            </Link>
          </nav>
        </div>
      </header>

      {/* ==================================================
          MOBILE MENU
      ================================================== */}

      {mobileOpen && (
        <div
          className="fixed inset-0 z-[999] bg-slate-950/50 backdrop-blur-sm xl:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute right-0 top-0 flex h-full w-[92%] max-w-[410px] flex-col bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* MOBILE HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3"
              >
                <Image
                  src="/images/logo.png"
                  alt="Digital Desk"
                  width={161}
                  height={46}
                  className="h-[46px] w-auto"
                />

                <div>
                  <p className="text-lg font-black text-slate-900">
                    Digital{" "}
                    <span className="text-blue-600">
                      Desk
                    </span>
                  </p>

                  <p className="text-[10px] text-slate-500">
                    Every Digital Service
                  </p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-red-50 hover:text-red-600"
                aria-label="Close menu"
              >
                <X size={21} />
              </button>
            </div>

            {/* MOBILE SEARCH */}

            <div className="border-b border-slate-100 p-4">
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50">
                <Search
                  size={18}
                  className="shrink-0 text-slate-400"
                />

                <input
                  type="search"
                  placeholder="Search services & tools..."
                  className="w-full bg-transparent px-3 py-3 text-sm outline-none"
                />
              </div>
            </div>

            {/* MOBILE SCROLL AREA */}

            <div className="flex-1 overflow-y-auto p-4">
              {/* HOME */}

              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3.5 font-bold text-slate-800 transition hover:bg-blue-50 hover:text-blue-700"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Home size={18} />
                </div>

                Home
              </Link>

              {/* MOBILE ACCORDIONS */}

              {navItems.map((item) => {
                const isOpen =
                  mobileDropdown === item.name;

                return (
                  <div
                    key={item.name}
                    className="mb-1"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        toggleMobileDropdown(item.name)
                      }
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 transition-all ${
                        isOpen
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-3 font-bold">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                            isOpen
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.icon}
                        </span>

                        {item.name}
                      </span>

                      <ChevronDown
                        size={18}
                        className={`transition-transform duration-300 ${
                          isOpen
                            ? "rotate-180 text-blue-600"
                            : "text-slate-400"
                        }`}
                      />
                    </button>

                    {/* ACCORDION */}

                    <div
                      className={`grid transition-all duration-300 ${
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="ml-6 border-l-2 border-blue-100 py-2 pl-4">
                          {/* CATEGORY */}

                          {item.href && (
                            <Link
                              href={item.href}
                              onClick={() =>
                                setMobileOpen(false)
                              }
                              className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
                            >
                              <ArrowRight size={16} />

                              Open {item.name}
                            </Link>
                          )}

                          {/* CHILDREN */}

                          {item.children?.map((child) => (
                            <Link
                              key={`${item.name}-${child.name}`}
                              href={child.href}
                              onClick={() =>
                                setMobileOpen(false)
                              }
                              className="group/mobile flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-blue-50"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover/mobile:bg-blue-600 group-hover/mobile:text-white">
                                {child.icon}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-700 group-hover/mobile:text-blue-700">
                                    {child.name}
                                  </p>

                                  {child.badge && (
                                    <span
                                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                                        child.badge ===
                                        "Popular"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : child.badge ===
                                              "Custom"
                                            ? "bg-violet-100 text-violet-700"
                                            : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {child.badge}
                                    </span>
                                  )}
                                </div>

                                {child.description && (
                                  <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                    {child.description}
                                  </p>
                                )}
                              </div>

                              <ChevronRight
                                size={15}
                                className="shrink-0 text-slate-300"
                              />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* CONTACT */}

              <Link
                href="/#contact"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3.5 font-bold text-slate-800 transition hover:bg-blue-50 hover:text-blue-700"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <UserRound size={18} />
                </div>

                Contact Us
              </Link>

              {/* TRUST CARD */}

              <div className="mt-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <ShieldCheck size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Secure Digital Tools
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Government services, PDF tools,
                      image tools and AI assistance from
                      one platform.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* MOBILE BOTTOM */}

            <div className="border-t border-slate-100 bg-white p-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20"
                >
                  <Bot size={17} />

                  Ask Manish
                </button>

                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-bold text-blue-700"
                >
                  <User size={17} />

                  Login
                </Link>
              </div>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-400">
                <ShieldCheck size={13} />

                Secure • Fast • Digital
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}