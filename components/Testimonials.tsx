"use client";

import {
  Star,
  Quote,
  CheckCircle2,
} from "lucide-react";

const reviews = [
  {
    name: "Rahul Sharma",
    city: "Kanpur",
    role: "CSC Operator",
    review:
      "DigiDesk India saved me hours every day. PDF tools and Government Services are excellent.",
    rating: 5,
  },
  {
    name: "Priya Verma",
    city: "Lucknow",
    role: "Student",
    review:
      "Passport photo tool and PDF compressor are extremely fast and easy to use.",
    rating: 5,
  },
  {
    name: "Ankit Singh",
    city: "Delhi",
    role: "Business Owner",
    review:
      "Manish AI helped me prepare official applications within minutes.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="bg-slate-50 py-24">

      <div className="mx-auto max-w-7xl px-5">

        <div className="text-center">

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Testimonials
          </span>

          <h2 className="mt-5 text-4xl font-black text-slate-900 lg:text-5xl">
            Loved By Our Users
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">
            Thousands of users trust DigiDesk India for
            Government Services, PDF Tools,
            Image Tools and AI Assistance.
          </p>

        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">

          {reviews.map((review) => (

            <div
              key={review.name}
              className="group rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >

              <Quote
                size={40}
                className="text-blue-600"
              />

              <div className="mt-5 flex gap-1">

                {Array.from({
                  length: review.rating,
                }).map((_, index) => (

                  <Star
                    key={index}
                    size={18}
                    className="fill-yellow-400 text-yellow-400"
                  />

                ))}

              </div>

              <p className="mt-6 leading-8 text-slate-600">

                &ldquo;{review.review}&rdquo;

              </p>

              <div className="mt-8 flex items-center gap-4">

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-700 to-cyan-500 text-lg font-bold text-white">

                  {review.name.charAt(0)}

                </div>

                <div>

                  <h3 className="font-bold text-slate-900">

                    {review.name}

                  </h3>

                  <p className="text-sm text-slate-500">

                    {review.role}

                  </p>

                  <p className="text-xs text-slate-400">

                    {review.city}

                  </p>

                </div>

              </div>

            </div>

          ))}

        </div>

        <div className="mt-20 rounded-[36px] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-12 text-white">

          <div className="grid gap-8 lg:grid-cols-4">

            <Stat
              value="25K+"
              title="Happy Users"
            />

            <Stat
              value="100+"
              title="Services"
            />

            <Stat
              value="50+"
              title="PDF & Image Tools"
            />

            <div className="flex items-center gap-3">

              <CheckCircle2
                size={40}
              />

              <div>

                <h3 className="text-xl font-bold">

                  Trusted Platform

                </h3>

                <p className="text-blue-100">

                  Secure & Reliable

                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}

function Stat({
  value,
  title,
}: {
  value: string;
  title: string;
}) {
  return (
    <div>

      <h3 className="text-4xl font-black">

        {value}

      </h3>

      <p className="mt-2 text-blue-100">

        {title}

      </p>

    </div>
  );
}