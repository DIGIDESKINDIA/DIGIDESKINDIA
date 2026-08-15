import MainLayout from "@/components/layout/MainLayout";

import PdfHero from "@/components/pdf/PdfHero";
import PdfStats from "@/components/pdf/PdfStats";
import PdfGrid from "@/components/pdf/PdfGrid";

export default function PDFToolsPage() {
  return (
    <MainLayout>

      <PdfHero />

      <PdfStats />

      <PdfGrid />

    </MainLayout>
  );
}