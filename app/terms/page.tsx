import MainLayout from "@/components/layout/MainLayout";
import StaticPage from "@/components/pages/StaticPage";

export default function TermsPage() {
  return (
    <MainLayout>
      <StaticPage
        eyebrow="Terms & Conditions"
        title="Terms for using DigiDesk India"
        description="These terms describe how the platform is intended to be used for digital services, document processing, and support features."
        bullets={[
          "Use the platform only for lawful service requests and content.",
          "Do not upload content you do not have the right to use.",
          "Service availability may vary by route, document type, and runtime support.",
        ]}
        primaryLabel="Privacy Policy"
        primaryHref="/privacy-policy"
        secondaryLabel="Refund Policy"
        secondaryHref="/refund-policy"
      />
    </MainLayout>
  );
}
