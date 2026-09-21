"use client";

import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Eraser,
  Highlighter,
  ImagePlus,
  Languages,
  Link as LinkIcon,
  Minus,
  MousePointer2,
  PenLine,
  Plus,
  Redo2,
  RotateCw,
  Square,
  Strikethrough,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import {
  findComposedTextMatches,
  findTextMatches,
  editedFilename,
  getEditorDomRect,
  getTextLayoutWidth,
  hitTestText,
  pdfRectToEditorRect,
  replaceTextElement,
  replaceTextElementById,
  resizeElement,
  rotationFromPointer,
  shouldShowSelectionHandles,
  splitPdfTextItemIntoWordBoxes,
  shouldRenderTextElement,
} from "@/lib/pdf/editor-model.mjs";
import { getPdfWorkerSource } from "@/lib/pdf/pdf-worker";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = getPdfWorkerSource(pdfjs.version);

type Tool = "select" | "text" | "image" | "whiteout" | "shape" | "highlight" | "strike" | "link" | "signature";

const toolbarItems: Array<{
  tool: Tool | "forms";
  label: string;
  icon: typeof Type;
  hasDropdown: boolean;
}> = [
  { tool: "text", label: "Text", icon: Type, hasDropdown: true },
  { tool: "link", label: "Links", icon: LinkIcon, hasDropdown: false },
  { tool: "forms", label: "Forms", icon: Square, hasDropdown: true },
  { tool: "image", label: "Images", icon: ImagePlus, hasDropdown: true },
  { tool: "signature", label: "Sign", icon: PenLine, hasDropdown: true },
  { tool: "whiteout", label: "Whiteout", icon: Eraser, hasDropdown: false },
  { tool: "highlight", label: "Annotate", icon: Highlighter, hasDropdown: true },
  { tool: "shape", label: "Shapes", icon: Square, hasDropdown: true },
];

type ElementKind =
  | "text"
  | "image"
  | "whiteout"
  | "shape"
  | "highlight"
  | "strike"
  | "link"
  | "signature";

type EditorElement = {
  id: string;
  pageIndex: number;
  kind: ElementKind;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  currentText?: string;
  originalText?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fontWeightExplicit?: boolean;
  isBold?: boolean;
  initialFontWeight?: "normal" | "bold";
  capturedFontWeight?: string;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  dataUrl?: string;
  imageName?: string;
  fillColor?: string;
  strokeWidth?: number;
  source?: "extracted" | "user";
  pdfX?: number;
  pdfY?: number;
  pdfWidth?: number;
  pdfHeight?: number;
  transform?: number[];
  fontName?: string;
  sourceFontName?: string;
  fontFamily?: string;
  opacity?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  lineHeight?: number;
  charSpacing?: number;
  baseline?: number;
  align?: "left" | "center" | "right";
  changed?: boolean;
  edited?: boolean;
  sourceStyle?: {
    sourceFontName?: string;
    fontName?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    color?: string;
    opacity?: number;
    transform?: number[];
    baseline?: number;
    lineHeight?: number;
    charSpacing?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
  };
  textRuns?: Array<{ text: string; bold: boolean; italic: boolean; underline?: boolean; strike?: boolean; color?: string; opacity?: number; charSpacing?: number; rise?: number }>;
};

type SearchMatch = { pageIndex: number; text: string; objectIds: string[]; bbox: { x: number; y: number; width: number; height: number } };
type Interaction = { type: "drag" | "resize" | "rotate"; id: string; startX: number; startY: number; original: EditorElement; before: EditorElement[]; handle?: string };
type InteractionPointer = { clientX: number; clientY: number; pageLeft: number; pageTop: number; pageWidth: number; pageHeight: number; shiftKey: boolean };

type ToolGroup = {
  label: string;
  items: Array<{ tool: Tool; label: string; icon: typeof Type }>;
};

const toolGroups: ToolGroup[] = [
  {
    label: "Edit",
    items: [
      { tool: "select", label: "Select", icon: MousePointer2 },
      { tool: "text", label: "Text", icon: Type },
      { tool: "image", label: "Image", icon: ImagePlus },
      { tool: "signature", label: "Signature", icon: PenLine },
    ],
  },
  {
    label: "Markup",
    items: [
      { tool: "whiteout", label: "Whiteout", icon: Eraser },
      { tool: "shape", label: "Shape", icon: Square },
      { tool: "highlight", label: "Highlight", icon: Highlighter },
      { tool: "strike", label: "Strike-through", icon: Strikethrough },
      { tool: "link", label: "Link", icon: LinkIcon },
    ],
  },
];

const colorMap: Record<string, [number, number, number]> = {
  "#111827": [0.067, 0.094, 0.153],
  "#ff2952": [1, 0.161, 0.322],
  "#2563eb": [0.145, 0.388, 0.922],
  "#16a34a": [0.086, 0.639, 0.325],
};

function makeId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeTextRuns(runs: Array<{ text: string; bold: boolean; italic: boolean; underline?: boolean; strike?: boolean; color?: string; opacity?: number; charSpacing?: number; rise?: number }> = []) {
  return runs.filter((run) => run.text).reduce<Array<{ text: string; bold: boolean; italic: boolean; underline?: boolean; strike?: boolean; color?: string; opacity?: number; charSpacing?: number; rise?: number }>>((result, run) => {
    const previous = result[result.length - 1];
    if (previous && previous.bold === run.bold && previous.italic === run.italic) previous.text += run.text;
    else result.push({ ...run });
    return result;
  }, []);
}

function getEffectiveFontWeight(element: EditorElement) {
  if (element.fontWeightExplicit) return element.fontWeight ?? "normal";
  if (element.fontWeight === "bold" || element.isBold || element.initialFontWeight === "bold" || Number(element.capturedFontWeight) >= 600) return "bold";
  return element.fontWeight ?? "normal";
}

function applyBoldToRange(element: EditorElement, start: number, end: number) {
  const text = String(element.currentText ?? element.text ?? element.originalText ?? "");
  if (start === end || !text) return element;
  const baseRuns = element.textRuns?.length
    ? element.textRuns
    : [{ text, bold: getEffectiveFontWeight(element) === "bold", italic: Boolean(element.italic) }];
  let offset = 0;
  const nextRuns: Array<{ text: string; bold: boolean; italic: boolean }> = [];
  for (const run of baseRuns) {
    const runStart = offset;
    const runEnd = offset + run.text.length;
    const slices = [
      [runStart, Math.max(runStart, Math.min(runEnd, start)), run.bold],
      [Math.max(runStart, start), Math.min(runEnd, end), true],
      [Math.max(runStart, end), runEnd, run.bold],
    ] as Array<[number, number, boolean]>;
    for (const [sliceStart, sliceEnd, bold] of slices) {
      if (sliceEnd <= sliceStart) continue;
      nextRuns.push({ text: text.slice(sliceStart, sliceEnd), bold, italic: run.italic });
    }
    offset = runEnd;
  }
  const normalized = normalizeTextRuns(nextRuns);
  return {
    ...element,
    textRuns: normalized,
    fontWeight: normalized.length === 1 && normalized[0].bold ? "bold" : normalized.length === 1 ? "normal" : element.fontWeight,
    isBold: normalized.length > 0 && normalized.every((run) => run.bold),
    changed: true,
    edited: true,
  };
}

function renderTextRuns(element: EditorElement, text: string) {
  const runs = element.textRuns?.length ? element.textRuns : [{ text, bold: getEffectiveFontWeight(element) === "bold", italic: Boolean(element.italic) }];
  return normalizeTextRuns(runs).map((run, index) => (
    <span key={`${index}-${run.text}`} style={{ fontWeight: run.bold ? "bold" : "normal", fontStyle: run.italic ? "italic" : "normal", textDecoration: [run.underline ? "underline" : "", run.strike ? "line-through" : ""].filter(Boolean).join(" ") || "none", color: run.color, opacity: run.opacity }}>{run.text}</span>
  ));
}

function hexRgb(hex: string): [number, number, number] {
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  return colorMap[normalized] ?? colorMap["#111827"];
}

function toPdfColor(value?: string): [number, number, number] {
  return hexRgb(value ?? "#111827");
}

function cleanInlinePdfText(value: string) {
  return value.replace(/[_\s]+$/g, "");
}

