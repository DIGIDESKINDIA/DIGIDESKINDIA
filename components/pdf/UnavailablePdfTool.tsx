type Props = { title: string; reason: string };

export default function UnavailablePdfTool({ title, reason }: Props) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-3xl">
        <div className="text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">DigiDesk PDF Tools</p><h1 className="mt-3 text-4xl font-black">{title}</h1><p className="mt-4 text-slate-600">This tool is not available in the current processing environment.</p></div>
        <div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center shadow-xl sm:p-8"><p className="font-semibold text-amber-900">{reason}</p></div>
      </section>
    </main>
  );
}
