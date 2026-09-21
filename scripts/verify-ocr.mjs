// Verifies the PDF-to-Word OCR path in isolation:
//  1. Stages storage/tessdata/eng.traineddata (decompresses .gz) — mirrors ensureTessdata.
//  2. Renders English text to a PNG with @napi-rs/canvas.
//  3. Recognizes with a Tesseract worker (langPath = storage/tessdata).
//  4. Prints the recognized text so we can confirm OCR emits real content.
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { promisify } from "util";
import { createCanvas } from "@napi-rs/canvas";

const gunzip = promisify(zlib.gunzip);

const ROOT = process.cwd();
const TESSDATA_DIR = path.join(ROOT, "storage", "tessdata");
const ROOT_ENG = path.join(ROOT, "eng.traineddata");
const GZ_ENG = path.join(TESSDATA_DIR, "eng.traineddata.gz");
const OUT_ENG = path.join(TESSDATA_DIR, "eng.traineddata");

async function stageEng() {
  fs.mkdirSync(TESSDATA_DIR, { recursive: true });
  if (fs.existsSync(OUT_ENG)) {
    console.log("[stage] eng.traineddata already present");
    return;
  }
  if (fs.existsSync(GZ_ENG)) {
    const gz = await fs.promises.readFile(GZ_ENG);
    const buf = await gunzip(gz);
    await fs.promises.writeFile(OUT_ENG, buf);
    console.log(`[stage] decompressed eng.traineddata.gz -> ${buf.length} bytes`);
  } else if (fs.existsSync(ROOT_ENG)) {
    await fs.promises.copyFile(ROOT_ENG, OUT_ENG);
    console.log(`[stage] copied root eng.traineddata -> ${fs.statSync(OUT_ENG).size} bytes`);
  } else {
    throw new Error("No eng traineddata source found");
  }
}

function renderText() {
  const width = 1280,
    height = 360;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "black";
  ctx.font = "56px Arial, Helvetica, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("Digital Desk India PDF to Word OCR test", 40, 40);
  ctx.fillText("Recognizing scanned image-only content.", 40, 120);
  ctx.font = "32px Arial, Helvetica, sans-serif";
  ctx.fillText("Hello World 12345", 40, 220);
  return canvas.toBuffer("image/png");
}

async function main() {
  await stageEng();
  const png = renderText();
  console.log("[render] png bytes:", png.length);

  const { createWorker } = await import("tesseract.js");
  const t0 = Date.now();
  const worker = await createWorker("eng", 1, {
    langPath: TESSDATA_DIR,
    cachePath: path.join(ROOT, "storage", ".ocr-cache"),
    logger: (m) => {
      if (m.status && m.status !== "recognizing text") {
        console.log("[tess]", m.status, m.progress ?? "");
      }
    },
  });
  const { data } = await worker.recognize(png);
  const elapsed = Date.now() - t0;
  await worker.terminate();

  console.log(`[ocr] done in ${elapsed}ms`);
  console.log("[ocr] recognized text:");
  console.log(JSON.stringify(data.text.trim()));
}

main().catch((e) => {
  console.error("VERIFY_OCR_FAILED:", e);
  process.exit(1);
});
