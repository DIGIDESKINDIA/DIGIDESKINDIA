import MainLayout from "@/components/layout/MainLayout";
import StaticPage from "@/components/pages/StaticPage";

export default function PrivacyPolicyPage() {
  return (
    <MainLayout>
      <StaticPage
        eyebrow="Privacy Policy"
        title="How DigiDesk India handles your information"
        description="We keep data handling focused on service delivery, secure processing, and support. We do not sell your personal information."
        bullets={[
          "Information is used only to process the services you request.",
          "Sensitive files are handled with secure server-side processing.",
          "Support requests are used only to respond to your inquiry.",
        ]}
        primaryLabel="Contact Support"
        primaryHref="/contact"
        secondaryLabel="Help Center"
        secondaryHref="/help-center"
      />
    </MainLayout>
  );
}
