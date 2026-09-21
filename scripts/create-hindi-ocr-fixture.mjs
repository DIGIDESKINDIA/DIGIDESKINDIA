import fs from "node:fs";
import path from "node:path";
import canvasPackage from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";

const { GlobalFonts, createCanvas } = canvasPackage;
const root = process.cwd();
const fontPath = path.join(root, "lib", "pdf", "fonts", "NotoSansDevanagari.ttf");
const outputPng = path.join(root, "storage", "fixtures", "hindi-ocr-acceptance.png");
const outputPdf = path.join(root, "storage", "fixtures", "hindi-ocr-acceptance.pdf");

if (!fs.existsSync(fontPath)) throw new Error(`Missing bundled Devanagari font: ${fontPath}`);
if (!GlobalFonts.registerFromPath(fontPath, "Noto Sans Devanagari")) throw new Error("Could not register bundled Devanagari font");

const canvas = createCanvas(1800, 1200);
const context = canvas.getContext("2d");
context.fillStyle = "white";
context.fillRect(0, 0, canvas.width, canvas.height);
context.fillStyle = "black";
context.textBaseline = "top";
context.font = "bold 112px Noto Sans Devanagari";
context.fillText("मेरा नाम मनीष है", 90, 100);
context.fillText("यह हिंदी OCR परीक्षण है", 90, 280);
context.fillText("उत्तर प्रदेश", 90, 460);
context.fillText("राशि ₹16,785", 90, 640);
context.font = "bold 92px Arial";
context.fillText("Hindi + English OCR Test", 90, 830);
context.fillText("Digital Desk India", 90, 980);

fs.mkdirSync(path.dirname(outputPng), { recursive: true });
const png = canvas.toBuffer("image/png");
fs.writeFileSync(outputPng, png);

const pdf = await PDFDocument.create();
const page = pdf.addPage([canvas.width, canvas.height]);
const image = await pdf.embedPng(png);
page.drawImage(image, { x: 0, y: 0, width: canvas.width, height: canvas.height });
fs.writeFileSync(outputPdf, await pdf.save());
console.log(JSON.stringify({ outputPng, outputPdf, width: canvas.width, height: canvas.height, fontPath }));
