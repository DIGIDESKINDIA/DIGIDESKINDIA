export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export class EmailNotConfiguredError extends Error {
  constructor() {
    super('Email delivery is not configured.');
    this.name = 'EmailNotConfiguredError';
  }
}

function getWebhookUrl() {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (provider !== 'webhook' || !process.env.EMAIL_WEBHOOK_URL) throw new EmailNotConfiguredError();
  return process.env.EMAIL_WEBHOOK_URL;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] || character));
}

export function isEmailConfigured() {
  try {
    getWebhookUrl();
    return true;
  } catch {
    return false;
  }
}

export async function sendEmail(message: EmailMessage) {
  const webhookUrl = getWebhookUrl();
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'DigiDesk India <no-reply@digidesk.in>',
      ...message,
    }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
}

export function buildSignatureRequestEmail({
  signerName,
  requesterName,
  documentName,
  expiration,
  signingUrl,
}: {
  signerName: string;
  requesterName: string;
  documentName: string;
  expiration: Date;
  signingUrl: string;
}): EmailMessage {
  const safeExpiration = expiration.toISOString().slice(0, 10);
  const safeSignerName = escapeHtml(signerName);
  const safeRequesterName = escapeHtml(requesterName);
  const safeDocumentName = escapeHtml(documentName);
  const safeSigningUrl = escapeHtml(signingUrl);
  return {
    to: '',
    subject: `Signature requested: ${documentName}`,
    text: `Hello ${signerName},\n\n${requesterName} requested your signature on ${documentName}. Review and sign securely: ${signingUrl}\n\nThis request expires on ${safeExpiration}.\n\nDigiDesk India`,
    html: `<p>Hello ${safeSignerName},</p><p><strong>${safeRequesterName}</strong> requested your signature on <strong>${safeDocumentName}</strong>.</p><p><a href="${safeSigningUrl}">Review &amp; Sign</a></p><p>This request expires on ${safeExpiration}.</p><p>DigiDesk India security notice: never share this signing link.</p>`,
  };
}
