import { notFound } from 'next/navigation';
import crypto from 'node:crypto';
import { connectDB } from '@/lib/mongodb';
import { SigningRequest, SigningSigner } from '@/models/Signing';
import SignerRequestWorkspace from '@/components/sign-pdf/SignerRequestWorkspace';

async function getSignerFromToken(token: string) {
  if (!token || token.length < 32) return null;
  await connectDB();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return await SigningSigner.findOne({ tokenHash }).lean();
}

export default async function SignerTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const signer = await getSignerFromToken(token);

  if (!signer) {
    notFound();
  }

  const request = await SigningRequest.findById(signer.requestId).lean();
  if (!request) {
    notFound();
  }

  return <SignerRequestWorkspace token={token} signerId={String(signer.publicSignerId || signer._id)} requestId={String(request._id)} />;
}
