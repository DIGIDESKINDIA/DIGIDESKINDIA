import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SigningRequest, SigningSigner } from '@/models/Signing';
import { recordAuditEvent } from '@/lib/sign-pdf/audit';
import { checkSignPdfRateLimit, getSignPdfClientKey } from '@/lib/sign-pdf/rate-limit';

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string; token: string }> }) {
  try {
    if (!checkSignPdfRateLimit(getSignPdfClientKey(request, 'signer-decline'), 10)) {
      return NextResponse.json({ success: false, message: 'Too many attempts. Please try again later.' }, { status: 429 });
    }
    const { requestId, token } = await params;
    if (!requestId || !token) return NextResponse.json({ success: false, message: 'Invalid signing link.' }, { status: 400 });
    await connectDB();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const signer = await SigningSigner.findOne({ tokenHash }).lean();
    const signingRequest = signer ? await SigningRequest.findOne({ _id: signer.requestId, publicRequestId: requestId }).lean() : null;
    if (!signer || !signingRequest) return NextResponse.json({ success: false, message: 'Invalid signing link.' }, { status: 401 });
    if (signingRequest.expirationAt && new Date(signingRequest.expirationAt).getTime() <= Date.now()) return NextResponse.json({ success: false, message: 'This signing request has expired.' }, { status: 410 });
    if (['completed', 'expired', 'cancelled', 'rejected'].includes(signingRequest.status)) return NextResponse.json({ success: false, message: 'This signing request is no longer active.' }, { status: 410 });
    const updated = await SigningSigner.updateOne({ _id: signer._id, status: { $nin: ['signed', 'rejected'] } }, { $set: { status: 'rejected', tokenHash: null, tokenExpiresAt: null } });
    if (updated.modifiedCount !== 1) return NextResponse.json({ success: false, message: 'This signer has already completed an action.' }, { status: 409 });
    await recordAuditEvent({ requestId: signingRequest._id.toString(), signerId: signer._id.toString(), requestPublicId: signingRequest.publicRequestId, signerPublicId: signer.publicSignerId, eventType: 'SIGNER_DECLINED', metadata: { reason: 'signer_declined' }, ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(), userAgent: request.headers.get('user-agent') || undefined });
    return NextResponse.json({ success: true, status: 'rejected' });
  } catch (error) {
    console.error('[SIGNER_DECLINE]', error);
    return NextResponse.json({ success: false, message: 'Unable to decline this signing request.' }, { status: 500 });
  }
}
