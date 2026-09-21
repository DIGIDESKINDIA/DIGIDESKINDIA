import { NextRequest, NextResponse } from "next/server";

import { getPdfToPptxJob } from "@/lib/pdf/pdf-to-pptx-jobs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("id")?.trim();
  if (!jobId || !/^[0-9a-f-]{36}$/i.test(jobId)) {
    return NextResponse.json({ success: false, message: "Invalid conversion job." }, { status: 400 });
  }

  const job = getPdfToPptxJob(jobId);
  if (!job) {
    return NextResponse.json({ success: false, message: "Conversion job not found or expired." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    job: {
      jobId: job.state.jobId,
      status: job.state.status,
      phase: job.state.phase,
      currentPage: job.state.currentPage,
      totalPages: job.state.totalPages,
      progress: job.state.progress,
      message: job.state.message,
      outputReady: job.state.status === "completed" && Boolean(job.result?.pptx),
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