async function extractPdfText(file: File): Promise<EditorElement[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  const extracted: EditorElement[] = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    await page.getOperatorList();
    const pageStart = extracted.length;

    for (const item of content.items) {
      if (!("str" in item) || typeof item.str !== "string") continue;

      const wordBoxes = splitPdfTextItemIntoWordBoxes({
        str: item.str,
        width: item.width,
        height: item.height,
        transform: item.transform,
      });
      if (!wordBoxes.length) continue;

      const transform = Array.isArray(item.transform) ? item.transform.map((value) => Number(value ?? 0)) : [1, 0, 0, 1, 0, 0];
      const rawHeight = Math.max(Math.abs(Number(transform[3] ?? 0)), Number(item.height ?? 0), 1);
      const transformFontSize = Math.max(Math.hypot(Number(transform[0] ?? 0), Number(transform[1] ?? 0)), 1);
      const fontName = typeof item.fontName === "string" ? item.fontName : undefined;
      const commonObjects = (page as unknown as { commonObjs?: { has?: (name: string) => boolean; get?: (name: string) => unknown } }).commonObjs;
      let pdfFont: Record<string, unknown> = {};
      if (fontName && commonObjects?.has?.(fontName) && commonObjects.get) {
        try {
          pdfFont = (commonObjects.get(fontName) as Record<string, unknown>) ?? {};
        } catch {
          pdfFont = {};
        }
      }
      const sourceFontFamily = fontName && content.styles[fontName]?.fontFamily
        ? content.styles[fontName].fontFamily
        : fontName ?? "Helvetica";
      const cssFontInfo = pdfFont.cssFontInfo && typeof pdfFont.cssFontInfo === "object" ? pdfFont.cssFontInfo as Record<string, unknown> : {};
      const fontDescriptor = `${fontName ?? ""} ${sourceFontFamily} ${String(pdfFont.name ?? "")} ${String(pdfFont.loadedName ?? "")} ${String(pdfFont.fallbackName ?? "")} ${String(pdfFont.fontFamily ?? "")} ${String(cssFontInfo.fontFamily ?? "")}`;
      const fontStyle = fontName ? content.styles[fontName] as unknown as Record<string, unknown> : undefined;
      const fontFlags = typeof fontStyle?.fontFlags === "number" ? fontStyle.fontFlags : Number(pdfFont.fontFlags ?? (item as { fontFlags?: number }).fontFlags ?? 0);
      const styleFontWeight = fontStyle?.fontWeight ?? cssFontInfo.fontWeight ?? pdfFont.fontWeight ?? "";
      const fontFamily = /helvetica/i.test(fontDescriptor)
        ? "Helvetica"
        : /times/i.test(fontDescriptor)
          ? "Times-Roman"
          : /courier/i.test(fontDescriptor)
            ? "Courier"
            : sourceFontFamily;
      const weight = "fontWeight" in item && typeof item.fontWeight === "string" && item.fontWeight === "bold"
        || /bold|black|demi|heavy/i.test(fontDescriptor)
        || /bold|black|demi|heavy/i.test(String(styleFontWeight))
        || Number(styleFontWeight) >= 600
        || Boolean(pdfFont.bold) || Boolean(pdfFont.isBold) || Boolean(pdfFont.isFakeBold)
        || Boolean(fontFlags & 262144)
        ? "bold"
        : "normal";
      const isBold = weight === "bold" || /(?:^|[-_\s])700(?:$|[-_\s])/i.test(fontDescriptor);
      const initialFontWeight: "normal" | "bold" = isBold ? "bold" : "normal";
      const isItalic = Boolean(("italic" in item && item.italic) || /italic|oblique|slanted/i.test(fontDescriptor) || /italic|oblique|slanted/i.test(String(styleFontWeight || "")));
      const lineGroups: Array<typeof wordBoxes> = [];
      for (const wordBox of wordBoxes) {
        const line = lineGroups.find((group) => Math.abs(group[0].baseline - wordBox.baseline) <= Math.max(rawHeight, wordBox.height) * 0.6);
        if (line) line.push(wordBox);
        else lineGroups.push([wordBox]);
      }

      for (const lineGroup of lineGroups) {
        const lineBox = {
          text: lineGroup.map((wordBox) => wordBox.text).join(" "),
          x: Math.min(...lineGroup.map((wordBox) => wordBox.x)),
          y: Math.min(...lineGroup.map((wordBox) => wordBox.y)),
          width: Math.max(...lineGroup.map((wordBox) => wordBox.x + wordBox.width)) - Math.min(...lineGroup.map((wordBox) => wordBox.x)),
          height: Math.max(...lineGroup.map((wordBox) => wordBox.y + wordBox.height)) - Math.min(...lineGroup.map((wordBox) => wordBox.y)),
          baseline: lineGroup[0].baseline,
        };
        const rect = pdfRectToEditorRect(lineBox, viewport.width, viewport.height);
        const sourceStyle: EditorElement["sourceStyle"] = {
          sourceFontName: fontName,
          fontName,
          fontFamily,
          fontSize: transformFontSize,
          fontWeight: weight === "bold" ? "bold" : "normal",
          italic: isItalic,
          color: "#111827",
          opacity: 1,
          transform,
          baseline: lineBox.baseline,
          lineHeight: 1.2,
          charSpacing: Number((item as { charSpacing?: number }).charSpacing ?? 0),
          rotation: 0,
          scaleX: Number(transform[0] ?? 1),
          scaleY: Number(transform[3] ?? 1),
        };

        extracted.push({
          id: makeId("pdf-text"),
          pageIndex,
          kind: "text",
          x: Math.max(0, Math.min(100, rect.x)),
          y: Math.max(0, Math.min(100, rect.y)),
          width: Math.max(0.1, Math.min(100, rect.width)),
          height: Math.max(0.1, Math.min(100, rect.height)),
          text: lineBox.text,
          currentText: lineBox.text,
          originalText: lineBox.text,
          color: "#111827",
          fontSize: transformFontSize,
          fontWeight: weight,
          isBold,
          initialFontWeight,
          italic: isItalic,
          source: "extracted",
          pdfX: lineBox.x,
          pdfY: lineBox.y,
          pdfWidth: lineBox.width,
          pdfHeight: lineBox.height || rawHeight,
          transform,
          fontName,
          sourceFontName: fontName,
          fontFamily,
          opacity: 1,
          rotation: 0,
          scaleX: Number(transform[0] ?? 1),
          scaleY: Number(transform[3] ?? 1),
          lineHeight: 1.2,
          charSpacing: Number((item as { charSpacing?: number }).charSpacing ?? 0),
          baseline: lineBox.baseline,
          changed: false,
          sourceStyle,
        });
      }
    }

    const pageElements = extracted.splice(pageStart);
    const mergedLines: EditorElement[] = [];
    for (const element of pageElements.sort((left, right) => (Number(right.pdfY ?? 0) - Number(left.pdfY ?? 0)) || (Number(left.pdfX ?? 0) - Number(right.pdfX ?? 0)))) {
      const fontSize = Number(element.fontSize ?? 12);
      const match = mergedLines.find((line) => {
        const sameStyle = line.fontFamily === element.fontFamily
          && line.fontWeight === element.fontWeight
          && Boolean(line.italic) === Boolean(element.italic)
          && Math.abs(Number(line.fontSize ?? 12) - fontSize) < 0.5;
        const sameBaseline = Math.abs((Number(line.y ?? 0) + Number(line.height ?? 0) / 2) - (Number(element.y ?? 0) + Number(element.height ?? 0) / 2)) <= 1.2;
        const lineRight = Number(line.x ?? 0) + Number(line.width ?? 0);
        const gap = Number(element.x ?? 0) - lineRight;
        const gapLimit = Math.max((fontSize / Math.max(viewport.width, 1)) * 100 * 1.25, 1);
        return sameStyle && sameBaseline && gap >= -0.4 && gap <= gapLimit;
      });

      if (!match) {
        mergedLines.push(element);
        continue;
      }

      const left = Math.min(Number(match.x ?? 0), Number(element.x ?? 0));
      const right = Math.max(Number(match.x ?? 0) + Number(match.width ?? 0), Number(element.x ?? 0) + Number(element.width ?? 0));
      const top = Math.min(Number(match.y ?? 0), Number(element.y ?? 0));
      const bottom = Math.max(Number(match.y ?? 0) + Number(match.height ?? 0), Number(element.y ?? 0) + Number(element.height ?? 0));
      const rect = {
        x: left,
        y: top,
        width: Math.min(100 - left, right - left),
        height: Math.min(100 - top, bottom - top),
      };
      const pdfX = (rect.x / 100) * viewport.width;
      const pdfWidth = (rect.width / 100) * viewport.width;
      const pdfY = Math.max(Number(match.pdfY ?? 0), Number(element.pdfY ?? 0));
      const pdfHeight = Math.max(Number(match.pdfHeight ?? 0), Number(element.pdfHeight ?? 0));
      const text = `${String(match.text ?? "").trim()} ${String(element.text ?? "").trim()}`.trim();
      Object.assign(match, {
        x: Math.max(0, Math.min(100, rect.x)),
        y: Math.max(0, Math.min(100, rect.y)),
        width: Math.max(0.1, Math.min(100, rect.width)),
        height: Math.max(0.1, Math.min(100, rect.height)),
        text,
        currentText: text,
        originalText: text,
        pdfX,
        pdfY,
        pdfWidth,
        pdfHeight,
        baseline: Math.max(Number(match.baseline ?? 0), Number(element.baseline ?? 0)),
        sourceStyle: match.sourceStyle ? {
          ...match.sourceStyle,
          sourceFontName: match.sourceFontName ?? match.sourceStyle.sourceFontName,
          fontName: match.fontName ?? match.sourceStyle.fontName,
          fontFamily: match.fontFamily ?? match.sourceStyle.fontFamily,
          fontSize: match.fontSize ?? match.sourceStyle.fontSize,
          fontWeight: match.fontWeight ?? match.sourceStyle.fontWeight,
          italic: Boolean(match.italic ?? match.sourceStyle.italic),
          baseline: pdfY,
        } : match.sourceStyle,
      });
    }
    const lineCandidates = mergedLines.map((element) => {
      const elementX = Number(element.pdfX ?? 0);
      const elementBaseline = Number(element.baseline ?? element.pdfY ?? 0);
      const fontSize = Number(element.fontSize ?? 12);
      const sameLineBlock = mergedLines.filter((candidate) => {
        const candidateX = Number(candidate.pdfX ?? 0);
        const candidateBaseline = Number(candidate.baseline ?? candidate.pdfY ?? 0);
        return candidate.fontFamily === element.fontFamily
          && candidate.fontWeight === element.fontWeight
          && Boolean(candidate.italic) === Boolean(element.italic)
          && Math.abs(candidateX - elementX) <= Math.max(fontSize * 2, viewport.width * 0.03)
          && Math.abs(candidateBaseline - elementBaseline) <= 1.2;
      });
      const right = Math.max(...sameLineBlock.map((candidate) => Number(candidate.pdfX ?? 0) + Number(candidate.pdfWidth ?? 0)));
      const neighboringRight = sameLineBlock.length > 1 ? right : viewport.width;
      return { element, pdfLineWidth: Math.max(Number(element.pdfWidth ?? 0), neighboringRight - elementX) };
    });
    extracted.push(...lineCandidates.map(({ element, pdfLineWidth }) => ({ ...element, pdfLineWidth })));
  }

  return extracted;
}

