"use client";

import Link from "next/link";

export default function ApplyNow() {
  return (
    <section className="bg-blue-700 py-20 text-center text-white">

      <div className="mx-auto max-w-4xl px-5">

        <h2 className="text-4xl font-black">
          Ready to Apply?
        </h2>

        <p className="mt-5 text-blue-100">
          Complete your application quickly and securely with DigiDesk India.
        </p>

        <Link
          href="/contact"
          className="mt-8 inline-block rounded-2xl bg-white px-8 py-4 font-bold text-blue-700 transition hover:scale-105"
        >
          Apply Now
        </Link>

      </div>

    </section>
  );
}