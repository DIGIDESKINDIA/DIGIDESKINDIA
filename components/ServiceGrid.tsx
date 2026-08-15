"use client";

import Link from "next/link";
import {
  CreditCard,
  Landmark,
  BadgeCheck,
  GraduationCap,
  HeartPulse,
  TrainFront,
  Plane,
  FileCheck,
  FileText,
  Receipt,
  Briefcase,
  ArrowRight,
} from "lucide-react";

const services = [
  {
    title: "PAN Card",
    icon: CreditCard,
    href: "/service/pan-card",
    color: "bg-blue-50 text-blue-700",
  },
  {
    title: "Aadhaar",
    icon: BadgeCheck,
    href: "/service/aadhaar",
    color: "bg-indigo-50 text-indigo-700",
  },
  {
    title: "Passport",
    icon: FileCheck,
    href: "/service/passport",
    color: "bg-green-50 text-green-700",
  },
  {
    title: "Income Certificate",
    icon: FileText,
    href: "/service/income-certificate",
    color: "bg-orange-50 text-orange-700",
  },
  {
    title: "Caste Certificate",
    icon: Landmark,
    href: "/service/caste-certificate",
    color: "bg-cyan-50 text-cyan-700",
  },
  {
    title: "Scholarship",
    icon: GraduationCap,
    href: "/service/scholarship",
    color: "bg-purple-50 text-purple-700",
  },
  {
    title: "Ayushman Card",
    icon: HeartPulse,
    href: "/service/ayushman-card",
    color: "bg-red-50 text-red-700",
  },
  {
    title: "Train Ticket",
    icon: TrainFront,
    href: "/service/train-ticket",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Flight Booking",
    icon: Plane,
    href: "/service/flight-booking",
    color: "bg-sky-50 text-sky-700",
  },
  {
    title: "Electricity Bill",
    icon: Receipt,
    href: "/service/electricity-bill",
    color: "bg-yellow-50 text-yellow-700",
  },
  {
    title: "Resume",
    icon: Briefcase,
    href: "/service/resume",
    color: "bg-pink-50 text-pink-700",
  },
  {
    title: "All Services",
    icon: ArrowRight,
    href: "/service",
    color: "bg-slate-900 text-white",
  },
];

export default function ServiceGrid() {
  return (
    <section
      id="services"
      className="bg-white py-20"
    >
      <div className="mx-auto max-w-7xl px-5">

        <div className="mb-14 text-center">

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">

            Government Services

          </span>

          <h2 className="mt-5 text-4xl font-black text-slate-900 lg:text-5xl">

            Popular Digital Services

          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">

            Fast, Secure and Trusted Government Services
            available online through DigiDesk India.

          </p>

        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {services.map((service) => {

            const Icon = service.icon;

            return (

              <Link
                key={service.title}
                href={service.href}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-500 hover:shadow-2xl"
              >

                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${service.color}`}
                >

                  <Icon size={30} />

                </div>

                <h3 className="mt-6 text-xl font-bold text-slate-900">

                  {service.title}

                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">

                  Quick online application with secure
                  document processing.

                </p>

                <div className="mt-6 flex items-center gap-2 font-semibold text-blue-700">

                  Open Service

                  <ArrowRight
                    size={18}
                    className="transition group-hover:translate-x-2"
                  />

                </div>

              </Link>

            );

          })}

        </div>

      </div>
    </section>
  );
}