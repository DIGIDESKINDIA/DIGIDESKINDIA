import SignPdfToolLoader from '@/components/sign-pdf/SignPdfToolLoader';

export const metadata = {
  title: 'Sign PDF Online Free | DigiDesk India',
  description: 'Sign PDF documents online with DigiDesk. Add signatures, initials, dates, text, stamps and prepare legally plain electronic signatures.',
  openGraph: {
    title: 'Sign PDF Online Free | DigiDesk India',
    description: 'Add signatures, initials, names and dates to your PDF documents.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign PDF Online Free | DigiDesk India',
    description: 'Sign PDF documents online with DigiDesk.',
  },
};

export default function SignPdfPage() {
  return <SignPdfToolLoader />;
}
