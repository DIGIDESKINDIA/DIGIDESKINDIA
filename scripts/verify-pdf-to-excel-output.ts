import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as XLSX from "xlsx-js-style";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { extractRowsFromTokens, type PdfLayoutRowKind } from "../lib/pdf/pdf-to-excel-extractor";
import { preparePdfExcelWorksheet } from "../lib/pdf/pdf-to-excel-worksheet";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function comparable(value: string | number): string | number {
  if (typeof value === "number") return value;
  const cleaned = value.replace(/[$€£₹,\s]/g, "");
  return cleaned && /^[-+]?\d+(?:\.\d+)?$/.test(cleaned) ? Number(cleaned) : value;
}

async function main() {
  const pdfPath = path.join(process.cwd(), "tmp-pdf-to-excel-reference.pdf");
  const xlsxPath = path.join(process.cwd(), "tmp-pdf-to-excel-reference.xlsx");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([720, 520]);
  const columns = [40, 140, 300, 350, 450, 545];
  const sourceRows = [
    ["Item #", "Description", "Qty", "Unit price", "Discount", "Price"],
    ["A875", "Peonies", "35", "$1.05", "", "$36.75"],
    ["K245", "Tulips", "25", "$2.00", "", "$50.00"],
    ["U123", "Buttercup", "30", "$1.35", "", "$40.50"],
  ];

  sourceRows.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    if (value) page.drawText(value, { x: columns[columnIndex], y: 445 - rowIndex * 28, size: rowIndex === 0 ? 12 : 11, font: rowIndex === 0 ? bold : font, color: rgb(0, 0, 0) });
  }));
  await fs.writeFile(pdfPath, Buffer.from(await pdf.save()));

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const standardFontDataUrl = pathToFileURL(`${path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts")}${path.sep}`).toString();
  const document = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(pdfPath)), standardFontDataUrl }).promise;
  const pageProxy = await document.getPage(1);
  const content = await pageProxy.getTextContent();
  const tokens = content.items.filter((item) => "str" in item && typeof item.str === "string" && item.str.trim()).map((item) => {
    const textItem = item as { str: string; transform: number[]; width?: number; height?: number };
    return { str: textItem.str, x: Number(textItem.transform[4]), y: Number(textItem.transform[5]), width: Number(textItem.width ?? 0), height: Number(textItem.height ?? 11) };
  });

  const extraction = extractRowsFromTokens(tokens);
  const workbook = XLSX.utils.book_new();
  const worksheet = preparePdfExcelWorksheet(extraction.rows, {
    rowKinds: extraction.rows.map(() => "table") as PdfLayoutRowKind[],
    mergedRows: [],
  });
  XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Data");
  await fs.writeFile(xlsxPath, XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }));

  const output = XLSX.read(await fs.readFile(xlsxPath), { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(output.Sheets["Extracted Data"], { header: 1, defval: "" }) as string[][];
  assert(
    rows.map((row) => row.map(comparable)).toString() === sourceRows.map((row) => row.map(comparable)).toString(),
    `XLSX mismatch: ${JSON.stringify(rows)}`
  );

  const layoutWorksheet = preparePdfExcelWorksheet([
    ["Elegant", "", "INVOICE Invoice #: 10654"],
    ["Embrace", "", "Invoice date: Job: 04-09-26 Wedding florals"],
    ["345 W Main", "", "Bill to: Hailey Clark"],
  ], {
    rowKinds: ["header", "header", "information"],
    mergedRows: [],
  });
  const debugCells = Object.fromEntries(["A1", "B1", "C1", "D1", "E1", "F1", "E2", "F2", "E3", "F3", "E4", "F4"].map((address) => [address, layoutWorksheet[address]?.v ?? ""]));
  assert(debugCells.A1 === "INVOICE", `Title placement failed: ${JSON.stringify(debugCells)}`);
  assert(debugCells.E2 === "Invoice #" && String(debugCells.F2) === "10654", `Invoice number placement failed: ${JSON.stringify(debugCells)}`);
  assert(debugCells.E3 === "Invoice date" && debugCells.F3 === "04-09-26", `Invoice date placement failed: ${JSON.stringify(debugCells)}`);
  assert(debugCells.E4 === "Job" && debugCells.F4 === "Wedding florals", `Job placement failed: ${JSON.stringify(debugCells)}`);
  assert(!Object.values(debugCells).some((value) => String(value).includes("Invoice date: Job:")), `Metadata concatenated: ${JSON.stringify(debugCells)}`);
  console.log("HEADER_CELLS", JSON.stringify(debugCells));

  console.log(JSON.stringify({
    pdf: path.basename(pdfPath),
    xlsx: path.basename(xlsxPath),
    confidence: extraction.confidence,
    dimensions: { rows: rows.length, columns: rows[0].length },
    discountCells: rows.slice(1).map((row) => row[4]),
    prices: rows.slice(1).map((row) => row[5]),
    result: "PASS",
  }, null, 2));

  await fs.rm(pdfPath, { force: true });
  await fs.rm(xlsxPath, { force: true });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
