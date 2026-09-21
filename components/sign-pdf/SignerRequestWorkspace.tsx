'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';

type PdfModule = {
  Document: typeof import('react-pdf').Document;
  Page: typeof import('react-pdf').Page;
  pdfjs: typeof import('react-pdf').pdfjs;
};

type FieldRecord = {
  id: string;
  type: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  value?: string | null;
  status?: string;
};

type RequestSession = {
  signer: { id: string; name: string; email: string; role: string; color: string; status: string };
  request: { id?: string; title?: string; status?: string };
  document: { publicDocumentId?: string; name?: string; mimeType?: string; url?: string; pageCount?: number } | null;
  fields: FieldRecord[];
};

type SignatureMode = 'typed' | 'drawn' | 'upload';

export default function SignerRequestWorkspace({ token, signerId }: { token: string; signerId: string; requestId?: string }) {
  const [session, setSession] = useState<RequestSession | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfModule, setPdfModule] = useState<PdfModule | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [consent, setConsent] = useState(false);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('typed');
  const [typedSignature, setTypedSignature] = useState('');
  const [signatureColor, setSignatureColor] = useState('#0f172a');
  const [drawing, setDrawing] = useState(false);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let mounted = true;

    import('react-pdf')
      .then((module) => {
        if (!mounted) return;
        module.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${module.pdfjs.version}/build/pdf.worker.min.mjs`;
        setPdfModule(module as PdfModule);
      })
      .catch(() => {
        if (mounted) {
          setError('Unable to load the PDF preview in this browser.');
          setLoading(false);
        }
      });

    const loadSession = async () => {
      try {
        const response = await fetch(`/api/sign-pdf/signer?token=${encodeURIComponent(token)}&signerId=${encodeURIComponent(signerId)}`);
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || 'Unable to load signer details.');
        }

        setSession(payload);
        if (payload.document?.url) {
          const documentResponse = await fetch(payload.document.url, { cache: 'no-store' });
          if (documentResponse.ok) {
            setPdfUrl(URL.createObjectURL(await documentResponse.blob()));
          }
        }
        const nextValues: Record<string, string> = {};
        for (const field of payload.fields || []) {
          nextValues[field.id] = String(field.value ?? '');
        }
        setValues(nextValues);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load signer details.');
      } finally {
        setLoading(false);
      }
    };

    void loadSession();
    return () => {
      mounted = false;
    };
  }, [signerId, token]);

  const PdfDocument = pdfModule?.Document;
  const PdfPage = pdfModule?.Page;
  const requiredCount = useMemo(() => (session?.fields ?? []).filter((field) => field.required).length, [session]);
  const completedCount = useMemo(() => {
    const current = session?.fields ?? [];
    return current.filter((field) => {
      const value = (values[field.id] ?? field.value ?? '').trim();
      return field.required ? value.length > 0 : true;
    }).length;
  }, [session, values]);

  const assignedPageFields = useMemo(
    () => (session?.fields ?? []).filter((field) => field.pageIndex === pageIndex),
    [pageIndex, session]
  );

  const setFieldValue = (fieldId: string, value: string) => {
    setValues((current) => ({ ...current, [fieldId]: value }));
  };

  const typedSignatureImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 300;
    const context = canvas.getContext('2d');
    if (!context) return '';
    context.font = '700 84px cursive';
    context.fillStyle = signatureColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(typedSignature || 'Signature', canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  };

  const saveSignatureForField = (fieldId: string) => {
    const canvas = drawCanvasRef.current;
    const value = signatureMode === 'typed'
      ? typedSignatureImage()
      : signatureMode === 'drawn' && canvas
        ? canvas.toDataURL('image/png')
        : values[fieldId] || '';
    if (value) setFieldValue(fieldId, value);
  };

  const handleSignatureUpload = (fieldId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !/^image\/(png|jpeg|jpg)$/.test(file.type) || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setFieldValue(fieldId, String(reader.result || ''));
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleDrawStart = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    if (!context) return;
    context.strokeStyle = signatureColor;
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    setDrawing(true);
  };

  const handleDrawMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing || !drawCanvasRef.current) return;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const context = drawCanvasRef.current.getContext('2d');
    if (!context) return;
    context.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    context.stroke();
  };

  const submitSignature = async () => {
    try {
      if (!consent) throw new Error('Please confirm your consent before signing.');
      const missing = (session?.fields ?? []).filter((field) => field.required && !(values[field.id] ?? field.value ?? '').trim());
      if (missing.length > 0) throw new Error('Complete all required fields before signing.');
      setSubmitting(true);
      setError('');
      setSuccess('');

      const fieldEntries = (session?.fields ?? []).map((field) => ({
        id: field.id,
        value: values[field.id] ?? field.value ?? '',
        imageData: field.type === 'signature' ? values[field.id] : undefined,
      }));

      const response = await fetch('/api/sign-pdf/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signerId,
          completedFields: fieldEntries.map((field) => field.id),
          fieldValues: fieldEntries,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to finalize signing.');
      }

      setSuccess('Signature completed successfully.');
      setSession((current) => current ? {
        ...current,
        signer: { ...current.signer, status: 'signed' },
        request: { ...current.request, status: payload.nextStatus || current.request.status },
      } : current);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to finalize signing.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Loading signer session…</div>;
  }

  if (error) {
    return <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-200">{error}</div>;
  }

  if (!session) {
    return <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">No signer session was found.</div>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900 dark:text-slate-100">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Signer workflow</p>
            <h1 className="mt-2 text-3xl font-black">{session.request.title || 'Signing request'}</h1>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            {session.signer.name} • {session.request.status}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            Required fields: {completedCount}/{requiredCount}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            Role: {session.signer.role}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-700 dark:bg-slate-950">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span>Page {pageIndex + 1} of {pageCount || session.document?.pageCount || 1}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPageIndex((current) => Math.max(0, current - 1))} disabled={pageIndex === 0} className="rounded-lg border px-2 py-1 disabled:opacity-40">Previous</button>
                <button type="button" onClick={() => setZoom((current) => Math.max(0.7, Number((current - 0.1).toFixed(2))))} className="rounded-lg border px-2 py-1">-</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={() => setZoom((current) => Math.min(2, Number((current + 0.1).toFixed(2))))} className="rounded-lg border px-2 py-1">+</button>
                <button type="button" onClick={() => setPageIndex((current) => Math.min((pageCount || 1) - 1, current + 1))} disabled={pageIndex >= (pageCount || 1) - 1} className="rounded-lg border px-2 py-1 disabled:opacity-40">Next</button>
              </div>
            </div>
            <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              {pdfUrl && PdfDocument && PdfPage ? (
                <PdfDocument file={pdfUrl} onLoadSuccess={({ numPages }) => setPageCount(numPages)} onLoadError={() => undefined} loading={<div className="py-12 text-center text-sm text-slate-500">Loading document…</div>}>
                  <div className="relative mx-auto" style={{ width: `${Math.round(760 * zoom)}px` }}>
                    <PdfPage pageNumber={pageIndex + 1} renderTextLayer={false} renderAnnotationLayer={false} width={Math.round(760 * zoom)} />
                    {assignedPageFields.map((field) => (
                      <div key={field.id} className="absolute border-2 border-emerald-500/70 bg-emerald-100/30 p-1" style={{ left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.width * 100}%`, height: `${field.height * 100}%` }}>
                        <span className="block truncate text-[10px] font-semibold text-emerald-800">{field.type}</span>
                        {field.type !== 'signature' && <span className="block truncate text-[10px] text-slate-700">{values[field.id] || field.value || 'Required'}</span>}
                      </div>
                    ))}
                  </div>
                </PdfDocument>
              ) : (
                <div className="py-12 text-center text-sm text-slate-500">Loading actual document…</div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-bold">Assigned fields</h2>
          </div>

          {(session.fields ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No fields are assigned to this signer yet.</p>
          ) : (
            <div className="space-y-3">
              {(session.fields ?? []).map((field) => (
                <div key={field.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                    <span>{field.type}</span>
                    {field.required && <span className="text-amber-600">Required</span>}
                  </div>
                  {field.type === 'signature' ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {(['typed', 'drawn', 'upload'] as SignatureMode[]).map((mode) => <button key={mode} type="button" onClick={() => setSignatureMode(mode)} className={`rounded-lg px-2 py-1 text-xs font-semibold ${signatureMode === mode ? 'bg-emerald-500 text-slate-950' : 'border'}`}>{mode}</button>)}
                      </div>
                      {signatureMode === 'typed' && <input value={typedSignature} onChange={(event) => setTypedSignature(event.target.value)} placeholder="Type your name" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />}
                      {signatureMode === 'drawn' && <canvas ref={drawCanvasRef} width={360} height={120} onPointerDown={handleDrawStart} onPointerMove={handleDrawMove} onPointerUp={() => setDrawing(false)} onPointerLeave={() => setDrawing(false)} className="w-full rounded-xl border bg-white" />}
                      {signatureMode === 'upload' && <input type="file" accept="image/png,image/jpeg" onChange={(event) => handleSignatureUpload(field.id, event)} className="w-full text-xs" />}
                      <div className="flex gap-2"><input type="color" value={signatureColor} onChange={(event) => setSignatureColor(event.target.value)} className="h-9 w-12" /><button type="button" onClick={() => saveSignatureForField(field.id)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-emerald-500 dark:text-slate-950">Apply signature</button></div>
                    </div>
                  ) : <input type={field.type === 'date' ? 'date' : 'text'} value={values[field.id] ?? field.value ?? ''} onChange={(event) => setFieldValue(field.id, event.target.value)} placeholder={field.type === 'name' ? 'Full name' : 'Enter value'} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />}
                </div>
              ))}
            </div>
          )}

          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-200">{error}</div> : null}
          {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-200">{success}</div> : null}

          <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5" /> I confirm that I reviewed this document and agree to apply my electronic signature.</label>

          <button
            type="button"
            onClick={submitSignature}
            disabled={submitting || !consent}
            className="mt-2 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-base font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Finish Signing'}
          </button>
        </aside>
      </div>
    </main>
  );
}
