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
    <div className="mb-12 flex flex-wrap justify-center gap-3">

      {categories.map((category) => (

        <button
          key={category}
          onClick={() => onChange(category)}
          className={`rounded-full px-6 py-3 font-semibold transition ${
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