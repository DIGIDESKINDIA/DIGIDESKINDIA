import fs from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';

async function test() {
  try {
    console.log("Creating PDF document...");
    const pdf = await PDFDocument.create();
    
    console.log("Adding page...");
    const page = pdf.addPage([595, 842]);
    
    console.log("Embedding Helvetica font...");
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    
    console.log("Drawing text...");
    page.drawText("Test", { x: 100, y: 700, size: 12, font });
    
    console.log("Saving PDF...");
    const bytes = await pdf.save();
    
    console.log("Success! PDF size:", bytes.length);
    
    // Save to file
    fs.writeFileSync('test-pdf-lib.pdf', bytes);
    console.log("PDF saved to test-pdf-lib.pdf");
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Full error:", error);
  }
}

test();
