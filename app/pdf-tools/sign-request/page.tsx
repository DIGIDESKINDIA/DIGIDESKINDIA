import SignPdfToolLoader from '@/components/sign-pdf/SignPdfToolLoader';

export const metadata = {
	title: 'Sign Request | DigiDesk India',
	description: 'Request secure electronic signatures from one or more recipients with DigiDesk India.',
	robots: { index: false, follow: false },
};

export default function SignRequestPage() {
	return <SignPdfToolLoader />;
}
