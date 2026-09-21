import { NextRequest, NextResponse } from 'next/server';
import { generateSecureToken } from '@/lib/sign-pdf/request-helpers.mjs';
import { hashToken } from '@/lib/sign-pdf/signing-store';
import { connectDB } from '@/lib/mongodb';
import { SigningField, SigningRequest, SigningSigner } from '@/models/Signing';
import { recordAuditEvent } from '@/lib/sign-pdf/audit';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';
import { checkSignPdfRateLimit, getSignPdfClientKey } from '@/lib/sign-pdf/rate-limit';
import { buildSignatureRequestEmail, EmailNotConfiguredError, isEmailConfigured, sendEmail } from '@/lib/email/service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const changedSigners: Array<{ id: string; tokenHash: string | null; tokenExpiresAt: Date | null; status: string }> = [];
  try {
    if (!checkSignPdfRateLimit(getSignPdfClientKey(request, 'request-send'), 20)) {
      return NextResponse.json({ success: false, message: 'Too many send attempts. Please try again later.' }, { status: 429 });
    }
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) return NextResponse.json({ success: false, message: 'Authentication is required.' }, { status: 401 });
    const { requestId } = await params;
    await connectDB();
    const requestRecord = await SigningRequest.findOne({ publicRequestId: requestId, ownerId });
    if (!requestRecord) return NextResponse.json({ success: false, message: 'Request not found.' }, { status: 404 });
    if (requestRecord.status !== 'draft') return NextResponse.json({ success: false, message: 'Only draft requests can be sent.' }, { status: 409 });
    if (!requestRecord.documentId) return NextResponse.json({ success: false, message: 'A source document is required.' }, { status: 400 });
    if (!requestRecord.expirationAt || new Date(requestRecord.expirationAt).getTime() <= Date.now()) {
      return NextResponse.json({ success: false, message: 'The request expiration must be in the future.' }, { status: 400 });
    }
    if (!isEmailConfigured()) {
      return NextResponse.json({ success: false, message: 'Email delivery is not configured. Set EMAIL_PROVIDER=webhook and EMAIL_WEBHOOK_URL before sending.' }, { status: 503 });
    }

    const signers = await SigningSigner.find({ requestId: requestRecord._id }).sort({ order: 1 });
    const fields = await SigningField.find({ requestId: requestRecord._id }).lean();
    if (signers.length === 0 || signers.some((signer) => !signer.name?.trim() || !signer.email?.trim())) {
      return NextResponse.json({ success: false, message: 'Every signer must have a name and email address.' }, { status: 400 });
    }
    if (fields.length === 0 || fields.some((field) => field.required && !field.signerId)) {
      return NextResponse.json({ success: false, message: 'Every required field must be assigned to a signer.' }, { status: 400 });
    }

    const links: Array<{ signerId: string; name: string; url: string }> = [];
    for (const signer of signers) {
      const token = generateSecureToken();
      changedSigners.push({ id: signer._id.toString(), tokenHash: signer.tokenHash, tokenExpiresAt: signer.tokenExpiresAt, status: signer.status });
      signer.tokenHash = await hashToken(token);
      signer.tokenExpiresAt = requestRecord.expirationAt;
      signer.status = 'pending';
      await signer.save();
      const email = buildSignatureRequestEmail({
        signerName: signer.name,
        requesterName: 'DigiDesk India requester',
        documentName: requestRecord.title || 'Document',
        expiration: requestRecord.expirationAt,
        signingUrl: `${new URL(request.url).origin}/sign/request/${requestRecord.publicRequestId}/${token}`,
      });
      await sendEmail({ ...email, to: signer.email });
      await recordAuditEvent({ requestId: requestRecord._id.toString(), signerId: signer._id.toString(), requestPublicId: requestRecord.publicRequestId, signerPublicId: signer.publicSignerId, eventType: 'EMAIL_SENT', metadata: { type: 'signature_request' } });
      links.push({
        signerId: signer.publicSignerId,
        name: signer.name,
        url: `${new URL(request.url).origin}/sign/request/${requestRecord.publicRequestId}/${token}`,
      });
    }

    requestRecord.status = 'sent';
    await requestRecord.save();
    await recordAuditEvent({
      requestId: requestRecord._id.toString(),
      requestPublicId: requestRecord.publicRequestId,
      eventType: 'REQUEST_SENT',
      metadata: { signerCount: signers.length, signingMode: requestRecord.signingMode },
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, requestId: requestRecord.publicRequestId, status: 'sent', signers: signers.map((signer) => ({ id: signer.publicSignerId, name: signer.name, status: signer.status })) });
  } catch (error) {
    if (changedSigners.length > 0) {
      await connectDB();
      for (const changedSigner of changedSigners) {
        await SigningSigner.updateOne({ _id: changedSigner.id }, { $set: { tokenHash: changedSigner.tokenHash, tokenExpiresAt: changedSigner.tokenExpiresAt, status: changedSigner.status } }).catch(() => undefined);
      }
    }
    if (error instanceof EmailNotConfiguredError) return NextResponse.json({ success: false, message: 'Email delivery is not configured.' }, { status: 503 });
    console.error('[SIGN_REQUEST_SEND]', error);
    return NextResponse.json({ success: false, message: 'Unable to send signing request.' }, { status: 500 });
  }
}
