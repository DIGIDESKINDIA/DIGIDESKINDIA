'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type SignRequest = {
  id: string;
  title: string;
  status: string;
  signers: Array<{ name: string; email: string; status: string }>;
  createdAt?: string;
  expirationAt?: string;
};

const filters = ['all', 'draft', 'sent', 'in_progress', 'completed', 'expired', 'cancelled'];

export default function SignRequestsDashboard() {
  const [requests, setRequests] = useState<SignRequest[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sign-pdf/dashboard', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load requests.');
      setRequests(payload.requests || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadInitialRequests = async () => {
      try {
        const response = await fetch('/api/sign-pdf/dashboard', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load requests.');
        if (!cancelled) setRequests(payload.requests || []);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load requests.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadInitialRequests();
    return () => { cancelled = true; };
  }, []);

  const visibleRequests = useMemo(() => filter === 'all' ? requests : requests.filter((request) => request.status === filter), [filter, requests]);

  const performAction = async (request: SignRequest, action: 'send' | 'resend' | 'cancel') => {
    setError('');
    const response = await fetch(`/api/sign-pdf/requests/${encodeURIComponent(request.id)}/${action}`, { method: 'POST' });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.message || `Unable to ${action} request.`);
    await loadRequests();
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900 dark:text-slate-100">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">DigiDesk India</p><h1 className="mt-2 text-3xl font-black">Sign Requests</h1><p className="mt-2 text-sm text-slate-500">Track drafts, signing activity, and completed documents.</p></div>
        <Link href="/pdf-tools/sign-request" className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-slate-950">New request</Link>
      </div>
      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize ${filter === item ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950' : 'border border-slate-200 dark:border-slate-700'}`}>{item.replace('_', ' ')}</button>)}
      </div>
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {loading ? <div className="rounded-2xl border p-8 text-center text-sm text-slate-500">Loading requests...</div> : visibleRequests.length === 0 ? <div className="rounded-2xl border p-8 text-center text-sm text-slate-500">No signing requests found.</div> : <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {visibleRequests.map((request) => <article key={request.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="font-bold">{request.title}</h2><p className="mt-1 text-xs text-slate-500">{request.signers.map((signer) => `${signer.name} (${signer.status})`).join(', ')}</p><p className="mt-2 text-xs text-slate-500">Created {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'n/a'} · Expires {request.expirationAt ? new Date(request.expirationAt).toLocaleDateString() : 'n/a'}</p></div>
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide dark:bg-slate-800">{request.status.replace('_', ' ')}</span><Link href={`/api/sign-pdf/requests/${encodeURIComponent(request.id)}`} className="rounded-lg border px-3 py-2 text-xs font-semibold">View</Link>{request.status === 'draft' && <button type="button" onClick={() => void performAction(request, 'send').catch((actionError) => setError(actionError.message))} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950">Send</button>}{['sent', 'in_progress'].includes(request.status) && <button type="button" onClick={() => void performAction(request, 'resend').catch((actionError) => setError(actionError.message))} className="rounded-lg border px-3 py-2 text-xs font-semibold">Resend</button>}{!['completed', 'expired', 'cancelled'].includes(request.status) && <button type="button" onClick={() => void performAction(request, 'cancel').catch((actionError) => setError(actionError.message))} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Cancel</button>}{request.status === 'completed' && <a href={`/api/sign-pdf/requests/${encodeURIComponent(request.id)}/download`} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Download</a>}<a href={`/api/sign-pdf/audit?requestId=${encodeURIComponent(request.id)}`} className="rounded-lg border px-3 py-2 text-xs font-semibold">Audit</a></div>
        </article>)}
      </div>}
    </main>
  );
}
