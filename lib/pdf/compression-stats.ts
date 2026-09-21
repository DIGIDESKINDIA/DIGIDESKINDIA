export type CompressionStats = {
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  reductionPercent: number;
  isReduced: boolean;
  isLargerThanOriginal: boolean;
};

export function computeCompressionStats(
  originalSize: number,
  compressedSize: number,
): CompressionStats {
  const safeOriginal = Number.isFinite(originalSize) ? Math.max(0, originalSize) : 0;
  const safeCompressed = Number.isFinite(compressedSize) ? Math.max(0, compressedSize) : 0;
  const savedBytes = Math.max(0, safeOriginal - safeCompressed);
  const reductionPercent = safeOriginal > 0
    ? Number(((savedBytes / safeOriginal) * 100).toFixed(2))
    : 0;

  return {
    originalSize: safeOriginal,
    compressedSize: safeCompressed,
    savedBytes,
    reductionPercent,
    isReduced: safeCompressed < safeOriginal,
    isLargerThanOriginal: safeCompressed > safeOriginal,
  };
}

export function getCompressionStrengthLabel(level: number) {
  if (level <= 25) {
    return "Low compression / Best quality";
  }

  if (level <= 50) {
    return "Balanced compression";
  }

  if (level <= 75) {
    return "Strong compression";
  }

  return "Maximum compression";
}

export function getCompressionStrengthDescription(level: number) {
  if (level <= 25) {
    return "Keeps the document closer to the original quality while making only modest size savings.";
  }

  if (level <= 50) {
    return "Balances file size and appearance for everyday sharing and storage.";
  }

  if (level <= 75) {
    return "Applies stronger optimization to reduce output size more aggressively.";
  }

  return "Uses the strongest optimization available, which may noticeably reduce image quality depending on the PDF content.";
}
