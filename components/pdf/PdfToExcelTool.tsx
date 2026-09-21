"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx-js-style";
import {
  extractPageLayout,
  type PdfLayoutRowKind,
  type PdfPageLayout,
  type PdfTextToken,
} from "@/lib/pdf/pdf-to-excel-extractor";
import { preparePdfExcelWorksheet } from "@/lib/pdf/pdf-to-excel-worksheet";
import type { PDFPageProxy } from "pdfjs-dist";

function clusterNumericValues(values: number[], tolerance: number): number[] {
  if (!values.length) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const lastCluster = clusters[clusters.length - 1];
    const lastValue = lastCluster[lastCluster.length - 1];

    if (current - lastValue <= tolerance) {
      lastCluster.push(current);
    } else {
      clusters.push([current]);
    }
  }

  return clusters.map((cluster) => cluster.reduce((sum, value) => sum + value, 0) / cluster.length);
}

function parseSpreadsheetValue(value: string): string | number {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const numeric = trimmed.replace(/[$€£₹,\s]/g, "");
  if (/^[+-]?\d+(?:\.\d+)?%$/.test(numeric)) {
    return Number(numeric.slice(0, -1)) / 100;
  }

  if (/^[+-]?\d+(?:\.\d+)?$/.test(numeric) && !/^0\d+/.test(numeric)) {
    return Number(numeric);
  }

  return trimmed;
}

type PdfPageLike = Pick<PDFPageProxy, "getViewport" | "render">;

type OcrWord = {
  text?: unknown;
  x0?: unknown;
  y0?: unknown;
  bbox?: { x0?: unknown; y0?: unknown };
};

type OcrResult = {
  data?: { words?: OcrWord[] };
};

type CombinedLayout = Pick<PdfPageLayout, "rowKinds" | "mergedRows">;

type StyledCell = XLSX.CellObject & {
  s?: {
    font?: { bold?: boolean; color?: { rgb: string }; sz?: number };
    fill?: { fgColor?: { rgb: string } };
    alignment?: { horizontal?: "left" | "center" | "right"; vertical?: "top" | "center"; wrapText?: boolean };
    border?: Record<string, { style: string; color: { rgb: string } }>;
  };
};

const thinBorder = { style: "thin", color: { rgb: "FFCBD5E1" } };
const tableBorder = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function splitLabelValue(value: string): [string, string] | null {
  const match = value.match(/^(.+?:)\s*(.+)$/);
  return match ? [match[1].trim(), match[2].trim()] : null;
}

function isLabel(value: string): boolean {
  return /:$/.test(value) || /^(invoice|date|job|bill to|address|phone|fax|tax|subtotal|deposit|total)\b/i.test(value);
}

function mapWorksheetRows(rows: string[][], rowKinds: PdfLayoutRowKind[]) {
  return rows.map((row, rowIndex) => {
    const kind = rowKinds[rowIndex];
    if (kind === "table" || kind === "totals") return [...row, ...Array(Math.max(0, 6 - row.length)).fill("")].slice(0, 6);

    if (kind === "header") {
      const text = row.filter(Boolean).join(" ").trim();
      if (/^invoice$/i.test(text)) return [text, "", "", "", "", ""];
      const pair = row.length >= 3 && row[0] && row[2] ? [row[0], row[2]] : splitLabelValue(text);
      return pair ? ["", "", "", "", pair[0], pair[1]] : [text, "", "", "", "", ""];
    }

    if (kind === "information") {
      const left = row[0]?.trim() ?? "";
      const right = row[2]?.trim() ?? "";
      const rightPair = splitLabelValue(right);
      if (left && right && isLabel(left)) return ["", "", "", "", left, right];
      if (left && right && rightPair) return [left, "", "", "", rightPair[0], rightPair[1]];
      if (left && right) return [left, "", "", "", "", right];
      if (left) {
        const pair = splitLabelValue(left);
        return pair ? ["", "", "", "", pair[0], pair[1]] : [left, "", "", "", "", ""];
      }
      return ["", "", "", "", right, ""];
    }

    if (kind === "footer") return [row.filter(Boolean).join(" ").trim(), "", "", "", "", ""];
    return ["", "", "", "", "", ""];
  });
}

