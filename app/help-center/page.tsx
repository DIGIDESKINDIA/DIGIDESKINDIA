import MainLayout from "@/components/layout/MainLayout";
import StaticPage from "@/components/pages/StaticPage";

export default function HelpCenterPage() {
  return (
    <MainLayout>
      <StaticPage
        eyebrow="Help Center"
        title="Find answers faster with DigiDesk India support"
        description="Browse the most common support topics or use search to jump directly to the tool or service you need."
        bullets={[
          "Need help with PDF or image tools? Start from the tool page and check the built-in guidance.",
          "Looking for a government service? Search by service name or open the Government Services section.",
          "Manish AI can help explain forms, service steps, and document workflows when enabled.",
        ]}
        primaryLabel="Search Services"
        primaryHref="/search"
        secondaryLabel="Contact Us"
        secondaryHref="/contact"
      />
    </MainLayout>
  );
}
