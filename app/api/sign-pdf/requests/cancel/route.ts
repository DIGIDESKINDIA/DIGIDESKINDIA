import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SigningRequest, SigningSigner } from '@/models/Signing';
import { recordAuditEvent } from '@/lib/sign-pdf/audit';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';
import { checkSignPdfRateLimit, getSignPdfClientKey } from '@/lib/sign-pdf/rate-limit';

export async function POST(request: NextRequest) {
  try {
    if (!checkSignPdfRateLimit(getSignPdfClientKey(request, 'request-cancel'), 20)) {
      return NextResponse.json({ success: false, message: 'Too many cancellation attempts. Please try again later.' }, { status: 429 });
    }
    const body = await request.json() as { requestId?: string };
    const requestId = typeof body.requestId === 'string' ? body.requestId : '';
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) {
      return NextResponse.json({ success: false, message: 'Authentication is required to cancel requests.' }, { status: 401 });
    }
    if (!requestId) {
      return NextResponse.json({ success: false, message: 'Request ID is required.' }, { status: 400 });
    }

    await connectDB();
    const signingRequest = await SigningRequest.findOne({ publicRequestId: requestId, ownerId });
    if (!signingRequest) {
      return NextResponse.json({ success: false, message: 'Request not found.' }, { status: 404 });
    }
    if (['completed', 'expired', 'cancelled', 'rejected'].includes(signingRequest.status)) {
      return NextResponse.json({ success: false, message: 'This request cannot be cancelled.' }, { status: 409 });
    }

    signingRequest.status = 'cancelled';
    signingRequest.cancelledAt = new Date();
    await signingRequest.save();
    await SigningSigner.updateMany({ requestId: signingRequest._id }, { $set: { status: 'expired', tokenHash: null } });
    await recordAuditEvent({
      requestId: signingRequest._id.toString(),
      eventType: 'REQUEST_CANCELLED',
      metadata: { ownerId },
      requestPublicId: signingRequest.publicRequestId,
    });
    return NextResponse.json({ success: true, status: 'cancelled' });
  } catch (error) {
    console.error('[SIGN_REQUEST_CANCEL]', error);
    return NextResponse.json({ success: false, message: 'Unable to cancel signing request.' }, { status: 500 });
  }
}
