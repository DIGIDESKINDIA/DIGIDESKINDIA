/**
 * Digital PDF → WORD page-aware reconstruction engine.
 *
 * This module preserves PDF geometry and layout structure instead of
 * forcing all content into sequential flow.
 */

export interface PositionedTextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily?: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  alignment: "left" | "center" | "right";
  color?: string;
  zIndex: number;
}

export interface DigitalTableModel {
  x: number;
  y: number;
  width: number;
  height: number;
  rows: DigitalTableRow[];
  confidence: number;
}

export interface DigitalTableRow {
  y: number;
  cells: DigitalTableCell[];
}

export interface DigitalTableCell {
  text: string;
  x: number;
  width: number;
  colIndex: number;
  rowIndex: number;
  merged?: boolean;
}

export interface DigitalImageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  caption?: string;
}

export interface DigitalPageLayout {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  
  // Raw positioned content, preserving geometry
  textBlocks: PositionedTextBlock[];
  tables: DigitalTableModel[];
  images: DigitalImageRegion[];
  
  // Detected structure
  layoutType: "simple-flow" | "multi-column" | "positioned" | "mixed" | "image-only";
  columnBounds?: { left: number; right: number; top: number; bottom: number }[];
  
  // Raster fallback for image-only pages
  backgroundImage?: { dataUrl: string; width: number; height: number };
  
  warnings: string[];
}

/**
 * Detect whether text blocks suggest multi-column layout.
 * Returns column regions if found, otherwise null.
 */
export function detectColumns(
  blocks: PositionedTextBlock[],
  pageWidth: number,
): { left: number; right: number; top: number; bottom: number }[] | null {
  if (blocks.length < 4) return null;

  // Find vertical gaps in x-coordinate distribution
  const xPositions = new Set<number>();
  for (const block of blocks) {
    xPositions.add(Math.round(block.x / 10) * 10);
    xPositions.add(Math.round((block.x + block.width) / 10) * 10);
  }

  const sorted = Array.from(xPositions).sort((a, b) => a - b);
  const gaps: { at: number; size: number }[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap > pageWidth * 0.1) {
      gaps.push({ at: sorted[i - 1], size: gap });
    }
  }

  if (gaps.length < 1) return null;

  // Simple two-column detection
  const mainGap = gaps.sort((a, b) => b.size - a.size)[0];
  if (!mainGap || mainGap.size < pageWidth * 0.15) return null;

  return [
    { left: 0, right: mainGap.at, top: 0, bottom: Infinity },
    { left: mainGap.at + mainGap.size, right: pageWidth, top: 0, bottom: Infinity },
  ];
}

/**
 * Determine layout type based on spatial distribution of content.
 */
export function classifyPageLayout(
  blocks: PositionedTextBlock[],
  tables: DigitalTableModel[],
  images: DigitalImageRegion[],
  pageWidth: number,
): "simple-flow" | "multi-column" | "positioned" | "mixed" | "image-only" {
  if (blocks.length === 0 && tables.length === 0 && images.length > 0) {
    return "image-only";
  }

  if (blocks.length === 0) {
    return "image-only";
  }

  const columns = detectColumns(blocks, pageWidth);
  if (columns && columns.length > 1) {
    return "multi-column";
  }

  // Check for positioned/absolutely-laid-out content
  const ySpread = Math.max(...blocks.map((b) => b.y)) - Math.min(...blocks.map((b) => b.y));
  const xSpread = Math.max(...blocks.map((b) => b.x + b.width)) - Math.min(...blocks.map((b) => b.x));

  const positionedCount = blocks.filter((b) => b.x > pageWidth * 0.3 && b.x < pageWidth * 0.7 === false).length;

  if (positionedCount > blocks.length * 0.4 && xSpread > pageWidth * 0.6) {
    return "positioned";
  }

  if (tables.length > 0 || images.length > 0) {
    return "mixed";
  }

  return "simple-flow";
}

/**
 * Group positioned text blocks into logical reading order.
 * This is used for reconstruction, not for changing their positions.
 */
export function computeReadingOrder(blocks: PositionedTextBlock[]): PositionedTextBlock[] {
  // Sort primarily by Y (top-to-bottom), secondarily by X (left-to-right)
  // This preserves document flow while respecting positioning
  return [...blocks].sort((a, b) => {
    const yDiff = Math.abs(a.y - b.y);
    if (yDiff > 3) return a.y - b.y;
    return a.x - b.x;
  });
}

/**
 * Detect if a page should use a raster background instead of text reconstruction.
 * Used for image-only digital pages.
 */
export function shouldUseRasterBackground(
  blocks: PositionedTextBlock[],
  images: DigitalImageRegion[],
  imageCount: number,
  imageCoverageRatio: number,
): boolean {
  // If page is image-heavy with minimal text, use raster
  if (imageCount > 0 && imageCoverageRatio > 0.7 && blocks.length < 5) {
    return true;
  }

  // If no extractable text at all, use raster
  if (blocks.length === 0 && images.length > 0) {
    return true;
  }

  return false;
}
