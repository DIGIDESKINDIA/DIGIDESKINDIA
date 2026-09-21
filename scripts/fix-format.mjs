import fs from "fs";
let s = fs.readFileSync("lib/pdf/pdf-to-word.ts", "utf8");
const CR = "\r";
const LF = "\n";
const CRLF = CR + LF;

// Build the old/new strings with actual CRLF
const old1 =
  `interface RunSpec {` + CRLF +
  `  text: string;` + CRLF +
  `  bold?: boolean;` + CRLF +
  `  italics?: boolean;` + CRLF +
  `  sizePt?: number;` + CRLF +
  `}` + CRLF +
  CRLF +
  `function runXml(run: RunSpec): string {` + CRLF +
  `  const props: string[] = [];` + CRLF +
  `  if (run.bold) props.push('<w:b/><w:bCs/>');` + CRLF +
  `  if (run.italics) props.push('<w:i/><w:iCs/>');` + CRLF +
  `  if (run.sizePt) {` + CRLF +
  `    const half = Math.round(run.sizePt * 2);` + CRLF +
  "    props.push(`<w:sz w:val=\"${half}\"/><w:szCs w:val=\"${half}\"/>`);" + CRLF +
  `  }` + CRLF +
  `  const rPr =` + CRLF +
  "    props.length > 0 ? `<w:rPr>${props.join(\"\")}</w:rPr>` : \"\";" + CRLF +
  "  return `<w:r>${rPr}<w:t xml:space=\"preserve\">${xmlEscape(run.text)}</w:t></w:r>`;" + CRLF +
  `}`;

const new1 =
  `interface RunSpec {` + CRLF +
  `  text: string;` + CRLF +
  `  bold?: boolean;` + CRLF +
  `  italics?: boolean;` + CRLF +
  `  underline?: boolean;` + CRLF +
  `  sizePt?: number;` + CRLF +
  `  family?: string;` + CRLF +
  `}` + CRLF +
  CRLF +
  `function runXml(run: RunSpec): string {` + CRLF +
  `  const props: string[] = [];` + CRLF +
  `  if (run.bold) props.push('<w:b/><w:bCs/>');` + CRLF +
  `  if (run.italics) props.push('<w:i/><w:iCs/>');` + CRLF +
  `  if (run.underline) props.push('<w:u w:val="single"/>');` + CRLF +
  `  if (run.sizePt) {` + CRLF +
  `    const half = Math.round(run.sizePt * 2);` + CRLF +
  "    props.push(`<w:sz w:val=\"${half}\"/><w:szCs w:val=\"${half}\"/>`);" + CRLF +
  `  }` + CRLF +
  `  if (run.family) {` + CRLF +
  `    const f = xmlEscape(run.family);` + CRLF +
  "    props.push(" + CRLF +
  "      `<w:rFonts w:ascii=\"${f}\" w:hAnsi=\"${f}\" w:cs=\"${f}\" w:eastAsia=\"${f}\"/>`" + CRLF +
  `    );` + CRLF +
  `  }` + CRLF +
  `  const rPr =` + CRLF +
  "    props.length > 0 ? `<w:rPr>${props.join(\"\")}</w:rPr>` : \"\";" + CRLF +
  "  return `<w:r>${rPr}<w:t xml:space=\"preserve\">${xmlEscape(run.text)}</w:t></w:r>`;" + CRLF +
  `}`;

if (s.includes(old1)) {
  s = s.replace(old1, new1);
  console.log("replaced runXml");
} else {
  console.log("old1 not found");
  // Try to find what's different
  const idx = s.indexOf("interface RunSpec");
  const slice = s.slice(idx, idx + 200);
  console.log("actual bytes:", Buffer.from(slice).toString("hex").slice(0, 200));
}

fs.writeFileSync("lib/pdf/pdf-to-word.ts", s);
console.log("done, len=", s.length);
