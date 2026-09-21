import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { SigningRequest, SigningSigner, SigningField, SigningDocument } from '@/models/Signing';
import { evaluateRequestStatus } from '@/lib/sign-pdf/request-state';
import { recordAuditEvent } from '@/lib/sign-pdf/audit';
import { finalizeSignedPdf } from '@/lib/sign-pdf/finalize-pdf';
import { createVerificationArtifact } from '@/lib/sign-pdf/verification';
import { saveFinalizedDocument } from '@/lib/sign-pdf/document-store';
import fs from 'node:fs/promises';
import { checkSignPdfRateLimit, getSignPdfClientKey } from '@/lib/sign-pdf/rate-limit';

export async function POST(req: NextRequest) {
  let finalizationRequestId: string | null = null;
  try {
    if (!checkSignPdfRateLimit(getSignPdfClientKey(req, 'signer-complete'), 30)) {
      return NextResponse.json({ success: false, message: 'Too many completion attempts. Please try again later.' }, { status: 429 });
    }
    const body: {
      token?: string;
      signerId?: string;
      completedFields?: string[];
      accessCode?: string;
      fieldValues?: Array<{ id: string; value: string; imageData?: string }>;
    } = await req.json();
    const { token, signerId, completedFields = [], accessCode, fieldValues = [] } = body ?? {};

    if (!token || !signerId) {
      return NextResponse.json({ success: false, message: 'Missing signer token.' }, { status: 400 });
    }

    await connectDB();
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(signerId));
    const signer = await SigningSigner.findOne({
      $and: [
        {
          $or: [
            ...(isObjectId ? [{ _id: signerId }] : []),
            { publicSignerId: signerId },
          ],
        },
        { tokenHash },
      ],
    }).lean();
    if (!signer) {
      return NextResponse.json({ success: false, message: 'Signer not found.' }, { status: 404 });
    }

    if (signer.tokenHash && signer.tokenHash !== tokenHash) {
      return NextResponse.json({ success: false, message: 'Invalid signer token.' }, { status: 401 });
    }

    const request = await SigningRequest.findById(signer.requestId).lean();
    if (!request) {
      return NextResponse.json({ success: false, message: 'Request not found.' }, { status: 404 });
    }

    if (request.status === 'draft') {
      return NextResponse.json({ success: false, message: 'This signing request has not been sent.' }, { status: 409 });
    }
    if (request.status === 'completed' || request.status === 'expired' || request.status === 'cancelled' || request.status === 'rejected') {
      return NextResponse.json({ success: false, message: 'This request is no longer active.' }, { status: 410 });
    }

    if (signer.tokenExpiresAt && new Date(signer.tokenExpiresAt).getTime() < Date.now()) {
      return NextResponse.json({ success: false, message: 'This signer link has expired.' }, { status: 410 });
    }

    const alreadySigned = signer.status === 'signed';
    let retryingFinalization = false;
    if (alreadySigned && request.status === 'in_progress') {
      const [signedSignerCount, totalSignerCount] = await Promise.all([
        SigningSigner.countDocuments({ requestId: request._id, status: 'signed' }),
        SigningSigner.countDocuments({ requestId: request._id }),
      ]);
      retryingFinalization = signedSignerCount === totalSignerCount && totalSignerCount > 0;
    }
    if (signer.status === 'signed' && !retryingFinalization) {
      return NextResponse.json({ success: false, message: 'This signer has already completed signing.' }, { status: 409 });
    }

    if (signer.accessCodeHash) {
      const suppliedAccessCode = typeof accessCode === 'string' ? accessCode : '';
      const accessCodeHash = crypto.createHash('sha256').update(suppliedAccessCode).digest('hex');
      if (accessCodeHash !== signer.accessCodeHash) {
        return NextResponse.json({ success: false, message: 'A valid access code is required.' }, { status: 401 });
      }
    }

    if (request.expirationAt && new Date(request.expirationAt).getTime() < Date.now()) {
      await SigningRequest.updateOne({ _id: request._id }, { $set: { status: 'expired', expiredAt: new Date() } });
      await recordAuditEvent({ requestId: request._id.toString(), signerId: signer._id.toString(), requestPublicId: request.publicRequestId, signerPublicId: signer.publicSignerId, eventType: 'REQUEST_EXPIRED' });
      return NextResponse.json({ success: false, message: 'This signing request has expired.' }, { status: 410 });
    }

    if (request.signingMode === 'sequential') {
      const priorSignerPending = await SigningSigner.exists({
        requestId: request._id,
        order: { $lt: signer.order ?? 0 },
        status: { $ne: 'signed' },
      });
      if (priorSignerPending) {
        return NextResponse.json({ success: false, message: 'The previous signer must complete signing first.' }, { status: 409 });
      }
    }

    const fields = await SigningField.find({ requestId: request._id, signerId: signer._id }).lean();
    const signerFieldIds = new Set(fields.flatMap((field) => [field.publicFieldId, field._id?.toString()]).filter(Boolean));
    const submittedFieldIds = [...completedFields, ...fieldValues.map((entry) => entry.id)].map(String);
    if (submittedFieldIds.some((fieldId) => !signerFieldIds.has(fieldId))) {
      return NextResponse.json({ success: false, message: 'One or more fields do not belong to this signer.' }, { status: 403 });
    }
    const submittedValueById = new Map<string, string>();
    for (const entry of fieldValues) {
      if (entry?.id) {
        submittedValueById.set(String(entry.id), String(entry.value ?? ''));
      }
    }

    const requiredMissing = fields.filter((field) => {
      const publicFieldId = field.publicFieldId || field._id?.toString();
      const submittedValue = submittedValueById.get(publicFieldId) ?? submittedValueById.get(field._id?.toString() ?? '') ?? '';
      const hasValue = Boolean((submittedValue ?? '').trim()) || Boolean(field.value) || field.status === 'completed';
      return field.required && !hasValue;
    });
    if (requiredMissing.length > 0) {
      return NextResponse.json({ success: false, message: 'Required fields are incomplete.' }, { status: 400 });
    }

    const fieldIdSet = new Set<string>([
      ...completedFields.map((value) => String(value)),
      ...fieldValues.map((entry) => String(entry.id)),
    ]);

    for (const entry of fieldValues) {
      const fieldId = String(entry.id || '');
      if (!fieldId) continue;

      const matchingField = await SigningField.findOne({
        requestId: request._id,
        signerId: signer._id,
        $or: [
          { publicFieldId: fieldId },
          { _id: fieldId.match(/^[0-9a-fA-F]{24}$/) ? fieldId : undefined },
        ],
      });

      if (matchingField) {
        await SigningField.updateOne({ _id: matchingField._id }, {
          $set: {
            value: entry.value ?? '',
            style: entry.imageData ? { imageData: entry.imageData } : undefined,
            status: 'completed',
          },
        });
      }
    }

    if (fieldIdSet.size > 0) {
      const objectIdsToUpdate: string[] = [];
      for (const rawId of fieldIdSet) {
        if (/^[0-9a-fA-F]{24}$/.test(rawId)) {
          objectIdsToUpdate.push(rawId);
        }
      }

      await SigningField.updateMany(
        {
          requestId: request._id,
          signerId: signer._id,
          $or: [
            { publicFieldId: { $in: [...fieldIdSet] } },
            ...(objectIdsToUpdate.length ? [{ _id: { $in: objectIdsToUpdate } }] : []),
          ],
        },
        {
          $set: {
            status: 'completed',
          },
        }
      );
    }

    const allSigners = await SigningSigner.find({ requestId: request._id }).lean();
    const signedCount = allSigners.filter((entry) => entry.status === 'signed').length + (retryingFinalization ? 0 : 1);
    const nextStatus = evaluateRequestStatus({
      totalSigners: allSigners.length,
      signedSigners: signedCount,
      currentStatus: request.status,
    });

    if (!retryingFinalization) {
      const signerUpdate = await SigningSigner.updateOne({ _id: signer._id, status: { $ne: 'signed' } }, {
        $set: {
          status: 'signed',
          signedAt: new Date(),
          completedAt: new Date(),
        },
      });
      if (signerUpdate.modifiedCount !== 1) return NextResponse.json({ success: false, message: 'This signer has already completed signing.' }, { status: 409 });
    }

    if (nextStatus !== 'completed') {
      await SigningRequest.updateOne({ _id: request._id }, { $set: { status: nextStatus, completedAt: null } });
    }

    await recordAuditEvent({
      requestId: request._id.toString(),
      signerId: signer._id.toString(),
      eventType: 'SIGNER_COMPLETED',
      metadata: { signerName: signer.name, completedFields: completedFields.length },
      requestPublicId: request.publicRequestId,
      signerPublicId: signer.publicSignerId,
    });
    for (const field of fields) {
      if (fieldIdSet.has(field.publicFieldId) || fieldIdSet.has(field._id?.toString() || '')) {
        await recordAuditEvent({
          requestId: request._id.toString(),
          signerId: signer._id.toString(),
          eventType: 'FIELD_COMPLETED',
          metadata: { fieldId: field.publicFieldId, fieldType: field.type },
          requestPublicId: request.publicRequestId,
          signerPublicId: signer.publicSignerId,
        });
        if (field.type === 'signature' || field.type === 'initials') {
          await recordAuditEvent({
            requestId: request._id.toString(),
            signerId: signer._id.toString(),
            eventType: 'SIGNATURE_APPLIED',
            metadata: { fieldId: field.publicFieldId, fieldType: field.type },
            requestPublicId: request.publicRequestId,
            signerPublicId: signer.publicSignerId,
          });
          if (field.type === 'signature' || field.type === 'initials') {
            await recordAuditEvent({
              requestId: request._id.toString(),
              signerId: signer._id.toString(),
              eventType: 'SIGNATURE_COMPLETED',
              metadata: { fieldId: field.publicFieldId, fieldType: field.type },
              requestPublicId: request.publicRequestId,
              signerPublicId: signer.publicSignerId,
            });
          }
        }
      }
    }

    let finalDocumentId: string | undefined;
    let verificationId: string | undefined;
    let verificationUrl: string | undefined;
    if (nextStatus === 'completed') {
      const lock = await SigningRequest.findOneAndUpdate(
        { _id: request._id, finalDocumentId: null, finalizationInProgress: { $ne: true }, status: { $ne: 'completed' } },
        { $set: { finalizationInProgress: true } },
        { new: true }
      ).lean();
      if (!lock) {
        const current = await SigningRequest.findById(request._id).lean();
        if (current?.finalDocumentId) {
          return NextResponse.json({ success: true, message: 'Signing was already completed.', nextStatus: 'completed', signerStatus: 'signed' });
        }
        return NextResponse.json({ success: false, message: 'Final document generation is already in progress.' }, { status: 409 });
      }
      finalizationRequestId = request._id.toString();
      const originalDocument = request.documentId ? await SigningDocument.findById(request.documentId).lean() : null;
      if (!originalDocument?.storagePath) {
        throw new Error('The signing request has no source document.');
      }

      const originalBytes = new Uint8Array(await fs.readFile(originalDocument.storagePath));
      const allFields = await SigningField.find({ requestId: request._id }).lean();
      const finalized = await finalizeSignedPdf({
        originalBytes,
        fields: allFields.map((field) => ({
          pageIndex: field.pageIndex,
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
          value: String(field.value ?? field.type),
          type: field.type,
          color: typeof field.style?.color === 'string' ? field.style.color : undefined,
          imageData: typeof field.style?.imageData === 'string' ? field.style.imageData : undefined,
        })),
      });
      const finalDocument = await saveFinalizedDocument({
        originalDocumentId: originalDocument._id.toString(),
        fileName: `${originalDocument.originalName || 'signed-document'}`.replace(/\.pdf$/i, '-signed.pdf'),
        fileBuffer: Buffer.from(finalized.pdfBytes),
        ownerId: originalDocument.ownerId || undefined,
      });
      await SigningRequest.updateOne({ _id: request._id }, { $set: { finalDocumentId: finalDocument._id, status: 'completed', completedAt: new Date(), finalizationInProgress: false } });
      finalizationRequestId = null;
      finalDocumentId = finalDocument.publicDocumentId;

      const verificationArtifact = await createVerificationArtifact({
        requestId: request._id.toString(),
        requestPublicId: request.publicRequestId,
        documentHash: originalDocument.checksum || '',
        finalPdfHash: finalized.hash,
        signerCount: allSigners.length,
      });
      verificationId = verificationArtifact.verificationId;
      verificationUrl = verificationArtifact.verificationUrl;
      await recordAuditEvent({
        requestId: request._id.toString(),
        eventType: 'REQUEST_COMPLETED',
        metadata: { finalDocumentId: finalDocument.publicDocumentId, verificationId: verificationArtifact.verificationId },
        requestPublicId: request.publicRequestId,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Signing completed successfully.',
      nextStatus,
      signerStatus: 'signed',
      finalDocumentId,
      verificationId,
      verificationUrl,
    });
  } catch (error) {
    if (finalizationRequestId) {
      await SigningRequest.updateOne({ _id: finalizationRequestId }, { $set: { finalizationInProgress: false } }).catch(() => undefined);
    }
    console.error('[SIGN_PDF_COMPLETE]', error);
    return NextResponse.json({ success: false, message: 'Unable to complete the signing flow.' }, { status: 500 });
  }
}
