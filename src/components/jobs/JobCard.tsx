import type { Job } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { Avatar } from '../ui/Avatar';
import { Stars } from '../ui/Stars';
import { formatDate } from '../../utils/format';

interface Props {
  job: Job;
  onClick: (job: Job) => void;
}

export function JobCard({ job, onClick }: Props) {
  const spots = Math.max((job.crew_size || 1) - (job.accepted_workers || 0), 0);

  return (
    <article className="jcard" onClick={() => onClick(job)}>
      <div className="jcard-hdr">
        <div className="jcard-bdgs">
          <StatusBadge status={job.status} />
          {job.category && <span className="bdg bdg-neu">{job.category.icon} {job.category.name}</span>}
          {job.distance_km != null && (
            <span className="bdg bdg-neu">📍 {job.distance_km < 1 ? `${Math.round(job.distance_km * 1000)}m` : `${job.distance_km.toFixed(1)}km`}</span>
          )}
        </div>
      </div>

      <div className="jcard-title">{job.title}</div>
      {job.description && <div className="jcard-desc">{job.description}</div>}

      <div className="jcard-meta">
        <span className="jmeta">📍 {job.city}</span>
        <span className="jmeta">🗓 {formatDate(job.scheduled_date)}</span>
        {job.duration_hours > 0 && <span className="jmeta">⏱ {job.duration_hours}h</span>}
      </div>

      {job.poster && (
        <div className="job-poster-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar name={job.poster.full_name} url={job.poster.avatar_url} size="sm" />
          <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)', fontWeight: 500 }}>{job.poster.full_name}</span>
          {job.poster.rating_as_poster > 0 && (
            <>
              <Stars value={job.poster.rating_as_poster} size="sm" />
              <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>{job.poster.rating_as_poster.toFixed(1)}</span>
            </>
          )}
          {job.poster.verification_status === 'verified' && <span className="bdg bdg-verif">✓ Verified</span>}
        </div>
      )}

      <div className="jcard-foot">
        <div className="jpay">
          <span className="jpay-amt">{job.pay_per_worker.toLocaleString()}</span>
          <span className="jpay-unit">RSD / worker</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="crew-dots">
            {Array.from({ length: job.crew_size }).map((_, i) => (
              <div key={i} className={`cdot${i < job.accepted_workers ? ' on' : ''}`} />
            ))}
          </div>
          <span style={{ fontSize: '.75rem', color: 'var(--tx-2)' }}>{spots} spot{spots !== 1 ? 's' : ''} left</span>
        </div>
      </div>
    </article>
  );
}
