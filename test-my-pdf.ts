import fs from "fs";
import { pdfToWord } from "./lib/pdf/pdf-to-word.js";
import path from "path";

async function run() {
  console.log("Starting test...");
  const pdfPath = "D:/New folder/ViewDocument.pdf";
  const buffer = fs.readFileSync(pdfPath);
  
  console.log(`Loaded PDF: ${buffer.length} bytes`);
  
  try {
    const result = await pdfToWord({
      file: {
        name: "ViewDocument.pdf",
        size: buffer.length,
        type: "application/pdf",
        buffer: new Uint8Array(buffer),
      },
      mode: "digital", // or 'scanned'
      language: "eng",
      noPageBreaks: false,
      addBorders: true
    });
    
    if (result.success && result.docx) {
      const outPath = path.join(process.cwd(), "ViewDocument_output.docx");
      fs.writeFileSync(outPath, Buffer.from(result.docx));
      console.log(`Success! Saved to ${outPath}`);
      console.log(result.metadata);
    } else {
      console.error("Conversion failed:", result.message);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
