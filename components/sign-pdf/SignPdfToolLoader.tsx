'use client';

import dynamic from 'next/dynamic';

const SignPdfTool = dynamic(() => import('./SignPdfTool'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
      Loading PDF signing tool...
    </div>
  ),
});

export default function SignPdfToolLoader() {
  return <SignPdfTool />;
}
