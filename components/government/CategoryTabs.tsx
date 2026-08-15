"use client";

const categories = [
  "All",
  "Identity",
  "Certificate",
  "Transport",
  "Health",
  "Education",
  "CSC",
];

interface Props {
  active: string;
  onChange: (category: string) => void;
}

export default function CategoryTabs({
  active,
  onChange,
}: Props) {
  return (
    <div className="mb-10 flex flex-wrap justify-center gap-3">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            active === category
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}