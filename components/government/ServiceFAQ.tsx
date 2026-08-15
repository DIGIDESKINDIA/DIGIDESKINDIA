"use client";

import { HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface Props {
  faq: FAQItem[];
}

export default function ServiceFAQ({ faq }: Props) {
  if (!faq || faq.length === 0) return null;

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-5">

        <div className="mb-10 text-center">

          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-5 py-2 font-semibold text-blue-700">
            <HelpCircle size={18} />
            Frequently Asked Questions
          </div>

          <h2 className="mt-5 text-4xl font-black text-slate-900">
            FAQs
          </h2>

        </div>

        <div className="space-y-5">

          {faq.map((item, index) => (

            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
            >

              <h3 className="text-lg font-bold text-slate-900">
                {item.question}
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                {item.answer}
              </p>

            </div>

          ))}

        </div>

      </div>
    </section>
  );
}