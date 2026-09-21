import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SigningRequest, SigningSigner } from '@/models/Signing';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) {
      return NextResponse.json({ success: false, message: 'Authentication is required to access the dashboard.' }, { status: 401 });
    }
    const requests = await SigningRequest.find({ ownerId }).sort({ createdAt: -1 }).lean();

    const payload = await Promise.all(requests.map(async (entry) => {
      const signers = await SigningSigner.find({ requestId: entry._id }).lean();
      return {
        id: entry.publicRequestId,
        title: entry.title,
        status: entry.status,
        signers: signers.map((signer) => ({ name: signer.name, email: signer.email, status: signer.status })),
        createdAt: entry.createdAt,
        expirationAt: entry.expirationAt,
      };
    }));

    return NextResponse.json({ success: true, requests: payload });
  } catch (error) {
    console.error('[SIGN_REQUEST_DASHBOARD]', error);
    return NextResponse.json({ success: false, message: 'Unable to load dashboard.' }, { status: 500 });
  }
}
