import MainLayout from "@/components/layout/MainLayout";
import StaticPage from "@/components/pages/StaticPage";

export default function PricingPage() {
  return (
    <MainLayout>
      <StaticPage
        eyebrow="Pricing"
        title="Simple, transparent support-first pricing"
        description="DigiDesk India is designed to keep service access easy, clear, and secure. Contact the team for customized support or bulk service needs."
        bullets={[
          "Best for single service requests, digital forms, and document support.",
          "Helpful for regular PDF, image, and government service tasks.",
          "Custom plans can be arranged for larger support requirements.",
        ]}
        primaryLabel="Contact Us"
        primaryHref="/contact"
        secondaryLabel="Explore Services"
        secondaryHref="/service"
      />
    </MainLayout>
  );
}
