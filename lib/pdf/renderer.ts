import type {
  PDFPageProxy,
  RenderTask,
} from "pdfjs-dist";

export interface RenderOptions {
  page: PDFPageProxy;
  canvas: HTMLCanvasElement;
  scale: number;
  rotation?: number;
}

export interface RenderResult {
  width: number;
  height: number;
  renderTask: RenderTask;
}

export async function renderPage({
  page,
  canvas,
  scale,
  rotation = 0,
}: RenderOptions): Promise<RenderResult> {

  const viewport = page.getViewport({
    scale,
    rotation,
  });

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Canvas context not found."
    );
  }

  const devicePixelRatio =
    window.devicePixelRatio || 1;

  canvas.width =
    viewport.width *
    devicePixelRatio;

  canvas.height =
    viewport.height *
    devicePixelRatio;

  canvas.style.width =
    `${viewport.width}px`;

  canvas.style.height =
    `${viewport.height}px`;

  context.setTransform(
    devicePixelRatio,
    0,
    0,
    devicePixelRatio,
    0,
    0
  );

  const renderTask = page.render({
    canvas: canvas,
    canvasContext: context,
    viewport,
  });

  await renderTask.promise;

  return {
    width: viewport.width,
    height: viewport.height,
    renderTask,
  };
}