import { DIGIDESK_SERVICE_MAP } from "./digidesk-service-catalog.ts";
import { resolveDigiDeskIntent } from "./intent-matcher.ts";
import type { DigiDeskService } from "./types.ts";

function getAppBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function buildCanonicalLink(route: string) {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}${route}`;
}

export function buildServiceGuide(message: string, service: DigiDeskService): string {
  const link = buildCanonicalLink(service.route);
  const related = service.relatedTools
    .map((toolId) => DIGIDESK_SERVICE_MAP[toolId]?.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  const steps = service.workflowSteps.map((step, index) => `${index + 1}. ${step}`).join("\n");

  return [
    `Bilkul! ${service.description.toLowerCase().startsWith("reduce") || service.description.toLowerCase().startsWith("combine") || service.description.toLowerCase().startsWith("divide") ? "Aap DigiDesk India ke " + service.name + " tool se directly is task ko complete kar sakte hain." : "Aap DigiDesk India ke " + service.name + " tool se is task ko easily complete kar sakte hain."}`,
    "",
    `🔗 ${service.name}`,
    `[Open DigiDesk ${service.name}](${link})`,
    "",
    `Purpose: ${service.description}`,
    "",
    "Process:",
    steps,
    "",
    `Requirements: ${service.requiresFileUpload ? `Upload ${service.supportedFileTypes?.join(", ") || "the required file"} file.` : "Check the service page requirements, documents, and eligibility details."}`,
    `Expected result: ${service.resultDescription}`,
    `Download: ${service.downloadDescription}`,
    related ? `Related: ${related}` : "",
    "",
    "Agar aapko kisi step mein problem ho, mujhe bataiye aur main specific guidance de dunga."
  ].filter(Boolean).join("\n");
}

export function buildClarificationGuide(message: string): string {
  const lower = message.toLowerCase();
  const isPdf = lower.includes("pdf");
  const isImage = lower.includes("image") || lower.includes("jpg") || lower.includes("png");
  const isGov = lower.includes("pan") || lower.includes("aadhaar") || lower.includes("passport") || lower.includes("csc") || lower.includes("government");

  const suggestions = [
    "Compress PDF",
    "Merge PDF",
    "Split PDF",
    "PDF to Word",
    "OCR PDF",
    "Sign PDF",
    "Redact PDF",
  ];

  if (isGov) {
    return "Bilkul. Aap kis government service ke baare mein help chahte hain? PAN Card, Aadhaar, Passport, Driving Licence, Voter ID, ya CSC service ke baare mein koi particular kaam bataiye. Main verified DigiDesk page ke saath guidance de dunga.";
  }

  if (isImage) {
    return "Bilkul. Image mein aap kya karna chahte hain? Compress Image, Convert Image, Remove Background, Passport Photo, ya kisi aur image task ke liye exact requirement bataiye.";
  }

  if (isPdf) {
    return `Bilkul. PDF mein kya karna hai? ${suggestions.join(", ")} mein se koi option bataiye. Main verified DigiDesk route ke saath exact steps de dunga.`;
  }

  return "Bilkul. Aapka request specific nahi hai. Kya aap PDF, image, government service, ya CSC service ke liye help chahte hain? Main DigiDesk ke verified tools ke according guidance de sakta hoon.";
}

export function buildServiceResponseForMessage(message: string): string {
  const intent = resolveDigiDeskIntent(message);

  if (intent) {
    return buildServiceGuide(message, intent.service);
  }

  return buildClarificationGuide(message);
}