function _prepareWorksheet(rows: string[][], layout: CombinedLayout) {
  const renderRows = mapWorksheetRows(rows, layout.rowKinds);
  const values = renderRows.map((row) => row.map(parseSpreadsheetValue));
  const worksheet = XLSX.utils.aoa_to_sheet(values);
  const columnCount = 6;

  worksheet["!cols"] = [18, 24, 12, 14, 18, 22].map((wch) => ({ wch }));

  worksheet["!rows"] = renderRows.map((row, rowIndex) => {
    const kind = layout.rowKinds[rowIndex];
    const height = kind === "spacer" ? 10 : kind === "header" ? (row[0] ? 34 : 22) : kind === "footer" ? 36 : row.some((cell) => cell.length > 35) ? 42 : 22;
    return { hpt: height, level: kind === "table" ? 1 : 0 };
  });

  worksheet["!merges"] = layout.mergedRows
    .filter((rowIndex) => rowIndex >= 0 && rowIndex < renderRows.length && ["header", "footer"].includes(layout.rowKinds[rowIndex]))
    .map((rowIndex) => ({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: columnCount - 1 } }));

  let firstTableRow = true;
  for (let rowIndex = 0; rowIndex < renderRows.length; rowIndex += 1) {
    const kind = layout.rowKinds[rowIndex];
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
      const cell = worksheet[address] as StyledCell;
      const style: NonNullable<StyledCell["s"]> = { alignment: { vertical: "center", wrapText: true, horizontal: "left" } };

      if (kind === "table") {
        style.border = tableBorder;
        style.alignment = { vertical: "center", wrapText: true, horizontal: columnIndex >= 2 ? "right" : "left" };
        if (firstTableRow) {
          style.font = { bold: true, color: { rgb: "FFFFFFFF" }, sz: 11 };
          style.fill = { fgColor: { rgb: "FF111827" } };
          style.alignment = { horizontal: "center", vertical: "center", wrapText: true };
        }
      } else if (kind === "totals") {
        style.border = tableBorder;
        style.alignment = { horizontal: columnIndex === columnCount - 1 ? "right" : "left", vertical: "center", wrapText: true };
        if (String(renderRows[rowIndex][columnIndex] ?? "").toLowerCase() === "total") {
          style.font = { bold: true, sz: 12 };
          style.fill = { fgColor: { rgb: "FFE2E8F0" } };
        }
      } else if (kind === "header") {
        style.font = { bold: true, sz: rowIndex === 0 ? 18 : 11 };
      } else if (kind === "footer") {
        style.font = { color: { rgb: "FF475569" }, sz: 10 };
        style.alignment = { horizontal: "center", vertical: "center", wrapText: true };
      } else if (kind === "information" && renderRows[rowIndex][columnIndex]) {
        style.font = { bold: columnIndex === 0 || columnIndex === 4 };
      }

      cell.s = style;
    }
    if (kind === "table") firstTableRow = false;
  }

  for (const address of Object.keys(worksheet)) {
    if (address.startsWith("!")) continue;
    const cell = worksheet[address] as XLSX.CellObject & { z?: string };
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match || typeof cell.v !== "number") continue;

    const column = match[1].split("").reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
    const row = Number(match[2]) - 1;
    const source = renderRows[row]?.[column] ?? "";
    if (source.includes("%")) {
      cell.z = "0.00%";
    } else if (/[$€£₹]/.test(source)) {
      cell.z = "$#,##0.00";
    } else {
      cell.z = "0.00";
    }
  }

  return worksheet;
}

