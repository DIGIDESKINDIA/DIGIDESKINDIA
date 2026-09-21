import { NextResponse } from "next/server";

import { getQpdfPath } from "@/lib/tools/metadata-remover/constants";

export const runtime = "nodejs";

export async function GET() {
  const processors = {
    pdf: Boolean(getQpdfPath()),
    office: true,
    jpeg: true,
    png: true,
  };

  return NextResponse.json({
    success: true,
    processors,
  });
}
