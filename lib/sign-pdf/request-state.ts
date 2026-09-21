export const REQUEST_STATES = [
  'draft',
  'sent',
  'in_progress',
  'completed',
  'expired',
  'cancelled',
  'rejected',
] as const;

export type RequestState = (typeof REQUEST_STATES)[number];

export function canTransitionRequestState(current: string, next: string): boolean {
  const transitions: Record<string, string[]> = {
    draft: ['sent', 'cancelled'],
    sent: ['in_progress', 'completed', 'expired', 'cancelled'],
    in_progress: ['completed', 'expired', 'cancelled'],
    pending: ['in_progress', 'completed', 'expired', 'cancelled', 'rejected'],
    partially_signed: ['completed', 'expired', 'cancelled'],
    completed: [],
    expired: [],
    cancelled: [],
    rejected: [],
  };

  return Boolean(transitions[current]?.includes(next));
}

export function evaluateRequestStatus({
  totalSigners,
  signedSigners,
  currentStatus,
}: {
  totalSigners: number;
  signedSigners: number;
  currentStatus: string;
}): RequestState {
  if (currentStatus === 'completed' || currentStatus === 'expired' || currentStatus === 'cancelled' || currentStatus === 'rejected') {
    return currentStatus as RequestState;
  }

  if (signedSigners >= totalSigners && totalSigners > 0) {
    return 'completed';
  }

  if (signedSigners > 0 && signedSigners < totalSigners) {
    return 'in_progress';
  }

  return currentStatus === 'draft' ? 'draft' : 'sent';
}

export function isSignerLocked(status?: string): boolean {
  return ['signed', 'rejected', 'expired'].includes(status ?? '');
}
