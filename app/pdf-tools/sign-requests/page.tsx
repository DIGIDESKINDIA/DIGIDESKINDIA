import SignRequestsDashboard from '@/components/sign-pdf/SignRequestsDashboard';

export const metadata = {
  title: 'Sign Requests | DigiDesk India',
  description: 'Manage DigiDesk India signing requests.',
  robots: { index: false, follow: false },
};

export default function SignRequestsPage() {
  return <SignRequestsDashboard />;
}
