import * as XLSX from "xlsx-js-style";
import type { PdfLayoutRowKind } from "./pdf-to-excel-extractor";

export type WorksheetLayout = {
  rowKinds: PdfLayoutRowKind[];
  mergedRows: number[];
};

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

function parseSpreadsheetValue(value: string): string | number {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const numeric = trimmed.replace(/[$€£₹,\s]/g, "");
  if (/^[+-]?\d+(?:\.\d+)?%$/.test(numeric)) return Number(numeric.slice(0, -1)) / 100;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(numeric) && !/^0\d+/.test(numeric)) return Number(numeric);
  return trimmed;
}

function splitLabelValue(value: string): [string, string] | null {
  const match = value.match(/^\s*(.+?):\s*(.+?)\s*$/);
  return match ? [match[1].trim(), match[2].trim()] : null;
}

function extractMetadata(text: string): string[][] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const invoiceNumber = normalized.match(/Invoice\s*#\s*:?\s*([^\s]+)/i)?.[1] ?? "";
  const date = normalized.match(/Invoice\s+date\b[^\d]*(\d{1,4}[-/]\d{1,2}[-/]\d{1,4})/i)?.[1] ?? "";
  let job = normalized.match(/Job\s*:?\s*(.+)$/i)?.[1]?.trim() ?? "";
  if (date && job.startsWith(date)) job = job.slice(date.length).trim();

  return [
    ["Invoice #", invoiceNumber],
    ["Invoice date", date],
    ["Job", job],
  ].filter(([, value]) => value.length > 0);
}

function normalizeTopRows(rows: string[][], rowKinds: PdfLayoutRowKind[]) {
  const outputRows: string[][] = [];
  const outputKinds: PdfLayoutRowKind[] = [];
  const mergedRows: number[] = [];
  const headerText = rows
    .filter((_, index) => rowKinds[index] === "header")
    .map((row) => (row[2]?.trim() ? row[2] : row[0] ?? ""))
    .filter(Boolean)
    .join(" ");
  const hasInvoiceTitle = /\bINVOICE\b/i.test(headerText);
  let titleAdded = false;
  let metadataAdded = false;

  const add = (row: string[], kind: PdfLayoutRowKind, merge = false) => {
    const index = outputRows.length;
    outputRows.push(row);
    outputKinds.push(kind);
    if (merge) mergedRows.push(index);
  };

  if (hasInvoiceTitle) {
    add(["INVOICE"], "header", true);
    titleAdded = true;
    const metadata = extractMetadata(headerText.replace(/\bINVOICE\b/i, ""));
    metadata.forEach(([label, value]) => add(["", "", "", "", label, value], "metadata"));
    metadataAdded = metadata.length > 0;
  }

  rows.forEach((row, rowIndex) => {
    const kind = rowKinds[rowIndex];
    const text = row.filter(Boolean).join(" ").trim();
    if (!text || (kind === "header" && (titleAdded || metadataAdded))) {
      if (kind !== "header") add(row, kind);
      return;
    }

    if (kind === "table" || kind === "totals") {
      add([...row, ...Array(Math.max(0, 6 - row.length)).fill("")].slice(0, 6), kind);
    } else if (kind === "information") {
      const left = row[0]?.trim() ?? "";
      const right = row[2]?.trim() ?? "";
      const rightPair = splitLabelValue(right);
      if (left && right && rightPair) add([left, "", "", "", rightPair[0], rightPair[1]], kind);
      else if (left && right) add([left, "", "", "", "", right], kind);
      else if (left) add([left, "", "", "", "", ""], kind);
      else add(["", "", "", "", right, ""], kind);
    } else if (kind === "footer") {
      add([text, "", "", "", "", ""], kind, true);
    } else if (kind === "header") {
      add([text, "", "", "", "", ""], kind, true);
    } else {
      add([text, "", "", "", "", ""], kind);
    }
  });

  return { rows: outputRows, rowKinds: outputKinds, mergedRows };
}

export function preparePdfExcelWorksheet(rows: string[][], layout: WorksheetLayout) {
  const normalized = normalizeTopRows(rows, layout.rowKinds);
  const values = normalized.rows.map((row) => row.map(parseSpreadsheetValue));
  const worksheet = XLSX.utils.aoa_to_sheet(values);
  const columnCount = 6;

  worksheet["!cols"] = [18, 24, 12, 14, 18, 22].map((wch) => ({ wch }));
  worksheet["!rows"] = normalized.rows.map((row, rowIndex) => {
    const kind = normalized.rowKinds[rowIndex];
    const height = kind === "spacer" ? 10 : kind === "header" ? (row[0] ? 34 : 22) : kind === "metadata" ? 22 : kind === "footer" ? 36 : row.some((cell) => cell.length > 35) ? 42 : 22;
    return { hpt: height, level: kind === "table" ? 1 : 0 };
  });

  worksheet["!merges"] = normalized.mergedRows.map((rowIndex) => ({
    s: { r: rowIndex, c: 0 },
    e: { r: rowIndex, c: columnCount - 1 },
  }));

  let firstTableRow = true;
  for (let rowIndex = 0; rowIndex < normalized.rows.length; rowIndex += 1) {
    const kind = normalized.rowKinds[rowIndex];
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
        style.alignment = { horizontal: columnIndex === 5 ? "right" : "left", vertical: "center", wrapText: true };
        if (String(normalized.rows[rowIndex][columnIndex] ?? "").toLowerCase() === "total") {
          style.font = { bold: true, sz: 12 };
          style.fill = { fgColor: { rgb: "FFE2E8F0" } };
        }
      } else if (kind === "header") {
        style.font = { bold: true, sz: rowIndex === 0 ? 18 : 11 };
      } else if (kind === "metadata") {
        style.font = { bold: columnIndex === 4, sz: 11 };
      } else if (kind === "footer") {
        style.font = { color: { rgb: "FF475569" }, sz: 10 };
        style.alignment = { horizontal: "center", vertical: "center", wrapText: true };
      } else if (kind === "information" && normalized.rows[rowIndex][columnIndex]) {
        style.font = { bold: columnIndex === 0 || columnIndex === 4 };
      }
      cell.s = style;
    }
    if (kind === "table") firstTableRow = false;
  }

  for (const address of Object.keys(worksheet)) {
    if (address.startsWith("!")) continue;
    const cell = worksheet[address] as StyledCell & { z?: string };
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match || typeof cell.v !== "number") continue;
    const column = match[1].split("").reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
    const row = Number(match[2]) - 1;
    const source = normalized.rows[row]?.[column] ?? "";
    cell.z = source.includes("%") ? "0.00%" : /[$€£₹]/.test(source) ? "$#,##0.00" : "0.00";
  }

  return worksheet;
}
