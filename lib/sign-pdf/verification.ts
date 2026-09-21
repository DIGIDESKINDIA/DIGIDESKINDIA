import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { createVerificationRecord } from '@/lib/sign-pdf/signing-store';

type JsonRecord = Record<string, unknown>;

type VerificationArtifactInput = {
  requestId: string;
  requestPublicId: string;
  documentHash: string;
  finalPdfHash: string;
  signerCount: number;
};

type AuditPdfInput = {
  request: JsonRecord;
  signers: JsonRecord[];
  events: JsonRecord[];
  verification?: JsonRecord;
  documentHash?: string;
  finalPdfHash?: string;
};

export function buildVerificationUrl(publicVerificationId: string) {
  const baseUrl = process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  return baseUrl ? `${baseUrl}/verify-signature/${publicVerificationId}` : `/verify-signature/${publicVerificationId}`;
}

export async function generateQrDataUrl(value: string) {
  return await QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 160,
    color: { dark: '#111827', light: '#ffffff' },
  });
}

export async function createVerificationArtifact({
  requestId,
  requestPublicId,
  documentHash,
  finalPdfHash,
  signerCount,
}: VerificationArtifactInput) {
  const publicVerificationId = `verify_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
  const verification = await createVerificationRecord({
    requestId,
    publicVerificationId,
    documentHash,
    finalPdfHash,
    verificationStatus: 'verified',
    signedAt: new Date(),
    signerCount,
    metadata: {
      requestPublicId,
      signatureType: 'Electronic signature',
    },
  });

  return {
    verificationId: verification.publicVerificationId,
    verificationUrl: buildVerificationUrl(verification.publicVerificationId),
    verification,
  };
}

export async function generateAuditPdf({
  request,
  signers,
  events,
  verification,
  documentHash,
  finalPdfHash,
}: AuditPdfInput) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 48;

  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 54, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('DigiDesk India', 42, 28);
  doc.setFontSize(10);
  doc.text('Electronic signature audit', 42, 42);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  y += 70;
  doc.text('Document: ' + (typeof request.title === 'string' ? request.title : 'Signed document'), 42, y);
  y += 22;
  const requestId = typeof request.publicRequestId === 'string' ? request.publicRequestId : typeof request._id === 'string' ? request._id : 'n/a';
  doc.text('Request ID: ' + requestId, 42, y);
  y += 22;
  const verificationId = typeof verification?.publicVerificationId === 'string' ? verification.publicVerificationId : 'n/a';
  doc.text('Verification ID: ' + verificationId, 42, y);
  y += 22;
  doc.text('Status: ' + (typeof request.status === 'string' ? request.status : 'completed'), 42, y);
  y += 22;
  doc.text('Created: ' + (request.createdAt ? new Date(String(request.createdAt)).toISOString() : 'n/a'), 42, y);
  y += 22;
  doc.text('Expiration: ' + (request.expirationAt ? new Date(String(request.expirationAt)).toISOString() : 'n/a'), 42, y);

  y += 28;
  doc.setFontSize(12);
  doc.text('Signer status', 42, y);
  y += 14;
  signers.forEach((signer) => {
    const signerName = typeof signer.name === 'string' ? signer.name : 'Signer';
    const signerEmail = typeof signer.email === 'string' ? signer.email : '';
    const signerStatus = typeof signer.status === 'string' ? signer.status : 'pending';
    doc.text(`• ${signerName} (${signerEmail}) - ${signerStatus}`, 42, y);
    y += 16;
  });

  y += 10;
  doc.text('Hash values', 42, y);
  y += 14;
  doc.text('Document SHA-256: ' + (documentHash || 'n/a'), 42, y);
  y += 16;
  doc.text('Final PDF SHA-256: ' + (finalPdfHash || 'n/a'), 42, y);

  y += 22;
  const verificationUrl = verification ? buildVerificationUrl(String(verification.publicVerificationId)) : '/verify-signature';
  const qrDataUrl = await generateQrDataUrl(verificationUrl);
  const qrImage = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  doc.addImage(qrImage, 'PNG', 420, y, 120, 120);
  doc.text('Verification URL', 42, y + 20);
  doc.text(verificationUrl, 42, y + 36);

  y += 150;
  doc.text('Event timeline', 42, y);
  y += 14;
  events.slice(0, 12).forEach((event) => {
    const ts = event.timestamp ? new Date(String(event.timestamp)).toISOString() : 'n/a';
    doc.text(`${ts} — ${String(event.eventType)}`, 42, y);
    y += 14;
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
  });

  return Buffer.from(doc.output('arraybuffer'));
}
