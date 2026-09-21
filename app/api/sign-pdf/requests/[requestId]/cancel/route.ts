import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SigningRequest, SigningSigner } from '@/models/Signing';
import { recordAuditEvent } from '@/lib/sign-pdf/audit';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';
import { checkSignPdfRateLimit, getSignPdfClientKey } from '@/lib/sign-pdf/rate-limit';

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    if (!checkSignPdfRateLimit(getSignPdfClientKey(request, 'request-cancel'), 20)) {
      return NextResponse.json({ success: false, message: 'Too many cancellation attempts. Please try again later.' }, { status: 429 });
    }
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) return NextResponse.json({ success: false, message: 'Authentication is required.' }, { status: 401 });
    const { requestId } = await params;
    await connectDB();
    const requestRecord = await SigningRequest.findOne({ publicRequestId: requestId, ownerId });
    if (!requestRecord) return NextResponse.json({ success: false, message: 'Request not found.' }, { status: 404 });
    if (!['draft', 'sent', 'in_progress', 'pending', 'partially_signed'].includes(requestRecord.status)) {
      return NextResponse.json({ success: false, message: 'This request cannot be cancelled.' }, { status: 409 });
    }

    requestRecord.status = 'cancelled';
    requestRecord.cancelledAt = new Date();
    await requestRecord.save();
    await SigningSigner.updateMany({ requestId: requestRecord._id }, { $set: { status: 'expired', tokenHash: null, tokenExpiresAt: null } });
    await recordAuditEvent({
      requestId: requestRecord._id.toString(),
      requestPublicId: requestRecord.publicRequestId,
      eventType: 'REQUEST_CANCELLED',
      metadata: { ownerId },
      userAgent: request.headers.get('user-agent') || undefined,
    });
    return NextResponse.json({ success: true, requestId: requestRecord.publicRequestId, status: 'cancelled' });
  } catch (error) {
    console.error('[SIGN_REQUEST_CANCEL_DYNAMIC]', error);
    return NextResponse.json({ success: false, message: 'Unable to cancel signing request.' }, { status: 500 });
  }
}
