import MainLayout from "@/components/layout/MainLayout";

export default function AIPage() {
  return (
    <MainLayout>
      <main className="min-h-screen bg-slate-50 dark:bg-[#050B18]">
        <section className="mx-auto max-w-7xl px-5 py-24">
          <div className="rounded-[32px] border border-slate-200 bg-white p-10 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-[0_24px_60px_rgba(2,6,23,0.35)]">
            <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 dark:border dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-100">
              AI Assistant
            </span>

            <h1 className="mt-6 text-5xl font-black text-slate-900 dark:text-white">
              Manish AI
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Your intelligent assistant for Government Services, PDF tools, image tools and everyday digital workflows.
            </p>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}