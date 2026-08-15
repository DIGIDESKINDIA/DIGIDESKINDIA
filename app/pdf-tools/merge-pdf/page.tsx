import MergePdfTool from "@/components/pdf/MergePdfTool";

export default function MergePDFPage() {
  return (
    <main className="min-h-screen bg-slate-100 py-20">

      <div className="mx-auto max-w-6xl px-5">

        <h1 className="mb-10 text-center text-5xl font-black">
          Merge PDF
        </h1>

        <MergePdfTool />

      </div>

    </main>
  );
}