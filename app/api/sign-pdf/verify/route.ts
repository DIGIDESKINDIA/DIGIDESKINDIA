import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SigningVerification, SigningRequest, SigningSigner, SigningDocument } from '@/models/Signing';
import { checkSignPdfRateLimit, getSignPdfClientKey } from '@/lib/sign-pdf/rate-limit';

export async function GET(request: NextRequest) {
  try {
    if (!checkSignPdfRateLimit(getSignPdfClientKey(request, 'verification'), 60)) {
      return NextResponse.json({ success: false, message: 'Too many verification requests. Please try again later.' }, { status: 429 });
    }
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return NextResponse.json({ success: false, message: 'Verification ID is required.' }, { status: 400 });
    }

    await connectDB();
    const verification = await SigningVerification.findOne({ publicVerificationId: publicId }).lean();
    if (!verification) {
      return NextResponse.json({ success: false, message: 'Verification record not found.' }, { status: 404 });
    }

    const requestRecord = await SigningRequest.findById(verification.requestId).lean();
    const finalDocument = requestRecord?.finalDocumentId ? await SigningDocument.findById(requestRecord.finalDocumentId).lean() : null;
    const integrityMatches = Boolean(finalDocument?.checksum && finalDocument.checksum === verification.finalPdfHash);
    const signers = await SigningSigner.find({ requestId: verification.requestId }).lean();

    return NextResponse.json({
      success: true,
      verification: {
        id: verification.publicVerificationId,
        status: integrityMatches ? verification.verificationStatus : 'unverified',
        integrityMatches,
        signerCount: verification.signerCount,
        documentHash: verification.documentHash,
        finalPdfHash: verification.finalPdfHash,
        signedAt: verification.signedAt,
      },
      request: {
        id: requestRecord?.publicRequestId,
        title: requestRecord?.title,
        status: requestRecord?.status,
      },
      signers: signers.map((signer) => ({
        id: signer.publicSignerId,
        name: signer.name,
        email: signer.email,
        role: signer.role,
        status: signer.status,
        signedAt: signer.signedAt,
      })),
    });
  } catch (error) {
    console.error('[SIGN_PDF_VERIFY]', error);
    return NextResponse.json({ success: false, message: 'Unable to verify request.' }, { status: 500 });
  }
}
