"use client";

const categories = [
  "All",
  "Convert",
  "Edit",
  "Security",
  "Optimize",
];

interface Props {
  active: string;
  onChange: (value: string) => void;
}

export default function PdfCategories({
  active,
  onChange,
}: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2">

      {categories.map((category) => (

        <button
          key={category}
          onClick={() => onChange(category)}
          className={`rounded-full border px-4 py-1.5 text-[11px] font-semibold transition ${
            active === category
              ? "bg-blue-600 text-white"
              : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-blue-200 hover:bg-blue-50 dark:border-white/10 dark:bg-[#101d31] dark:text-slate-300 dark:hover:border-blue-400/40 dark:hover:bg-blue-400/10"
          }`}
        >
          {category}
        </button>

      ))}

    </div>
  );
}