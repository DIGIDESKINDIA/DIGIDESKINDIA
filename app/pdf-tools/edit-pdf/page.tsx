"use client";

import dynamic from "next/dynamic";

const EditPdfTool = dynamic(() => import("@/components/pdf/EditPdfTool"), {
	ssr: false,
	loading: () => <div className="min-h-screen bg-[#f3f6fb]" />,
});

export default function EditPdfPage() {
	return <EditPdfTool />;
}
