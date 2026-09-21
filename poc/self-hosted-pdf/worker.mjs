import { createServer } from "node:http";
import { execFile } from "node:child_process";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
  readdir,
} from "node:fs/promises";
import { promisify } from "node:util";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);

const port = Number(process.env.PORT ?? 8080);

function send(
  res,
  status,
  body,
  contentType = "application/json",
  extraHeaders = {}
) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    ...extraHeaders,
  });

  res.end(body);
}

function json(res, status, value) {
  send(res, status, JSON.stringify(value));
}

function parseMultipart(body, contentType) {
  const boundaryMatch = contentType.match(
    /boundary=(?:"([^"]+)"|([^;]+))/i
  );

  if (!boundaryMatch) {
    throw new Error("Multipart boundary is missing.");
  }

  const boundary = Buffer.from(
    `--${boundaryMatch[1] ?? boundaryMatch[2]}`
  );

  const parts = [];
  let offset = 0;

  while (true) {
    const start = body.indexOf(boundary, offset);

    if (start < 0) {
      break;
    }

    const headerStart =
      start + boundary.length + 2;

    const headerEnd = body.indexOf(
      Buffer.from("\r\n\r\n"),
      headerStart
    );

    if (headerEnd < 0) {
      break;
    }

    const headers = body
      .subarray(headerStart, headerEnd)
      .toString("utf8");

    const nextBoundary = body.indexOf(
      boundary,
      headerEnd + 4
    );

    if (nextBoundary < 0) {
      break;
    }

    const contentEnd = nextBoundary - 2;

    const disposition = headers.match(
      /name="([^"]+)"/i
    );

    const filename =
      headers.match(/filename="([^"]*)"/i)?.[1] ?? "";

    const contentTypeValue =
      headers
        .match(/Content-Type:\s*([^\r\n]+)/i)?.[1]
        ?.trim() ??
      "application/octet-stream";

    if (disposition) {
      parts.push({
        name: disposition[1],
        filename,
        contentType: contentTypeValue,
        data: body.subarray(
          headerEnd + 4,
          contentEnd
        ),
      });
    }

    offset = nextBoundary;
  }

  return parts;
}

