"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

export default function WhatsAppButton() {
  return (
    <Link
      href="https://wa.me/919696295457"
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed bottom-6 left-6 z-[999] hidden md:flex items-center gap-3 rounded-full bg-[#25D366] px-5 py-4 text-white shadow-[0_20px_60px_rgba(37,211,102,.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_25px_70px_rgba(37,211,102,.5)]"
    >
      {/* Ping */}

      <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping"></span>

      {/* Icon */}

      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#25D366]">

        <MessageCircle size={28} />

      </div>

      {/* Text */}

      <div className="relative hidden lg:block">

        <p className="text-sm opacity-90">

          Need Help?

        </p>

        <h3 className="font-bold">

          Chat on WhatsApp

        </h3>

      </div>

    </Link>
  );
}