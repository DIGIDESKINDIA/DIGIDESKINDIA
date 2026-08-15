import { NextResponse } from "next/server";

export function createDownloadResponse(
  buffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string,
  extraHeaders?: Record<string, string>
) {
  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
      ...(extraHeaders ?? {}),
    },
  });
}
