import MainLayout from "@/components/layout/MainLayout";
import StaticPage from "@/components/pages/StaticPage";

export default function ContactPage() {
  return (
    <MainLayout>
      <StaticPage
        eyebrow="Contact Us"
        title="Talk to DigiDesk India Support"
        description="Reach the DigiDesk India team for service guidance, document help, account support, and digital assistance."
        bullets={[
          "Phone support for service guidance and order follow-up.",
          "Email support for document, payment, and account questions.",
          "Local support for CSC-style digital service workflows.",
        ]}
        primaryLabel="Open Help Center"
        primaryHref="/help-center"
        secondaryLabel="Go to Search"
        secondaryHref="/search"
      />
    </MainLayout>
  );
}
