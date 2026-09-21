import { access, readdir } from "fs/promises";
import path from "path";

export async function resolveQpdfBinary() {
  const configuredPath = process.env.QPDF_PATH?.trim();

  if (configuredPath) {
    try {
      await access(configuredPath);
      return configuredPath;
    } catch {
      // Continue with the standard installation locations.
    }
  }

  if (process.platform === "win32") {
    const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";

    try {
      const entries = await readdir(programFiles, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.toLowerCase().startsWith("qpdf")) {
          continue;
        }

        const binary = path.join(
          programFiles,
          entry.name,
          "bin",
          "qpdf.exe"
        );

        try {
          await access(binary);
          return binary;
        } catch {
          // Try the next qpdf installation.
        }
      }
    } catch {
      // Fall back to qpdf resolved from PATH.
    }
  }

  return "qpdf";
}