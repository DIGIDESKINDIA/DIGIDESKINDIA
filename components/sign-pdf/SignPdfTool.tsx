'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ArrowLeft, CheckCircle2, Download, FileText, Image as ImageIcon, PencilLine, UploadCloud } from 'lucide-react';
import Link from 'next/link';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type FieldType = 'signature' | 'initials' | 'name' | 'date' | 'text' | 'input' | 'company-stamp';

type PdfField = {
  id: string;
  type: FieldType;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string;
  imageData?: string;
  signerId?: string | null;
  label?: string;
  color?: string;
  fontSize?: number;
  required?: boolean;
  linkedMode?: 'single' | 'all' | 'all-but-last' | 'last' | 'range';
  linkedRange?: [number, number];
};

type Signer = {
  id: string;
  name: string;
  email: string;
  role: string;
  color: string;
};

type SignaturePreset = {
  type: 'typed' | 'drawn' | 'upload';
  value: string;
  imageData?: string;
  color: string;
  fontFamily: string;
};

const DEFAULT_SIGNATURE: SignaturePreset = {
  type: 'typed',
  value: 'DigiDesk India',
  color: '#0f172a',
  fontFamily: 'cursive',
};

const SIGNATURE_FONTS = [
  'Alex Brush', 'Allura', 'Amatic SC', 'Archivo', 'Arial', 'Arizonia', 'Bebas Neue', 'Berkshire Swash',
  'Bodoni Moda', 'Bonheur Royale', 'Bree Serif', 'Brush Script MT', 'Caveat', 'Cedarville Cursive',
  'Ceviche One', 'Cinzel', 'Comfortaa', 'Comic Sans MS', 'Cormorant Garamond', 'Courgette', 'Courier New',
  'Creepster', 'Crimson Text', 'Dancing Script', 'Delius', 'Delius Swash Caps', 'DM Serif Display',
  'Dorsa', 'Eczar', 'Edu AU VIC WA NT Hand', 'El Messiri', 'Ephesis', 'Euphoria Script', 'Exo 2',
  'Fira Code', 'Fira Sans', 'Fondamento', 'Frank Ruhl Libre', 'Fredericka the Great', 'Garamond',
  'Georgia', 'Gilda Display', 'Great Vibes', 'Handlee', 'Helvetica', 'Homemade Apple', 'IM FELL English',
  'Inconsolata', 'Indie Flower', 'Italianno', 'Josefin Sans', 'Josefin Slab', 'Kaushan Script',
  'Kalam', 'Kanit', 'Lato', 'League Spartan', 'Libre Baskerville', 'Lobster', 'Lora', 'Luxurious Script',
  'Marck Script', 'Merienda', 'Merriweather', 'Montserrat', 'Mr Dafoe', 'Mrs Saint Delafield',
  'Noto Sans', 'Noto Serif', 'Nothing You Could Do', 'Nunito', 'Old Standard TT', 'Open Sans', 'Orbitron',
  'Oswald', 'Outfit', 'Pacifico', 'Patrick Hand', 'Permanent Marker', 'Philosopher', 'Playball',
  'Playfair Display', 'Poiret One', 'Poppins', 'Prata', 'Quicksand', 'Raleway', 'Ranchers', 'Righteous',
  'Roboto', 'Roboto Slab', 'Rock Salt', 'Sacramento', 'Satisfy', 'Schoolbell', 'Segoe Script',
  'Shadows Into Light', 'Signika', 'Sofia', 'Space Grotesk', 'Special Elite', 'Spectral', 'Tahoma',
  'Tangerine', 'The Girl Next Door', 'Times New Roman', 'Trattatello', 'Trebuchet MS', 'Ubuntu',
  'UnifrakturCook', 'Unkempt', 'Varela Round', 'Verdana', 'Vollkorn', 'Walter Turncoat', 'Yellowtail',
  'Yeseva One', 'Zeyada', 'cursive',
];

const DEFAULT_SIGNERS: Signer[] = [
  { id: 'signer-1', name: 'Primary Signer', email: 'signer@example.com', role: 'Approver', color: '#10b981' },
];

const REQUEST_DEFAULT_SETTINGS = {
  signingMode: 'sequential',
  expirationDays: 7,
  remindersEnabled: true,
  reminderFrequency: 2,
  emailNotifications: true,
  language: 'en',
  customMessage: 'Please review and sign this document.',
  allowAccessCode: false,
};

