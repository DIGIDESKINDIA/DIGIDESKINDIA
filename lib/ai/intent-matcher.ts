import { DIGIDESK_SERVICES } from "./digidesk-service-catalog.ts";
import type { ResolvedIntent } from "./types.ts";

const SYNONYM_MAP: Record<string, string> = {
  chhota: "compress",
  kam: "reduce",
  reduce: "reduce",
  compress: "compress",
  merge: "merge",
  combine: "merge",
  split: "split",
  divide: "split",
  word: "word",
  doc: "word",
  docx: "word",
  ocr: "ocr",
  sign: "sign",
  redact: "redact",
  protect: "protect",
  password: "protect",
  image: "image",
  photos: "image",
  passport: "passport",
  pan: "pan",
  aadhaar: "aadhaar",
  csc: "csc",
  jan: "csc",
  seva: "csc",
  form: "form",
  bharna: "form",
  bharein: "form",
  karna: "do",
  karni: "do",
  hai: "",
  ho: "",
  ka: "",
  ke: "",
  ki: "",
  ko: "",
  karke: "",
};

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandTerms(input: string) {
  const normalized = normalizeText(input);
  const tokens = normalized.split(" ").map((token) => SYNONYM_MAP[token] ?? token);
  return tokens.filter(Boolean).join(" ");
}

function matchesAlias(serviceText: string, alias: string) {
  const serviceNormalized = expandTerms(serviceText);
  const aliasExpanded = expandTerms(alias);
  const serviceTokens = serviceNormalized.split(" ").filter(Boolean);
  const aliasTokens = aliasExpanded.split(" ").filter(Boolean);

  if (!aliasTokens.length) return false;
  return aliasTokens.every((token) => serviceTokens.includes(token));
}

export function resolveDigiDeskIntent(message: string): ResolvedIntent | null {
  const cleaned = normalizeText(message);

  if (!cleaned) {
    return null;
  }

  let bestMatch: ResolvedIntent | null = null;

  for (const service of DIGIDESK_SERVICES) {
    for (const alias of service.aliases) {
      if (matchesAlias(cleaned, alias)) {
        const serviceText = expandTerms(cleaned);
        const aliasExpanded = expandTerms(alias);
        const overlap = aliasExpanded.split(" ").filter(Boolean).length;
        const score = overlap + (serviceText.includes(aliasExpanded) ? 1 : 0);

        if (!bestMatch || score > bestMatch.confidence) {
          bestMatch = {
            serviceId: service.id,
            service,
            matchText: alias,
            confidence: score,
          };
        }
      }
    }
  }

  return bestMatch;
}
