import { accessSync, constants as fsConstants, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

export const MAX_METADATA_ITEMS = 200;
export const JOB_TTL_MINUTES = Number(process.env.JOB_TTL_MINUTES ?? 30);

const envValue = (name: string, fallback: number) => {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const FILE_LIMITS = {
  pdf: envValue("METADATA_REMOVER_MAX_PDF_MB", 50) * 1024 * 1024,
  docx: envValue("METADATA_REMOVER_MAX_DOCX_MB", 50) * 1024 * 1024,
  xlsx: envValue("METADATA_REMOVER_MAX_XLSX_MB", 50) * 1024 * 1024,
  pptx: envValue("METADATA_REMOVER_MAX_PPTX_MB", 100) * 1024 * 1024,
  jpg: envValue("METADATA_REMOVER_MAX_IMAGE_MB", 25) * 1024 * 1024,
  jpeg: envValue("METADATA_REMOVER_MAX_IMAGE_MB", 25) * 1024 * 1024,
  png: envValue("METADATA_REMOVER_MAX_IMAGE_MB", 25) * 1024 * 1024,
};

export const OOXML_LIMITS = {
  maxEntries: Number(process.env.METADATA_REMOVER_OOXML_MAX_ENTRIES ?? 10000),
  maxUncompressedMb: Number(process.env.METADATA_REMOVER_OOXML_MAX_UNCOMPRESSED_MB ?? 500),
  maxCompressionRatio: Number(process.env.METADATA_REMOVER_OOXML_MAX_COMPRESSION_RATIO ?? 100),
};

export const RATE_LIMITS = {
  analyze: { limit: Number(process.env.METADATA_REMOVER_ANALYZE_LIMIT ?? 20), windowMs: Number(process.env.METADATA_REMOVER_ANALYZE_WINDOW_MS ?? 10 * 60 * 1000) },
  remove: { limit: Number(process.env.METADATA_REMOVER_REMOVE_LIMIT ?? 10), windowMs: Number(process.env.METADATA_REMOVER_REMOVE_WINDOW_MS ?? 10 * 60 * 1000) },
  download: { limit: Number(process.env.METADATA_REMOVER_DOWNLOAD_LIMIT ?? 30), windowMs: Number(process.env.METADATA_REMOVER_DOWNLOAD_WINDOW_MS ?? 10 * 60 * 1000) },
};

export const TEMP_BASE_DIR = process.env.METADATA_TEMP_DIR ?? "";

export const PROCESSING_TIMEOUT_MS = Number(process.env.METADATA_REMOVER_TIMEOUT_MS ?? 180000);

export function getFileLimit(type: keyof typeof FILE_LIMITS): number {
  return FILE_LIMITS[type];
}

export function getQpdfPath(): string | undefined {
  const configured = process.env.QPDF_PATH?.trim();
  if (configured) {
    try {
      accessSync(configured, fsConstants.X_OK);
      return configured;
    } catch {
      return undefined;
    }
  }

  try {
    const command = process.platform === "win32" ? "where" : "which";
    const onPath = execFileSync(command, ["qpdf"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split(/\r?\n/)[0];
    if (onPath) return onPath;
  } catch {
    // Continue with common Windows installation locations.
  }

  if (process.platform === "win32") {
    const roots = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter((root): root is string => Boolean(root));
    for (const root of roots) {
      try {
        for (const entry of readdirSync(root, { withFileTypes: true })) {
          if (!entry.isDirectory() || !/^qpdf(?:\s|$)/i.test(entry.name)) continue;
          const candidate = `${root}\\${entry.name}\\bin\\qpdf.exe`;
          try {
            accessSync(candidate, fsConstants.X_OK);
            return candidate;
          } catch {
            // Try the next installation.
          }
        }
      } catch {
        // Ignore inaccessible installation roots.
      }
    }
  }

  return undefined;
}

export function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}