export default function EditPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [sourcePageCount, setSourcePageCount] = useState(0);
  const [pageOrder, setPageOrder] = useState<Array<number | null>>([]);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({});
  const [addedPages, setAddedPages] = useState<Array<{ pageIndex: number; width: number; height: number; rotation: number }>>([]);
  const [pageDimensions, setPageDimensions] = useState({ width: 612, height: 792 });
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(160);
  const [tool, setTool] = useState<Tool>("text");
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [history, setHistory] = useState<EditorElement[][]>([]);
  const [future, setFuture] = useState<EditorElement[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredTextId, setHoveredTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [pdfTextEdits, setPdfTextEdits] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [color, setColor] = useState("#ff2952");
  const [fontSize, setFontSize] = useState(18);
  const [draft, setDraft] = useState("");
  const [textEditorOpen, setTextEditorOpen] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState("");
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [showFind, setShowFind] = useState(false);
  const [showFullChrome, setShowFullChrome] = useState(true);
  const [requestedCorrectionCount, setRequestedCorrectionCount] = useState(0);
  const [requestedCorrectionApplied, setRequestedCorrectionApplied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const interactionPointerRef = useRef<InteractionPointer | null>(null);
  const interactionFrameRef = useRef<number | null>(null);
  const clipboardRef = useRef<EditorElement | null>(null);
  const editableTextRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inlineSelectionRef = useRef<{ elementId: string; start: number; end: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!file) {
      return;
    }

    let cancelled = false;

    async function loadTextModel() {
      if (!file) return;

      try {
        const parsed = await extractPdfText(file);
        if (!cancelled) {
          setElements(parsed);
          setSourcePageCount(await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: true }).promise.then((document) => document.numPages));
          setHistory([]);
          setFuture([]);
          setSelectedId(null);
          setHoveredTextId(null);
          setEditingTextId(null);
          setRequestedCorrectionCount(0);
          setRequestedCorrectionApplied(false);
          setStatus("PDF loaded. Click text to edit it.");
        }
      } catch (error) {
        if (!cancelled) {
          setDocumentError(error instanceof Error ? error.message : "Unable to read PDF text");
          setStatus("The PDF could not be parsed for text editing.");
        }
      }
    }

    loadTextModel();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const pageElements = useMemo(
    () => elements.filter((element) => element.pageIndex === page),
    [elements, page]
  );

  const hoveredLineBounds = useMemo(() => {
    if (tool !== "text" || !hoveredTextId) return null;
    const hoveredElement = pageElements.find((element) => element.id === hoveredTextId);
    if (!hoveredElement) return null;
    return {
      x: hoveredElement.x,
      y: hoveredElement.y,
      width: hoveredElement.width,
      height: hoveredElement.height,
    };
  }, [pageElements, tool, hoveredTextId]);

  const selectedElement = useMemo(
    () => pageElements.find((element) => element.id === selectedId) ?? null,
    [pageElements, selectedId]
  );

  const selectionHandleVisibility = shouldShowSelectionHandles as unknown as (input: {
    tool: Tool;
    selectedId: string | null;
    editingTextId: string | null;
    pendingPoint?: boolean;
  }) => boolean;

  const showSelectionHandles = useMemo(
    () => selectionHandleVisibility({ tool, selectedId, editingTextId, pendingPoint: pendingPoint !== null }),
    [tool, selectedId, editingTextId, pendingPoint],
  );

  const fontSizeOptions = useMemo(() => {
    const baseValues = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 28.5, 30, 32, 36, 40, 48, 60, 72];
    const selectedValue = Number(selectedElement?.fontSize ?? 18);
    const merged = [...baseValues, selectedValue];
    return Array.from(new Set(merged.map((value) => Number(value.toFixed(2))))).sort((left, right) => left - right);
  }, [selectedElement?.fontSize]);

  const matches = useMemo<SearchMatch[]>(
    () => {
      const composed = findComposedTextMatches(elements, findQuery) as SearchMatch[];
      if (composed.length) return composed;
      return (findTextMatches(elements, findQuery) as Array<{ id: string; pageIndex: number; x: number; y: number; text: string }>).map((match) => ({
        pageIndex: match.pageIndex,
        text: match.text,
        objectIds: [match.id],
        bbox: { x: match.x, y: match.y, width: 0, height: 0 },
      }));
    },
    [elements, findQuery]
  );

  const pageWidth = Math.round(pageDimensions.width * (zoom / 100));
  const pageHeight = Math.round(pageDimensions.height * (zoom / 100));

  const currentPageRotation = pageRotations[page] ?? 0;

  function goToPage(nextPage: number) {
    const target = Math.max(1, Math.min(pageCount || sourcePageCount || 1, nextPage));
    setPage(target);

    requestAnimationFrame(() => {
      const scrollTarget = scrollContainerRef.current;
      const pageNode = pageRefs.current[target];
      if (!scrollTarget || !pageNode) return;
      const top = Math.max(0, pageNode.offsetTop - 12);
      scrollTarget.scrollTo({ top, behavior: "smooth" });
    });
  }

  useEffect(() => {
    if (!file) {
      return;
    }

    const scrollTarget = scrollContainerRef.current;
    if (!scrollTarget) return;

    const syncChromeVisibility = () => {
      setShowFullChrome(scrollTarget.scrollTop <= 24);
    };

    syncChromeVisibility();
    scrollTarget.addEventListener("scroll", syncChromeVisibility, { passive: true });
    return () => scrollTarget.removeEventListener("scroll", syncChromeVisibility);
  }, [file]);

  useEffect(() => {
    if (!pageCount) return;

    const syncPageFromScroll = () => {
      const scrollTarget = scrollContainerRef.current;
      if (!scrollTarget) return;

      const viewportCenter = scrollTarget.scrollTop + scrollTarget.clientHeight / 2;
      let activePage = page;
      let closestDistance = Number.POSITIVE_INFINITY;

      Object.entries(pageRefs.current).forEach(([pageNumber, node]) => {
        if (!node) return;
        const midpoint = node.offsetTop + node.offsetHeight / 2;
        const distance = Math.abs(midpoint - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          activePage = Number(pageNumber);
        }
      });

      if (activePage !== page) {
        setPage(activePage);
      }
    };

    syncPageFromScroll();
    const scrollTarget = scrollContainerRef.current;
    if (!scrollTarget) return;
    scrollTarget.addEventListener("scroll", syncPageFromScroll, { passive: true });
    return () => scrollTarget.removeEventListener("scroll", syncPageFromScroll);
  }, [pageCount, page]);

  function commit(next: EditorElement[]) {
    setHistory((items) => [...items, elements]);
    setFuture([]);
    setElements(next);
  }

  function captureInlineSelection(elementId: string) {
    const node = editableTextRefs.current[elementId];
    const selection = window.getSelection();
    if (!node || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!node.contains(range.startContainer) || !node.contains(range.endContainer)) return;
    const before = range.cloneRange();
    before.selectNodeContents(node);
    before.setEnd(range.startContainer, range.startOffset);
    inlineSelectionRef.current = { elementId, start: before.toString().length, end: before.toString().length + range.toString().length };
  }

  function toggleSelectedBold() {
    if (!selectedId) return;
    const selection = inlineSelectionRef.current;
    if (selection?.elementId === selectedId && selection.start !== selection.end) {
      commit(elements.map((element) => element.id === selectedId ? applyBoldToRange(element, selection.start, selection.end) : element));
      return;
    }
    const selected = elements.find((element) => element.id === selectedId);
    if (!selected) return;
    updateSelected({ fontWeight: selected.fontWeight === "bold" ? "normal" : "bold" });
  }

  function pointFromEvent(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.closest("[data-editor-canvas]")?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  }

  function handlePdfFileChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    if (!next) return;

    if (!next.name.toLowerCase().endsWith(".pdf")) {
      setStatus("Please upload a valid PDF file.");
      return;
    }

    setFile(next);
    setPageOrder([]);
    setAddedPages([]);
    setPageRotations({});
    setPage(1);
    setStatus("Loading the PDF...");
    setDocumentError("");
    setTextEditorOpen(false);
    setHoveredTextId(null);
    setEditingTextId(null);
    if (event.target) event.target.value = "";
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    if (!next) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const nextElement = createElementAtPoint("image", { x: 39, y: 42 }, undefined, result);
      commit([...elements, nextElement]);
      setSelectedId(nextElement.id);
      setTool("select");
      setImageData(null);
      setStatus("Image inserted on the current page.");
    };
    reader.readAsDataURL(next);
    if (event.target) event.target.value = "";
  }

  function createElementAtPoint(kind: Exclude<Tool, "select">, point: { x: number; y: number }, textValue?: string, imageDataOverride?: string) {
    const baseElement: EditorElement = {
      id: makeId(kind),
      pageIndex: page,
      kind,
      x: point.x,
      y: point.y,
      width: kind === "whiteout" ? 18 : kind === "shape" ? 22 : kind === "link" ? 28 : kind === "highlight" ? 26 : kind === "strike" ? 28 : kind === "signature" ? 28 : 24,
      height: kind === "highlight" ? 6 : kind === "whiteout" ? 10 : kind === "shape" ? 12 : kind === "link" ? 6 : kind === "strike" ? 4 : 10,
      color: kind === "shape" || kind === "whiteout" || kind === "link" ? "#111827" : color,
      text: textValue ?? "",
      fontSize,
      fontWeight: "normal",
      source: "user",
    };

    if (kind === "image" && (imageDataOverride ?? imageData)) {
      return {
        ...baseElement,
        kind: "image",
        dataUrl: imageDataOverride ?? imageData ?? undefined,
        imageName: "uploaded-image",
        width: 22,
        height: 15,
      } satisfies EditorElement;
    }

    if (kind === "signature") {
      return {
        ...baseElement,
        kind: "signature",
        text: textValue ?? "Signature",
        fontSize: 22,
      } satisfies EditorElement;
    }

    if (kind === "link") {
      return {
        ...baseElement,
        kind: "link",
        text: textValue ?? "https://example.com",
        width: 30,
        height: 5,
      } satisfies EditorElement;
    }

    return baseElement satisfies EditorElement;
  }

  function addSelectedTextElement(point: { x: number; y: number }, value: string) {
    const textElement = createElementAtPoint("text", point, value);
    const next = [...elements, textElement];
    commit(next);
    setSelectedId(textElement.id);
    setTool("select");
    setTextEditorOpen(false);
    setEditingTextId(null);
    setDraft("");
    setPendingPoint(null);
  }

  function updateSelectedElementText(value: string) {
    if (!selectedId) return;

    const selected = elements.find((element) => element.id === selectedId);
    if (!selected) return;

    const next = replaceTextElementById(elements, selectedId, value || "") as EditorElement[];

    commit(next);
    setTextEditorOpen(false);
    setEditingTextId(null);
    setDraft("");
  }

  function handlePagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const point = pointFromEvent(event);

    const hitTarget = hitTestText(elements, page, point.x, point.y, 0, currentPageRotation);

    if (tool === "select") {
      setSelectedId(hitTarget ? hitTarget.id : null);
      return;
    }

    if (tool === "text") {
      if (hitTarget && hitTarget.kind === "text") {
        setSelectedId(hitTarget.id);
        setPendingPoint(null);
        return;
      }
      return;
    }

    if (tool === "image" && imageData) {
      const nextElement = createElementAtPoint("image", point);
      commit([...elements, nextElement]);
      setSelectedId(nextElement.id);
      setTool("select");
      setImageData(null);
      return;
    }

    const nextElement = createElementAtPoint(tool, point, tool === "link" ? "https://example.com" : tool === "signature" ? "Signature" : undefined);
    commit([...elements, nextElement]);
    setSelectedId(nextElement.id);
    setTool("select");
  }

  function handlePagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (tool !== "text") return;
    const point = pointFromEvent(event);
    const hit = hitTestText(elements, page, point.x, point.y, 2, currentPageRotation);
    setHoveredTextId((current) => current === hit?.id ? current : hit?.id ?? null);
  }

  function handleElementPointerDown(event: ReactPointerEvent<HTMLDivElement>, elementId: string) {
    event.stopPropagation();
    if (event.button !== 0) return;
    const element = elements.find((item) => item.id === elementId);
    const point = pointFromEvent(event);
    const target = element?.kind === "text" && tool === "select"
      ? hitTestText(elements, page, point.x, point.y, 2, currentPageRotation) ?? element
      : element;
    if (!target) return;
      setSelectedId(target.id);
    if (tool === "select" && target) {
      event.currentTarget.setPointerCapture(event.pointerId);
      interactionRef.current = { type: "drag", id: target.id, startX: event.clientX, startY: event.clientY, original: target, before: elements };
    }

    if (tool === "text") {
      if (target?.kind === "text") {
        setHoveredTextId(target.id);
        setEditingTextId(target.id);
        setDraft(target.text ?? target.originalText ?? "");
        setTextEditorOpen(true);
      }
    }
  }

  function handleTextClick(event: React.MouseEvent<HTMLDivElement>, element: EditorElement) {
    if (tool !== "text" || element.kind !== "text") return;
    event.stopPropagation();
    const activeElement = elements.find((item) => item.id === element.id) ?? element;
    setSelectedId(activeElement.id);
    setHoveredTextId(activeElement.id);
    setEditingTextId(activeElement.id);
    setDraft(activeElement.text ?? activeElement.currentText ?? activeElement.originalText ?? "");
    setPendingPoint(null);
    setTextEditorOpen(true);
  }

  function handleInlineTextBlur(elementId: string, value: string) {
    const nextValue = value ?? "";
    const matched = elements.find((element) => element.id === elementId);
    setPdfTextEdits((current) => ({ ...current, [elementId]: nextValue }));
    if (matched) {
      commit(replaceTextElementById(elements, elementId, nextValue) as EditorElement[]);
    }
    if (matched && matched.source === "extracted") {
      setEditingTextId((current) => current === elementId ? null : current);
      setTextEditorOpen(false);
      return;
    }
    setEditingTextId((current) => current === elementId ? null : current);
    setTextEditorOpen(false);
  }

  function handleTextPointerMove(event: ReactPointerEvent<HTMLDivElement>, element: EditorElement) {
    if (tool !== "text" || element.kind !== "text") return;
    const point = pointFromEvent(event);
    const hit = hitTestText(elements, page, point.x, point.y, 2, currentPageRotation);
    setHoveredTextId((current) => current === hit?.id ? current : hit?.id ?? null);
  }

  function handleTextPointerLeave() {
    setHoveredTextId(null);
  }

  function canvasRect(event: ReactPointerEvent<HTMLElement>) {
    return event.currentTarget.closest("[data-editor-canvas]")?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
  }

  function beginResize(event: ReactPointerEvent<HTMLButtonElement>, element: EditorElement, handle: string) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = { type: "resize", id: element.id, startX: event.clientX, startY: event.clientY, original: element, before: elements, handle };
    interactionPointerRef.current = null;
  }

  function beginRotation(event: ReactPointerEvent<HTMLButtonElement>, element: EditorElement) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    interactionRef.current = { type: "rotate", id: element.id, startX: event.clientX, startY: event.clientY, original: element, before: elements };
    interactionPointerRef.current = null;
  }

  function applyInteractionPointer(pointer: InteractionPointer) {
    const interaction = interactionRef.current;
    if (!interaction) return;
    const dx = ((pointer.clientX - interaction.startX) / pointer.pageWidth) * 100;
    const dy = ((pointer.clientY - interaction.startY) / pointer.pageHeight) * 100;
    if (interaction.type === "drag") {
      setElements((current) => current.map((element) => element.id === interaction.id ? { ...element, x: Math.max(0, Math.min(100 - element.width, interaction.original.x + dx)), y: Math.max(0, Math.min(100 - element.height, interaction.original.y + dy)) } : element));
    } else if (interaction.type === "resize") {
      const next = resizeElement(interaction.original, interaction.handle ?? "bottom-right", dx, dy, { preserveAspect: interaction.original.kind === "image" && pointer.shiftKey });
      setElements((current) => current.map((element) => element.id === interaction.id ? next : element));
    } else {
      const center = { x: interaction.original.x + interaction.original.width / 2, y: interaction.original.y + interaction.original.height / 2 };
      const rotationPointer = { x: ((pointer.clientX - pointer.pageLeft) / pointer.pageWidth) * 100, y: ((pointer.clientY - pointer.pageTop) / pointer.pageHeight) * 100 };
      const next = { ...interaction.original, rotation: rotationFromPointer(center, rotationPointer) };
      setElements((current) => current.map((element) => element.id === interaction.id ? next : element));
    }
  }

  function handleElementPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const interaction = interactionRef.current;
    if (!interaction || event.buttons !== 1) return;
    const pageRect = canvasRect(event);
    if (!pageRect) return;
    interactionPointerRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pageLeft: pageRect.left,
      pageTop: pageRect.top,
      pageWidth: pageRect.width,
      pageHeight: pageRect.height,
      shiftKey: event.shiftKey,
    };
    if (interactionFrameRef.current !== null) return;
    interactionFrameRef.current = requestAnimationFrame(() => {
      interactionFrameRef.current = null;
      const pointer = interactionPointerRef.current;
      if (pointer) applyInteractionPointer(pointer);
    });
  }

  function handleElementPointerUp(event?: ReactPointerEvent<HTMLElement>) {
    const interaction = interactionRef.current;
    if (!interaction) return;
    if (interactionFrameRef.current !== null) {
      cancelAnimationFrame(interactionFrameRef.current);
      interactionFrameRef.current = null;
    }
    const pointer = interactionPointerRef.current;
    if (pointer) applyInteractionPointer(pointer);
    interactionPointerRef.current = null;
    interactionRef.current = null;
    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setHistory((items) => [...items, interaction.before]);
    setFuture([]);
  }

  function handleElementPointerCancel(event: ReactPointerEvent<HTMLElement>) {
    interactionPointerRef.current = null;
    if (interactionFrameRef.current !== null) {
      cancelAnimationFrame(interactionFrameRef.current);
      interactionFrameRef.current = null;
    }
    interactionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function selectMatch(index: number) {
    if (!matches.length) return;
    const normalizedIndex = (index + matches.length) % matches.length;
    const match = matches[normalizedIndex];
    setMatchIndex(normalizedIndex);
    goToPage(match.pageIndex);
    setSelectedId(match.objectIds[0] ?? null);
  }

  function replaceCurrentMatch() {
    const match = matches[matchIndex];
    if (!match || !replaceQuery) return;
    const affected = new Set(match.objectIds);
    const firstId = match.objectIds[0];
    const next = elements.map((element) => {
      if (!affected.has(element.id)) return element;
      return replaceTextElement(element, element.id === firstId ? replaceQuery : "");
    });
    commit(next);
  }

  function replaceAllMatches() {
    if (!matches.length || !replaceQuery) return;
    const ids = new Set(matches.flatMap((match) => match.objectIds));
    commit(elements.map((element) => {
      if (!ids.has(element.id)) return element;
      const match = matches.find((candidate) => candidate.objectIds.includes(element.id));
      return replaceTextElement(element, match?.objectIds[0] === element.id ? replaceQuery : "");
    }));
  }

  function applyRequestedCorrections() {
    const corrections = elements.map((element) => {
      if (element.kind !== "text") return element;

      const sourceText = String(element.currentText ?? element.text ?? element.originalText ?? "");
      const replacementText = element.pageIndex === 1
        ? sourceText.replace(/project/gi, "manish")
        : element.pageIndex === 6
          ? sourceText.replace(/uniwest/gi, "manish")
          : sourceText;

      if (replacementText === sourceText) return element;
      return replaceTextElement(element, replacementText);
    });

    const changed = corrections.filter((element, index) => element.currentText !== elements[index]?.currentText);
    if (!changed.length) {
      setStatus("No matching PROJECT or UNIWEST text was found on pages 1 and 6.");
      return;
    }

    commit(corrections);
    setRequestedCorrectionCount(changed.length);
    setRequestedCorrectionApplied(true);
    setStatus(`Applied ${changed.length} requested text correction${changed.length === 1 ? "" : "s"}.`);
  }

  function moveCurrentPage(direction: -1 | 1) {
    const currentOrder = pageOrder.length ? pageOrder : Array.from({ length: sourcePageCount }, (_, index) => index);
    const targetIndex = page - 1 + direction;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;
    const nextOrder = [...currentOrder];
    [nextOrder[page - 1], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[page - 1]];
    const remapped = elements.map((element) => {
      if (element.pageIndex === page) return { ...element, pageIndex: targetIndex + 1 };
      if (element.pageIndex === targetIndex + 1) return { ...element, pageIndex: page };
      return element;
    });
    commit(remapped);
    setPageOrder(nextOrder);
    goToPage(targetIndex + 1);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [elements, ...items]);
    setHistory((items) => items.slice(0, -1));
    setElements(previous);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setHistory((items) => [...items, elements]);
    setFuture((items) => items.slice(1));
    setElements(next);
  }

  function deleteSelected() {
    if (!selectedId) return;
    commit(elements.filter((element) => element.id !== selectedId));
    setSelectedId(null);
  }

  function duplicateSelected() {
    if (!selectedId) return;
    const selected = elements.find((element) => element.id === selectedId);
    if (!selected) return;

    const duplicated = {
      ...selected,
      id: makeId(selected.kind),
      x: Math.min(96, selected.x + 2),
      y: Math.min(96, selected.y + 2),
      currentText: selected.currentText ?? selected.text ?? selected.originalText ?? "",
      text: selected.text ?? selected.currentText ?? selected.originalText ?? "",
      changed: true,
    } as EditorElement;

    commit([...elements, duplicated]);
    setSelectedId(duplicated.id);
  }

  function moveSelected() {
    if (!selectedId) return;
    setTool("select");
    setStatus("Drag the selected text to move it.");
  }

  function updateSelected(patch: Partial<EditorElement>) {
    if (!selectedId) return;
    commit(elements.map((element) => {
      if (element.id !== selectedId) return element;
      const next = { ...element, ...patch };
      if (patch.fontWeight) {
        next.changed = true;
        next.edited = true;
        next.fontWeightExplicit = true;
        next.isBold = patch.fontWeight === "bold";
        next.initialFontWeight = patch.fontWeight;
        next.capturedFontWeight = patch.fontWeight;
        next.sourceStyle = next.sourceStyle ? { ...next.sourceStyle, fontWeight: patch.fontWeight } : next.sourceStyle;
      }
      return next;
    }));
  }

  function handleTextSave() {
    if (!pendingPoint && !selectedId) return;
    if (pendingPoint) {
      addSelectedTextElement(pendingPoint, draft.trim() || "New text");
      return;
    }
    updateSelectedElementText(draft.trim() || "New text");
  }

  function placeCaretInInlineText(elementId: string, clientX?: number, clientY?: number) {
    const node = editableTextRefs.current[elementId];
    if (!node) return;

    requestAnimationFrame(() => {
      node.focus();
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      const documentWithCaret = document as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
        caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
      };
      const pointRange = clientX == null || clientY == null
        ? null
        : documentWithCaret.caretRangeFromPoint?.(clientX, clientY) ?? null;
      if (pointRange && node.contains(pointRange.startContainer)) {
        range.setStart(pointRange.startContainer, pointRange.startOffset);
        range.collapse(true);
      } else {
        range.selectNodeContents(node);
        range.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }

  useEffect(() => {
    function handleEditorKeyDown(event: KeyboardEvent) {
      if (!selectedId || textEditorOpen || !file) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active?.getAttribute("contenteditable") === "true") return;
      const selected = elements.find((element) => element.id === selectedId);
      if (!selected) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        const duplicate = { ...selected, id: makeId(selected.kind), x: Math.min(96, selected.x + 2), y: Math.min(96, selected.y + 2) };
        commit([...elements, duplicate]);
        setSelectedId(duplicate.id);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        clipboardRef.current = { ...selected };
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v" && clipboardRef.current) {
        event.preventDefault();
        const pasted = { ...clipboardRef.current, id: makeId(clipboardRef.current.kind), x: Math.min(96, clipboardRef.current.x + 2), y: Math.min(96, clipboardRef.current.y + 2) };
        commit([...elements, pasted]);
        setSelectedId(pasted.id);
        return;
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const deltaX = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const deltaY = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        commit(elements.map((element) => element.id === selectedId ? { ...element, x: Math.max(0, Math.min(100 - element.width, element.x + deltaX)), y: Math.max(0, Math.min(100 - element.height, element.y + deltaY)) } : element));
      }
    }
    window.addEventListener("keydown", handleEditorKeyDown);
    return () => window.removeEventListener("keydown", handleEditorKeyDown);
  }, [elements, file, selectedId, textEditorOpen]);

  function handleExport() {
    if (!file) return;

    setIsExporting(true);
    setStatus("Applying changes...");

    void (async () => {
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("elements", JSON.stringify(elements));
        if (pageOrder.length) form.append("pageOrder", JSON.stringify(pageOrder));
        form.append("pageRotations", JSON.stringify(pageRotations));
        form.append("addedPages", JSON.stringify(addedPages));
        const response = await fetch("/api/pdf/edit", { method: "POST", body: form });
        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { message?: string } | null;
          throw new Error(payload?.message || "Unable to edit this PDF.");
        }
        const pdfBuffer = new Uint8Array(await response.arrayBuffer());
        const blob = new Blob([pdfBuffer.buffer], { type: "application/pdf" });
        const safeName = editedFilename(file.name || "document.pdf");
        downloadBlob(blob, safeName);
        setStatus("Your edited PDF is ready to download.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to export this PDF.");
      } finally {
        setIsExporting(false);
      }
    })();
  }

  if (!file) {
    return (
      <main className="min-h-screen bg-[#edf3f6] text-[#1a2b36] dd-editor-shell">
        <header className="border-b border-[#dfe7ec] bg-white">
          <div className="mx-auto flex h-[72px] max-w-[1536px] items-center gap-6 px-5 sm:px-10">
            <div className="flex shrink-0 items-center gap-3">
              <img src="/images/logo.png" alt="DigiDesk India" className="h-12 w-12 object-contain" />
            </div>

            <nav className="hidden items-center gap-7 text-[15px] font-medium text-[#1d2a32] md:flex">
              <button type="button" className="inline-flex items-center gap-2 rounded-md border border-[#dfe7ec] bg-[#f7fafb] px-3 py-2">All Tools <ChevronDown size={15} /></button>
              <span>Compress</span>
              <span>Edit</span>
              <span>Fill &amp; Sign</span>
              <span>Merge</span>
              <span>Delete Pages</span>
              <span>Crop</span>
            </nav>

            <div className="ml-auto hidden items-center gap-6 text-[15px] font-medium text-[#1d2a32] xl:flex">
              <span>Pricing</span>
              <span>Desktop</span>
              <span>Log in</span>
              <Languages size={20} />
            </div>
          </div>
        </header>

        <section className="bg-[#edf3f6] px-5 pb-12 pt-12 text-center sm:px-10">
          <div className="mx-auto max-w-[1100px]">
              <div className="flex items-end justify-center gap-4 text-[42px] font-extrabold leading-none tracking-[-1.6px] text-[#2a2f35] sm:text-[64px]">
              <span>DIGIDESK INDIA PDF EDITOR</span>
            </div>
            <p className="mt-4 text-[26px] font-light leading-none text-[#8b9aa5] sm:text-[36px]">Edit PDF files for free</p>
          </div>
        </section>

        <div className="mx-auto max-w-[1500px] px-4 pb-8 sm:px-6">
          <div className="rounded-lg border border-[#cfe1ea] bg-[#edf3f6] p-5 shadow-inner shadow-[#dfeaf0]">
            <div className="mx-auto flex max-w-[860px] flex-col items-center justify-center gap-5 rounded-xl border border-[#d7e8f2] bg-white p-6 shadow-[0_10px_26px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-center gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#800020] px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-[#68001a]">
                  <Upload size={18} /> Upload PDF file
                </button>
                <button type="button" className="flex h-12 w-11 items-center justify-center rounded-md border border-[#800020] bg-[#fff1f2] text-[#800020]">
                  <ChevronDown size={18} />
                </button>
              </div>
              <button type="button" onClick={() => setStatus("Blank document mode is ready for typed PDF content.")} className="text-sm font-medium text-[#800020] hover:underline">or start with a blank document</button>
            </div>
          </div>
        </div>

        <input ref={fileInputRef} hidden type="file" accept="application/pdf,.pdf" onChange={handlePdfFileChange} />
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-transparent text-[#1d2b34] dd-editor-shell" style={{ background: "transparent", backgroundColor: "transparent", backgroundImage: "none", boxShadow: "none" }}>
      {(!file || showFullChrome) && (
        <>
          <header className="shrink-0 border-b border-[#dfe7ec] bg-white">
            <div className="mx-auto flex h-[58px] max-w-[1536px] items-center gap-4 px-4 sm:px-7">
              <div className="flex shrink-0 items-center gap-2.5">
                <img src="/images/logo.png" alt="DigiDesk India" className="h-10 w-10 object-contain" />
              </div>

              <nav className="hidden items-center gap-5 text-[13px] font-medium text-[#1d2a32] md:flex">
                <button type="button" className="inline-flex items-center gap-2 rounded-md border border-[#dfe7ec] bg-[#f7fafb] px-2.5 py-1.5 shadow-[0_1px_0_rgba(15,23,42,0.02)]">All Tools <ChevronDown size={14} /></button>
                <span>Compress</span>
                <span>Edit</span>
                <span>Fill &amp; Sign</span>
                <span>Merge</span>
                <span>Delete Pages</span>
                <span>Crop</span>
              </nav>

              <div className="ml-auto hidden items-center gap-5 text-[13px] font-medium text-[#1d2a32] xl:flex">
                <span>Pricing</span>
                <span>Desktop</span>
                <span>Log in</span>
                <Languages size={20} />
              </div>
            </div>
          </header>

          <section className="bg-transparent px-3 pb-5 pt-8 text-center sm:px-6" style={{ background: "transparent", backgroundColor: "transparent", backgroundImage: "none" }}>
            <div className="mx-auto max-w-[1100px]">
              <div className="flex items-end justify-center gap-3 text-[40px] font-extrabold leading-[0.95] tracking-[-0.06em] text-[#2e343b] sm:text-[58px]">
                <span>DIGIDESK INDIA PDF EDITOR</span>
              </div>
              <p className="mt-3 text-[20px] font-light leading-none text-[#9aa8b0] sm:text-[28px]">Edit PDF files for free</p>
            </div>
          </section>
        </>
      )}

      <div className="dd-toolbar-shell shrink-0 pointer-events-none" style={{ background: "transparent", backgroundColor: "transparent", backgroundImage: "none", border: "none", borderTop: "none", borderBottom: "none", boxShadow: "none", backdropFilter: "none", WebkitBackdropFilter: "none" }}>
        <div className="mx-auto max-w-[1536px] px-3 pb-0 sm:px-4">
          <div className="editor-chrome flex w-full flex-col items-center pointer-events-none">
            <div className="toolbar-center-wrapper flex w-full justify-center pointer-events-none">
              <div className="toolbar-shell pointer-events-auto w-full max-w-[min(92vw,910px)] overflow-hidden">
                <div className="toolbar-row flex w-full min-w-max items-center gap-0 overflow-x-auto whitespace-nowrap dd-toolbar-scroll">
                  {toolbarItems.map(({ tool: itemTool, label, icon: Icon, hasDropdown }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (itemTool === "forms") {
                          setStatus("Form fields are not available for this PDF yet.");
                          return;
                        }
                        if (itemTool === "image") {
                          imageInputRef.current?.click();
                          return;
                        }
                        setTool(itemTool);
                      }}
                      data-active={tool === itemTool}
                      className="dd-tool-button flex h-[47px] shrink-0 items-center gap-1 border-r border-[#bfdaf0] bg-white px-2.5 text-[12.5px] font-medium text-[#1d5d7f] last:border-r-0"
                    >
                      <Icon size={14} className="stroke-[2.1]" />
                      <span>{label}</span>
                      {hasDropdown && <ChevronDown size={12} />}
                    </button>
                  ))}

                  <button type="button" title="Undo" disabled={!history.length} onClick={undo} className="flex h-[47px] shrink-0 items-center gap-1.5 border-l border-[#bfdaf0] bg-white px-2.5 text-[12.5px] font-medium text-[#1d5d7f] disabled:opacity-35">
                    <Undo2 size={15} />
                    <span>Undo</span>
                  </button>

                </div>
              </div>
            </div>

            <div className="page-controls-shell pointer-events-auto mt-1 w-full max-w-[1536px] overflow-hidden">
              <div className="page-controls-row flex w-full flex-wrap items-center justify-between gap-2 px-3 py-1.5">
                <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#3a4f5d]">
                  <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 1} className="flex h-7 w-7 items-center justify-center rounded border border-[#c1d9e8] bg-white text-[#1d5d7f] disabled:opacity-40">
                    <ChevronLeft size={13} />
                  </button>
                  <span className="px-1">{page} / {pageCount || "..."}</span>
                  <button type="button" onClick={() => goToPage(page + 1)} disabled={page === pageCount} className="flex h-7 w-7 items-center justify-center rounded border border-[#c1d9e8] bg-white text-[#1d5d7f] disabled:opacity-40">
                    <ChevronRight size={13} />
                  </button>
                  <button type="button" onClick={() => {
                    const nextPage = pageCount + 1;
                    setPageOrder((current) => [...(current.length ? current : Array.from({ length: sourcePageCount }, (_, index) => index)), null]);
                    setAddedPages((current) => [...current, { pageIndex: nextPage, width: 595.28, height: 841.89, rotation: 0 }]);
                    setPageCount(nextPage);
                    goToPage(nextPage);
                  }} className="inline-flex items-center gap-1.5 rounded border border-[#c1d9e8] bg-white px-1.5 py-1 text-[#1d5d7f]">
                    <Plus size={13} /> Add blank page
                  </button>
                  <button type="button" onClick={() => {
                    if (pageCount <= 1) return;
                    const currentOrder = pageOrder.length ? pageOrder : Array.from({ length: sourcePageCount }, (_, index) => index);
                    const nextOrder = currentOrder.filter((_, index) => index !== page - 1);
                    commit(elements
                      .filter((element) => element.pageIndex !== page)
                      .map((element) => element.pageIndex > page ? { ...element, pageIndex: element.pageIndex - 1 } : element));
                    setPageOrder(nextOrder);
                    setAddedPages((current) => current.filter((item) => item.pageIndex !== page).map((item) => item.pageIndex > page ? { ...item, pageIndex: item.pageIndex - 1 } : item));
                    setPageCount(nextOrder.length);
                    goToPage(Math.min(page, Math.max(1, nextOrder.length)));
                  }} className="inline-flex items-center gap-1.5 rounded border border-[#c1d9e8] bg-white px-1.5 py-1 text-[#1d5d7f]">
                    <Trash2 size={13} /> Delete page
                  </button>
                  <button type="button" onClick={() => moveCurrentPage(-1)} disabled={page === 1} className="rounded border border-[#c1d9e8] bg-white px-1.5 py-1 text-[#1d5d7f] disabled:opacity-40">Move up</button>
                  <button type="button" onClick={() => moveCurrentPage(1)} disabled={page === pageCount} className="rounded border border-[#c1d9e8] bg-white px-1.5 py-1 text-[#1d5d7f] disabled:opacity-40">Move down</button>
                </div>

                <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#3a4f5d]">
                  <button type="button" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="flex h-7 w-7 items-center justify-center rounded border border-[#c1d9e8] bg-white text-[#1d5d7f]">
                    <Minus size={13} />
                  </button>
                  <span className="w-12 text-center font-bold text-[#1d5d7f]">{zoom}%</span>
                  <button type="button" onClick={() => setZoom((value) => Math.min(200, value + 10))} className="flex h-7 w-7 items-center justify-center rounded border border-[#c1d9e8] bg-white text-[#1d5d7f]">
                    <Plus size={13} />
                  </button>
                  <button type="button" title="Rotate page" onClick={() => setPageRotations((current) => ({ ...current, [page]: ((current[page] ?? 0) + 90) % 360 }))} className="flex h-7 w-7 items-center justify-center rounded border border-[#c1d9e8] bg-white text-[#1d5d7f]">
                    <RotateCw size={13} />
                  </button>
                  <button type="button" title="Find and replace" onClick={() => setShowFind((current) => !current)} className="flex h-7 w-7 items-center justify-center rounded border border-[#c1d9e8] bg-white text-[#1d5d7f]">
                    <Type size={13} />
                  </button>
                </div>
              </div>

              {showFind && (
                <div className="flex flex-wrap items-end gap-2 border-t border-[#d1dbe2] bg-[#f1f5f8] px-4 py-3 text-[14px] text-[#3a4f5d]">
                  <label className="text-xs font-semibold text-[#4b5d6d]">
                    Find
                    <input value={findQuery} onChange={(event) => { setFindQuery(event.target.value); setMatchIndex(0); }} className="mt-1 block w-44 rounded border border-[#c1d9e8] bg-white px-2 py-1.5 text-sm" />
                  </label>
                  <label className="text-xs font-semibold text-[#4b5d6d]">
                    Replace
                    <input value={replaceQuery} onChange={(event) => setReplaceQuery(event.target.value)} className="mt-1 block w-44 rounded border border-[#c1d9e8] bg-white px-2 py-1.5 text-sm" />
                  </label>
                  <span className="pb-2 text-xs font-semibold text-[#4b5d6d]">{matches.length ? `${matchIndex + 1} of ${matches.length} matches` : "No matches"}</span>
                  <button type="button" disabled={!matches.length} onClick={() => selectMatch(matchIndex - 1)} className="rounded border border-[#c1d9e8] bg-white px-2 py-1.5 disabled:opacity-40">Previous</button>
                  <button type="button" disabled={!matches.length} onClick={() => selectMatch(matchIndex + 1)} className="rounded border border-[#c1d9e8] bg-white px-2 py-1.5 disabled:opacity-40">Next</button>
                  <button type="button" disabled={!matches.length || !replaceQuery} onClick={replaceCurrentMatch} className="rounded border border-[#c1d9e8] bg-white px-2 py-1.5 disabled:opacity-40">Replace</button>
                  <button type="button" disabled={!matches.length || !replaceQuery} onClick={replaceAllMatches} className="rounded border border-[#c1d9e8] bg-white px-2 py-1.5 disabled:opacity-40">Replace all</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none fixed bottom-3 left-1/2 z-50 -translate-x-1/2"
        style={{
          background: "transparent",
          backgroundColor: "transparent",
          backgroundImage: "none",
          boxShadow: "none",
          border: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          padding: 0,
          margin: 0,
          minHeight: 0,
          height: "auto",
          width: "auto",
        }}
      >
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="pointer-events-auto inline-flex h-[52px] w-[280px] max-w-[calc(100%-18px)] items-center justify-center gap-2 rounded-[12px] border border-[#6b1f32] bg-[#8b1e3f] px-4 text-[18px] font-extrabold tracking-[-0.04em] text-white shadow-[inset_0_-3px_0_rgba(74,0,18,0.2),0_2px_0_rgba(74,0,18,0.18)] transition hover:bg-[#721832] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="leading-none">{isExporting ? "Applying..." : "Apply changes"}</span>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-white/10 text-[18px] leading-none">
            <ChevronRight size={17} />
          </span>
        </button>
      </div>

      <input ref={fileInputRef} hidden type="file" accept="application/pdf,.pdf" onChange={handlePdfFileChange} />
      <input ref={imageInputRef} hidden type="file" accept="image/png,image/jpeg" onChange={handleImageFileChange} />

      <div className="mx-auto flex h-full w-full min-h-0 flex-1 overflow-hidden px-3 pt-0 sm:px-6">
        <div
          ref={scrollContainerRef}
          data-pdf-scroll-root
          className="dd-editor-shell h-full min-h-0 flex-1 overflow-y-auto overflow-x-auto bg-transparent px-0 py-5 overscroll-contain"
          style={{ background: "transparent", backgroundColor: "transparent" }}
        >
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => {
              setPageCount(numPages);
              setDocumentError("");
            }}
            loading={<div className="py-20 text-center text-slate-500">Loading PDF...</div>}
            error={(
              <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
                <p className="font-semibold text-red-600">{documentError || "Unable to load this PDF."}</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-md bg-[#800020] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#68001a]">
                  <Upload size={16} /> Choose another PDF
                </button>
              </div>
            )}
          >
            {Array.from({ length: pageCount || 1 }, (_, pageIndex) => {
              const pageNumber = pageIndex + 1;
              const isActive = pageNumber === page;
              return (
                <div key={pageNumber} ref={(node) => { pageRefs.current[pageNumber] = node; }} data-scroll-page={pageNumber} onMouseEnter={() => { if (page !== pageNumber) setPage(pageNumber); }} onWheel={() => { if (page !== pageNumber) setPage(pageNumber); }} className="mx-auto mb-8 w-fit last:mb-0">
                  <div className="relative bg-white shadow-[0_10px_28px_rgba(15,23,42,0.18)]" style={{ width: pageWidth }}>
                    <div
                      onPointerDown={isActive ? handlePagePointerDown : undefined}
                      onPointerMove={isActive ? handlePagePointerMove : undefined}
                      onPointerLeave={isActive ? handleTextPointerLeave : undefined}
                      className="relative"
                      style={{ width: pageWidth }}
                      data-editor-canvas={isActive ? true : undefined}
                    >
                      {pageNumber <= sourcePageCount ? (
                        <Page pageNumber={pageNumber} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false} onLoadSuccess={(loadedPage) => { if (isActive) setPageDimensions({ width: loadedPage.originalWidth, height: loadedPage.originalHeight }); }} />
                      ) : (
                        <div style={{ width: pageWidth, height: Math.round(pageDimensions.height * (zoom / 100)) }} className="bg-white" />
                      )}

                      {isActive && (
                        <>
                          <div
                            className="pdf-inline-text-layer pointer-events-none absolute left-0 top-0 z-10 h-full w-full"
                            style={{ fontVariantLigatures: "none", textShadow: "none" }}
                            data-main-roles="text-layer"
                            onPointerDown={handlePagePointerDown}
                            onClick={(event) => {
                              if (tool !== "select" && tool !== "text") {
                                handlePagePointerDown(event as unknown as ReactPointerEvent<HTMLDivElement>);
                              }
                            }}
                          >
                              {hoveredLineBounds && (
                                <div
                                  aria-hidden="true"
                                  style={{
                                    position: "absolute",
                                    left: `${hoveredLineBounds.x}%`,
                                    top: `${hoveredLineBounds.y}%`,
                                    width: `${hoveredLineBounds.width}%`,
                                    height: `${hoveredLineBounds.height}%`,
                                    background: "rgba(46, 204, 113, 0.12)",
                                            border: "1px dashed #8b1e3f",
                                    boxSizing: "border-box",
                                    pointerEvents: "none",
                                    zIndex: 11,
                                  }}
                                />
                              )}
                            {pageElements.map((element) => {
                              const isSelected = selectedId === element.id;
                              const isHovered = hoveredTextId === element.id && tool === "text" && element.kind === "text";
                              const isEditing = textEditorOpen && selectedId === element.id;
                              const domRect = getEditorDomRect(element, { left: 0, top: 0, width: pageWidth, height: pageHeight }, pageDimensions, currentPageRotation);
                              const commonStyle: React.CSSProperties = {
                                position: "absolute",
                                left: `${domRect.left}px`,
                                top: `${domRect.top}px`,
                                width: `${Math.max(2, domRect.width)}px`,
                                height: `${Math.max(2, domRect.height)}px`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: element.kind === "shape" ? 10 : 0,
                                border: element.kind === "text"
                                  ? "none"
                                  : isSelected
                                    ? "1px solid #ff2952"
                                    : isHovered
                                      ? "1px solid rgba(37,99,235,0.8)"
                                      : "none",
                                background: element.kind === "highlight" ? "rgba(250, 204, 21, 0.38)" : element.kind === "whiteout" ? "#ffffff" : "transparent",
                                boxShadow: element.kind === "text"
                                  ? isSelected
                                    ? "inset 0 0 0 1px rgba(37,99,235,0.22)"
                                    : isHovered
                                      ? "inset 0 0 0 1px rgba(37,99,235,0.08)"
                                      : "none"
                                  : isSelected
                                    ? "0 0 0 2px rgba(255,41,82,0.15)"
                                    : "none",
                                fontVariantLigatures: "none",
                                textShadow: "none",
                                transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                                transformOrigin: "center",
                                cursor: tool === "text" && element.kind === "text" ? "text" : tool === "select" ? "move" : "default",
                                pointerEvents: "auto",
                              };

                              if (element.kind === "text") {
                                const renderText = shouldRenderTextElement(element);
                                const htmlText = cleanInlinePdfText(pdfTextEdits[element.id] ?? element.currentText ?? element.text ?? element.originalText ?? "");
                                const isInlineEditing = editingTextId === element.id;
                                const isModifiedExtractedText = element.source === "extracted" && (element.changed === true || shouldRenderTextElement(element));
                                const layoutWidth = getTextLayoutWidth(element);
                                const layoutDomRect = layoutWidth > 0 && element.source === "extracted"
                                  ? getEditorDomRect({ ...element, width: (layoutWidth / Math.max(pageDimensions.width, 1)) * 100 }, { left: 0, top: 0, width: pageWidth, height: pageHeight }, pageDimensions, currentPageRotation)
                                  : domRect;
                                const maskLeft = Math.max(0, domRect.left - 10);
                                const maskRight = Math.min(pageWidth, domRect.left + domRect.width + 10);
                                const maskWidth = Math.max(maskRight - maskLeft, 2);
                                const maskHeight = Math.max(domRect.height + 4, 2);

                                if (element.source === "extracted") {
                                  return (
                                    <Fragment key={element.id}>
                                      {(isModifiedExtractedText || isInlineEditing) && (
                                        <div
                                          aria-hidden="true"
                                          style={{
                                            position: "absolute",
                                            left: `${maskLeft}px`,
                                            top: `${domRect.top - 2}px`,
                                            width: `${maskWidth}px`,
                                            height: `${maskHeight}px`,
                                            display: "block",
                                            background: "white",
                                            backgroundColor: "white",
                                            opacity: 1,
                                            zIndex: 5,
                                            pointerEvents: "none",
                                            mixBlendMode: "normal",
                                            filter: "none",
                                          }}
                                        />
                                      )}
                                      <div
                                        ref={(node) => {
                                          editableTextRefs.current[element.id] = node;
                                        }}
                                        contentEditable={isInlineEditing}
                                        suppressContentEditableWarning={true}
                                        spellCheck={false}
                                        autoCapitalize="off"
                                        aria-label={`Edit text: ${htmlText || "PDF text"}`}
                                        data-edit-text-id={element.id}
                                        data-pdf-x={element.pdfX}
                                        data-pdf-y={element.pdfY}
                                        data-pdf-width={element.pdfWidth}
                                        data-pdf-line-width={getTextLayoutWidth(element)}
                                        data-pdf-font-family={element.fontFamily}
                                        data-pdf-font-size={element.fontSize}
                                        data-pdf-text-runs={element.textRuns ? JSON.stringify(element.textRuns) : undefined}
                                        onPointerDown={(event) => {
                                          if (tool === "image") {
                                            handlePagePointerDown(event);
                                            return;
                                          }
                                          event.stopPropagation();
                                          setSelectedId(element.id);
                                        }}
                                        onPointerMove={(event) => handleTextPointerMove(event, element)}
                                        onMouseEnter={(event) => handleTextPointerMove(event as unknown as ReactPointerEvent<HTMLDivElement>, element)}
                                        onMouseDown={(event) => {
                                          if (tool === "image") {
                                            handlePagePointerDown(event as unknown as ReactPointerEvent<HTMLDivElement>);
                                            return;
                                          }
                                          event.stopPropagation();
                                          setSelectedId(element.id);
                                        }}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setSelectedId(element.id);
                                          setEditingTextId(element.id);
                                          setTextEditorOpen(true);
                                          placeCaretInInlineText(element.id, event.clientX, event.clientY);
                                        }}
                                        onDoubleClick={(event) => {
                                          event.stopPropagation();
                                          setSelectedId(element.id);
                                          setEditingTextId(element.id);
                                          setTextEditorOpen(true);
                                          placeCaretInInlineText(element.id, event.clientX, event.clientY);
                                        }}
                                        onFocus={() => {
                                          const node = editableTextRefs.current[element.id];
                                          const capturedFontWeight = window.getComputedStyle(node ?? document.body).fontWeight;
                                          const capturedIsBold = capturedFontWeight === "bold" || Number(capturedFontWeight) >= 600;
                                          if (node && !renderText) node.textContent = htmlText;
                                          setSelectedId(element.id);
                                          setEditingTextId(element.id);
                                          setDraft(htmlText);
                                          setTextEditorOpen(true);
                                          setElements((current) => current.map((item) => item.id !== element.id ? item : {
                                            ...item,
                                            capturedFontWeight,
                                            isBold: item.isBold || capturedIsBold,
                                          }));
                                        }}
                                        onInput={(event) => {
                                          event.currentTarget.dataset.currentText = cleanInlinePdfText(event.currentTarget.textContent ?? "");
                                          if (isInlineEditing) {
                                            const editorNode = event.currentTarget;
                                            editorNode.style.whiteSpace = "nowrap";
                                            editorNode.style.width = `${Math.min(pageWidth - domRect.left, Math.max(domRect.width, editorNode.scrollWidth))}px`;
                                          }
                                        }}
                                        onMouseUp={() => captureInlineSelection(element.id)}
                                        onKeyUp={() => captureInlineSelection(element.id)}
                                        onSelect={() => captureInlineSelection(element.id)}
                                        onBlur={(event) => handleInlineTextBlur(element.id, cleanInlinePdfText(event.currentTarget.textContent ?? ""))}
                                        style={{
                                          position: "absolute",
                                          display: "block",
                                          left: `${domRect.left}px`,
                                          top: `${domRect.top}px`,
                                          width: `${Math.max(isInlineEditing ? domRect.width : isModifiedExtractedText ? layoutDomRect.width : domRect.width, 2)}px`,
                                          height: `${Math.max(domRect.height, 2)}px`,
                                          boxSizing: "border-box",
                                          margin: 0,
                                          padding: 0,
                                          border: isInlineEditing
                                            ? "1px dashed #8b1e3f"
                                            : "1px solid transparent",
                                          textDecoration: "none",
                                          boxShadow: "none",
                                          fontVariantLigatures: "none",
                                          textShadow: "none",
                                          color: renderText || isInlineEditing
                                            ? element.color ?? "#111827"
                                            : "transparent",
                                          backgroundColor: isInlineEditing ? "rgba(46, 204, 113, 0.12)" : "transparent",
                                          fontFamily: element.fontFamily ?? "Helvetica",
                                          fontSize: `${(element.fontSize ?? 12) * (zoom / 100)}px`,
                                          lineHeight: 1,
                                          fontWeight: getEffectiveFontWeight(element),
                                          fontStyle: element.italic ? "italic" : "normal",
                                          whiteSpace: isInlineEditing ? "nowrap" : "pre-wrap",
                                          outline: "none",
                                          cursor: "text",
                                          userSelect: "text",
                                          WebkitUserSelect: "text",
                                          zIndex: 12,
                                          pointerEvents: "auto",
                                        }}
                                        className="pdf-inline-text pdf-text-no-underline"
                                      >
                                        {renderText || isInlineEditing ? (isInlineEditing ? htmlText : renderTextRuns(element, htmlText)) : null}
                                      </div>
                                    </Fragment>
                                  );
                                }

                                return (
                                  <div key={element.id} aria-label={`Edit text: ${element.text ?? element.currentText ?? element.originalText ?? "PDF text"}`} onPointerDown={(event) => handleElementPointerDown(event, element.id)} onClick={(event) => handleTextClick(event, element)} onPointerMove={(event) => { handleTextPointerMove(event, element); handleElementPointerMove(event); }} onPointerUp={handleElementPointerUp} style={{ ...commonStyle, textDecoration: "none", pointerEvents: !isEditing && tool !== "text" && tool !== "select" ? "none" : "auto", background: "transparent", boxShadow: isSelected ? "inset 0 0 0 1px rgba(37,99,235,0.22)" : isHovered ? "inset 0 0 0 1px rgba(37,99,235,0.08)" : "none" }} className={`pdf-text-no-underline select-none overflow-visible whitespace-pre-wrap ${isHovered ? "editor-text-hover" : ""} ${isSelected ? "editor-text-selected" : ""} ${isEditing ? "editor-text-editing" : ""}`}>
                                    {isEditing ? (
                                      <textarea
                                        autoFocus
                                        value={draft}
                                        onChange={(event) => setDraft(event.target.value)}
                                        onBlur={handleTextSave}
                                        onKeyDown={(event) => {
                                          if (event.key === "Escape") { setTextEditorOpen(false); setEditingTextId(null); setDraft(element.text ?? element.originalText ?? ""); }
                                          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) handleTextSave();
                                        }}
                                        className="h-full min-h-6 w-full resize-none overflow-hidden border border-[#ff2952] bg-white/90 p-0 outline-none"
                                        style={{ boxSizing: "border-box", margin: 0, color: element.color ?? "#111827", fontSize: `${(element.fontSize ?? 18) * (zoom / 100)}px`, fontWeight: element.fontWeight ?? "normal", fontStyle: element.italic ? "italic" : "normal", lineHeight: 1.1 }}
                                      />
                                    ) : renderText ? (
                                      <span style={{ color: element.color ?? "#111827", fontSize: `${(element.fontSize ?? 18) * (zoom / 100)}px`, fontWeight: element.fontWeight ?? "normal", fontStyle: element.italic ? "italic" : "normal", display: "block", width: "100%", textAlign: element.align ?? "left", lineHeight: 1.1 }}>
                                        {renderTextRuns(element, element.text ?? element.currentText ?? element.originalText ?? "")}
                                      </span>
                                    ) : null}
                                  </div>
                                );
                              }

                              if (element.kind === "image" && element.dataUrl) {
                                return (
                                  <div key={element.id} onPointerDown={(event) => { if ((event.target as HTMLElement).closest("button")) return; handleElementPointerDown(event, element.id); }} onPointerMove={(event) => { if ((event.target as HTMLElement).closest("button")) return; handleElementPointerMove(event); }} onPointerUp={(event) => { if ((event.target as HTMLElement).closest("button")) return; handleElementPointerUp(event); }} onPointerCancel={handleElementPointerCancel} style={{ ...commonStyle, background: "rgba(148,163,184,0.08)" }} className="cursor-pointer overflow-hidden">
                                    <img src={element.dataUrl} alt="PDF overlay" draggable={false} onDragStart={(event) => event.preventDefault()} className="h-full w-full select-none object-cover" />
                                  </div>
                                );
                              }

                              if (element.kind === "shape") {
                                return (
                                  <div key={element.id} onPointerDown={(event) => handleElementPointerDown(event, element.id)} onPointerMove={handleElementPointerMove} onPointerUp={handleElementPointerUp} style={{ ...commonStyle, background: "transparent", border: isSelected ? "1px solid #ff2952" : `1px solid ${element.color ?? "#111827"}` }} />
                                );
                              }

                              if (element.kind === "whiteout") {
                                return (
                                  <div
                                    key={element.id}
                                    onPointerDown={(event) => handleElementPointerDown(event, element.id)}
                                    onPointerMove={handleElementPointerMove}
                                    onPointerUp={(event) => handleElementPointerUp(event)}
                                    onPointerCancel={handleElementPointerCancel}
                                    style={{ ...commonStyle, touchAction: "none" }}
                                    className="cursor-move"
                                  />
                                );
                              }

                              if (element.kind === "highlight") {
                                return <div key={element.id} onPointerDown={(event) => handleElementPointerDown(event, element.id)} onPointerMove={handleElementPointerMove} onPointerUp={handleElementPointerUp} style={commonStyle} />;
                              }

                              if (element.kind === "strike") {
                                return (
                                  <div key={element.id} onPointerDown={(event) => handleElementPointerDown(event, element.id)} onPointerMove={handleElementPointerMove} onPointerUp={handleElementPointerUp} style={{ ...commonStyle, border: isSelected ? "1px solid #ff2952" : "none" }}>
                                    <div style={{ width: "100%", height: 2, background: element.color ?? "#111827" }} />
                                  </div>
                                );
                              }

                              if (element.kind === "link") {
                                return (
                                  <div key={element.id} onPointerDown={(event) => handleElementPointerDown(event, element.id)} onPointerMove={handleElementPointerMove} onPointerUp={handleElementPointerUp} style={{ ...commonStyle, borderBottom: `1px solid ${element.color ?? "#111827"}` }} className="text-xs font-medium text-blue-600">
                                    {element.text ?? "Link"}
                                  </div>
                                );
                              }

                              if (element.kind === "signature") {
                                return (
                                  <div key={element.id} onPointerDown={(event) => handleElementPointerDown(event, element.id)} onPointerMove={handleElementPointerMove} onPointerUp={handleElementPointerUp} style={commonStyle} className="text-xs font-medium text-slate-900">
                                    {element.text ?? "Signature"}
                                  </div>
                                );
                              }

                              return null;
                            })}

                            {selectedElement && showSelectionHandles && !pendingPoint && (
                                  <div className="pointer-events-none absolute z-20" style={getEditorDomRect(selectedElement, { left: 0, top: 0, width: pageWidth, height: pageHeight }, pageDimensions, currentPageRotation)}>
                                {selectedElement.kind === "text" && editingTextId === selectedElement.id && (
                                  <div className="pointer-events-auto absolute bottom-full left-0 mb-2 flex items-center gap-1 rounded-[3px] border border-[#3ab0ff] bg-[#f8fbff] p-0.5 shadow-[0_0_0_1px_rgba(58,176,255,0.08)]" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}>
                                    <div className="flex items-center gap-0.5 rounded-[3px] border border-[#d7ebff] bg-white p-0.5">
                                      <button type="button" title="Bold" onMouseDown={(event) => { event.preventDefault(); if (selectedId) captureInlineSelection(selectedId); }} onClick={toggleSelectedBold} className={`flex h-6 w-6 items-center justify-center rounded-[3px] text-[11px] font-black ${selectedElement.fontWeight === "bold" ? "bg-[#ebf7ff] text-[#0b6eb6]" : "text-[#3a4f5d] hover:bg-[#f4f9ff]"}`}>B</button>
                                      <button type="button" title="Italic" onClick={() => updateSelected({ italic: !selectedElement.italic })} className={`flex h-6 w-6 items-center justify-center rounded-[3px] text-[11px] ${selectedElement.italic ? "bg-[#ebf7ff] text-[#0b6eb6]" : "text-[#3a4f5d] hover:bg-[#f4f9ff]"}`} style={{ fontStyle: "italic", fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, lineHeight: 1 }}>I</button>
                                    </div>
                                    <div className="h-6 w-px bg-[#d7e3f0]" />
                                    <select value={String(selectedElement.fontSize ?? 18)} onChange={(event) => updateSelected({ fontSize: Number(event.target.value) })} title="Text size" className="h-6 rounded-[3px] border border-[#d7ebff] bg-white px-1.5 text-[11px] font-medium text-[#35536a] outline-none" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 600 }}>
                                      {fontSizeOptions.map((size) => (
                                        <option key={String(size)} value={String(size)} style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 600 }}>Tt</option>
                                      ))}
                                    </select>
                                    <select value={selectedElement.fontFamily ?? "Helvetica"} onChange={(event) => updateSelected({ fontFamily: event.target.value })} title="Font family" className="h-6 min-w-[80px] rounded-[3px] border border-[#d7ebff] bg-white px-1.5 text-[11px] font-medium text-[#35536a] outline-none">
                                      <option value="Helvetica">Helvetica</option>
                                      <option value="Times-Roman">Times</option>
                                      <option value="Courier">Courier</option>
                                      <option value="Arial">Arial</option>
                                    </select>
                                    <div className="flex items-center gap-1 rounded-[3px] border border-[#d7ebff] bg-white p-0.5">
                                      {Object.keys(colorMap).map((swatch) => (
                                        <button key={swatch} type="button" title={swatch} onClick={() => updateSelected({ color: swatch })} className={`h-3.5 w-3.5 rounded-[2px] border ${selectedElement.color === swatch ? "border-[#1d2b34] ring-1 ring-[#d7ebff]" : "border-[#d8e4ee]"}`} style={{ backgroundColor: swatch }} />
                                      ))}
                                    </div>
                                    <button type="button" title="Move" onClick={moveSelected} className="rounded-[3px] border border-[#d7ebff] bg-white px-1.5 py-0.5 text-[11px] font-semibold text-[#35536a] transition hover:bg-[#f4f9ff]">Move</button>
                                    <button type="button" title="Duplicate" onClick={duplicateSelected} className="rounded-[3px] border border-[#d7ebff] bg-white px-1.5 py-0.5 text-[11px] font-semibold text-[#35536a] transition hover:bg-[#f4f9ff]">Duplicate</button>
                                    <button type="button" title="Delete text" onClick={deleteSelected} className="rounded-[3px] border border-[#ffb0b0] bg-[#fff2f2] px-1.5 py-0.5 text-[11px] font-semibold text-[#d93f4d] transition hover:bg-[#ffe7e7]">Delete</button>
                                  </div>
                                )}
                                {!editingTextId && [
                                  ["top-left", "left-0 top-0 -translate-x-1/2 -translate-y-1/2"],
                                  ["top", "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"],
                                  ["top-right", "right-0 top-0 translate-x-1/2 -translate-y-1/2"],
                                  ["left", "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2"],
                                  ["right", "right-0 top-1/2 translate-x-1/2 -translate-y-1/2"],
                                  ["bottom-left", "left-0 bottom-0 -translate-x-1/2 translate-y-1/2"],
                                  ["bottom", "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2"],
                                  ["bottom-right", "right-0 bottom-0 translate-x-1/2 translate-y-1/2"],
                                ].map(([handle, position]) => (
                                  <button key={handle} type="button" aria-label={`Resize ${handle}`} onPointerDown={(event) => beginResize(event, selectedElement, handle)} onPointerMove={(event) => { event.stopPropagation(); handleElementPointerMove(event); }} onPointerUp={(event) => { event.stopPropagation(); handleElementPointerUp(); }} className={`pointer-events-auto absolute h-2.5 w-2.5 rounded-sm border border-[#58d18b] bg-white ${position}`} />
                                ))}
                                {!editingTextId && <button type="button" aria-label="Rotate selected object" onPointerDown={(event) => beginRotation(event, selectedElement)} onPointerMove={handleElementPointerMove} onPointerUp={handleElementPointerUp} className="pointer-events-auto absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-[180%] rounded-full border border-[#58d18b] bg-white" />}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </Document>
        </div>
      </div>

      {textEditorOpen && pendingPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-black">{selectedId ? "Edit text" : "Add text"}</h2>
              <button type="button" onClick={() => { setTextEditorOpen(false); setEditingTextId(null); setDraft(""); setPendingPoint(null); }} className="toolbar-icon"><X size={17} /></button>
            </div>

            <textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type text here"
              className="mt-4 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-[#ff2952]"
            />

            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => { setTextEditorOpen(false); setEditingTextId(null); setDraft(""); setPendingPoint(null); }} className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 font-semibold text-slate-600">Cancel</button>
                    <button type="button" onClick={handleTextSave} className="flex-1 rounded-xl bg-[#800020] px-3 py-2.5 font-bold text-white">Save text</button>
            </div>
          </div>
        </div>
      )}

      {status && !status.startsWith("PDF loaded") && (
        <div className="sr-only" aria-live="polite">
          {status}
        </div>
      )}
    </main>
  );
}
