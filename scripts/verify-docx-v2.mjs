// Regression verification for the PDF->Word converter output.
// Usage: node scripts/verify-docx-v2.mjs [docxPath]
import fs from "fs";
import path from "path";
import JSZip from "jszip";

const docxPath =
  process.argv[2] ?? "storage/fixtures/ViewDocument_v2.docx";

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
};

const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));

// ---- package integrity ----
const requiredParts = [
  "[Content_Types].xml",
  "_rels/.rels",
  "word/document.xml",
  "word/_rels/document.xml.rels",
  "word/styles.xml",
];
for (const part of requiredParts) {
  check(`part present: ${part}`, zip.file(part) != null);
}

const docXml = await zip.file("word/document.xml").async("string");

// ---- XML well-formed (tag balance with exact tag matching) ----
const pair = (tag) => {
  const open = (docXml.match(new RegExp(`<${tag}[ >]`, "g")) ?? []).length;
  // self-closing with optional attributes: <tag/> or <tag a="b"/>
  const selfClose = (
    docXml.match(new RegExp(`<${tag}(?: [^>]*)?/>`, "g")) ?? []
  ).length;
  const close = (docXml.match(new RegExp(`</${tag}>`, "g")) ?? []).length;
  // open already includes self-closing forms, so subtract them
  return open - selfClose === close;
};
const wellFormed =
  pair("w:p") && pair("w:tbl") && pair("w:tr") && pair("w:tc") &&
  pair("w:r") && pair("w:t") && pair("w:body") && pair("w:document") &&
  pair("w:tblGrid") && pair("w:gridCol");
check("document.xml is well-formed (tag balance)", wellFormed);

// ---- invalid XML entities ----
const badEntities = docXml.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)[^;\s]{0,10};/g) ?? [];
check("no invalid XML entities", badEntities.length === 0, badEntities.slice(0, 5).join(" | "));

// ---- structure counts ----
const count = (re) => (docXml.match(re) ?? []).length;
const pageBreaks = count(/<w:br w:type="page"\/>/g);
const tables = count(/<w:tbl>/g);
const images = count(/<pic:pic /g);
const paragraphs = count(/<w:p[ >]/g) - count(/<w:pPr>/g) * 0;

check("page breaks == 42 (43 source pages)", pageBreaks === 42, `breaks=${pageBreaks}`);
check("tables reconstructed as native w:tbl", tables >= 3, `tables=${tables}`);
check("image regions embedded", images >= 3, `images=${images}`);

// ---- text content checks ----
const text = docXml
  .replace(/<[^>]+>/g, "\n")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const mustContain = [
  "PROJECT REPORT",
  "UNIWEST HUB",
  "CHAPTER 1: PROJECT DESCRIPTION",
  "Project in a Nut Shell",
  "1.2 : Contact Information:",
  "Location Map",
  "1.5: Projected Cost of the Project:",
  "1.88: Floor Wise Activity Breakup:",
];
for (const needle of mustContain) {
  check(`text present: "${needle}"`, text.includes(needle));
}

// "Proposed" must not be systematically truncated to "roposed"
const proposedCount = (text.match(/Proposed/g) ?? []).length;
const orphanRoposed = (text.match(/(?<![Pp])roposed/g) ?? []).length;
check(
  '"Proposed" intact, not truncated',
  proposedCount >= 5 && orphanRoposed <= proposedCount * 0.1,
  `Proposed=${proposedCount} orphan-roposed=${orphanRoposed}`
);

// ---- table content spot checks (verified against the source PDF
//      text layer - these strings exist in the fixture) ----
const tblChecks = [
  // "Project in a Nut Shell" table rows
  ["Nut Shell row: project name", "Project Name"],
  ["Nut Shell row: parking", "Car parking Details"],
  // user-reported corruption: must read "...proposed is Nos. 114"
  ["parking count intact", "proposed is Nos. 114"],
  ["water supply row", "Water supply from Bore well"],
  // equipment tables (ruled, reconstructed natively)
  ["pump table", "Twin lobe blowers"],
  ["material column", "Material of Construction"],
];
for (const [name, needle] of tblChecks) {
  check(`table text present: "${needle}" (${name})`, text.includes(needle));
}

// ---- report ----
let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? "  [" + r.detail + "]" : ""}`);
  if (!r.pass) failed++;
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);

// ---- page estimate: rough visual page estimate from content volume ----
const charsPerPage = 1800; // crude density at 11pt on A4
const estPages =
  Math.ceil(text.replace(/\s+/g, " ").length / charsPerPage) + images;
console.log(
  `structure: breaks=${pageBreaks} tables=${tables} images=${images} paras=${paragraphs} estVisualPages~${estPages}`
);

process.exit(failed ? 1 : 0);
