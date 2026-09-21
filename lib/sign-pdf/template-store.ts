import { connectDB } from '@/lib/mongodb';
import { SigningTemplate } from '@/models/Signing';

type TemplatePayload = Record<string, unknown>;

export async function saveTemplate(payload: TemplatePayload) {
  await connectDB();
  return await SigningTemplate.create(payload as Record<string, unknown>);
}

export async function listTemplates(ownerId?: string) {
  await connectDB();
  return await SigningTemplate.find(ownerId ? { ownerId } : {}).lean();
}

export async function getTemplate(publicTemplateId: string) {
  await connectDB();
  return await SigningTemplate.findOne({ publicTemplateId }).lean();
}

export async function updateTemplate(publicTemplateId: string, payload: TemplatePayload) {
  await connectDB();
  return await SigningTemplate.findOneAndUpdate({ publicTemplateId }, { $set: payload }, { new: true });
}

export async function deleteTemplate(publicTemplateId: string) {
  await connectDB();
  return await SigningTemplate.deleteOne({ publicTemplateId });
}
