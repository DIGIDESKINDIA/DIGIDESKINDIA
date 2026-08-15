import { notFound } from "next/navigation";
import { governmentServices } from "@/data/government";

import ServiceHero from "@/components/government/ServiceHero";
import ServiceOverview from "@/components/government/ServiceOverview";
import ServiceDocuments from "@/components/government/ServiceDocuments";
import ServiceEligibility from "@/components/government/ServiceEligibility";
import ServiceFees from "@/components/government/ServiceFees";
import ApplyNow from "@/components/government/ApplyNow";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function Page({
  params,
}: Props) {
  const { slug } = await params;

  const service = governmentServices.find(
    (item) => item.slug === slug
  );

  if (!service) {
    notFound();
  }

  return (
    <main className="bg-slate-50">

      <ServiceHero
        title={service.title}
        description={service.description}
      />

      <ServiceOverview
        description={service.description}
        processingTime={service.processingTime}
      />

      <ServiceDocuments
        documents={service.documents}
      />

      <ServiceEligibility
        eligibility={service.eligibility}
      />

      <ServiceFees
        service={{
          fees: `${service.governmentFee} + ${service.serviceCharge}`,
          processingTime: service.processingTime,
        }}
      />

      <ApplyNow />

    </main>
  );
}