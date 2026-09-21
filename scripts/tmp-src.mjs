import fs from "fs";
const p = "lib/pdf/pdf-to-word.ts";
const s = fs.readFileSync(p, "utf8");

const fmIdx = s.indexOf("Font mapping");
const sanIdx = s.indexOf("function sanitizeText");
const startIdx = s.lastIndexOf("/*", fmIdx);
// find the closing */ of the comment block just before sanitizeText
let endIdx = s.lastIndexOf("*/", sanIdx);
if (endIdx === -1 || endIdx < startIdx) {
  console.log("boundary error", startIdx, endIdx, sanIdx);
  process.exit(1);
}
endIdx += 2; // include the */

const before = s.slice(0, startIdx);
const after = s.slice(endIdx);
const clean = [
  "/* ==========================================================",
  "   Font mapping: PDF base-font name -> Word font family,",
  "   with bold/italic flags detected from the font name and",
  "   real PDF font flags. Makes output resemble the source.",
  "   ========================================================== */",
  "",
  "function stripSubsetPrefix(name: string): string {",
  '  return name && name.length > 7 && name[6] === "+" ? name.slice(7) : name;',
  "}",
  "",
  "function mapFontFamily(baseFont: string): string {",
  '  const name = stripSubsetPrefix(baseFont).toLowerCase();',
  '  if (/times-new-roman|times$|times-new/.test(name)) return "Times New Roman";',
  '  if (/arial|helvetica/.test(name)) return "Arial";',
  '  if (/calibri/.test(name)) return "Calibri";',
  '  if (/courier/.test(name)) return "Courier New";',
  '  if (/georgia/.test(name)) return "Georgia";',
  '  if (/cambria/.test(name)) return "Cambria";',
  '  if (/MT$|Text$|Pro$/.test(name) && !/serif|san|futura|avant|grotesque/.test(name)) return "Arial";',
  '  if (/serif/.test(name)) return "Times New Roman";',
  '  return "Times New Roman";',
  "}",
  "",
  "function isBoldFontName(name: string): boolean {",
  "  const n = stripSubsetPrefix(name).toLowerCase();",
  '  return /bold|black|heavy|semibold|demi/.test(n) && !/light|thin|regular/.test(n);',
  "}",
  "",
  "function isItalicFontName(name: string): boolean {",
  "  return /italic|oblique/.test(stripSubsetPrefix(name).toLowerCase());",
  "}",
  "",
  "interface FontMeta { family: string; bold: boolean; italic: boolean; }",
  "",
  "function resolveFontMeta(",
  "  fontNames: string[],",
  "  fontFlags: Record<string, { bold?: boolean; italic?: boolean }> | { bold?: boolean; italic?: boolean }[]",
  "): FontMeta {",
  '  const counts: Record<string, number> = Object.create(null);',
  "  for (const f of fontNames) {",
  '    const n = f ? stripSubsetPrefix(f) : "";',
  "    counts[n] = (counts[n] ?? 0) + 1;",
  "  }",
  "  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);",
  '  const dominant = entries[0]?.[0];',
  '  if (!dominant) return { family: "Times New Roman", bold: false, italic: false };',
  "  const mapped = mapFontFamily(dominant);",
  "  let flags: { bold?: boolean; italic?: boolean } = {};",
  "  if (Array.isArray(fontFlags)) {",
  "    flags = fontFlags.find((f) => f && f.bold) ?? {};",
  "  } else {",
  "    flags = fontFlags[dominant] ?? fontFlags[stripSubsetPrefix(dominant)] ?? {};",
  "  }",
  "  return {",
  "    family: mapped,",
  "    bold: isBoldFontName(dominant) || !!flags.bold,",
  "    italic: isItalicFontName(dominant) || !!flags.italic,",
  "  };",
  "}",
  "",
  "/* ==========================================================",
  "   Text sanitization",
  "   ========================================================== */",
  "",
].join("\r\n");

fs.writeFileSync(p, before + clean + after);
console.log("repaired OK; removed bytes", endIdx - startIdx, "wrote", clean.length);


