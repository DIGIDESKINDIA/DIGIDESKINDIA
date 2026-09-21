import MainLayout from "@/components/layout/MainLayout";

import PdfStats from "@/components/pdf/PdfStats";
import PdfGrid from "@/components/pdf/PdfGrid";

export default function PDFToolsPage() {
  return (
    <MainLayout>

      <PdfGrid />

      <PdfStats />

    </MainLayout>
  );
}