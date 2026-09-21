import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { chromium, type BrowserContext } from "playwright";

import { ConvertOptions, ConvertResult } from "../types";

const MAX_HTML_BYTES = Number(process.env.HTML_MAX_FILE_SIZE_BYTES ?? 25 * 1024 * 1024);
const ALLOWED_EXTENSIONS = new Set([".html", ".htm"]);

function outputName(inputName: string): string {
  const base = path.basename(inputName, path.extname(inputName))
    .replace(/[^a-zA-Z0-9._ ()-]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[._-]{2,}/g, "-")
    .trim()
    .replace(/[._-]+$/, "")
    .trim() || "document";
  return `${base}.pdf`;
}

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function findChromiumExecutable(): Promise<string | undefined> {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    process.platform === "win32" ? path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe") : undefined,
    process.platform === "linux" ? "/usr/bin/google-chrome" : undefined,
    process.platform === "linux" ? "/usr/bin/chromium" : undefined,
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next known installation location.
    }
  }
  return undefined;
}

export async function htmlToPDF(options: ConvertOptions): Promise<ConvertResult> {
  const extension = path.extname(options.input.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return { success: false, message: "Only .html and .htm files are supported.", errorCode: "unsupported-file" };
  }
  if (!Number.isFinite(MAX_HTML_BYTES) || MAX_HTML_BYTES <= 0) {
    return { success: false, message: "HTML upload limit is not configured.", errorCode: "configuration" };
  }
  if (options.input.size <= 0) {
    return { success: false, message: "The HTML file is empty.", errorCode: "empty-file" };
  }
  if (options.input.size > MAX_HTML_BYTES) {
    return { success: false, message: "The HTML file exceeds the maximum allowed size.", errorCode: "file-too-large" };
  }

  const sourceDirectory = path.resolve(path.dirname(options.input.path));
  const jobDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "digital-desk-html-pdf-"));
  const pdfPath = path.join(jobDirectory, outputName(options.input.name));
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let context: BrowserContext | undefined;
  let completed = false;

  try {
    const htmlFileUrl = pathToFileURL(options.input.path).href;

    const executablePath = await findChromiumExecutable();
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    context = await browser.newContext({
      javaScriptEnabled: true,
      acceptDownloads: false,
      permissions: [],
    });
    await context.route("**/*", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.protocol === "data:" || requestUrl.protocol === "about:") {
        await route.continue();
        return;
      }
      if (requestUrl.protocol !== "file:") {
        await route.abort("blockedbyclient");
        return;
      }
      const requestedPath = path.resolve(fileURLToPath(requestUrl));
      if (!isWithin(sourceDirectory, requestedPath) && !isWithin(jobDirectory, requestedPath)) {
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });

    const page = await context.newPage();
    await page.goto(htmlFileUrl, { waitUntil: "load", timeout: 30_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map((image) => image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })));
    });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });
    const stat = await fs.stat(pdfPath);
    if (stat.size === 0) throw new Error("Generated PDF is empty.");
    completed = true;

    return {
      success: true,
      outputPath: pdfPath,
      outputName: outputName(options.input.name),
      message: "HTML converted to PDF.",
      metadata: { renderer: "playwright-chromium", bytes: stat.size },
    };
  } catch (error) {
    console.error("[HTML_TO_PDF_ERROR]", error);
    await fs.rm(pdfPath, { force: true }).catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    const errorCode = message.includes("Executable doesn't exist") || message.includes("Failed to launch")
      ? "browser-launch"
      : message.includes("Timeout")
        ? "render-timeout"
        : "conversion-failed";
    return { success: false, message: "The HTML file could not be converted to PDF.", errorCode };
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
    if (!completed) await fs.rm(jobDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}