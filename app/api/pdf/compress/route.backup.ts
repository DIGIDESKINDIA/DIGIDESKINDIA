import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "fs/promises";
import os from "os";
import path from "path";
import { PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

const MAX_FILE_SIZE = 100 * 1024 * 1024;

type CompressionAttempt = {
  path: string;
  size: number;
  stage: string;
  dpi?: number;
  quality?: number;
};

type RasterProfile = {
  dpi: number;
  quality: number;
  device: "jpeg" | "jpeggray";
};

/* =========================================================
   HELPERS
========================================================= */

function parseTarget(
  value: FormDataEntryValue | null
): number | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return Math.floor(number);
}

function safeName(name: string) {
  const base =
    name
      .replace(/\.pdf$/i, "")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100) || "document";

  return `${base}-compressed.pdf`;
}

/* =========================================================
   FIND GHOSTSCRIPT
========================================================= */

async function findGhostscript(): Promise<string> {
  const configured =
    process.env.GHOSTSCRIPT_PATH?.trim();

  if (configured) {
    try {
      await stat(configured);
      return configured;
    } catch {
      // Continue.
    }
  }

  const commands =
    process.platform === "win32"
      ? ["gswin64c.exe", "gswin32c.exe"]
      : ["gs"];

  for (const command of commands) {
    try {
      await execFileAsync(command, ["-version"], {
        windowsHide: true,
        timeout: 10000,
      });

      return command;
    } catch {
      // Continue.
    }
  }

  if (process.platform === "win32") {
    const root = path.join(
      process.env.ProgramFiles || "C:\\Program Files",
      "gs"
    );

    try {
      const entries = await readdir(root, {
        withFileTypes: true,
      });

      const versions = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) =>
          b.localeCompare(a, undefined, {
            numeric: true,
          })
        );

      for (const version of versions) {
        const candidates = [
          path.join(
            root,
            version,
            "bin",
            "gswin64c.exe"
          ),
          path.join(
            root,
            version,
            "bin",
            "gswin32c.exe"
          ),
        ];

        for (const exe of candidates) {
          try {
            await stat(exe);
            return exe;
          } catch {
            // Continue.
          }
        }
      }
    } catch {
      // Continue.
    }
  }

  throw new Error(
    "Ghostscript could not be found."
  );
}

/* =========================================================
   NORMAL COMPRESSION

   Used for automatic mode / large targets.
========================================================= */

async function normalCompress(
  ghostscript: string,
  input: string,
  output: string,
  dpi: number,
  quality: number
) {
  const args = [
    "-dSAFER",
    "-dBATCH",
    "-dNOPAUSE",
    "-dQUIET",

    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",

    "-dDetectDuplicateImages=true",
    "-dCompressFonts=true",
    "-dSubsetFonts=true",

    "-dDownsampleColorImages=true",
    "-dColorImageDownsampleType=/Bicubic",
    `-dColorImageResolution=${dpi}`,
    "-dColorImageDownsampleThreshold=1.0",

    "-dDownsampleGrayImages=true",
    "-dGrayImageDownsampleType=/Bicubic",
    `-dGrayImageResolution=${dpi}`,
    "-dGrayImageDownsampleThreshold=1.0",

    "-dDownsampleMonoImages=true",
    "-dMonoImageDownsampleType=/Subsample",
    `-dMonoImageResolution=${Math.max(50, dpi * 2)}`,
    "-dMonoImageDownsampleThreshold=1.0",

    "-dAutoFilterColorImages=false",
    "-dColorImageFilter=/DCTEncode",

    "-dAutoFilterGrayImages=false",
    "-dGrayImageFilter=/DCTEncode",

    `-dJPEGQ=${quality}`,

    `-sOutputFile=${output}`,

    input,
  ];

  await execFileAsync(
    ghostscript,
    args,
    {
      windowsHide: true,
      timeout: 180000,
      maxBuffer: 20 * 1024 * 1024,
    }
  );
}

/* =========================================================
   FAST RASTERIZE

   jpeggray is intentionally used for tiny targets.
========================================================= */

