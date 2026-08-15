"use client";

interface Props {
  documents: string[];
}

export default function ServiceDocuments({
  documents,
}: Props) {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-5">

        <h2 className="text-3xl font-bold">
          Required Documents
        </h2>

        <ul className="mt-8 space-y-4">
          {documents.map((doc) => (
            <li
              key={doc}
              className="rounded-xl border bg-white p-5"
            >
              ✅ {doc}
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}