async function extractOcrRows(page: PdfPageLike): Promise<string[][]> {
  try {
    const viewport = page.getViewport({ scale: 2.2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) return [];

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({ canvasContext: context, canvas, viewport }).promise;

    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");

    try {
      const imageDataUrl = canvas.toDataURL("image/png");
      const result = await worker.recognize(imageDataUrl) as OcrResult;
      const words = Array.isArray(result.data?.words) ? result.data.words : [];
      if (!words.length) return [];

      const rowMap = new Map<number, { text: string; x: number }[]>();
      const rowStep = 24;

      for (const word of words) {
        const text = String(word.text ?? "").replace(/\s+/g, " ").trim();
        if (!text) continue;

        const rowKey = Math.round((Number(word.bbox?.y0 ?? word.y0 ?? 0)) / rowStep) * rowStep;
        const bucket = rowMap.get(rowKey) ?? [];
        bucket.push({ text, x: Number(word.bbox?.x0 ?? word.x0 ?? 0) });
        rowMap.set(rowKey, bucket);
      }

      const rows = Array.from(rowMap.entries())
        .sort(([a], [b]) => b - a)
        .map(([, items]) => {
          const sorted = [...items].sort((a, b) => a.x - b.x);
          const centers = clusterNumericValues(sorted.map((item) => item.x), 24);
          const rowValues = new Map<number, string[]>();

          sorted.forEach((item) => {
            const nearestIndex = centers.length
              ? centers.reduce((closestIndex, center, index) => {
                  const currentDistance = Math.abs(item.x - center);
                  const closestDistance = Math.abs(item.x - centers[closestIndex]);
                  return currentDistance < closestDistance ? index : closestIndex;
                }, 0)
              : 0;

            const values = rowValues.get(nearestIndex) ?? [];
            values.push(item.text);
            rowValues.set(nearestIndex, values);
          });

          return Array.from(rowValues.entries())
            .sort(([a], [b]) => a - b)
            .map(([, values]) => values.join(" ").trim())
            .filter(Boolean);
        })
        .filter((row) => row.length > 0);

      return rows;
    } finally {
      await worker.terminate().catch(() => undefined);
    }
  } catch {
    return [];
  }
}

export default function PdfToExcelTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useOcr, setUseOcr] = useState(true);

  function selectFile(selected: File | null) {
    if (!selected) return;

    if ((!selected.type || selected.type !== "application/pdf") && !/\.pdf$/i.test(selected.name)) {
      setError("Please select a valid PDF file.");
      return;
    }

    if (selected.size === 0) {
      setError("Selected PDF is empty.");
      return;
    }

    setFile(selected);
    setError("");
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function convert() {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const rows: string[][] = [];
      const rowKinds: PdfLayoutRowKind[] = [];
      const mergedRows: number[] = [];
      const seenTableHeaders = new Set<string>();

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();

        const items: PdfTextToken[] = textContent.items
          .filter((item) => {
            const maybeText = item as { str?: unknown; transform?: number[] };
            return typeof maybeText.str === "string" && Array.isArray(maybeText.transform);
          })
          .map((item) => {
            const textItem = item as { str: string; transform: number[]; width?: number; height?: number };
            return {
              str: String(textItem.str).trim(),
              x: Number(textItem.transform?.[4] ?? 0),
              y: Number(textItem.transform?.[5] ?? 0),
              width: Number(textItem.width ?? 0),
              height: Number(textItem.height ?? 0),
              pageNumber,
            };
          })
          .filter((item) => item.str.length > 0);

        const viewport = page.getViewport({ scale: 1 });
        const pageLayout = extractPageLayout(items, viewport.width, viewport.height);
        const pageRows = pageLayout.rows;
        if (pageLayout.tableRowStart >= 0) {
          const headerSignature = pageRows[pageLayout.tableRowStart]?.join("\u001f").toLowerCase();
          if (headerSignature && seenTableHeaders.has(headerSignature)) {
            pageRows.splice(pageLayout.tableRowStart, 1);
            pageLayout.rowKinds.splice(pageLayout.tableRowStart, 1);
            const mergedHeaderIndex = pageLayout.mergedRows.indexOf(pageLayout.tableRowStart);
            if (mergedHeaderIndex >= 0) pageLayout.mergedRows.splice(mergedHeaderIndex, 1);
          } else if (headerSignature) {
            seenTableHeaders.add(headerSignature);
          }
        }
        const hasRealText = pageRows.length > 0 && pageRows[0]?.[0] !== "No extractable text was found in this PDF.";

        if (hasRealText) {
          if (rows.length) {
            rows.push([""]);
            rowKinds.push("spacer");
          }
          const offset = rows.length;
          rows.push(...pageRows);
          rowKinds.push(...pageLayout.rowKinds);
          mergedRows.push(...pageLayout.mergedRows.map((rowIndex) => rowIndex + offset));
        }

        if (useOcr && !hasRealText) {
          const ocrRows = await extractOcrRows(page);
          if (ocrRows.length > 0) {
            rows.push(...ocrRows);
          }
        }
      }

      const finalRows = rows.length ? rows : [["No extractable text was found in this PDF."]];

      const workbook = XLSX.utils.book_new();
      const worksheet = preparePdfExcelWorksheet(finalRows, { rowKinds, mergedRows });
      XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Data");

      const fileName = file.name.replace(/\.pdf$/i, "") || "converted";
      const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([output], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, `${fileName}.xlsx`);
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "PDF to Excel conversion failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">DigiDesk PDF Tools</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">PDF to Excel</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            Extract readable tables and scanned text into a spreadsheet-ready Excel file.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${
              dragging
                ? "border-blue-600 bg-blue-50"
                : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
            }`}
          >
            <UploadCloud size={42} className="text-blue-600" />
            <h2 className="mt-5 text-xl font-bold">Drag & drop your PDF here</h2>
            <p className="mt-2 text-sm text-slate-600">or click to choose from your device</p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Choose File
            </button>
            <input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" onChange={handleChange} />
          </div>

          {file && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <FileSpreadsheet className="shrink-0 text-blue-600" size={22} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{file.name}</p>
                <p className="text-sm text-slate-600">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-sm font-semibold text-slate-700">Enable scanned PDF OCR</span>
            <button
              type="button"
              onClick={() => setUseOcr((current) => !current)}
              className={`relative h-7 w-12 rounded-full transition ${useOcr ? "bg-blue-600" : "bg-slate-300"}`}
              aria-label="Toggle OCR fallback"
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${useOcr ? "left-6" : "left-1"}`}
              />
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>
          )}

          <button
            type="button"
            onClick={convert}
            disabled={loading || !file}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            {loading ? "Converting PDF to Excel..." : "Convert to Excel"}
          </button>
        </div>
      </section>
    </main>
  );
}
