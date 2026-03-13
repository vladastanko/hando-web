import type { JobStatus, ApplicationStatus, VerificationStatus } from '../../types';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', completed: 'Completed',
  cancelled: 'Cancelled', disputed: 'Disputed',
  pending: 'Pending', accepted: 'Accepted', rejected: 'Rejected', withdrawn: 'Withdrawn',
  unverified: 'Unverified', verified: 'Verified',
};

const STATUS_CLASS: Record<string, string> = {
  open: 'bdg-open', in_progress: 'bdg-prog', completed: 'bdg-closed',
  cancelled: 'bdg-closed', disputed: 'bdg-disputed',
  pending: 'bdg-pend', accepted: 'bdg-ok', rejected: 'bdg-rej', withdrawn: 'bdg-with',
  unverified: 'bdg-neu', verified: 'bdg-verif',
};

interface Props { status: JobStatus | ApplicationStatus | VerificationStatus | string; }

export function StatusBadge({ status }: Props) {
  return (
    <span className={`bdg ${STATUS_CLASS[status] ?? 'bdg-neu'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
