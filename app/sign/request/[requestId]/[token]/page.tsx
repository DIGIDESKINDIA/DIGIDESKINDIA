import crypto from 'node:crypto';
import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import { SigningRequest, SigningSigner } from '@/models/Signing';
import SignerRequestWorkspace from '@/components/sign-pdf/SignerRequestWorkspace';

export const metadata = {
  title: 'Secure signing request | DigiDesk India',
  robots: { index: false, follow: false },
};

export default async function SignRequestSignerPage({ params }: { params: Promise<{ requestId: string; token: string }> }) {
  const { requestId, token } = await params;
  if (!requestId || !token || token.length < 32) notFound();
  await connectDB();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const signer = await SigningSigner.findOne({ tokenHash }).lean();
  if (!signer) notFound();
  const signingRequest = await SigningRequest.findOne({ _id: signer.requestId, publicRequestId: requestId }).lean();
  if (!signingRequest) notFound();

  return <SignerRequestWorkspace token={token} signerId={String(signer.publicSignerId || signer._id)} requestId={requestId} />;
}
