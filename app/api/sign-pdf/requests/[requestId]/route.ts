import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SigningEvent, SigningField, SigningRequest, SigningSigner } from '@/models/Signing';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';

function publicSigner(signer: Record<string, unknown>) {
  return {
    id: signer.publicSignerId,
    name: signer.name,
    email: signer.email,
    role: signer.role,
    order: signer.order,
    status: signer.status,
    openedAt: signer.openedAt,
    signedAt: signer.signedAt,
    completedAt: signer.completedAt,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) return NextResponse.json({ success: false, message: 'Authentication is required.' }, { status: 401 });
    const { requestId } = await params;
    await connectDB();
    const requestRecord = await SigningRequest.findOne({ publicRequestId: requestId, ownerId }).lean();
    if (!requestRecord) return NextResponse.json({ success: false, message: 'Request not found.' }, { status: 404 });

    const [signers, fields, events] = await Promise.all([
      SigningSigner.find({ requestId: requestRecord._id }).sort({ order: 1 }).lean(),
      SigningField.find({ requestId: requestRecord._id }).lean(),
      SigningEvent.find({ requestId: requestRecord._id }).sort({ timestamp: 1 }).lean(),
    ]);

    return NextResponse.json({
      success: true,
      request: {
        id: requestRecord.publicRequestId,
        title: requestRecord.title,
        status: requestRecord.status,
        signingMode: requestRecord.signingMode,
        expirationAt: requestRecord.expirationAt,
        createdAt: requestRecord.createdAt,
        updatedAt: requestRecord.updatedAt,
        completedAt: requestRecord.completedAt,
        documentId: requestRecord.documentRef || null,
        finalDocumentId: requestRecord.finalDocumentId ? String(requestRecord.finalDocumentId) : null,
        signers: signers.map((signer) => publicSigner(signer as unknown as Record<string, unknown>)),
        fields: fields.map((field) => ({
          id: field.publicFieldId,
          signerId: field.signerId ? String(field.signerId) : null,
          type: field.type,
          pageIndex: field.pageIndex,
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
          required: field.required,
          status: field.status,
          value: field.value,
        })),
        audit: events.map((event) => ({
          event: event.eventType,
          timestamp: event.timestamp,
          signerId: event.publicSignerId || null,
          metadata: event.metadata,
        })),
      },
    });
  } catch (error) {
    console.error('[SIGN_REQUEST_GET]', error);
    return NextResponse.json({ success: false, message: 'Unable to load signing request.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) return NextResponse.json({ success: false, message: 'Authentication is required.' }, { status: 401 });
    const { requestId } = await params;
    const body = await request.json() as { title?: unknown; expirationAt?: unknown };
    await connectDB();
    const requestRecord = await SigningRequest.findOne({ publicRequestId: requestId, ownerId });
    if (!requestRecord) return NextResponse.json({ success: false, message: 'Request not found.' }, { status: 404 });
    if (requestRecord.status !== 'draft') return NextResponse.json({ success: false, message: 'Only draft requests can be edited.' }, { status: 409 });

    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (title.length < 2 || title.length > 200) return NextResponse.json({ success: false, message: 'Document name is invalid.' }, { status: 400 });
      requestRecord.title = title;
    }
    if (body.expirationAt !== undefined) {
      const expirationAt = new Date(String(body.expirationAt));
      if (!Number.isFinite(expirationAt.getTime()) || expirationAt.getTime() <= Date.now()) {
        return NextResponse.json({ success: false, message: 'Expiration must be a future date.' }, { status: 400 });
      }
      requestRecord.expirationAt = expirationAt;
    }
    await requestRecord.save();
    return NextResponse.json({ success: true, request: { id: requestRecord.publicRequestId, title: requestRecord.title, status: requestRecord.status, expirationAt: requestRecord.expirationAt } });
  } catch (error) {
    console.error('[SIGN_REQUEST_PATCH]', error);
    return NextResponse.json({ success: false, message: 'Unable to update signing request.' }, { status: 500 });
  }
}
