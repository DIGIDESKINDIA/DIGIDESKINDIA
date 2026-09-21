import crypto from 'node:crypto';
import { connectDB } from '@/lib/mongodb';
import {
  SigningDocument,
  SigningRequest,
  SigningSigner,
  SigningField,
  SigningEvent,
  SigningVerification,
  SignatureAsset,
  SigningTemplate,
} from '@/models/Signing';

type SigningStorePayload = Record<string, unknown>;

export async function hashToken(value: string): Promise<string> {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function generateSignerLinkToken(): Promise<string> {
  return crypto.randomBytes(32).toString('hex');
}

export async function createDocumentRecord(payload: SigningStorePayload) {
  await connectDB();
  return await SigningDocument.create(payload as Record<string, unknown>);
}

export async function createRequestRecord(payload: SigningStorePayload) {
  await connectDB();
  return await SigningRequest.create(payload as Record<string, unknown>);
}

export async function createSignerRecord(payload: SigningStorePayload) {
  await connectDB();
  return await SigningSigner.create(payload as Record<string, unknown>);
}

export async function createFieldRecord(payload: SigningStorePayload) {
  await connectDB();
  return await SigningField.create(payload as Record<string, unknown>);
}

export async function createEventRecord(payload: SigningStorePayload) {
  await connectDB();
  return await SigningEvent.create(payload as Record<string, unknown>);
}

export async function createVerificationRecord(payload: SigningStorePayload) {
  await connectDB();
  return await SigningVerification.create(payload as Record<string, unknown>);
}

export async function createSignatureAssetRecord(payload: SigningStorePayload) {
  await connectDB();
  return await SignatureAsset.create(payload as Record<string, unknown>);
}

export async function createTemplateRecord(payload: SigningStorePayload) {
  await connectDB();
  return await SigningTemplate.create(payload as Record<string, unknown>);
}

export async function getRequestByPublicId(publicRequestId: string) {
  await connectDB();
  return await SigningRequest.findOne({ publicRequestId }).lean();
}

export async function getSignerByTokenHash(tokenHash: string) {
  await connectDB();
  return await SigningSigner.findOne({ tokenHash }).lean();
}

export async function getSignerByPublicId(publicSignerId: string) {
  await connectDB();
  return await SigningSigner.findOne({ publicSignerId }).lean();
}

export async function getSignerFieldsForRequest(requestId: string, signerId: string) {
  await connectDB();
  return await SigningField.find({ requestId, signerId }).lean();
}

export async function getRequestFields(requestId: string) {
  await connectDB();
  return await SigningField.find({ requestId }).lean();
}
