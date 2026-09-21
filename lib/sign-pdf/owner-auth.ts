import { isAuthenticated } from '@/lib/auth/session';

export async function resolveSigningOwnerId(): Promise<string | null> {
  if (await isAuthenticated()) {
    return 'admin';
  }

  return process.env.NODE_ENV === 'production' ? null : 'local-requester';
}
