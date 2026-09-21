import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { connectDB } from '@/lib/mongodb';
import { SigningSigner, SigningRequest, SigningField, SigningDocument } from '@/models/Signing';
import { recordAuditEvent } from '@/lib/sign-pdf/audit';
import { checkSignPdfRateLimit, getSignPdfClientKey } from '@/lib/sign-pdf/rate-limit';

export async function GET(request: NextRequest) {
  try {
    if (!checkSignPdfRateLimit(getSignPdfClientKey(request, 'signer-session'), 60)) {
      return NextResponse.json({ success: false, message: 'Too many signer requests. Please try again later.' }, { status: 429 });
    }
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const signerId = searchParams.get('signerId');

    if (!token || !signerId) {
      return NextResponse.json({ success: false, message: 'Missing token or signer identifier.' }, { status: 400 });
    }

    await connectDB();
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(signerId));
    const signer = await SigningSigner.findOne({
      tokenHash,
      $or: [
        ...(isObjectId ? [{ _id: signerId }] : []),
        { publicSignerId: signerId },
      ],
    }).lean();
    if (!signer) {
      return NextResponse.json({ success: false, message: 'Invalid signer token.' }, { status: 401 });
    }

    const requestRecord = await SigningRequest.findById(signer.requestId).lean();
    if (!requestRecord) {
      return NextResponse.json({ success: false, message: 'Signing request not found.' }, { status: 404 });
    }
    if (requestRecord.status === 'draft') {
      return NextResponse.json({ success: false, message: 'This signing request has not been sent.' }, { status: 409 });
    }
    if (['completed', 'expired', 'cancelled', 'rejected'].includes(requestRecord.status)) {
      return NextResponse.json({ success: false, message: 'This signing request is no longer active.' }, { status: 410 });
    }
    if (requestRecord.expirationAt && new Date(requestRecord.expirationAt).getTime() < Date.now()) {
      await SigningRequest.updateOne({ _id: requestRecord._id }, { $set: { status: 'expired', expiredAt: new Date() } });
      await recordAuditEvent({
        requestId: requestRecord._id.toString(),
        eventType: 'REQUEST_EXPIRED',
        requestPublicId: requestRecord.publicRequestId,
      });
      return NextResponse.json({ success: false, message: 'This signing request has expired.' }, { status: 410 });
    }
    if (signer.tokenExpiresAt && new Date(signer.tokenExpiresAt).getTime() < Date.now()) {
      return NextResponse.json({ success: false, message: 'This signer link has expired.' }, { status: 410 });
    }
    if (signer.status === 'signed') {
      return NextResponse.json({ success: false, message: 'This signer has already completed signing.' }, { status: 409 });
    }
    if (requestRecord.signingMode === 'sequential') {
      const priorSignerPending = await SigningSigner.exists({ requestId: signer.requestId, order: { $lt: signer.order ?? 0 }, status: { $ne: 'signed' } });
      if (priorSignerPending) return NextResponse.json({ success: false, message: 'The previous signer must complete signing first.' }, { status: 409 });
    }
    await SigningSigner.updateOne(
      { _id: signer._id, status: 'pending' },
      { $set: { status: 'opened', openedAt: new Date() } }
    );
    if (requestRecord.status === 'sent' || requestRecord.status === 'pending') {
      await SigningRequest.updateOne({ _id: requestRecord._id, status: requestRecord.status }, { $set: { status: 'in_progress' } });
      requestRecord.status = 'in_progress';
    }
    await recordAuditEvent({
      requestId: requestRecord._id.toString(),
      signerId: signer._id.toString(),
      eventType: 'SIGNER_OPENED',
      requestPublicId: requestRecord.publicRequestId,
      signerPublicId: signer.publicSignerId,
    });
    await recordAuditEvent({
      requestId: requestRecord._id.toString(),
      signerId: signer._id.toString(),
      eventType: 'DOCUMENT_VIEWED',
      requestPublicId: requestRecord.publicRequestId,
      signerPublicId: signer.publicSignerId,
    });
    await recordAuditEvent({
      requestId: requestRecord._id.toString(),
      signerId: signer._id.toString(),
      eventType: 'SIGNING_STARTED',
      requestPublicId: requestRecord.publicRequestId,
      signerPublicId: signer.publicSignerId,
    });
    await recordAuditEvent({
      requestId: requestRecord._id.toString(),
      signerId: signer._id.toString(),
      eventType: 'SIGNER_AUTHENTICATED',
      requestPublicId: requestRecord.publicRequestId,
      signerPublicId: signer.publicSignerId,
    });
    const fields = await SigningField.find({ requestId: signer.requestId, signerId: signer._id }).lean();
    const document = requestRecord?.documentId ? await SigningDocument.findById(requestRecord.documentId).lean() : null;

    return NextResponse.json({
      success: true,
      signer: {
        id: signer.publicSignerId,
        name: signer.name,
        email: signer.email,
        role: signer.role,
        color: signer.color,
        status: signer.status,
      },
      request: {
        id: requestRecord?.publicRequestId,
        title: requestRecord?.title,
        status: requestRecord?.status,
      },
      document: document ? {
        publicDocumentId: document.publicDocumentId,
        name: document.originalName || document.filename,
        mimeType: document.mimeType,
        size: document.size,
        pageCount: document.metadata?.pageCount ?? 0,
        url: `/api/sign-pdf/documents/${document.publicDocumentId}?token=${encodeURIComponent(String(token))}`,
      } : null,
      fields: fields.map((field) => ({
        id: field.publicFieldId,
        type: field.type,
        pageIndex: field.pageIndex,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        required: field.required,
        value: field.value,
        status: field.status,
      })),
    });
  } catch (error) {
    console.error('[SIGNER_DETAILS]', error);
    return NextResponse.json({ success: false, message: 'Unable to load signer session.' }, { status: 500 });
  }
}
