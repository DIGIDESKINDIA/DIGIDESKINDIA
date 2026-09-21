import { createEventRecord } from '@/lib/sign-pdf/signing-store';

export const AUDIT_EVENT_TYPES = [
  'REQUEST_CREATED',
  'DOCUMENT_UPLOADED',
  'SIGNER_ADDED',
  'REQUEST_SENT',
  'EMAIL_SENT',
  'DOCUMENT_VIEWED',
  'SIGNING_STARTED',
  'SIGNER_OPENED',
  'SIGNER_AUTHENTICATED',
  'FIELD_COMPLETED',
  'SIGNATURE_APPLIED',
  'SIGNATURE_COMPLETED',
  'SIGNER_COMPLETED',
  'REMINDER_SENT',
  'REQUEST_CANCELLED',
  'REQUEST_EXPIRED',
  'SIGNER_DECLINED',
  'REQUEST_COMPLETED',
  'DOCUMENT_DOWNLOADED',
] as const;

type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];
type AuditMetadata = Record<string, unknown>;

export async function recordAuditEvent({
  requestId,
  signerId,
  eventType,
  metadata,
  requestPublicId,
  signerPublicId,
  ipAddress,
  userAgent,
}: {
  requestId?: string;
  signerId?: string;
  eventType: string;
  metadata?: AuditMetadata;
  requestPublicId?: string;
  signerPublicId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const normalizedEventType = eventType as AuditEventType;
  if (!AUDIT_EVENT_TYPES.includes(normalizedEventType)) {
    throw new Error(`Unsupported audit event: ${eventType}`);
  }

  return await createEventRecord({
    requestId,
    signerId,
    publicRequestId: requestPublicId || '',
    publicSignerId: signerPublicId || '',
    eventType: normalizedEventType,
    timestamp: new Date(),
    metadata: metadata || {},
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });
}
