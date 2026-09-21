export interface RedactionRect {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface RedactionCoordinates {
  pageWidth: number;
  pageHeight: number;
  containerWidth: number;
  containerHeight: number;
  x: number;
  y: number;
  zoom?: number;
  rotation?: number;
}

export function validateRedactionRectangle(
  rect: Pick<RedactionRect, "x" | "y" | "width" | "height">,
  pageWidth: number,
  pageHeight: number
): void {
  if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y)) {
    throw new Error("Redaction position is invalid.");
  }

  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
    throw new Error("Redaction size is invalid.");
  }

  const rightEdge = rect.x + rect.width;
  const bottomEdge = rect.y + rect.height;

  if (rect.x < 0 || rect.y < 0 || rightEdge > pageWidth || bottomEdge > pageHeight) {
    throw new Error("Redaction box must stay within the page bounds.");
  }
}

export function mapViewerToPdf({
  pageWidth,
  pageHeight,
  containerWidth,
  containerHeight,
  x,
  y,
  zoom: _zoom = 1,
  rotation = 0,
}: RedactionCoordinates): { x: number; y: number } {
  const normalizedX = x / Math.max(containerWidth, 1);
  const normalizedY = y / Math.max(containerHeight, 1);
  const localX = normalizedX * pageWidth;
  const localY = normalizedY * pageHeight;

  if (rotation === 90 || rotation === 270) {
    return {
      x: Math.max(0, Math.min(pageHeight - localY, pageHeight)),
      y: Math.max(0, Math.min(localX, pageWidth)),
    };
  }

  return {
    x: Math.max(0, Math.min(localX, pageWidth)),
    y: Math.max(0, Math.min(localY, pageHeight)),
  };
}
