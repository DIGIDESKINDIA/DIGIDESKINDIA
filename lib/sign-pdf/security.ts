import crypto from 'node:crypto';

export function sanitizeFilename(name: string): string {
  const safe = (name || 'document').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 120);
  return safe || 'document';
}

export function isValidPdfFile(file: File | null): boolean {
  if (!file) return false;
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export function createAccessCodeHash(value: string): string {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

export function verifyAccessCodeHash(input: string, hash: string): boolean {
  return createAccessCodeHash(input) === hash;
}

export function createSecureRequestUrl(token: string): string {
  return `/sign/${token}`;
}

export function generateVerificationUrl(publicId: string): string {
  return `/verify-signature/${publicId}`;
}
