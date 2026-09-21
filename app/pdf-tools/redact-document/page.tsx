import type { Metadata } from "next";

import RedactDocumentToolClient from "@/components/pdf/RedactDocumentToolClient";

export const metadata: Metadata = {
  title: "Redact PDF Online – Permanently Hide Sensitive Information | DigiDesk India",
  description:
    "Redact sensitive information from PDF documents with DigiDesk India. Permanently hide confidential text, personal information and document regions.",
};

export default function RedactDocumentPage() {
  return <RedactDocumentToolClient />;
}
