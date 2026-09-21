import fs from "fs/promises";
import path from "path";
import { execFileSync } from "child_process";

function normalizeCandidatePath(candidate: string) {
  return candidate.trim().replace(/['"]+/g, "");
}

async function isUsableExecutable(filePath: string) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return false;
    await fs.access(filePath, fs.constants?.F_OK ?? 0);
    return true;
  } catch {
    return false;
  }
}

function resolveFromPathEnv() {
  const rawPath = process.env.PATH || "";
  if (!rawPath) return [] as string[];

  return rawPath
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((dir) => {
      const basename = process.platform === "win32" ? "soffice.exe" : "soffice";
      return [path.join(dir, basename), path.join(dir, "libreoffice")];
    });
}

export async function findLibreOfficeExecutable(): Promise<string | null> {
  const candidates = new Set<string>();

  const configuredPath = normalizeCandidatePath(process.env.LIBREOFFICE_PATH || "");
  if (configuredPath) candidates.add(configuredPath);

  const execName = process.platform === "win32" ? "soffice.exe" : "soffice";
  try {
    const command = process.platform === "win32" ? "where.exe" : "which";
    const result = execFileSync(command, [execName], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const located = (result || "")
      .split(/\r?\n/)
      .map((entry) => normalizeCandidatePath(entry))
      .filter(Boolean)[0];
    if (located) candidates.add(located);
  } catch {
    // Not in PATH; continue to common installation search.
  }

  for (const dir of resolveFromPathEnv()) {
    if (dir) candidates.add(dir);
  }

  if (process.platform === "win32") {
    [
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
      path.join(process.env.PROGRAMFILES || "", "LibreOffice", "program", "soffice.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] || "", "LibreOffice", "program", "soffice.exe"),
      path.join(process.env.LOCALAPPDATA || "", "Programs", "LibreOffice", "program", "soffice.exe"),
    ].forEach((candidate) => candidates.add(candidate));
  } else if (process.platform === "darwin") {
    [
      "/Applications/LibreOffice.app/Contents/MacOS/soffice",
      "/usr/local/bin/soffice",
      "/opt/homebrew/bin/soffice",
    ].forEach((candidate) => candidates.add(candidate));
  } else {
    [
      "/usr/bin/libreoffice",
      "/usr/bin/soffice",
      "/usr/local/bin/libreoffice",
      "/usr/local/bin/soffice",
      "/opt/libreoffice/program/soffice",
    ].forEach((candidate) => candidates.add(candidate));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        const canAccess = await fs.access(candidate, (fs.constants && fs.constants.X_OK) || 0).then(() => true).catch(() => false);
        if (canAccess) {
          console.log("[LIBREOFFICE_DISCOVERY] Found soffice at:", candidate);
          return candidate;
        }
      }
    } catch {
      // Candidate is not a valid file for this machine; continue.
    }
  }

  console.log("[LIBREOFFICE_DISCOVERY] LibreOffice not found in common paths or PATH.");
  return null;
}
