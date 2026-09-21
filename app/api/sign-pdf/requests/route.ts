import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequestPayload } from '@/lib/sign-pdf/request-helpers.mjs';
import { createRequestRecord, createSignerRecord, createFieldRecord, createEventRecord } from '@/lib/sign-pdf/signing-store';
import { connectDB } from '@/lib/mongodb';
import { SigningDocument } from '@/models/Signing';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';
import { checkSignPdfRateLimit, getSignPdfClientKey } from '@/lib/sign-pdf/rate-limit';

const signerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  role: z.string().optional(),
  color: z.string().optional(),
  accessCode: z.string().optional(),
});

const fieldSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  pageIndex: z.number().int().min(0),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0.01).max(1),
  height: z.number().min(0.01).max(1),
  required: z.boolean().optional(),
  signerId: z.string().nullable().optional(),
  value: z.string().optional(),
  linkedRange: z.tuple([z.number(), z.number()]).optional(),
  linkedMode: z.enum(['single', 'all', 'all-but-last', 'last', 'range']).optional(),
});

const settingsSchema = z.object({
  signingMode: z.enum(['sequential', 'parallel']).default('sequential'),
  expirationDays: z.number().int().min(1).max(365).optional(),
  remindersEnabled: z.boolean().optional(),
  reminderFrequency: z.number().int().min(1).max(30).optional(),
  emailNotifications: z.boolean().optional(),
  language: z.string().optional(),
  customMessage: z.string().optional(),
  allowAccessCode: z.boolean().optional(),
});

const requestSchema = z.object({
  title: z.string().min(2),
  signers: z.array(signerSchema).min(1),
  fields: z.array(fieldSchema).min(1),
  settings: settingsSchema,
  document: z.object({
    name: z.string().optional(),
    publicDocumentId: z.string().optional(),
    storagePath: z.string().optional(),
    mimeType: z.string().optional(),
    size: z.number().optional(),
    checksum: z.string().optional(),
    pageCount: z.number().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!checkSignPdfRateLimit(getSignPdfClientKey(request, 'request-create'), 30)) {
      return NextResponse.json({ success: false, message: 'Too many request attempts. Please try again later.' }, { status: 429 });
    }
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) {
      return NextResponse.json({ success: false, message: 'Authentication is required to create signing requests.' }, { status: 401 });
    }
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid request payload.', details: parsed.error.flatten() }, { status: 400 });
    }

    const validation = validateRequestPayload(parsed.data);
    if (!validation.ok) {
      return NextResponse.json({ success: false, message: validation.errors.join(' ') }, { status: 400 });
    }

    const signerIds = new Set(parsed.data.signers.map((signer) => signer.id));
    if (parsed.data.fields.some((field) => field.signerId && !signerIds.has(field.signerId))) {
      return NextResponse.json({ success: false, message: 'One or more fields reference an unknown signer.' }, { status: 400 });
    }
    if (parsed.data.fields.some((field) => field.x + field.width > 1 || field.y + field.height > 1)) {
      return NextResponse.json({ success: false, message: 'Signature fields must stay within the document page.' }, { status: 400 });
    }

    const documentMeta = parsed.data.document ?? null;
    let documentObjectId: string | null = null;
    if (documentMeta?.publicDocumentId) {
      await connectDB();
      const documentRecord = await SigningDocument.findOne({ publicDocumentId: documentMeta.publicDocumentId, ownerId }).lean();
      documentObjectId = documentRecord?._id ? String(documentRecord._id) : null;
    }

    const requestRecord = await createRequestRecord({
      title: parsed.data.title,
      status: 'draft',
      signingMode: parsed.data.settings.signingMode,
      signingOrder: parsed.data.settings.signingMode,
      expirationAt: new Date(Date.now() + (Number(parsed.data.settings.expirationDays || 7) * 24 * 60 * 60 * 1000)),
      reminderSettings: {
        enabled: parsed.data.settings.remindersEnabled ?? true,
        frequencyHours: parsed.data.settings.reminderFrequency ?? 24,
      },
      emailSettings: {
        notifications: parsed.data.settings.emailNotifications ?? true,
      },
      verificationSettings: {
        qr: true,
      },
      ownerId,
      documentId: documentObjectId,
      documentRef: documentMeta?.publicDocumentId || '',
      requestHash: crypto.createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex'),
    });

    const requestId = requestRecord._id.toString();

    const signerRecords: Array<{
      id: string;
      name: string;
      email: string;
      role?: string;
      color?: string;
      secureLinkToken: string;
      signerRecord: { _id: { toString: () => string }; publicSignerId: string };
    }> = [];
    for (const signer of parsed.data.signers) {
      const signerRecord = await createSignerRecord({
        requestId,
        name: signer.name,
        email: signer.email,
        role: signer.role || 'Approver',
        order: signerRecords.length,
        status: 'pending',
        tokenHash: null,
        tokenExpiresAt: null,
        accessCodeHash: signer.accessCode ? crypto.createHash('sha256').update(String(signer.accessCode)).digest('hex') : null,
        color: signer.color || '#10b981',
      });

      signerRecords.push({ ...signer, secureLinkToken: '', signerRecord });
    }

    const signerMap = new Map(signerRecords.map((entry) => [entry.id, entry.signerRecord._id.toString()]));
    for (const field of parsed.data.fields) {
      await createFieldRecord({
        requestId,
        signerId: field.signerId ? signerMap.get(field.signerId) ?? null : null,
        pageIndex: Number(field.pageIndex ?? 0),
        x: Number(field.x ?? 0),
        y: Number(field.y ?? 0),
        width: Number(field.width ?? 0.2),
        height: Number(field.height ?? 0.1),
        rotation: 0,
        type: field.type,
        required: Boolean(field.required),
        value: field.value ?? null,
        style: {},
        linkedMode: 'single',
        linkedRange: Array.isArray(field.linkedRange) ? field.linkedRange : undefined,
        status: 'pending',
      });
    }

    await createEventRecord({
      requestId,
      publicRequestId: requestRecord.publicRequestId,
      eventType: 'REQUEST_CREATED',
      metadata: { title: parsed.data.title, signerCount: signerRecords.length },
    });
    await createEventRecord({
      requestId,
      publicRequestId: requestRecord.publicRequestId,
      eventType: 'DOCUMENT_UPLOADED',
      metadata: { publicDocumentId: documentMeta?.publicDocumentId || null },
    });
    for (const signer of signerRecords) {
      await createEventRecord({
        requestId,
        signerId: signer.signerRecord._id.toString(),
        publicRequestId: requestRecord.publicRequestId,
        publicSignerId: signer.signerRecord.publicSignerId,
        eventType: 'SIGNER_ADDED',
        metadata: { name: signer.name, email: signer.email },
      });
    }
    return NextResponse.json({
      success: true,
      requestId: requestRecord.publicRequestId,
      message: 'Draft request created successfully.',
      request: {
        id: requestRecord.publicRequestId,
        title: parsed.data.title,
        status: 'draft',
        signers: signerRecords.map((entry) => ({
          id: entry.id,
          name: entry.name,
          email: entry.email,
          role: entry.role,
          color: entry.color,
          publicSignerId: entry.signerRecord.publicSignerId,
        })),
        fields: parsed.data.fields,
        settings: parsed.data.settings,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[SIGN_REQUEST_CREATE]', error);
    return NextResponse.json({ success: false, message: 'Unable to create signing request.' }, { status: 500 });
  }
}
