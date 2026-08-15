import MainLayout from "@/components/layout/MainLayout";
import StaticPage from "@/components/pages/StaticPage";

export default function RefundPolicyPage() {
  return (
    <MainLayout>
      <StaticPage
        eyebrow="Refund Policy"
        title="Refund guidance for DigiDesk India services"
        description="Refund handling depends on the specific service request, processing stage, and support outcome. Contact the team if you need help reviewing a transaction."
        bullets={[
          "Requests that have not entered processing can be reviewed for refund eligibility.",
          "Completed document work or delivered services may be non-refundable.",
          "Support can help you verify the status of any service request.",
        ]}
        primaryLabel="Contact Us"
        primaryHref="/contact"
        secondaryLabel="Help Center"
        secondaryHref="/help-center"
      />
    </MainLayout>
  );
}
