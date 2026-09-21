import { NextRequest, NextResponse } from "next/server";
import { deleteRedactionJob, getRedactionJob } from "@/lib/tools/redaction-store";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const job = await getRedactionJob(token);

    if (!job) {
      return NextResponse.json({ success: false, message: "Redacted document not found or expired." }, { status: 404 });
    }

    const response = new NextResponse(Buffer.from(job.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${job.fileName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });

    await deleteRedactionJob(token);
    return response;
  } catch (error) {
    console.error("[REDACT_DOCUMENT_DOWNLOAD]", error);
    return NextResponse.json({ success: false, message: "Unable to download the redacted PDF." }, { status: 500 });
  }
}
