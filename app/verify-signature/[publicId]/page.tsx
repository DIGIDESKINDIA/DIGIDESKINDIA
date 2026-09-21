import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import { SigningVerification, SigningRequest, SigningSigner, SigningDocument } from '@/models/Signing';

export default async function VerifySignaturePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  await connectDB();

  const verification = await SigningVerification.findOne({ publicVerificationId: publicId }).lean();
  if (!verification) {
    notFound();
  }

  const request = await SigningRequest.findById(verification.requestId).lean();
  const signers = await SigningSigner.find({ requestId: verification.requestId }).sort({ order: 1 }).lean();
  const finalDocument = request?.finalDocumentId ? await SigningDocument.findById(request.finalDocumentId).lean() : null;
  const integrityMatches = Boolean(finalDocument?.checksum && finalDocument.checksum === verification.finalPdfHash);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-3xl font-black">Verification</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Document: {request?.title ?? 'Signed document'}</p>
          <p className="mt-2 text-sm text-slate-500">Request ID: {request?.publicRequestId ?? 'n/a'}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-slate-500">Verification ID</p>
            <p className="mt-2 font-semibold">{verification.publicVerificationId}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-slate-500">Status</p>
            <p className="mt-2 font-semibold text-emerald-600">{request?.status ?? 'completed'} · Electronic Signature</p>
            <p className="mt-1 text-xs text-slate-500">Integrity: {integrityMatches ? 'verified against final artifact' : 'final artifact unavailable for comparison'}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-slate-500">Original hash</p>
            <p className="mt-2 break-all font-mono text-xs">{verification.documentHash}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-slate-500">Final hash</p>
            <p className="mt-2 break-all font-mono text-xs">{verification.finalPdfHash}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm text-slate-500">Signer timestamps</p>
          <div className="mt-2 space-y-2 text-sm">
            {signers.map((signer) => (
              <p key={signer.publicSignerId}>{signer.name}: {signer.status} · {signer.signedAt ? new Date(signer.signedAt).toISOString() : 'not signed'}</p>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
