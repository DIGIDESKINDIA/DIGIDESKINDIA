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

const PRESET_QUALITY = [
  "low",
  "medium",
  "high",
] as const;

type CompressionPreset =
  (typeof PRESET_QUALITY)[number];

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

function parsePreset(
  formData: FormData
): CompressionPreset {
  const quality =
    formData.get("quality") ??
    formData.get("level") ??
    "medium";

  if (
    typeof quality === "string" &&
    PRESET_QUALITY.includes(
      quality as CompressionPreset
    )
  ) {
    return quality as CompressionPreset;
  }

  return "medium";
}

function getPresetConfig(
  preset: CompressionPreset
) {
  if (preset === "low") {
    return {
      dpi: 130,
      quality: 78,
      stage: "automatic-low",
    };
  }

  if (preset === "high") {
    return {
      dpi: 85,
      quality: 54,
      stage: "automatic-high",
    };
  }

  return {
    dpi: 110,
    quality: 68,
    stage: "automatic-medium",
  };
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

function hasPdfSignature(buffer: Buffer) {
  return (
    buffer.length >= 5 &&
    buffer
      .subarray(0, 5)
      .toString("ascii") === "%PDF-"
  );
}

async function validateReadablePdf(
  buffer: Buffer
) {
  if (
    buffer.length === 0 ||
    !hasPdfSignature(buffer)
  ) {
    throw new Error(
      "The compression engine did not produce a valid PDF file."
    );
  }

  try {
    await PDFDocument.load(buffer, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
  } catch {
    throw new Error(
      "The compression engine produced an unreadable PDF file."
    );
  }
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
    "Ghostscript could not be found. Install Ghostscript or set GHOSTSCRIPT_PATH."
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

   Instead of trying many profiles, jump near target.
========================================================= */

function getStartingProfile(
  originalSize: number,
  target: number
): RasterProfile {
  const ratio =
    target / originalSize;

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
  preset,
}: {
  attempt: CompressionAttempt;
  originalSize: number;
  target: number | null;
  originalName: string;
  processingMs: number;
  preset: CompressionPreset;
}) {
  const buffer =
    await readFile(attempt.path);

  await validateReadablePdf(buffer);

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

  const reached =
    target !== null &&
    size <= target;

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

        "X-Compression-Preset":
          preset,

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

    const preset =
      parsePreset(formData);

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

    if (!target) {
      const outputPath =
        path.join(
          tempRoot,
          "automatic.pdf"
        );

      const presetConfig =
        getPresetConfig(preset);

      await normalCompress(
        ghostscript,
        inputPath,
        outputPath,
        presetConfig.dpi,
        presetConfig.quality
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
              presetConfig.stage,
          },

          originalSize:
            uploaded.size,

          target: null,

          originalName:
            uploaded.name,

          processingMs:
            Date.now() -
            startedAt,

          preset,
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

        preset,
      });
    }

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

            preset,
          });
        }
      } catch {
        // Continue to quality-first target mode.
      }
    }

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
      | CompressionAttempt
      | null = null;

    const preferredMinimum =
      Math.floor(
        target * 0.82
      );

    for (
      let attemptIndex = 0;
      attemptIndex < 3;
      attemptIndex++
    ) {
      const attempt =
        await createRasterAttempt({
          ghostscript,
          inputPath,
          tempRoot,
          pageSizes,
          profile,
          index: attemptIndex,
        });

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

      if (
        attempt.size <= target &&
        attempt.size >=
          preferredMinimum
      ) {
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

          preset,
        });
      }

      if (
        attempt.size <
        preferredMinimum
      ) {
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

          preset,
        });
      }

      if (
        attemptIndex < 2
      ) {
        const nextProfile =
          getMoreAggressiveProfile(
            profile,
            attempt.size,
            target
          );

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

    if (
      best.size >=
      uploaded.size
    ) {
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

        target,

        originalName:
          uploaded.name,

        processingMs:
          Date.now() -
          startedAt,

        preset,
      });
    }

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

      preset,
    });
  } catch (error) {
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
      } catch {
        // Ignore cleanup error.
      }
    }
  }
}