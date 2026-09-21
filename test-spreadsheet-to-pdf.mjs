import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as fs from "fs";

async function testSpreadsheetToPdf() {
  try {
    console.log("Reading test Excel file...");
    const fileBuffer = fs.readFileSync('test-excel.xlsx');
    const input = new Uint8Array(fileBuffer);
    
    console.log("Parsing workbook...");
    const workbook = XLSX.read(input, { type: "array" });
    console.log("Sheet names:", workbook.SheetNames);
    
    console.log("Creating PDF...");
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
    
    console.log("Saving PDF...");
    const pdfBytes = await pdf.save();
    fs.writeFileSync('test-spreadsheet.pdf', pdfBytes);
    console.log("Success! PDF saved to test-spreadsheet.pdf");
    console.log("PDF size:", pdfBytes.length);
    
  } catch (error) {
    console.error("Error:", error.message);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
  }
}

testSpreadsheetToPdf();