async function rasterizePDF(
  ghostscript: string,
  input: string,
  directory: string,
  profile: RasterProfile
) {
  const outputPattern = path.join(
    directory,
    "page-%05d.jpg"
  );

  const args = [
    "-dSAFER",
    "-dBATCH",
    "-dNOPAUSE",
    "-dQUIET",

    `-sDEVICE=${profile.device}`,

    `-r${profile.dpi}`,

    `-dJPEGQ=${profile.quality}`,

    "-dTextAlphaBits=1",
    "-dGraphicsAlphaBits=1",

    `-sOutputFile=${outputPattern}`,

    input,
  ];

  await execFileAsync(
    ghostscript,
    args,
    {
      windowsHide: true,
      timeout: 180000,
      maxBuffer: 20 * 1024 * 1024,
    }
  );

  const files = await readdir(directory);

  return files
    .filter((file) =>
      /^page-\d+\.jpg$/i.test(file)
    )
    .sort()
    .map((file) =>
      path.join(directory, file)
    );
}

/* =========================================================
   READ ORIGINAL PAGE SIZES ONCE
========================================================= */

async function getPageSizes(
  originalPDF: Buffer
) {
  const sourceDocument =
    await PDFDocument.load(originalPDF, {
      ignoreEncryption: true,
    });

  return sourceDocument
    .getPages()
    .map((page) => {
      const size = page.getSize();

      return {
        width: size.width,
        height: size.height,
      };
    });
}

/* =========================================================
   BUILD RASTER PDF
========================================================= */

async function buildRasterPDF(
  imagePaths: string[],
  outputPath: string,
  pageSizes: {
    width: number;
    height: number;
  }[]
) {
  if (imagePaths.length === 0) {
    throw new Error(
      "No rasterized pages were generated."
    );
  }

  const outputDocument =
    await PDFDocument.create();

  for (
    let index = 0;
    index < imagePaths.length;
    index++
  ) {
    const jpegBytes =
      await readFile(imagePaths[index]);

    const jpeg =
      await outputDocument.embedJpg(
        jpegBytes
      );

    const original =
      pageSizes[index];

    const width =
      original?.width || 595.28;

    const height =
      original?.height || 841.89;

    const page =
      outputDocument.addPage([
        width,
        height,
      ]);

    page.drawImage(jpeg, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  const bytes =
    await outputDocument.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 100,
    });

  await writeFile(
    outputPath,
    bytes
  );

  return bytes.length;
}

/* =========================================================
   ONE RASTER ATTEMPT
========================================================= */

async function createRasterAttempt({
  ghostscript,
  inputPath,
  tempRoot,
  pageSizes,
  profile,
  index,
}: {
  ghostscript: string;
  inputPath: string;
  tempRoot: string;
  pageSizes: {
    width: number;
    height: number;
  }[];
  profile: RasterProfile;
  index: number;
}): Promise<CompressionAttempt> {
  const attemptDirectory =
    await mkdtemp(
      path.join(
        tempRoot,
        `raster-${index}-`
      )
    );

  try {
    const images =
      await rasterizePDF(
        ghostscript,
        inputPath,
        attemptDirectory,
        profile
      );

    const outputPath = path.join(
      tempRoot,
      `target-${index}.pdf`
    );

    const size =
      await buildRasterPDF(
        images,
        outputPath,
        pageSizes
      );

    return {
      path: outputPath,
      size,
      stage:
        `${profile.device}-${profile.dpi}dpi-q${profile.quality}`,
      dpi: profile.dpi,
      quality: profile.quality,
    };
  } finally {
    await rm(
      attemptDirectory,
      {
        recursive: true,
        force: true,
      }
    ).catch(() => {});
  }
}

/* =========================================================
   TARGET PROFILE ESTIMATION

   Instead of trying 12 profiles, jump near target.
========================================================= */

