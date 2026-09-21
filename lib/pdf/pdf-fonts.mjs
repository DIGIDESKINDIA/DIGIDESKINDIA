import { StandardFonts } from "pdf-lib";

const SOURCE_FONT_ALIASES = [
  ["helvetica-boldoblique", StandardFonts.HelveticaBoldOblique],
  ["helvetica-bold", StandardFonts.HelveticaBold],
  ["helvetica-oblique", StandardFonts.HelveticaOblique],
  ["helvetica", StandardFonts.Helvetica],
  ["times-bolditalic", StandardFonts.TimesRomanBoldItalic],
  ["times-bold", StandardFonts.TimesRomanBold],
  ["times-italic", StandardFonts.TimesRomanItalic],
  ["times", StandardFonts.TimesRoman],
  ["courier-boldoblique", StandardFonts.CourierBoldOblique],
  ["courier-bold", StandardFonts.CourierBold],
  ["courier-oblique", StandardFonts.CourierOblique],
  ["courier", StandardFonts.Courier],
];

export function containsNonLatin(value = "") {
  return /[^\u0000-\u024f\u1e00-\u1eff\u2000-\u206f\u20a0-\u20cf\u2100-\u214f\s]/u.test(value);
}

function normalizeFontName(fontName = "") {
  return String(fontName)
    .replace(/^[A-Z0-9]{3,8}\+/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function resolvePdfFontStyle(fontName = "Helvetica", style = {}, fallbackFamily = "Helvetica") {
  const normalized = normalizeFontName(fontName || fallbackFamily || "Helvetica");
  const weightSource = typeof style?.fontWeight === "string" ? style.fontWeight : "";
  const italicSource = Boolean(style?.italic) || /italic|oblique|slanted/.test(normalized);
  const hasBold = /bold|black|demi|heavy/.test(normalized) || /bold|black|demi|heavy/.test(String(weightSource || "").toLowerCase());
  const isItalic = italicSource || /italic|oblique/.test(String(style?.fontStyle ?? "").toLowerCase());

  let fontFamily = fallbackFamily || "Helvetica";
  if (/times|timesnewroman/.test(normalized)) fontFamily = "Times-Roman";
  else if (/courier/.test(normalized)) fontFamily = "Courier";
  else if (/arial|helvetica|noto sans|liberation sans|dejavu sans|roboto/.test(normalized)) fontFamily = "Helvetica";
  else if (typeof style?.fontFamily === "string" && style.fontFamily) fontFamily = style.fontFamily;

  return {
    fontFamily,
    fontWeight: hasBold ? "bold" : "normal",
    italic: isItalic,
  };
}

export function resolveSourceFont({ sourceFontName, fontFamily, fontWeight, italic } = {}) {
  const normalized = normalizeFontName(sourceFontName || fontFamily || "Helvetica");
  const exactMatch = SOURCE_FONT_ALIASES.find(([alias]) => normalized.includes(alias));
  if (exactMatch) return exactMatch[1];

  const hasBold = fontWeight === "bold" || /bold|black|demi|heavy/.test(normalized);
  const hasItalic = Boolean(italic) || /italic|oblique|slanted/.test(normalized);
  const familyHint = normalizeFontName(fontFamily || normalized || "Helvetica");

  if (/times|timesnewroman/.test(familyHint)) {
    if (hasBold && hasItalic) return StandardFonts.TimesRomanBoldItalic;
    if (hasBold) return StandardFonts.TimesRomanBold;
    if (hasItalic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }

  if (/courier/.test(familyHint)) {
    if (hasBold && hasItalic) return StandardFonts.CourierBoldOblique;
    if (hasBold) return StandardFonts.CourierBold;
    if (hasItalic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }

  if (hasBold && hasItalic) return StandardFonts.HelveticaBoldOblique;
  if (hasBold) return StandardFonts.HelveticaBold;
  if (hasItalic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

export function matchStandardFont(fontName = "Helvetica", { bold = false, italic = false } = {}) {
  const normalized = normalizeFontName(fontName || "Helvetica");
  const hasBold = bold || /bold|black|demi|heavy/.test(normalized);
  const hasItalic = italic || /italic|oblique|slanted/.test(normalized);

  if (/(times|timesnewroman)/.test(normalized)) {
    if (hasBold && hasItalic) return StandardFonts.TimesRomanBoldItalic;
    if (hasBold) return StandardFonts.TimesRomanBold;
    if (hasItalic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }

  if (/courier/.test(normalized)) {
    if (hasBold && hasItalic) return StandardFonts.CourierBoldOblique;
    if (hasBold) return StandardFonts.CourierBold;
    if (hasItalic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }

  if (hasBold && hasItalic) return StandardFonts.HelveticaBoldOblique;
  if (hasBold) return StandardFonts.HelveticaBold;
  if (hasItalic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

export async function embedEditorFont(pdfDoc, element, { baseUrl = "" } = {}) {
  const style = element?.sourceStyle ?? element;
  const value = String(style?.currentText ?? style?.text ?? style?.originalText ?? "");
  if (containsNonLatin(value)) {
    const response = await fetch(`${baseUrl}/fonts/NotoSansDevanagari.ttf`);
    if (!response.ok) throw new Error("Hindi text needs the bundled Devanagari font, which could not be loaded.");
    const fontBytes = new Uint8Array(await response.arrayBuffer());
    await import("regenerator-runtime/runtime.js");
    if (typeof globalThis.regeneratorRuntime === "undefined") {
      globalThis.regeneratorRuntime = (await import("regenerator-runtime")).default;
    }
    const { default: fontkit } = await import("@pdf-lib/fontkit");
    pdfDoc.registerFontkit(fontkit);
    return pdfDoc.embedFont(fontBytes, { subset: true });
  }

  return pdfDoc.embedFont(resolveSourceFont({
    sourceFontName: style?.sourceFontName ?? style?.fontName,
    fontFamily: style?.fontFamily ?? style?.fontName,
    fontWeight: style?.fontWeight ?? "normal",
    italic: Boolean(style?.italic),
  }));
}
