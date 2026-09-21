import crypto from 'node:crypto';

export function buildLinkedPageIndexes({ pageCount, pageIndex, mode, range }) {
  const safeCount = Number(pageCount || 1);
  const safeIndex = Number(pageIndex ?? 0);

  if (!Number.isFinite(safeCount) || safeCount < 1) {
    return [];
  }

  if (mode === 'single') {
    return [Math.min(Math.max(safeIndex, 0), safeCount - 1)];
  }

  if (mode === 'all') {
    return Array.from({ length: safeCount }, (_, index) => index);
  }

  if (mode === 'all-but-last') {
    return Array.from({ length: Math.max(0, safeCount - 1) }, (_, index) => index);
  }

  if (mode === 'last') {
    return [safeCount - 1];
  }

  if (mode === 'range' && Array.isArray(range) && range.length === 2) {
    const start = Math.min(Math.max(range[0], 0), safeCount - 1);
    const end = Math.min(Math.max(range[1], 0), safeCount - 1);
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    return Array.from({ length: to - from + 1 }, (_, offset) => from + offset);
  }

  return [Math.min(Math.max(safeIndex, 0), safeCount - 1)];
}

export function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function validateRequestPayload(payload) {
  const errors = [];
  const signers = Array.isArray(payload?.signers) ? payload.signers : [];
  const fields = Array.isArray(payload?.fields) ? payload.fields : [];

  if (!payload?.title || String(payload.title).trim().length < 2) {
    errors.push('Request title is required.');
  }

  if (signers.length === 0) {
    errors.push('At least one signer is required.');
  }

  for (const signer of signers) {
    if (!signer?.name || String(signer.name).trim().length < 2) {
      errors.push('Each signer must include a valid name.');
    }

    const email = String(signer?.email || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email address: each signer must have a valid email address.');
    }
  }

  const requiredFields = fields.filter((field) => field?.required === true);
  if (requiredFields.length === 0) {
    errors.push('At least one required field is required.');
  }

  for (const field of requiredFields) {
    if (!field?.type || !Number.isFinite(Number(field.pageIndex)) || !Number.isFinite(Number(field.x)) || !Number.isFinite(Number(field.y))) {
      errors.push('Every required field must include valid page and position data.');
    }
  }

  if (payload?.settings?.signingMode && !['sequential', 'parallel'].includes(payload.settings.signingMode)) {
    errors.push('Signing mode must be sequential or parallel.');
  }

  return { ok: errors.length === 0, errors };
}