function getStartingProfile(
  originalSize: number,
  target: number
): RasterProfile {
  const ratio =
    target / originalSize;

  /*
   * QUALITY-FIRST TARGET PROFILES
   *
   * Important:
   * - Always preserve colour.
   * - Never start with destructive grayscale.
   * - Keep enough DPI for readable text.
   * - Starting reasonably close to the expected target
   *   reduces the number of Ghostscript passes.
   */

  if (target <= 120 * 1024) {
    if (ratio < 0.03) {
      return {
        dpi: 58,
        quality: 42,
        device: "jpeg",
      };
    }

    return {
      dpi: 65,
      quality: 46,
      device: "jpeg",
    };
  }

  if (target <= 220 * 1024) {
    return {
      dpi: 78,
      quality: 52,
      device: "jpeg",
    };
  }

  if (target <= 550 * 1024) {
    return {
      dpi: 96,
      quality: 60,
      device: "jpeg",
    };
  }

  return {
    dpi: 115,
    quality: 68,
    device: "jpeg",
  };
}

/* =========================================================
   MORE AGGRESSIVE PROFILE

   Called only when first estimate is still too large.
========================================================= */

function getMoreAggressiveProfile(
  current: RasterProfile,
  currentSize: number,
  target: number
): RasterProfile {
  const sizeRatio =
    target / currentSize;

  /*
   * Reduce DPI progressively instead of destroying
   * image quality immediately.
   *
   * DPI has the biggest effect on raster PDF size.
   */
  const estimatedDpi =
    Math.floor(
      current.dpi *
        Math.sqrt(
          Math.max(
            0.35,
            Math.min(
              0.95,
              sizeRatio * 0.92
            )
          )
        )
    );

  /*
   * Quality protection:
   * do not allow normal target compression to fall
   * into Q1-Q10 territory.
   */
  const nextDpi =
    Math.max(
      42,
      Math.min(
        current.dpi - 4,
        estimatedDpi
      )
    );

  const nextQuality =
    Math.max(
      34,
      current.quality - 6
    );

  return {
    dpi: nextDpi,
    quality: nextQuality,
    device: "jpeg",
  };
}

/* =========================================================
   RESPONSE
========================================================= */

async function createPDFResponse({
  attempt,
  originalSize,
  target,
  originalName,
  processingMs,
}: {
  attempt: CompressionAttempt;
  originalSize: number;
  target: number | null;
  originalName: string;
  processingMs: number;
}) {
  const buffer =
    await readFile(attempt.path);

  const size =
    buffer.length;

  const saved =
    Math.max(
      0,
      originalSize - size
    );

  const reduction =
    originalSize > 0
      ? Math.max(
          0,
          Math.round(
            (1 - size / originalSize) *
              100
          )
        )
      : 0;

  /*
   * Target is considered reached only when
   * output is at or below requested size.
   */
  const reached =
    target !== null &&
    size <= target;

  console.log(
  `[Digital Desk] Final response: final=${size}, target=${target ?? "auto"}`
);

return new NextResponse(
    new Uint8Array(buffer),
    {
      status: 200,

      headers: {
        "Content-Type":
          "application/pdf",

        "Content-Disposition":
          `attachment; filename="${safeName(
            originalName
          )}"`,

        "Content-Length":
          String(size),

        "X-Original-Size":
          String(originalSize),

        "X-Compressed-Size":
          String(size),

        "X-Saved-Bytes":
          String(saved),

        "X-Reduction-Percent":
          String(reduction),

        "X-Target-Size":
          target
            ? String(target)
            : "0",

        "X-Target-Reached":
          reached
            ? "true"
            : "false",

        "X-Compression-Stage":
          attempt.stage,

        "X-Compression-DPI":
          attempt.dpi
            ? String(attempt.dpi)
            : "normal",

        "X-JPEG-Quality":
          attempt.quality
            ? String(attempt.quality)
            : "normal",

        "X-Processing-Time":
          String(processingMs),

        "Cache-Control":
          "no-store",
      },
    }
  );
}

/* =========================================================
   MAIN
========================================================= */

