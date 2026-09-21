import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import { extractPageLayout, extractRowsFromTokens } from "../lib/pdf/pdf-to-excel-extractor";

type Token = { str: string; x: number; y: number; width: number; height: number };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function createReferencePdf(filePath: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([720, 520]);
  const columns = [40, 140, 300, 350, 450, 545];
  const headers = ["Item #", "Description", "Qty", "Unit price", "Discount", "Price"];
  const rows = [
    ["A875", "Peonies", "35", "$1.05", "", "$36.75"],
    ["K245", "Tulips", "25", "$2.00", "", "$50.00"],
    ["U123", "Buttercup", "30", "$1.35", "", "$40.50"],
  ];

  headers.forEach((value, index) => page.drawText(value, { x: columns[index], y: 445, size: 12, font: bold, color: rgb(0, 0, 0) }));
  rows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (value) page.drawText(value, { x: columns[columnIndex], y: 410 - rowIndex * 28, size: 11, font, color: rgb(0, 0, 0) });
    });
  });

  await fs.writeFile(filePath, Buffer.from(await pdf.save()));
}

async function extractPdfTokens(filePath: string): Promise<Token[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const standardFontDataUrl = pathToFileURL(
    `${path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts")}${path.sep}`
  ).toString();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(filePath)), standardFontDataUrl }).promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();

  return content.items
    .filter((item) => "str" in item && typeof item.str === "string" && item.str.trim())
    .map((item) => {
      const textItem = item as { str: string; transform: number[]; width?: number; height?: number };
      return {
        str: textItem.str,
        x: Number(textItem.transform[4]),
        y: Number(textItem.transform[5]),
        width: Number(textItem.width ?? 0),
        height: Number(textItem.height ?? 11),
      };
    });
}

async function main() {
  const fixture = path.join(process.cwd(), "tmp-pdf-to-excel-reference.pdf");
  await createReferencePdf(fixture);

  try {
    const tokens = await extractPdfTokens(fixture);
    const extraction = extractRowsFromTokens(tokens);
    const expected = [
      ["Item #", "Description", "Qty", "Unit price", "Discount", "Price"],
      ["A875", "Peonies", "35", "$1.05", "", "$36.75"],
      ["K245", "Tulips", "25", "$2.00", "", "$50.00"],
      ["U123", "Buttercup", "30", "$1.35", "", "$40.50"],
    ];

    for (let rowIndex = 0; rowIndex < expected.length; rowIndex += 1) {
      assert(JSON.stringify(extraction.rows[rowIndex]) === JSON.stringify(expected[rowIndex]), `Unexpected row ${rowIndex}: ${JSON.stringify(extraction.rows[rowIndex])}`);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(extraction.rows), "Extracted Data");
    const roundTrip = XLSX.read(XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }), { type: "buffer" });
    const values = XLSX.utils.sheet_to_json(roundTrip.Sheets["Extracted Data"], { header: 1, defval: "" }) as string[][];

    assert(values[1][4] === "", "Discount cell was collapsed or populated unexpectedly");
    assert(values[1][5] === "$36.75", "Price shifted into the Discount column");
    assert(values[3][5] === "$40.50", "Final row price was not preserved");
    assert(extraction.confidence >= 0.8, `Low extraction confidence: ${extraction.confidence}`);

    const wrapped = extractRowsFromTokens([
      { str: "Item", x: 40, y: 300, width: 28, height: 10 },
      { str: "Description", x: 140, y: 300, width: 58, height: 10 },
      { str: "Qty", x: 300, y: 300, width: 18, height: 10 },
      { str: "Price", x: 400, y: 300, width: 28, height: 10 },
      { str: "A1", x: 40, y: 280, width: 12, height: 10 },
      { str: "Long", x: 140, y: 280, width: 22, height: 10 },
      { str: "description", x: 140, y: 268, width: 58, height: 10 },
      { str: "1", x: 300, y: 280, width: 6, height: 10 },
      { str: "$10.00", x: 400, y: 280, width: 34, height: 10 },
    ]);
    assert(wrapped.rows[1][1] === "Long description", "Wrapped description was split into a new row");
    assert(wrapped.rows[1][2] === "1" && wrapped.rows[1][3] === "$10.00", "Wrapped row columns were not preserved");

    const layout = extractPageLayout([
      { str: "INVOICE", x: 480, y: 760, width: 70, height: 20 },
      { str: "Invoice #:", x: 480, y: 700, width: 55, height: 10 },
      { str: "10654", x: 550, y: 700, width: 35, height: 10 },
      { str: "345 W Main", x: 40, y: 600, width: 60, height: 10 },
      { str: "Bill to:", x: 420, y: 600, width: 35, height: 10 },
      { str: "Hailey Clark", x: 470, y: 600, width: 65, height: 10 },
      { str: "Item #", x: 40, y: 480, width: 30, height: 10 },
      { str: "Description", x: 140, y: 480, width: 60, height: 10 },
      { str: "Qty", x: 300, y: 480, width: 18, height: 10 },
      { str: "Price", x: 400, y: 480, width: 28, height: 10 },
      { str: "A875", x: 40, y: 450, width: 25, height: 10 },
      { str: "Peonies", x: 140, y: 450, width: 45, height: 10 },
      { str: "35", x: 300, y: 450, width: 12, height: 10 },
      { str: "$36.75", x: 400, y: 450, width: 36, height: 10 },
      { str: "Invoice Subtotal", x: 420, y: 280, width: 90, height: 10 },
      { str: "$127.25", x: 550, y: 280, width: 40, height: 10 },
      { str: "Please make all checks payable", x: 180, y: 100, width: 120, height: 10 },
    ], 620, 800);
    assert(layout.rowKinds.includes("table"), "Table region was not detected");
    assert(layout.rowKinds.includes("totals"), "Totals region was not detected");
    assert(layout.rowKinds.includes("footer"), "Footer region was not detected");
    assert(layout.rows.some((row) => row[0] === "345 W Main" && row[2] === "Bill to: Hailey Clark"), "Left and right information blocks were flattened");
    assert(layout.rows.some((row) => row[0] === "Invoice #:" && row[2] === "10654"), "Invoice metadata label/value relationship was flattened");

    console.log(JSON.stringify({
      fixture: path.basename(fixture),
      confidence: extraction.confidence,
      tableColumns: extraction.table?.columns.length ?? 0,
      rows: values,
      result: "PASS",
    }, null, 2));
  } finally {
    await fs.rm(fixture, { force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
