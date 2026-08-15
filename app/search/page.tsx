// File: app/search/page.tsx

import { searchAll } from "@/lib/search/engine";
import SearchResults from "@/components/search/SearchResults";
import MainLayout from "@/components/layout/MainLayout";

type Props = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({
  searchParams,
}: Props) {
  const params = await searchParams;

  const query = params.q ?? "";

  const response = searchAll(query);

  return (
    <MainLayout>
      <main className="min-h-screen bg-slate-50 dark:bg-[#050B18]">

        <section className="border-b bg-white dark:border-white/10 dark:bg-[#081225]">

          <div className="mx-auto max-w-7xl px-6 py-10">

            <h1 className="text-4xl font-black text-slate-900 dark:text-white">

              Search Everything

            </h1>

            <p className="mt-3 text-slate-600 dark:text-slate-300">

              Search Government Services, PDF Tools,
              Image Studio, AI Studio, Jobs,
              Education and more.

            </p>

          </div>

        </section>

        <SearchResults
          query={query}
          response={response}
        />

      </main>
    </MainLayout>
  );
}