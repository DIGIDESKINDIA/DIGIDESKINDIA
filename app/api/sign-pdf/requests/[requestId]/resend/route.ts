import { NextRequest, NextResponse } from 'next/server';
import { generateSecureToken } from '@/lib/sign-pdf/request-helpers.mjs';
import { hashToken } from '@/lib/sign-pdf/signing-store';
import { connectDB } from '@/lib/mongodb';
import { SigningRequest, SigningSigner } from '@/models/Signing';
import { recordAuditEvent } from '@/lib/sign-pdf/audit';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';
import { checkSignPdfRateLimit, getSignPdfClientKey } from '@/lib/sign-pdf/rate-limit';
import { buildSignatureRequestEmail, EmailNotConfiguredError, isEmailConfigured, sendEmail } from '@/lib/email/service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const changedSigners: Array<{ id: string; tokenHash: string | null; tokenExpiresAt: Date | null; status: string }> = [];
  try {
    if (!checkSignPdfRateLimit(getSignPdfClientKey(request, 'request-resend'), 10)) {
      return NextResponse.json({ success: false, message: 'Too many resend attempts. Please try again later.' }, { status: 429 });
    }
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) return NextResponse.json({ success: false, message: 'Authentication is required.' }, { status: 401 });
    const { requestId } = await params;
    const body = await request.json().catch(() => ({})) as { signerId?: string };
    await connectDB();
    const requestRecord = await SigningRequest.findOne({ publicRequestId: requestId, ownerId });
    if (!requestRecord) return NextResponse.json({ success: false, message: 'Request not found.' }, { status: 404 });
    if (!['sent', 'in_progress', 'pending', 'partially_signed'].includes(requestRecord.status)) {
      return NextResponse.json({ success: false, message: 'Only active requests can be resent.' }, { status: 409 });
    }
    if (!requestRecord.expirationAt || new Date(requestRecord.expirationAt).getTime() <= Date.now()) {
      requestRecord.status = 'expired';
      requestRecord.expiredAt = new Date();
      await requestRecord.save();
      return NextResponse.json({ success: false, message: 'The request has expired.' }, { status: 410 });
    }
    if (!isEmailConfigured()) return NextResponse.json({ success: false, message: 'Email delivery is not configured.' }, { status: 503 });

    const signerQuery = body.signerId
      ? { requestId: requestRecord._id, publicSignerId: body.signerId }
      : { requestId: requestRecord._id, status: { $nin: ['signed', 'rejected'] } };
    const signers = await SigningSigner.find(signerQuery).sort({ order: 1 });
    if (signers.length === 0) return NextResponse.json({ success: false, message: 'No eligible signer found.' }, { status: 409 });

    const links: Array<{ signerId: string; name: string; url: string }> = [];
    for (const signer of signers) {
      const token = generateSecureToken();
      changedSigners.push({ id: signer._id.toString(), tokenHash: signer.tokenHash, tokenExpiresAt: signer.tokenExpiresAt, status: signer.status });
      signer.tokenHash = await hashToken(token);
      signer.tokenExpiresAt = requestRecord.expirationAt;
      if (signer.status !== 'signed') signer.status = 'pending';
      await signer.save();
      const email = buildSignatureRequestEmail({ signerName: signer.name, requesterName: 'DigiDesk India requester', documentName: requestRecord.title || 'Document', expiration: requestRecord.expirationAt, signingUrl: `${new URL(request.url).origin}/sign/request/${requestRecord.publicRequestId}/${token}` });
      await sendEmail({ ...email, to: signer.email });
      await recordAuditEvent({ requestId: requestRecord._id.toString(), signerId: signer._id.toString(), requestPublicId: requestRecord.publicRequestId, signerPublicId: signer.publicSignerId, eventType: 'EMAIL_SENT', metadata: { type: 'signature_request_resend' } });
      links.push({ signerId: signer.publicSignerId, name: signer.name, url: `${new URL(request.url).origin}/sign/request/${requestRecord.publicRequestId}/${token}` });
    }

    await recordAuditEvent({
      requestId: requestRecord._id.toString(),
      requestPublicId: requestRecord.publicRequestId,
      eventType: 'REMINDER_SENT',
      metadata: { signerIds: signers.map((signer) => signer.publicSignerId) },
      userAgent: request.headers.get('user-agent') || undefined,
    });
    return NextResponse.json({ success: true, requestId: requestRecord.publicRequestId, signers: signers.map((signer) => ({ id: signer.publicSignerId, name: signer.name, status: signer.status })) });
  } catch (error) {
    if (changedSigners.length > 0) {
      await connectDB();
      for (const changedSigner of changedSigners) {
        await SigningSigner.updateOne({ _id: changedSigner.id }, { $set: { tokenHash: changedSigner.tokenHash, tokenExpiresAt: changedSigner.tokenExpiresAt, status: changedSigner.status } }).catch(() => undefined);
      }
    }
    if (error instanceof EmailNotConfiguredError) return NextResponse.json({ success: false, message: 'Email delivery is not configured.' }, { status: 503 });
    console.error('[SIGN_REQUEST_RESEND]', error);
    return NextResponse.json({ success: false, message: 'Unable to resend signing request.' }, { status: 500 });
  }
}
