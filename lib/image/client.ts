export function getDownloadFileName(
  contentDisposition: string | null,
  fallback: string
) {
  if (contentDisposition) {
    const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

    if (utfMatch?.[1]) {
      try {
        return decodeURIComponent(utfMatch[1]);
      } catch {
        // Fall through to the normal filename parsing.
      }
    }

    const normalMatch = contentDisposition.match(/filename="?([^";]+)"?/i);

    if (normalMatch?.[1]) {
      return normalMatch[1].trim();
    }
  }

  return fallback;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(kb >= 100 ? 0 : 2)} KB`;
  }

  const mb = kb / 1024;

  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);

  try {
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };

      image.onerror = () => {
        reject(new Error("Unable to read image dimensions."));
      };

      image.src = url;
    });

    return dimensions;
  } finally {
    URL.revokeObjectURL(url);
  }
}