async function readRequest(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function requirePdf(parts, name = "file") {
  const part = parts.find(
    (item) =>
      item.name === name &&
      item.data.length > 0
  );

  if (
    !part ||
    (
      !part.filename
        .toLowerCase()
        .endsWith(".pdf") &&
      !part.contentType.includes("pdf")
    )
  ) {
    throw new Error("A PDF file is required.");
  }

  if (
    part.data
      .subarray(0, 5)
      .toString("ascii") !== "%PDF-"
  ) {
    throw new Error(
      "The uploaded file is not a valid PDF."
    );
  }

  return part;
}

function requireImages(parts) {
  const files = parts.filter(
    (item) =>
      item.name === "files" &&
      item.data.length > 0
  );

  if (!files.length) {
    throw new Error(
      "At least one image is required."
    );
  }

  return files;
}

async function run(command, args, cwd) {
  return execFileAsync(command, args, {
    cwd,
    shell: false,
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
  });
}

async function assertPdf(file) {
  const bytes = await readFile(file);

  if (
    bytes
      .subarray(0, 5)
      .toString("ascii") !== "%PDF-"
  ) {
    throw new Error(
      "The PDF engine returned an invalid PDF."
    );
  }

  await run(
    "qpdf",
    ["--check", file],
    dirname(file)
  );

  return bytes;
}

async function readPdfCandidate(file) {
  const bytes = await readFile(file);

  if (
    bytes.subarray(0, 5).toString("ascii") !== "%PDF-" ||
    !bytes.includes(Buffer.from("%%EOF"))
  ) {
    throw new Error("The compression candidate is not a valid PDF.");
  }

  return bytes;
}

async function getPageCount(file) {
  const { stdout } = await run(
    "qpdf",
    ["--show-npages", file],
    dirname(file)
  );

  const pageCount = Number(stdout.trim());

  if (!Number.isInteger(pageCount) || pageCount < 0) {
    throw new Error("The PDF engine returned an invalid page count.");
  }

  return pageCount;
}

async function assertEncryptedPdf(
  file,
  password
) {
  const bytes = await readFile(file);

  if (
    bytes
      .subarray(0, 5)
      .toString("ascii") !== "%PDF-"
  ) {
    throw new Error(
      "The PDF engine returned an invalid PDF."
    );
  }

  await run(
    "qpdf",
    [
      `--password=${password}`,
      "--check",
      file,
    ],
    dirname(file)
  );

  return bytes;
}

function getPartValue(
  parts,
  name,
  fallback = ""
) {
  return (
    parts
      .find((item) => item.name === name)
      ?.data
      .toString("utf8")
      .trim() || fallback
  );
}

function parseTargetBytes(parts) {
  const raw =
    getPartValue(parts, "targetSize") ||
    getPartValue(parts, "targetBytes") ||
    "";

  const value = Number(raw);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  return Math.floor(value);
}

function parseCompressionLevel(parts) {
  const raw = getPartValue(parts, "compressionLevel", "60");
  const value = Number(raw);

  if (!Number.isFinite(value) || value < 1 || value > 100) {
    throw new Error("Compression level must be between 1 and 100.");
  }

  return Math.floor(value);
}

function getCompressionSettings(quality) {
  switch (quality) {
    case "low":
      return {
        preset: "/screen",
        dpi: 72,
        jpegQuality: 35,
      };

    case "high":
      return {
        preset: "/printer",
        dpi: 150,
        jpegQuality: 75,
      };

    case "medium":
    default:
      return {
        preset: "/ebook",
        dpi: 110,
        jpegQuality: 55,
      };
  }
}

async function compressWithGhostscript(
  input,
  output,
  {
    preset = "/ebook",
    dpi = 110,
    jpegQuality = 55,
    grayscale = false,
  } = {}
) {
  await run(
    "gs",
    [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-dSAFER",

      `-dPDFSETTINGS=${preset}`,

      "-dDetectDuplicateImages=true",
      "-dCompressFonts=true",
      "-dSubsetFonts=true",
      "-dEmbedAllFonts=false",

      "-dDownsampleColorImages=true",
      "-dDownsampleGrayImages=true",
      "-dDownsampleMonoImages=true",

      "-dColorImageDownsampleType=/Bicubic",
      "-dGrayImageDownsampleType=/Bicubic",

      `-dColorImageResolution=${dpi}`,
      `-dGrayImageResolution=${dpi}`,
      `-dMonoImageResolution=${Math.max(
        150,
        dpi
      )}`,

      "-dAutoRotatePages=/None",

      `-dJPEGQ=${jpegQuality}`,

      ...(grayscale
        ? [
            "-sColorConversionStrategy=Gray",
          ]
        : []),

      `-sOutputFile=${output}`,
      input,
    ],
    dirname(output)
  );
}

async function compressWithQpdf(input, output) {
  await run(
    "qpdf",
    [
      "--stream-data=compress",
      "--object-streams=generate",
      input,
      output,
    ],
    dirname(output)
  );
}

async function compressWithRasterization(input, output, directory, level) {
  const dpi = Math.max(24, Math.round(150 - level * 1.3));
  const jpegQuality = Math.max(12, Math.round(86 - level * 0.72));
  const prefix = join(directory, "raster-page");

  await run(
    "pdftoppm",
    [
      "-jpeg",
      "-r",
      String(dpi),
      "-jpegopt",
      `quality=${jpegQuality},progressive=y,optimize=y`,
      input,
      prefix,
    ],
    directory
  );

  const names = (await readdir(directory))
    .filter((name) => /^raster-page-\d+\.jpg$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!names.length) {
    throw new Error("Raster compression produced no pages.");
  }

  await run(
    "gs",
    [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-dSAFER",
      "-dAutoRotatePages=/None",
      `-sOutputFile=${output}`,
      ...names.map((name) => join(directory, name)),
    ],
    directory
  );
}

function getAdaptiveGhostscriptSettings(aggression) {
  const level = Math.min(1.8, Math.max(0, aggression));

  return {
    preset: level > 0.3 ? "/screen" : "/ebook",
    dpi: Math.max(8, Math.round(150 - level * 79)),
    jpegQuality: Math.max(3, Math.round(85 - level * 46)),
    grayscale: level >= 1.55,
  };
}

async function compressForTarget(
  input,
  output,
  targetBytes,
  quality,
  compressionLevel = null
) {
  const qualitySettings = getCompressionSettings(quality);
  const originalBytes = await readFile(input);
  const attempts = compressionLevel !== null && compressionLevel >= 70
    ? [{ engine: "raster", level: compressionLevel }]
    : [{ engine: "qpdf" }];

  if (compressionLevel === null || compressionLevel < 70) {
    if (targetBytes === null) {
    if (compressionLevel === null) {
      attempts.push({ ...qualitySettings });
    } else {
      const aggression = (compressionLevel / 100) * 1.8;

      attempts.push({
        ...getAdaptiveGhostscriptSettings(aggression),
        aggression,
      });

    }
    } else {
      const targetRatio = targetBytes / originalBytes.length;
      const predictedAggression = Math.min(
        1.8,
        Math.max(0.2, 0.9 + (0.2 - targetRatio) * 5)
      );

    // Use one ratio-guided probe and one floor probe. Further candidates are
    // generated only from measured output-size bounds.
      attempts.push(
        {
          ...getAdaptiveGhostscriptSettings(predictedAggression),
          aggression: predictedAggression,
        },
        { ...getAdaptiveGhostscriptSettings(1.8), aggression: 1.8 }
      );
    }
  }

  let bestFile = null;
  let bestSize = Number.POSITIVE_INFINITY;
  let bestTargetFile = null;
  let bestTargetSize = 0;
  let targetReached = false;
  let attemptCount = 0;
  let underAggression = null;
  let overAggression = null;
  const targetRatio = targetBytes === null
    ? 1
    : targetBytes / originalBytes.length;
  const maxAttempts = compressionLevel !== null && compressionLevel >= 70
    ? 1
    : targetBytes === null
    ? 2
    : targetRatio <= 0.05
      ? 4
      : targetRatio <= 0.15
        ? 5
        : 4;
  const originalPageCount = await getPageCount(input);

  const seen = new Set();

  for (
    let index = 0;
    index < attempts.length && attemptCount < maxAttempts;
    index++
  ) {
    const settings = attempts[index];

    const key = settings.engine === "qpdf"
      ? "qpdf"
      : settings.engine === "raster"
        ? `raster-${settings.level}`
        : `${settings.preset}-${settings.dpi}-${settings.jpegQuality}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    attemptCount++;

    const candidate = join(
      dirname(output),
      `compressed-${index}.pdf`
    );

    try {
      console.log(
        `[Digital Desk] Compression attempt ${index + 1}/${attempts.length}: ${settings.engine ?? "ghostscript"}${settings.dpi ? ` ${settings.dpi} DPI / Q${settings.jpegQuality}` : ""}${settings.grayscale ? " / grayscale" : ""} / target=${targetBytes ?? "auto"}`
      );

      if (process.env.NODE_ENV !== "production") {
        console.debug(JSON.stringify({
          attempt: attemptCount,
          targetBytes,
          imageResolution: settings.dpi ?? null,
          jpegQuality: settings.jpegQuality ?? null,
          ghostscriptSettings: settings,
          strategy: targetBytes === null
            ? "automatic"
            : "adaptive-target-search",
        }));
      }

      if (settings.engine === "qpdf") {
        await compressWithQpdf(input, candidate);
      } else if (settings.engine === "raster") {
        await compressWithRasterization(
          input,
          candidate,
          dirname(output),
          settings.level
        );
      } else {
        await compressWithGhostscript(input, candidate, settings);
      }

      const bytes = await readPdfCandidate(candidate);

      if (bytes.length < bestSize) {
        bestSize = bytes.length;
        bestFile = candidate;
      }

      console.log(
        `[Digital Desk] Compression result ${index + 1}: ${bytes.length} bytes / target=${targetBytes ?? "auto"}`
      );

      if (
        targetBytes &&
        bytes.length <= targetBytes
      ) {
        if (bytes.length > bestTargetSize) {
          bestTargetFile = candidate;
          bestTargetSize = bytes.length;
        }

        targetReached = true;

        if (settings.engine !== "qpdf") {
          underAggression = Math.min(
            underAggression ?? Number.POSITIVE_INFINITY,
            settings.aggression ?? 1
          );
        }
      } else if (targetBytes && settings.engine !== "qpdf") {
        overAggression = Math.max(
          overAggression ?? 0,
          settings.aggression ?? 0
        );
      }

      if (
        targetBytes &&
        attemptCount < maxAttempts &&
        underAggression !== null &&
        overAggression !== null
      ) {
        const midpoint =
          (underAggression + overAggression) / 2;
        const midpointSettings =
          getAdaptiveGhostscriptSettings(midpoint);

        attempts.push({
          ...midpointSettings,
          aggression: midpoint,
        });
      }
    } catch (error) {
      console.error(
        `[Digital Desk] Compression attempt ${index + 1} failed:`,
        error instanceof Error ? error.message : error
      );
      // Try the next stronger compression level.
    }
  }

  if (bestTargetFile) {
    bestFile = bestTargetFile;
    bestSize = bestTargetSize;
  }

  if (!bestFile) {
    throw new Error(
      "Unable to generate a compressed PDF."
    );
  }

  if (
    bestSize >= originalBytes.length
  ) {
    await writeFile(output, originalBytes);

    return {
      targetReached: false,
      size: originalBytes.length,
      attemptCount,
      strategy: "original-preserved",
    };
  }

  await writeFile(
    output,
    await readFile(bestFile)
  );

  const finalBytes = await assertPdf(output);

  if (await getPageCount(output) !== originalPageCount) {
    throw new Error("Compression changed the PDF page count.");
  }

  return {
    targetReached,
    size: finalBytes.length,
    attemptCount,
    strategy: targetBytes === null
      ? compressionLevel === null
        ? "qpdf-then-adaptive-ghostscript"
        : "qpdf-then-slider-ghostscript"
      : "ratio-guided-adaptive-search",
  };
}

async function handle(req, res) {
  if (
    req.method === "GET" &&
    req.url === "/health"
  ) {
    return json(res, 200, {
      ok: true,
      engines: [
        "qpdf",
        "poppler",
        "ghostscript",
      ],
    });
  }

  if (req.method !== "POST") {
    return json(res, 405, {
      error: "Method not allowed.",
    });
  }

  const contentType =
    req.headers["content-type"] ?? "";

  if (
    !contentType.startsWith(
      "multipart/form-data"
    )
  ) {
    return json(res, 415, {
      error:
        "multipart/form-data is required.",
    });
  }

  const root = await mkdtemp(
    join(tmpdir(), "digidesk-pdf-poc-")
  );

  try {
    const parts = parseMultipart(
      await readRequest(req),
      contentType
    );

    const path = new URL(
      req.url,
      "http://localhost"
    ).pathname;

    if (path === "/office-to-pdf") {
      const office = parts.find(
        (item) => item.name === "file" && item.data.length > 0
      );

      if (!office || !/\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(office.filename)) {
        throw new Error("A DOC, DOCX, XLS, XLSX, PPT, or PPTX file is required.");
      }

      const inputFile = join(root, office.filename.replace(/[^a-zA-Z0-9._-]/g, "-"));
      await writeFile(inputFile, office.data);
      await run(
        "soffice",
        ["--headless", "--convert-to", "pdf", "--outdir", root, inputFile],
        root
      );

      const outputName = (await readdir(root)).find((name) =>
        name.toLowerCase().endsWith(".pdf")
      );

      if (!outputName) {
        throw new Error("Office conversion did not produce a PDF.");
      }

      const bytes = await assertPdf(join(root, outputName));
      return send(res, 200, bytes, "application/pdf", {
        "Content-Disposition": `attachment; filename="${outputName.replace(/\.pdf$/i, "")}.pdf"`,
      });
    }

    // MERGE
    if (path === "/merge") {
      const files = parts.filter(
        (item) =>
          item.name === "files" &&
          item.data.length > 0
      );

      if (files.length < 2) {
        throw new Error(
          "At least two PDFs are required."
        );
      }

      const args = [
        "--empty",
        "--pages",
      ];

      for (
        let i = 0;
        i < files.length;
        i++
      ) {
        const inputFile = join(
          root,
          `input-${i}.pdf`
        );

        if (
          files[i]
            .data
            .subarray(0, 5)
            .toString("ascii") !== "%PDF-"
        ) {
          throw new Error(
            "All uploaded files must be valid PDFs."
          );
        }

        await writeFile(
          inputFile,
          files[i].data
        );

        args.push(
          inputFile,
          "1-z"
        );
      }

      const output = join(
        root,
        "merged.pdf"
      );

      args.push(
        "--",
        output
      );

      await run(
        "qpdf",
        args,
        root
      );

      const bytes =
        await assertPdf(output);

      return send(
        res,
        200,
        bytes,
        "application/pdf"
      );
    }

    const pdf = requirePdf(parts);

    const input = join(
      root,
      "input.pdf"
    );

    await writeFile(
      input,
      pdf.data
    );

    // SPLIT
    if (path === "/split") {
      const ranges = String(
        parts
          .find(
            (item) =>
              item.name === "ranges"
          )
          ?.data
          .toString() ?? "1-z"
      )
        .replace(
          /[^0-9,\-z ]/gi,
          ""
        )
        .trim() || "1-z";

      const output = join(
        root,
        "split.pdf"
      );

      await run(
        "qpdf",
        [
          input,
          "--pages",
          input,
          ranges,
          "--",
          output,
        ],
        root
      );

      const bytes =
        await assertPdf(output);

      return send(
        res,
        200,
        bytes,
        "application/pdf"
      );
    }

    // COMPRESS
    if (path === "/compress") {
      const output = join(
        root,
        "compressed.pdf"
      );

      const requestedQuality =
        getPartValue(
          parts,
          "quality",
          getPartValue(
            parts,
            "level",
            "medium"
          )
        )
          .toLowerCase()
          .trim();

      const quality =
        [
          "low",
          "medium",
          "high",
        ].includes(requestedQuality)
          ? requestedQuality
          : "medium";

      const targetBytes =
        parseTargetBytes(parts);

      const compressionLevel =
        parseCompressionLevel(parts);

      if (
        targetBytes !== null &&
        targetBytes >= pdf.data.length
      ) {
        throw new Error(
          "Target size must be smaller than the original PDF size."
        );
      }

      const result =
        await compressForTarget(
          input,
          output,
          targetBytes,
            quality,
            compressionLevel
        );

      const bytes =
        await assertPdf(output);

      const reductionPercent =
        pdf.data.length > 0
          ? Math.max(
              0,
              (
                (pdf.data.length -
                  bytes.length) /
                pdf.data.length
              ) * 100
            )
          : 0;

      const headers = {
        "X-Original-Size":
          String(pdf.data.length),

        "X-Compressed-Size":
          String(bytes.length),

        "X-Target-Size":
          targetBytes !== null
            ? String(targetBytes)
            : "0",

        "X-Target-Reached":
          String(result.targetReached),

        "X-Best-Achievable":
          String(targetBytes !== null && !result.targetReached),

        "X-Attempt-Count":
          String(result.attemptCount),

        "X-Compression-Strategy":
          result.strategy,

        "X-Compression-Preset":
          quality,

        "X-Reduction-Percent":
          String(reductionPercent),
      };

      return send(
        res,
        200,
        bytes,
        "application/pdf",
        headers
      );
    }

    // PROTECT
    if (path === "/protect") {
      const password =
        getPartValue(
          parts,
          "password",
          ""
        );

      if (password.length < 4) {
        throw new Error(
          "Password must contain at least 4 characters."
        );
      }

      const output = join(
        root,
        "protected.pdf"
      );

      await run(
        "qpdf",
        [
          "--encrypt",
          password,
          password,
          "256",
          "--",
          input,
          output,
        ],
        root
      );

      const bytes =
        await assertEncryptedPdf(
          output,
          password
        );

      return send(
        res,
        200,
        bytes,
        "application/pdf"
      );
    }

    // UNLOCK
    if (path === "/unlock") {
      const password =
        getPartValue(
          parts,
          "password",
          ""
        );

      if (!password) {
        throw new Error(
          "Please enter the PDF password."
        );
      }

      const output = join(
        root,
        "unlocked.pdf"
      );

      await run(
        "qpdf",
        [
          `--password=${password}`,
          "--decrypt",
          input,
          output,
        ],
        root
      );

      const bytes =
        await assertPdf(output);

      return send(
        res,
        200,
        bytes,
        "application/pdf"
      );
    }

    // PDF TO IMAGE
    if (path === "/render") {
      const requestedFormat =
        getPartValue(
          parts,
          "format",
          "jpg"
        ).toLowerCase();

      const format =
        requestedFormat === "png"
          ? "png"
          : "jpeg";

      const outputPrefix = join(
        root,
        "page"
      );

      await run(
        "pdftoppm",
        [
          `-${format}`,
          "-r",
          "150",
          input,
          outputPrefix,
        ],
        root
      );

      const names =
        (await readdir(root))
          .filter((name) => {
            if (
              !name.startsWith("page-")
            ) {
              return false;
            }

            if (format === "png") {
              return name
                .toLowerCase()
                .endsWith(".png");
            }

            return (
              name
                .toLowerCase()
                .endsWith(".jpg") ||
              name
                .toLowerCase()
                .endsWith(".jpeg")
            );
          })
          .sort((a, b) =>
            a.localeCompare(
              b,
              undefined,
              {
                numeric: true,
              }
            )
          );

      const outputs = [];

      for (const name of names) {
        outputs.push({
          name,
          bytes: (
            await readFile(
              join(root, name)
            )
          ).toString("base64"),
        });
      }

      return json(res, 200, {
        format:
          requestedFormat === "png"
            ? "png"
            : "jpg",
        pages: outputs,
      });
    }

    // IMAGE TO PDF
    if (path === "/image-to-pdf") {
      const images =
        requireImages(parts);

      for (
        let i = 0;
        i < images.length;
        i++
      ) {
        const extension =
          images[i]
            .filename
            .match(/\.[^.]+$/)?.[0] ??
          ".img";

        const imagePath = join(
          root,
          `image-${i}${extension}`
        );

        await writeFile(
          imagePath,
          images[i].data
        );
      }

      throw new Error(
        "Image-to-PDF is intentionally not part of this first worker POC."
      );
    }

    return json(res, 404, {
      error:
        "Unknown POC operation.",
    });
  } catch (error) {
    return json(res, 400, {
      error:
        error instanceof Error
          ? error.message
          : "PDF processing failed.",
    });
  } finally {
    await rm(root, {
      recursive: true,
      force: true,
    });
  }
}

createServer((req, res) =>
  handle(req, res).catch((error) => {
    console.error(
      "[PDF_WORKER]",
      error
    );

    json(res, 500, {
      error: "Worker failure.",
    });
  })
).listen(
  port,
  "0.0.0.0",
  () => {
    console.log(
      `Self-hosted PDF POC listening on ${port}`
    );
  }
);