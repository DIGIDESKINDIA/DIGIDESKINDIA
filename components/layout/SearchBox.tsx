"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  ImageIcon,
  Bot,
  Landmark,
} from "lucide-react";

const suggestions = [
  "Compress PDF",
  "Merge PDF",
  "PDF to Word",
  "Passport Photo",
  "Remove Background",
  "PAN Card",
  "Aadhaar",
  "Income Certificate",
  "Scholarship",
  "Manish AI",
];

export default function SearchBox() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState(false);

  const filtered = suggestions.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase())
  );

  const handleSearch = (value?: string) => {
    const text = value || query;

    if (!text.trim()) return;

    router.push(
      `/search?q=${encodeURIComponent(text)}`
    );

    setFocus(false);
  };

  return (
    <div className="relative w-[340px]">

      <div className="flex h-12 items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-blue-500 focus-within:bg-white">

        <Search
          size={18}
          className="ml-4 text-slate-400"
        />

        <input
          value={query}
          onFocus={() => setFocus(true)}
          onBlur={() =>
            setTimeout(() => setFocus(false), 150)
          }
          onChange={(e) =>
            setQuery(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
          placeholder="Search tools..."
          className="h-full flex-1 bg-transparent px-3 text-sm outline-none"
        />

      </div>

      {focus && (

        <div className="absolute top-14 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

          {(query ? filtered : suggestions).map(
            (item) => (

              <button
                key={item}
                onClick={() =>
                  handleSearch(item)
                }
                className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-blue-50"
              >

                {item.includes("PDF") ? (
                  <FileText
                    size={18}
                    className="text-red-600"
                  />
                ) : item.includes("Photo") ||
                  item.includes("Background") ? (
                  <ImageIcon
                    size={18}
                    className="text-green-600"
                  />
                ) : item.includes("AI") ? (
                  <Bot
                    size={18}
                    className="text-violet-600"
                  />
                ) : (
                  <Landmark
                    size={18}
                    className="text-blue-700"
                  />
                )}

                <span className="text-sm font-medium text-slate-700">

                  {item}

                </span>

              </button>

            )
          )}

        </div>

      )}

    </div>
  );
}