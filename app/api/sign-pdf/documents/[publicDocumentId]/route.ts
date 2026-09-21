import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { connectDB } from '@/lib/mongodb';
import { SigningDocument, SigningRequest, SigningSigner } from '@/models/Signing';
import { recordAuditEvent } from '@/lib/sign-pdf/audit';
import { checkSignPdfRateLimit, getSignPdfClientKey } from '@/lib/sign-pdf/rate-limit';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ publicDocumentId: string }> }) {
  try {
    if (!checkSignPdfRateLimit(getSignPdfClientKey(req, 'document-download'), 60)) {
      return NextResponse.json({ success: false, message: 'Too many document requests. Please try again later.' }, { status: 429 });
    }
    const { publicDocumentId } = await params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const ownerId = await resolveSigningOwnerId();

    if (!publicDocumentId) {
      return NextResponse.json({ success: false, message: 'Document identifier is required.' }, { status: 400 });
    }

    await connectDB();
    const document = await SigningDocument.findOne({ publicDocumentId }).lean();
    if (!document || !document.storagePath) {
      return NextResponse.json({ success: false, message: 'Document not found.' }, { status: 404 });
    }

    if (token) {
      const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
      const signer = await SigningSigner.findOne({ tokenHash }).lean();
      if (!signer) {
        return NextResponse.json({ success: false, message: 'Invalid signer token.' }, { status: 401 });
      }

      const request = await SigningRequest.findOne({
        _id: signer.requestId,
        $or: [
          { documentId: document._id },
          { finalDocumentId: document._id },
        ],
      }).lean();
      if (!request) {
        return NextResponse.json({ success: false, message: 'Unauthorized document access.' }, { status: 403 });
      }
      if (signer.tokenExpiresAt && new Date(signer.tokenExpiresAt).getTime() < Date.now()) {
        return NextResponse.json({ success: false, message: 'This signer link has expired.' }, { status: 410 });
      }
      if (['expired', 'cancelled', 'rejected'].includes(request.status)) {
        return NextResponse.json({ success: false, message: 'This signing request is no longer active.' }, { status: 410 });
      }
      await recordAuditEvent({
        requestId: request._id.toString(),
        signerId: signer._id.toString(),
        eventType: 'DOCUMENT_DOWNLOADED',
        metadata: { publicDocumentId },
        requestPublicId: request.publicRequestId,
        signerPublicId: signer.publicSignerId,
      });
    } else if (ownerId && document.ownerId === ownerId) {
      const ownerRequest = await SigningRequest.findOne({
        ownerId,
        $or: [
          { documentId: document._id },
          { finalDocumentId: document._id },
        ],
      }).lean();
      if (!ownerRequest) {
        return NextResponse.json({ success: false, message: 'Unauthorized document access.' }, { status: 403 });
      }
      await recordAuditEvent({
        requestId: ownerRequest._id.toString(),
        eventType: 'DOCUMENT_DOWNLOADED',
        metadata: { publicDocumentId, requesterDownload: true },
        requestPublicId: ownerRequest.publicRequestId,
      });
    } else {
      return NextResponse.json({ success: false, message: 'Document access requires a valid signer token.' }, { status: 401 });
    }

    const fs = await import('node:fs/promises');
    const fileBuffer = await fs.readFile(document.storagePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': document.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${(document.originalName || document.filename || 'document.pdf').replace(/[^a-zA-Z0-9._-]+/g, '-') }"`,
      },
    });
  } catch (error) {
    console.error('[SIGN_PDF_DOCUMENT_GET]', error);
    return NextResponse.json({ success: false, message: 'Unable to retrieve document.' }, { status: 500 });
  }
}