function generateTypedSignature(value: string, color: string, fontFamily: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is unavailable in this browser.');
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const fontSize = 84;
  ctx.font = `700 ${fontSize}px ${fontFamily}, cursive, serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(value || 'Signature', canvas.width / 2, canvas.height / 2 + 18);

  return canvas.toDataURL('image/png');
}

export default function SignPdfTool() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fields, setFields] = useState<PdfField[]>([]);
  const [signingMode, setSigningMode] = useState<'self' | 'request'>('self');
  const [signers, setSigners] = useState<Signer[]>(DEFAULT_SIGNERS);
  const [requestSettings, setRequestSettings] = useState<typeof REQUEST_DEFAULT_SETTINGS>(REQUEST_DEFAULT_SETTINGS);
  const [requestResult, setRequestResult] = useState<{ requestId: string; status: string; message?: string } | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [signaturePreset, setSignaturePreset] = useState<SignaturePreset>(DEFAULT_SIGNATURE);
  const [isSigning, setIsSigning] = useState(false);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ downloadUrl: string; fileName: string } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const typedSignaturePreview = useMemo(
    () => generateTypedSignature(signaturePreset.value || 'Signature', signaturePreset.color, signaturePreset.fontFamily),
    [signaturePreset.value, signaturePreset.color, signaturePreset.fontFamily]
  );
  const currentPageFields = useMemo(
    () => fields.filter((field) => field.pageIndex === pageIndex),
    [fields, pageIndex]
  );
  const selectedField = fields.find((field) => field.id === selectedId) ?? null;

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      if (success?.downloadUrl) URL.revokeObjectURL(success.downloadUrl);
    };
  }, [pdfUrl, success]);

  const addField = (type: FieldType, valueOverride?: string, imageOverride?: string) => {
    const base: PdfField = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      pageIndex,
      x: 0.18 + Math.min(fields.length * 0.02, 0.18),
      y: 0.22 + (fields.filter((field) => field.pageIndex === pageIndex).length % 4) * 0.08,
      width: type === 'signature' || type === 'initials' ? 0.28 : 0.2,
      height: type === 'signature' || type === 'initials' ? 0.12 : 0.07,
      value: valueOverride ?? (type === 'date' ? new Date().toLocaleDateString('en-CA') : type === 'name' ? 'Full Name' : type === 'text' ? 'Approved by DigiDesk' : 'Signature'),
      color: signaturePreset.color,
      fontSize: 18,
      imageData: imageOverride ?? (signaturePreset.type === 'typed' ? typedSignaturePreview : signaturePreset.imageData),
      label: type === 'signature' ? 'Signature' : type === 'initials' ? 'Initials' : type,
      required: type === 'signature' || type === 'initials' || type === 'name' || type === 'date',
      signerId: signingMode === 'request' ? signers[0]?.id ?? null : null,
      linkedMode: 'single',
    };

    const nextField = { ...base };
    setFields((current) => [...current, nextField]);
    setSelectedId(nextField.id);
  };

  const updateSigner = (id: string, key: keyof Signer, value: string) => {
    setSigners((current) => current.map((signer) => signer.id === id ? { ...signer, [key]: value } : signer));
  };

  const addSigner = () => {
    const nextId = `signer-${Date.now()}`;
    setSigners((current) => [...current, { id: nextId, name: `Signer ${current.length + 1}`, email: '', role: 'Approver', color: '#22c55e' }]);
  };

  const removeSigner = (id: string) => {
    setSigners((current) => (current.length > 1 ? current.filter((signer) => signer.id !== id) : current));
  };

  const handleCreateRequest = async () => {
    if (!pdfFile) {
      setError('Upload a PDF before creating a request.');
      return;
    }

    if (!signers.length || signers.some((signer) => !signer.name.trim() || !signer.email.trim())) {
      setError('Every signer needs a name and valid email.')
      return;
    }

    const validFields = fields.filter((field) => field.type && field.pageIndex >= 0);
    if (!validFields.length) {
      setError('Add at least one field before creating a signing request.');
      return;
    }

    setIsCreatingRequest(true);
    setError('');

    try {
      const uploaded = await fetch('/api/sign-pdf/documents', {
        method: 'POST',
        body: (() => {
          const form = new FormData();
          form.append('file', pdfFile);
          return form;
        })(),
      });

      const uploadedPayload = await uploaded.json();
      if (!uploaded.ok || !uploadedPayload?.success) {
        throw new Error(uploadedPayload?.message || 'Unable to store the uploaded PDF.');
      }

      const response = await fetch('/api/sign-pdf/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: documentName.trim() || pdfFile.name.replace(/\.pdf$/i, '') || 'Document Signing Request',
          signers,
          fields: validFields,
          settings: requestSettings,
          document: uploadedPayload.document,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to create the signing request.');
      }

      setRequestResult({
        requestId: payload.requestId,
        status: payload.request?.status || 'draft',
        message: payload.message,
      });
      setSuccess(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the signing request.');
    } finally {
      setIsCreatingRequest(false);
    }
  };

  const handleSendRequest = async () => {
    if (!requestResult?.requestId) return;
    setIsCreatingRequest(true);
    setError('');
    try {
      const response = await fetch(`/api/sign-pdf/requests/${encodeURIComponent(requestResult.requestId)}/send`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.message || 'Unable to send the signing request.');
      setRequestResult((current) => current ? { ...current, status: payload.status || 'sent' } : current);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send the signing request.');
    } finally {
      setIsCreatingRequest(false);
    }
  };

  const removeSelectedField = () => {
    setFields((current) => current.filter((field) => field.id !== selectedId));
    setSelectedId(null);
  };

  const assignSelectedField = (signerId: string) => {
    if (!selectedId) return;
    setFields((current) => current.map((field) => field.id === selectedId ? { ...field, signerId: signerId || null } : field));
  };

  const selectFile = (file: File | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF file.');
      return;
    }
    if (file.size <= 0) {
      setError('The PDF file is empty.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('PDF files must be smaller than 50 MB.');
      return;
    }

    setError('');
    setSuccess(null);
    setFields([]);
    setSelectedId(null);
    setPdfFile(file);
    setPdfUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setPageIndex(0);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    selectFile(nextFile);
    event.target.value = '';
  };

  const handleFieldPointerDown = (fieldId: string, event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setSelectedId(fieldId);
    if (event.pointerType !== 'mouse') return;
    const field = fields.find((item) => item.id === fieldId);
    if (!field) return;

    const pageRect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!pageRect) return;

    setDraggingId(fieldId);
    const localX = (event.clientX - pageRect.left) / pageRect.width;
    const localY = (event.clientY - pageRect.top) / pageRect.height;

    const drag = {
      fieldId,
      startX: localX,
      startY: localY,
      originX: field.x,
      originY: field.y,
    };

    const handleMove = (moveEvent: PointerEvent) => {
      const posX = (moveEvent.clientX - pageRect.left) / pageRect.width;
      const posY = (moveEvent.clientY - pageRect.top) / pageRect.height;
      const nextX = drag.originX + (posX - drag.startX);
      const nextY = drag.originY + (posY - drag.startY);

      setFields((current) => current.map((item) => item.id === fieldId ? { ...item, x: Math.min(Math.max(nextX, 0.02), 0.82), y: Math.min(Math.max(nextY, 0.04), 0.92) } : item));
    };

    const handleUp = () => {
      setDraggingId(null);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const goToPage = (value: string | number) => {
    if (!numPages) return;
    const requestedPage = Number(value);
    if (!Number.isFinite(requestedPage)) return;
    setPageIndex(Math.min(Math.max(Math.trunc(requestedPage) - 1, 0), numPages - 1));
  };

  const handleSignatureUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    if (!next) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageData = String(reader.result || '');
      setSignaturePreset((current) => ({ ...current, type: 'upload', imageData }));
      addField('signature', 'Signature', imageData);
    };
    reader.readAsDataURL(next);
    event.target.value = '';
  };

  const saveDrawnSignature = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const png = canvas.toDataURL('image/png');
    setSignaturePreset((current) => ({ ...current, type: 'drawn', imageData: png }));
    addField('signature', 'Signature', png);
  };

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = signaturePreset.color;
    context.beginPath();
    context.moveTo(x, y);
    setDrawing(true);
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing || !drawCanvasRef.current) return;
    const canvas = drawCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.lineTo(x, y);
    context.stroke();
  };

  const handleCanvasPointerUp = () => {
    setDrawing(false);
  };

  const clearDrawCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    if (!pdfFile) {
      setError('Upload a PDF first.');
      return;
    }

    const validFields = fields.filter((field) => field.type && field.pageIndex >= 0);
    if (validFields.length === 0) {
      setError('Add at least one signature field before signing.');
      return;
    }

    setIsSigning(true);
    setError('');

    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('fields', JSON.stringify(validFields));

    try {
      const response = await fetch('/api/sign-pdf/self-sign', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to sign this PDF.');
      }

      if (!payload?.downloadUrl) {
        throw new Error('Signed PDF was not generated.');
      }

      const fileName = pdfFile.name.replace(/\.pdf$/i, '') || 'signed-document';
      setSuccess({ downloadUrl: payload.downloadUrl, fileName: `${fileName}-signed.pdf` });
    } catch (signingError) {
      setError(signingError instanceof Error ? signingError.message : 'Unable to sign this PDF.');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <header className="mb-6 flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <Link href="/pdf-tools" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">DigiDesk</p>
              <h1 className="text-2xl font-black">Sign PDF</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Local signing ready
          </div>
        </header>

        {!pdfFile ? (
          <section className="rounded-[32px] border border-dashed border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <UploadCloud size={36} />
              </div>
              <h2 className="text-3xl font-black">Upload a PDF to get started</h2>
              <p className="mt-3 text-slate-600 dark:text-slate-300">Accepted file: PDF only. Maximum size 50 MB. Add signatures, initials, dates, names and approval text.</p>
              <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileInput} />
              <button type="button" onClick={() => inputRef.current?.click()} className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white dark:bg-emerald-500 dark:text-slate-950">
                <UploadCloud size={18} />
                Select PDF
              </button>
            </div>
          </section>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
            <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Document</h3>
                <button type="button" onClick={() => setPdfFile(null)} className="text-sm text-slate-500 underline underline-offset-4">Clear</button>
              </div>

              <label className="mb-4 block text-sm font-medium text-slate-600 dark:text-slate-300">Upload another PDF</label>
              <button type="button" onClick={() => inputRef.current?.click()} className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800">
                <UploadCloud size={16} />
                Replace file
              </button>
              <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileInput} />

              <div className="space-y-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><FileText size={14} /> {pdfFile.name}</div>
                <div className="text-xs text-slate-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="sign-pdf-page-number" className="text-sm font-medium text-slate-600 dark:text-slate-300">Go to page</label>
                  <input
                    id="sign-pdf-page-number"
                    type="number"
                    min={1}
                    max={numPages || 1}
                    value={pageIndex + 1}
                    onChange={(event) => goToPage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        goToPage(event.currentTarget.value);
                        event.currentTarget.blur();
                      }
                    }}
                    className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
                    aria-label="PDF page number"
                  />
                  <span className="text-sm text-slate-500">of {numPages || 1}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPageIndex((current) => Math.max(current - 1, 0))} disabled={pageIndex === 0} className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700">Previous page</button>
                  <button type="button" onClick={() => setPageIndex((current) => Math.min(current + 1, Math.max(numPages - 1, 0)))} disabled={!numPages || pageIndex >= numPages - 1} className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700">Next page</button>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setZoom((current) => Math.max(0.7, Number((current - 0.1).toFixed(2))))} className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-700">-</button>
                  <button type="button" onClick={() => setZoom(1)} className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-700">100%</button>
                  <button type="button" onClick={() => setZoom((current) => Math.min(2.4, Number((current + 0.1).toFixed(2))))} className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-700">+</button>
                </div>
                <button type="button" onClick={removeSelectedField} className="w-full rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">Delete selected</button>
              </div>
            </aside>

            <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-2 dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => addField('signature')} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-emerald-500 dark:text-slate-950"><PencilLine size={14} /> Signature</button>
                  <button type="button" onClick={() => addField('initials')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">Initials</button>
                  <button type="button" onClick={() => addField('name')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">Name</button>
                  <button type="button" onClick={() => addField('date')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">Date</button>
                  <button type="button" onClick={() => addField('text')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">Text</button>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span>Page {pageIndex + 1}</span>
                  <span>of {numPages || 1}</span>
                </div>
              </div>

              <div className="relative overflow-auto rounded-[24px] border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-950">
                <div style={{ width: `${Math.round(780 * zoom)}px` }} className="mx-auto transition-[width]">
                  {pdfUrl && (
                    <div className="relative mx-auto w-full" onClick={() => setSelectedId(null)}>
                      <Document file={pdfUrl} onLoadSuccess={({ numPages: loadedPages }) => setNumPages(loadedPages)} loading={<div className="py-10 text-center text-sm text-slate-500">Loading PDF…</div>} error={<div className="py-10 text-center text-sm text-red-600">This PDF could not be rendered.</div>}>
                        <Page pageNumber={pageIndex + 1} width={Math.round(780 * zoom)} renderTextLayer={false} renderAnnotationLayer={false} className="shadow-lg shadow-slate-200 dark:shadow-black/20" />
                      </Document>

                      {currentPageFields.map((field) => (
                        <div
                          key={field.id}
                          onPointerDown={(event) => handleFieldPointerDown(field.id, event)}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(field.id);
                          }}
                          style={{
                            position: 'absolute',
                            left: `${field.x * 100}%`,
                            top: `${field.y * 100}%`,
                            width: `${field.width * 100}%`,
                            height: `${field.height * 100}%`,
                            border: selectedId === field.id ? '2px solid #10b981' : 'none',
                            background: selectedId === field.id ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                            boxShadow: selectedId === field.id ? '0 0 0 4px rgba(16, 185, 129, 0.15)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            color: field.color || '#0f172a',
                            cursor: draggingId === field.id ? 'grabbing' : 'grab',
                            userSelect: 'none',
                          }}
                        >
                          {signingMode === 'request' && field.signerId ? (
                            <span
                              className="absolute left-1 top-1 z-10 max-w-[90%] truncate rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white"
                              style={{ backgroundColor: signers.find((signer) => signer.id === field.signerId)?.color || '#64748b' }}
                            >
                              {signers.find((signer) => signer.id === field.signerId)?.name || 'Assigned'}
                            </span>
                          ) : null}
                          {field.type === 'signature' && field.imageData ? (
                            <img src={field.imageData} alt="Signature" className="h-full w-full object-contain" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center px-2 text-center text-[9px] font-semibold sm:text-[11px]" style={{ color: field.color || '#0f172a', fontFamily: signaturePreset.fontFamily }}>
                              {field.value || field.label || 'Signature'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h3 className="text-lg font-bold">Create signature</h3>
                <div className="mt-3 flex gap-2">
                  {['typed', 'drawn', 'upload'].map((mode) => (
                    <button key={mode} type="button" onClick={() => setSignaturePreset((current) => ({ ...current, type: mode as SignaturePreset['type'] }))} className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize ${signaturePreset.type === mode ? 'bg-emerald-500 text-slate-950' : 'border border-slate-200 dark:border-slate-700'}`}>
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {signaturePreset.type === 'typed' && (
                <div className="space-y-3">
                  <input value={signaturePreset.value} onChange={(event) => setSignaturePreset((current) => ({ ...current, value: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Type your name" />
                  <div className="flex gap-2">
                    <input type="color" value={signaturePreset.color} onChange={(event) => setSignaturePreset((current) => ({ ...current, color: event.target.value }))} className="h-11 w-16 rounded-xl border border-slate-200 bg-transparent p-1 dark:border-slate-700" />
                    <select value={signaturePreset.fontFamily} onChange={(event) => setSignaturePreset((current) => ({ ...current, fontFamily: event.target.value }))} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                      {SIGNATURE_FONTS.map((font) => (
                        <option key={font} value={font} style={{ fontFamily: font }}>
                          {font === 'cursive' ? 'Signature cursive' : font}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={() => addField('signature')} className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-emerald-500 dark:text-slate-950">Apply typed signature</button>
                </div>
              )}

              {signaturePreset.type === 'drawn' && (
                <div className="space-y-3">
                  <canvas ref={drawCanvasRef} width={360} height={180} onPointerDown={handleCanvasPointerDown} onPointerMove={handleCanvasPointerMove} onPointerUp={handleCanvasPointerUp} onPointerLeave={handleCanvasPointerUp} className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700" style={{ borderColor: signaturePreset.color }} />
                  <div className="flex gap-2">
                    <input type="color" value={signaturePreset.color} onChange={(event) => setSignaturePreset((current) => ({ ...current, color: event.target.value }))} className="h-11 w-16 rounded-xl border border-slate-200 bg-transparent p-1 dark:border-slate-700" />
                    <button type="button" onClick={clearDrawCanvas} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">Clear</button>
                    <button type="button" onClick={saveDrawnSignature} className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-emerald-500 dark:text-slate-950">Save</button>
                  </div>
                </div>
              )}

              {signaturePreset.type === 'upload' && (
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    <ImageIcon size={16} />
                    Upload signature image
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleSignatureUpload} />
                  </label>
                  <button type="button" onClick={() => addField('signature')} className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white dark:bg-emerald-500 dark:text-slate-950">Place uploaded signature</button>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                  <span>Workflow</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{signingMode}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSigningMode('self')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${signingMode === 'self' ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950' : 'border border-slate-200 dark:border-slate-700'}`}>Sign myself</button>
                  <button type="button" onClick={() => setSigningMode('request')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${signingMode === 'request' ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950' : 'border border-slate-200 dark:border-slate-700'}`}>Request</button>
                </div>
              </div>

              {signingMode === 'request' && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Document name
                    <input value={documentName} onChange={(event) => setDocumentName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal dark:border-slate-700 dark:bg-slate-900" />
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <label className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span>Assigned to</span>
                      <select
                        aria-label="Assigned to"
                        disabled={!selectedField}
                        value={selectedField?.signerId || ''}
                        onChange={(event) => assignSelectedField(event.target.value)}
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                      >
                        <option value="">Unassigned</option>
                        {signers.map((signer) => (
                          <option key={signer.id} value={signer.id}>{signer.name}</option>
                        ))}
                      </select>
                    </label>
                    {selectedField?.signerId ? (
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: signers.find((signer) => signer.id === selectedField.signerId)?.color || '#64748b' }} />
                        {signers.find((signer) => signer.id === selectedField.signerId)?.name || 'Assigned signer'}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">Signers</h4>
                    <button type="button" onClick={addSigner} className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900">Add signer</button>
                  </div>
                  {signers.map((signer) => (
                    <div key={signer.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center gap-2">
                        <input type="color" value={signer.color} onChange={(event) => updateSigner(signer.id, 'color', event.target.value)} className="h-9 w-10 rounded-lg border border-slate-200 bg-transparent p-1 dark:border-slate-700" />
                        <input value={signer.name} onChange={(event) => updateSigner(signer.id, 'name', event.target.value)} placeholder="Signer name" className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800" />
                        <button type="button" onClick={() => removeSigner(signer.id)} className="text-xs text-red-600">Remove</button>
                      </div>
                      <input value={signer.email} onChange={(event) => updateSigner(signer.id, 'email', event.target.value)} placeholder="signer@example.com" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800" />
                      <input value={signer.role} onChange={(event) => updateSigner(signer.id, 'role', event.target.value)} placeholder="Role" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800" />
                    </div>
                  ))}

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span>Signing order</span>
                      <select value={requestSettings.signingMode} onChange={(event) => setRequestSettings((current) => ({ ...current, signingMode: event.target.value as 'sequential' | 'parallel' }))} className="rounded-xl border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
                        <option value="sequential">Sequential</option>
                        <option value="parallel">Parallel</option>
                      </select>
                    </label>
                    <label className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
                      <span>Expiry days</span>
                      <input type="number" min={1} max={365} value={requestSettings.expirationDays} onChange={(event) => setRequestSettings((current) => ({ ...current, expirationDays: Number(event.target.value) || 7 }))} className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900" />
                    </label>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={handleCreateRequest} disabled={isCreatingRequest || Boolean(requestResult)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      {isCreatingRequest ? 'Saving draft...' : 'Save draft'}
                    </button>
                    <button type="button" onClick={handleSendRequest} disabled={isCreatingRequest || !requestResult || requestResult.status !== 'draft'} className="w-full rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
                      {isCreatingRequest ? 'Sending...' : 'Send request'}
                    </button>
                  </div>

                  {requestResult && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                      <p className="font-semibold">Request {requestResult.status}</p>
                      <p className="mt-1">ID: {requestResult.requestId}</p>
                    </div>
                  )}
                </div>
              )}

              {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">{error}</div> : null}

              {success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                  <div className="mb-2 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Signed successfully</div>
                  <a href={success.downloadUrl} download={success.fileName} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white"><Download size={14} /> Download signed PDF</a>
                </div>
              ) : null}

              <button type="button" onClick={handleSign} disabled={isSigning || !pdfFile} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-base font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
                {isSigning ? 'Signing…' : 'Sign PDF'}
              </button>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
