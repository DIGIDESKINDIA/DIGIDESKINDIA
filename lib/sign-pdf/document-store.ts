import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { connectDB } from '@/lib/mongodb';
import { ensureUploadDir, generateSafeFileName, getUploadPath } from '@/lib/utils/file-upload';
import { SigningDocument } from '@/models/Signing';

const MAX_SIGNING_FILE_SIZE = 50 * 1024 * 1024;

export async function createDocumentRecordFromFile(file: File, ownerId?: string) {
  if (file.size <= 0 || file.size > MAX_SIGNING_FILE_SIZE) {
    throw new Error('PDF files must be greater than 0 bytes and no larger than 50 MB.');
  }
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
    throw new Error('Only PDF files are supported.');
  }

  await ensureUploadDir();
  const safeName = generateSafeFileName(file.name || 'document.pdf');
  const storagePath = getUploadPath(safeName);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storagePath, fileBuffer);

  let pageCount = 0;
  try {
    const pdf = await PDFDocument.load(new Uint8Array(fileBuffer), { ignoreEncryption: true });
    pageCount = pdf.getPageCount();
  } catch {
    await fs.unlink(storagePath).catch(() => undefined);
    throw new Error('The uploaded file is not a readable PDF.');
  }

  await connectDB();
  return await SigningDocument.create({
    filename: file.name || 'document.pdf',
    originalName: file.name || 'document.pdf',
    storagePath,
    mimeType: file.type || 'application/pdf',
    size: fileBuffer.length,
    checksum: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
    ownerId: ownerId || null,
    metadata: { pageCount },
  });
}

export async function getDocumentByPublicId(publicDocumentId: string) {
  await connectDB();
  return await SigningDocument.findOne({ publicDocumentId }).lean();
}

export async function readDocumentFile(publicDocumentId: string) {
  const document = await getDocumentByPublicId(publicDocumentId);
  if (!document || !document.storagePath) {
    return null;
  }

  const fileBuffer = await fs.readFile(document.storagePath);
  return { document, fileBuffer };
}

export async function saveFinalizedDocument({
  originalDocumentId,
  fileName,
  fileBuffer,
  ownerId,
}: {
  originalDocumentId: string;
  fileName: string;
  fileBuffer: Buffer;
  ownerId?: string;
}) {
  await ensureUploadDir();
  const safeName = generateSafeFileName(fileName || 'finalized-document.pdf');
  const storagePath = getUploadPath(safeName);
  await fs.writeFile(storagePath, fileBuffer);

  await connectDB();
  const created = await SigningDocument.create({
    filename: fileName || 'finalized-document.pdf',
    originalName: fileName || 'finalized-document.pdf',
    storagePath,
    mimeType: 'application/pdf',
    size: fileBuffer.length,
    checksum: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
    ownerId: ownerId || null,
    metadata: { generatedFromDocumentId: originalDocumentId, finalized: true },
  });

  return created;
}
