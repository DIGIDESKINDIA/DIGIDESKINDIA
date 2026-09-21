import fs from 'node:fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SigningDocument, SigningRequest } from '@/models/Signing';
import { recordAuditEvent } from '@/lib/sign-pdf/audit';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';
import { checkSignPdfRateLimit, getSignPdfClientKey } from '@/lib/sign-pdf/rate-limit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    if (!checkSignPdfRateLimit(getSignPdfClientKey(request, 'request-download'), 30)) return NextResponse.json({ success: false, message: 'Too many download attempts. Please try again later.' }, { status: 429 });
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) return NextResponse.json({ success: false, message: 'Authentication is required.' }, { status: 401 });
    const { requestId } = await params;
    await connectDB();
    const signingRequest = await SigningRequest.findOne({ publicRequestId: requestId, ownerId }).lean();
    if (!signingRequest) return NextResponse.json({ success: false, message: 'Request not found.' }, { status: 404 });
    if (signingRequest.status !== 'completed' || !signingRequest.finalDocumentId) return NextResponse.json({ success: false, message: 'The final signed PDF is not available.' }, { status: 409 });
    const document = await SigningDocument.findById(signingRequest.finalDocumentId).lean();
    if (!document?.storagePath) return NextResponse.json({ success: false, message: 'Final document not found.' }, { status: 404 });
    const fileBuffer = await fs.readFile(document.storagePath);
    await recordAuditEvent({ requestId: signingRequest._id.toString(), requestPublicId: signingRequest.publicRequestId, eventType: 'DOCUMENT_DOWNLOADED', metadata: { final: true }, userAgent: request.headers.get('user-agent') || undefined });
    return new NextResponse(fileBuffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${(document.originalName || 'signed-document.pdf').replace(/[^a-zA-Z0-9._-]+/g, '-') }"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[SIGN_REQUEST_DOWNLOAD]', error);
    return NextResponse.json({ success: false, message: 'Unable to download the final PDF.' }, { status: 500 });
  }
}
