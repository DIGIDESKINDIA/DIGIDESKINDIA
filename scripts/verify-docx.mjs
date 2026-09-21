import fs from "fs";
import JSZip from "jszip";

const zip = await JSZip.loadAsync(
  fs.readFileSync("storage/pdf-to-word-standard.docx")
);
const xml = await zip.file("word/document.xml").async("string");

const breaks = xml.split('w:br w:type="page"').length - 1;
const paras = xml.split("<w:p>").length - 1;
const h1 = xml.split('w:val="Heading1"').length - 1;
const h2 = xml.split('w:val="Heading2"').length - 1;
const h3 = xml.split('w:val="Heading3"').length - 1;

console.log({
  pageBreaks: breaks,
  bodyParagraphs: paras,
  heading1: h1,
  heading2: h2,
  heading3: h3,
});