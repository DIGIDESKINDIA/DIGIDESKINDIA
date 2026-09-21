import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SigningRequest, SigningSigner, SigningEvent, SigningVerification } from '@/models/Signing';
import { generateAuditPdf } from '@/lib/sign-pdf/verification';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';
import { checkSignPdfRateLimit, getSignPdfClientKey } from '@/lib/sign-pdf/rate-limit';

export async function GET(request: NextRequest) {
  try {
    if (!checkSignPdfRateLimit(getSignPdfClientKey(request, 'audit-pdf'), 30)) {
      return NextResponse.json({ success: false, message: 'Too many audit requests. Please try again later.' }, { status: 429 });
    }
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ success: false, message: 'Request ID is required.' }, { status: 400 });
    }
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) {
      return NextResponse.json({ success: false, message: 'Authentication is required to access audit records.' }, { status: 401 });
    }

    await connectDB();
    const req = await SigningRequest.findOne({ publicRequestId: requestId, ownerId }).lean();
    if (!req) {
      return NextResponse.json({ success: false, message: 'Request not found.' }, { status: 404 });
    }

    const signers = await SigningSigner.find({ requestId: req._id }).lean();
    const events = await SigningEvent.find({ requestId: req._id }).sort({ createdAt: 1 }).lean();
    const verification = await SigningVerification.findOne({ requestId: req._id }).lean();

    const auditPdfBytes = await generateAuditPdf({
      request: req,
      signers,
      events,
      verification,
      documentHash: verification?.documentHash || '',
      finalPdfHash: verification?.finalPdfHash || '',
    });

    return new NextResponse(Buffer.from(auditPdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(req.title || 'audit').replace(/[^a-zA-Z0-9._-]+/g, '-')}-audit.pdf"`,
      },
    });
  } catch (error) {
    console.error('[SIGN_PDF_AUDIT]', error);
    return NextResponse.json({ success: false, message: 'Unable to generate audit PDF.' }, { status: 500 });
  }
}
