import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SigningRequest, SigningSigner } from '@/models/Signing';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) return NextResponse.json({ success: false, message: 'Authentication is required.' }, { status: 401 });
    const { requestId } = await params;
    await connectDB();
    const requestRecord = await SigningRequest.findOne({ publicRequestId: requestId, ownerId }).lean();
    if (!requestRecord) return NextResponse.json({ success: false, message: 'Request not found.' }, { status: 404 });
    const signers = await SigningSigner.find({ requestId: requestRecord._id }).sort({ order: 1 }).lean();
    return NextResponse.json({
      success: true,
      requestId: requestRecord.publicRequestId,
      status: requestRecord.status,
      expiresAt: requestRecord.expirationAt,
      completedAt: requestRecord.completedAt,
      signers: signers.map((signer) => ({ id: signer.publicSignerId, name: signer.name, status: signer.status, signedAt: signer.signedAt })),
    });
  } catch (error) {
    console.error('[SIGN_REQUEST_STATUS]', error);
    return NextResponse.json({ success: false, message: 'Unable to load request status.' }, { status: 500 });
  }
}
