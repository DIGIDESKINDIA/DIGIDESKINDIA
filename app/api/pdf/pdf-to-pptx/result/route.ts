import { NextRequest, NextResponse } from "next/server";

import { getPdfToPptxJob } from "@/lib/pdf/pdf-to-pptx-jobs";

export const runtime = "nodejs";

const PPTX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("id")?.trim();
  if (!jobId || !/^[0-9a-f-]{36}$/i.test(jobId)) {
    return NextResponse.json({ success: false, message: "Invalid conversion job." }, { status: 400 });
  }

  const job = getPdfToPptxJob(jobId);
  if (!job) return NextResponse.json({ success: false, message: "Conversion job not found or expired." }, { status: 404 });
  if (job.state.status === "failed") return NextResponse.json({ success: false, message: job.state.message }, { status: 422 });
  if (!job.result?.pptx) return NextResponse.json({ success: false, message: "Conversion is still in progress." }, { status: 409 });

  const output = Buffer.from(job.result.pptx);
  return new NextResponse(output, {
    status: 200,
    headers: {
      "Content-Type": PPTX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${job.result.outputName || "document.pptx"}"`,
      "Content-Length": String(output.length),
      "Cache-Control": "no-store",
    },
  });
}
