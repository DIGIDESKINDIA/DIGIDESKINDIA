import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveTemplate, listTemplates, getTemplate, updateTemplate, deleteTemplate } from '@/lib/sign-pdf/template-store';
import { resolveSigningOwnerId } from '@/lib/sign-pdf/owner-auth';

const templateSchema = z.object({
  name: z.string().min(2),
  fields: z.array(z.record(z.string(), z.unknown())).default([]),
  defaultRequestSettings: z.object({}).passthrough().default({}),
  signerRoleMap: z.record(z.string(), z.string()).default({}),
  ownerId: z.string().optional(),
});

export async function GET() {
  const ownerId = await resolveSigningOwnerId();
  if (!ownerId) return NextResponse.json({ success: false, message: 'Authentication is required to access templates.' }, { status: 401 });
  const templates = await listTemplates(ownerId);
  return NextResponse.json({ success: true, templates });
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) return NextResponse.json({ success: false, message: 'Authentication is required to create templates.' }, { status: 401 });
    const body = await request.json();
    const parsed = templateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid template payload.' }, { status: 400 });
    }

    const record = await saveTemplate({ ...parsed.data, ownerId });
    return NextResponse.json({ success: true, template: record }, { status: 201 });
  } catch (error) {
    console.error('[SIGN_TEMPLATE_CREATE]', error);
    return NextResponse.json({ success: false, message: 'Unable to create template.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) return NextResponse.json({ success: false, message: 'Authentication is required to update templates.' }, { status: 401 });
    const body = await request.json();
    const { publicTemplateId, ...payload } = body ?? {};
    if (!publicTemplateId) {
      return NextResponse.json({ success: false, message: 'Template ID is required.' }, { status: 400 });
    }
    const existing = await getTemplate(publicTemplateId);
    if (!existing || existing.ownerId !== ownerId) {
      return NextResponse.json({ success: false, message: 'Template not found.' }, { status: 404 });
    }
    const template = await updateTemplate(publicTemplateId, { ...payload, ownerId });
    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('[SIGN_TEMPLATE_UPDATE]', error);
    return NextResponse.json({ success: false, message: 'Unable to update template.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ownerId = await resolveSigningOwnerId();
    if (!ownerId) return NextResponse.json({ success: false, message: 'Authentication is required to delete templates.' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const publicTemplateId = searchParams.get('publicTemplateId');
    if (!publicTemplateId) {
      return NextResponse.json({ success: false, message: 'Template ID is required.' }, { status: 400 });
    }
    const template = await getTemplate(publicTemplateId);
    if (!template || template.ownerId !== ownerId) {
      return NextResponse.json({ success: false, message: 'Template not found.' }, { status: 404 });
    }
    await deleteTemplate(publicTemplateId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SIGN_TEMPLATE_DELETE]', error);
    return NextResponse.json({ success: false, message: 'Unable to delete template.' }, { status: 500 });
  }
}
