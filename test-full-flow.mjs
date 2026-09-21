import * as fs from "fs";
import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

async function spreadsheetToPdf(input) {
  const workbook = XLSX.read(input, { type: "array" });
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
    const page = pdf.addPage([595, 842]);
    const { height } = page.getSize();
    let y = height - 45;
    page.drawText(sheetName, { x: 36, y, size: 15, font: boldFont, color: rgb(0.05, 0.2, 0.5) });
    y -= 30;

    for (const row of rows) {
      if (y < 36) break;
      const text = row.map((cell) => String(cell ?? "").replace(/\s+/g, " ")).join(" | ");
      page.drawText(text.slice(0, 125), { x: 36, y, size: 8, font, color: rgb(0.1, 0.1, 0.1), maxWidth: 523 });
      y -= 14;
    }
  }

  if (!pdf.getPageCount()) pdf.addPage([595, 842]);
  return await pdf.save();
}

async function test() {
  try {
    console.log("Reading file from disk...");
    const uploadPath = "test-excel.xlsx";
    const fileBuffer = await fs.promises.readFile(uploadPath);
    console.log("File buffer type:", fileBuffer.constructor.name);
    console.log("File buffer size:", fileBuffer.length);
    
    console.log("Converting Uint8Array...");
    const uint8 = new Uint8Array(fileBuffer);
    console.log("Uint8Array size:", uint8.length);
    
    console.log("Calling spreadsheetToPdf...");
    const result = await spreadsheetToPdf(uint8);
    console.log("Result type:", result.constructor.name);
    console.log("Result size:", result.length);
    
    fs.writeFileSync("test-final.pdf", result);
    console.log("SUCCESS! PDF saved to test-final.pdf");
  } catch (error) {
    console.error("ERROR:", error.message);
    console.error("Stack:", error instanceof Error ? error.stack : "");
  }
}

test();
