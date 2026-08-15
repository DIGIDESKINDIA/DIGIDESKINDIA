import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";

import { useManishAI } from "@/components/ai/ManishAIProvider";

export default function Hero() {
  const { enabled, setOpen } = useManishAI();

  return (
    <section className="relative overflow-hidden bg-[#06152F] text-white">
      {/* cinematic atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[-80px] h-[380px] w-[380px] rounded-full bg-blue-700/10 blur-3xl" />

        <div className="absolute right-[-100px] top-[-80px] h-[420px] w-[420px] rounded-full bg-orange-500/10 blur-3xl" />

        <div className="absolute bottom-[-160px] left-[40%] h-[340px] w-[340px] rounded-full bg-green-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1480px] px-5 py-4 sm:px-7 lg:px-9 lg:py-5">
        <div className="grid items-center gap-0 lg:grid-cols-[0.84fr_1.16fr]">
          {/* LEFT CONTENT */}
          <div className="relative z-[70] max-w-[610px] pb-4 lg:pb-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-5 py-2.5 text-base font-semibold text-blue-100 backdrop-blur-md sm:text-lg">
              <Check
                size={18}
                className="text-cyan-300"
              />

              Trusted Digital Services Platform
            </span>

            <h1 className="mt-5 text-[40px] font-black leading-[0.92] tracking-[-0.045em] sm:text-[54px] lg:text-[64px] xl:text-[74px]">
              <span className="block text-white">
                Digital India.
              </span>

              <span className="mt-2 block">
                <span className="text-[#FF9933]">
                  Smart
                </span>{" "}
                <span className="text-white">
                  Services.
                </span>
              </span>

              <span className="mt-2 inline whitespace-nowrap text-white">
                Stronger
              </span>{" "}
              <span className="inline whitespace-nowrap text-[#138808]">
                India.
              </span>
            </h1>

            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

            <p className="mt-4 max-w-[560px] text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              Government Services, PDF Tools, Image
              Tools &amp; AI Assistance — everything you
              need in one trusted digital platform.
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/service"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#0891B2] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_36px_rgba(37,99,235,0.25)] transition hover:-translate-y-0.5 sm:px-6"
              >
                Explore Services
                <ArrowRight size={17} />
              </Link>

              {enabled ? (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-white/10 sm:px-6"
                >
                  <Sparkles
                    size={17}
                    className="text-cyan-300"
                  />
                  AI Assistant
                </button>
              ) : (
                <Link
                  href="/ai"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-white/10 sm:px-6"
                >
                  <Sparkles
                    size={17}
                    className="text-cyan-300"
                  />
                  AI Assistant
                </Link>
              )}
            </div>
          </div>

          {/* RIGHT VISUAL */}
          <div className="hero-artwork-wrapper relative h-[405px] sm:h-[425px] lg:h-[440px] justify-self-end position-relative left-16">
            <img
              src="/images/right-hero.png"
              alt="Digital India"
              className="hero-artwork-blend h-full w-full object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}