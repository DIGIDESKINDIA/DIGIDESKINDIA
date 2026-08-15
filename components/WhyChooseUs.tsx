"use client";

import {
  ShieldCheck,
  Zap,
  Clock3,
  Bot,
  Lock,
  BadgeCheck,
  Headphones,
  Cloud,
} from "lucide-react";

const features = [
  {
    title: "100% Secure Platform",
    description:
      "Enterprise-grade security keeps your files and personal data protected.",
    icon: ShieldCheck,
    color: "bg-blue-50 text-blue-700",
  },
  {
    title: "Lightning Fast",
    description:
      "High-speed processing with optimized cloud infrastructure.",
    icon: Zap,
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    title: "24×7 Availability",
    description:
      "Access your services anytime from anywhere.",
    icon: Clock3,
    color: "bg-green-50 text-green-700",
  },
  {
    title: "Manish AI Assistant",
    description:
      "AI powered guidance for Government and Digital Services.",
    icon: Bot,
    color: "bg-violet-50 text-violet-700",
  },
  {
    title: "Privacy First",
    description:
      "Uploaded documents remain private and protected.",
    icon: Lock,
    color: "bg-red-50 text-red-700",
  },
  {
    title: "Trusted Platform",
    description:
      "Reliable services built for Indian users.",
    icon: BadgeCheck,
    color: "bg-cyan-50 text-cyan-700",
  },
  {
    title: "Premium Support",
    description:
      "Dedicated customer assistance whenever required.",
    icon: Headphones,
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Cloud Based",
    description:
      "No software installation required. Everything works online.",
    icon: Cloud,
    color: "bg-sky-50 text-sky-700",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-5">

        <div className="text-center">

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">

            Why DigiDesk India?

          </span>

          <h2 className="mt-5 text-4xl font-black text-slate-900 lg:text-5xl">

            Why Millions Will Choose DigiDesk India

          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">

            Fast, secure and intelligent digital platform
            designed for Government Services,
            PDF Tools, Image Tools and AI.

          </p>

        </div>

        <div className="mt-16 grid gap-7 md:grid-cols-2 xl:grid-cols-4">

          {features.map((feature) => {

            const Icon = feature.icon;

            return (

              <div
                key={feature.title}
                className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-500 hover:shadow-2xl"
              >

                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${feature.color}`}
                >

                  <Icon size={30} />

                </div>

                <h3 className="mt-7 text-xl font-bold text-slate-900">

                  {feature.title}

                </h3>

                <p className="mt-4 text-sm leading-7 text-slate-600">

                  {feature.description}

                </p>

              </div>

            );

          })}

        </div>

        {/* Bottom Banner */}

        <div className="mt-20 rounded-[36px] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-12 text-center text-white">

          <h3 className="text-4xl font-black">

            One Platform. Unlimited Digital Possibilities.

          </h3>

          <p className="mx-auto mt-6 max-w-3xl text-lg text-blue-100">

            Government Services, PDF Tools,
            Image Tools and AI Assistant —
            everything in one trusted platform.

          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-8">

            <div>

              <h4 className="text-4xl font-black">
                100+
              </h4>

              <p className="mt-2 text-blue-100">
                Services
              </p>

            </div>

            <div>

              <h4 className="text-4xl font-black">
                50+
              </h4>

              <p className="mt-2 text-blue-100">
                PDF & Image Tools
              </p>

            </div>

            <div>

              <h4 className="text-4xl font-black">
                24×7
              </h4>

              <p className="mt-2 text-blue-100">
                AI Support
              </p>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}