export async function POST(
  request: NextRequest
) {
  const startedAt =
    Date.now();

  let tempRoot: string | null =
    null;

  try {
    const formData =
      await request.formData();

    const uploaded =
      formData.get("file");

    const requestedTarget =
      parseTarget(
        formData.get("targetBytes")
      );

    if (!(uploaded instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Please upload a PDF.",
        },
        {
          status: 400,
        }
      );
    }

    const isPDF =
      uploaded.type ===
        "application/pdf" ||
      uploaded.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPDF) {
      return NextResponse.json(
        {
          error:
            "Only PDF files are supported.",
        },
        {
          status: 400,
        }
      );
    }

    if (uploaded.size <= 0) {
      return NextResponse.json(
        {
          error:
            "The uploaded PDF is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      uploaded.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Maximum file size is 100 MB.",
        },
        {
          status: 413,
        }
      );
    }

    const target =
      requestedTarget &&
      requestedTarget <
        uploaded.size
        ? requestedTarget
        : null;

    const ghostscript =
      await findGhostscript();

    tempRoot =
      await mkdtemp(
        path.join(
          os.tmpdir(),
          "digital-desk-fast-"
        )
      );

    const inputPath =
      path.join(
        tempRoot,
        "input.pdf"
      );

    const originalBuffer =
      Buffer.from(
        await uploaded.arrayBuffer()
      );

    await writeFile(
      inputPath,
      originalBuffer
    );

    /* =====================================================
       NO TARGET

       Keep decent quality.
    ===================================================== */

    if (!target) {
      const outputPath =
        path.join(
          tempRoot,
          "automatic.pdf"
        );

      await normalCompress(
        ghostscript,
        inputPath,
        outputPath,
        110,
        68
      );

      const outputInfo =
        await stat(outputPath);

      if (
        outputInfo.size <
        uploaded.size
      ) {
        return await createPDFResponse({
          attempt: {
            path: outputPath,
            size: outputInfo.size,
            stage:
              "automatic-standard",
          },

          originalSize:
            uploaded.size,

          target: null,

          originalName:
            uploaded.name,

          processingMs:
            Date.now() -
            startedAt,
        });
      }

      const originalOutput =
        path.join(
          tempRoot,
          "original.pdf"
        );

      await writeFile(
        originalOutput,
        originalBuffer
      );

      return await createPDFResponse({
        attempt: {
          path: originalOutput,
          size: uploaded.size,
          stage: "original",
        },

        originalSize:
          uploaded.size,

        target: null,

        originalName:
          uploaded.name,

        processingMs:
          Date.now() -
          startedAt,
      });
    }

    /* =====================================================
       LARGE / EASY TARGET

       Give pdfwrite ONE chance only.

       Do not waste five Ghostscript passes.
    ===================================================== */

    const targetRatio =
      target / uploaded.size;

    if (
      target >= 250 * 1024 &&
      targetRatio >= 0.15
    ) {
      const normalOutput =
        path.join(
          tempRoot,
          "normal-target.pdf"
        );

      try {
        await normalCompress(
          ghostscript,
          inputPath,
          normalOutput,
          72,
          48
        );

        const info =
          await stat(normalOutput);

        console.log(
          `[Digital Desk] Normal target attempt: ${info.size}/${target}`
        );

        if (
          info.size <= target
        ) {
          return await createPDFResponse({
            attempt: {
              path: normalOutput,
              size: info.size,
              stage:
                "normal-target",
            },

            originalSize:
              uploaded.size,

            target,

            originalName:
              uploaded.name,

            processingMs:
              Date.now() -
              startedAt,
          });
        }
      } catch (error) {
        console.error(
          "[Digital Desk] normal target attempt failed:",
          error
        );
      }
    }

        /* =====================================================
       FAST QUALITY-FIRST TARGET MODE

       Priorities:
       1. Keep PDF readable
       2. Preserve colour
       3. Process quickly
       4. Get reasonably close to requested size

       Maximum raster passes: 3
    ===================================================== */

    const pageSizes =
      await getPageSizes(
        originalBuffer
      );

    let profile =
      getStartingProfile(
        uploaded.size,
        target
      );

    let best:
      CompressionAttempt | null =
      null;

    /*
     * Prefer an output close to target.
     *
     * We do NOT destroy quality just to save the
     * final few KB.
     */
    const preferredMinimum =
      Math.floor(
        target * 0.82
      );

    for (
      let attemptIndex = 0;
      attemptIndex < 3;
      attemptIndex++
    ) {
      console.log(
        `[Digital Desk] Quality attempt ${
          attemptIndex + 1
        }: ${profile.dpi} DPI / Q${
          profile.quality
        } / ${profile.device}`
      );

      const attempt =
        await createRasterAttempt({
          ghostscript,
          inputPath,
          tempRoot,
          pageSizes,
          profile,
          index: attemptIndex,
        });

      console.log(
        `[Digital Desk] Result: ${
          attempt.size
        } bytes | Target: ${target}`
      );

      /*
       * BEST RESULT SELECTION
       *
       * Prefer:
       * 1. an under-target result closest to target
       * 2. otherwise the smallest sensible result
       */
      if (!best) {
        best = attempt;
      } else {
        const bestUnder =
          best.size <= target;

        const attemptUnder =
          attempt.size <= target;

        if (
          attemptUnder &&
          !bestUnder
        ) {
          best = attempt;
        } else if (
          attemptUnder &&
          bestUnder &&
          attempt.size >
            best.size
        ) {
          best = attempt;
        } else if (
          !attemptUnder &&
          !bestUnder &&
          attempt.size <
            best.size
        ) {
          best = attempt;
        }
      }

      /*
       * GOOD RESULT
       *
       * 82%-100% of requested target:
       * stop immediately.
       *
       * Example:
       * 100 KB target -> 82-100 KB accepted.
       *
       * This avoids unnecessary extra processing.
       */
      if (
        attempt.size <= target &&
        attempt.size >=
          preferredMinimum
      ) {
        console.log(
          `[Digital Desk] QUALITY TARGET ACHIEVED: ${
            attempt.size
          }/${target}`
        );

        return await createPDFResponse({
          attempt,

          originalSize:
            uploaded.size,

          target,

          originalName:
            uploaded.name,

          processingMs:
            Date.now() -
            startedAt,
        });
      }

      /*
       * Result is already below target but substantially
       * smaller than requested.
       *
       * Do NOT compress it again.
       * Another pass would only reduce quality.
       */
      if (
        attempt.size < preferredMinimum
      ) {
        console.log(
          `[Digital Desk] Result already below target. Keeping quality instead of recompressing.`
        );

        return await createPDFResponse({
          attempt,

          originalSize:
            uploaded.size,

          target,

          originalName:
            uploaded.name,

          processingMs:
            Date.now() -
            startedAt,
        });
      }

      /*
       * Still too large.
       *
       * Make one controlled step more aggressive.
       * No grayscale and no ultra-low DPI.
       */
      if (
        attemptIndex < 2
      ) {
        const nextProfile =
          getMoreAggressiveProfile(
            profile,
            attempt.size,
            target
          );

        /*
         * If quality floor has been reached,
         * don't waste another expensive pass.
         */
        if (
          nextProfile.dpi ===
            profile.dpi &&
          nextProfile.quality ===
            profile.quality
        ) {
          break;
        }

        profile =
          nextProfile;
      }
    }

    if (!best) {
      throw new Error(
        "Could not generate a compressed PDF."
      );
    }

    /*
     * QUALITY FLOOR REACHED
     *
     * The target may not always be achievable without
     * making the document unreadable.
     *
     * Return the best usable result rather than
     * destroying the PDF.
     */
    console.log(
      `[Digital Desk] Quality floor reached: ${
        best.size
      }/${target}`
    );

    return await createPDFResponse({
      attempt: best,

      originalSize:
        uploaded.size,

      target,

      originalName:
        uploaded.name,

      processingMs:
        Date.now() -
        startedAt,
    });
  } catch (error) {
    console.error(
      "[Digital Desk] compression error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PDF compression failed.",
      },
      {
        status: 500,
      }
    );
  } finally {
    if (tempRoot) {
      try {
        await rm(
          tempRoot,
          {
            recursive: true,
            force: true,
          }
        );
      } catch (error) {
        console.error(
          "[Digital Desk] cleanup failed:",
          error
        );
      }
    }
  }
}