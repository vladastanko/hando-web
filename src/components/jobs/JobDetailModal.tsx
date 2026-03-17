import { useState } from 'react';
import type { Job, Profile } from '../../types';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';
import { Avatar } from '../ui/Avatar';
import { Stars } from '../ui/Stars';
import { applications } from '../../lib/supabase';
import { formatDatetime } from '../../utils/format';

interface Props {
  job: Job | null;
  currentUser: Profile | null;
  onClose: () => void;
  onApplied: () => void;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

export function JobDetailModal({ job, currentUser, onClose, onApplied, onMessage }: Props) {
  const [applyMsg, setApplyMsg] = useState('');
  const [applying, setApplying] = useState(false);
  const [step, setStep] = useState<'view' | 'apply'>('view');

  if (!job) return null;

  const isOwn = currentUser?.id === job.poster_id;
  const spots = Math.max((job.crew_size || 1) - (job.accepted_workers || 0), 0);
  const canApply = !isOwn && job.status === 'open' && spots > 0;

  const handleApply = async () => {
    if (applying) return;
    setApplying(true);
    const res = await applications.apply(job.id, applyMsg.trim() || undefined);
    setApplying(false);
    if (res.error) {
      onMessage(res.error, 'error');
    } else {
      onMessage('Application sent! −3 credits deducted.', 'success');
      onApplied();
      onClose();
    }
  };

  return (
    <Modal open={!!job} onClose={onClose} title={step === 'apply' ? 'Apply for this job' : undefined}>
      {step === 'view' ? (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <StatusBadge status={job.status} />
            {job.category && <span className="bdg bdg-neu">{job.category.icon} {job.category.name}</span>}
          </div>

          <div style={{ fontSize: '1.1875rem', fontWeight: 800, lineHeight: 1.3, letterSpacing: '-.02em' }}>{job.title}</div>

          {job.description && (
            <p style={{ fontSize: '.9375rem', color: 'var(--tx-2)', lineHeight: 1.65 }}>{job.description}</p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['📍', 'Location', `${job.address}, ${job.city}`],
              ['🗓', 'Scheduled', formatDatetime(job.scheduled_date)],
              ['⏱', 'Duration', `${job.duration_hours} hours`],
              ['💰', 'Pay', `${job.pay_per_worker.toLocaleString()} RSD / worker`],
              ['👥', 'Crew size', `${job.crew_size} workers (${spots} spots left)`],
            ].map(([icon, label, val]) => (
              <div key={label as string} style={{ padding: '12px 14px', background: 'var(--bg-ov)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 600, marginBottom: 4 }}>{icon} {label}</div>
                <div style={{ fontSize: '.9375rem', fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>

          {job.poster && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: 'var(--bg-ov)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
              <Avatar name={job.poster.full_name} url={job.poster.avatar_url} size="md" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{job.poster.full_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <Stars value={job.poster.rating_as_poster} />
                  <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>
                    {job.poster.rating_as_poster > 0 ? job.poster.rating_as_poster.toFixed(1) : 'No ratings yet'}
                  </span>
                  {job.poster.verification_status === 'verified' && <span className="bdg bdg-verif">✓ Verified</span>}
                </div>
                <div style={{ fontSize: '.8125rem', color: 'var(--tx-3)', marginTop: 2 }}>
                  {job.poster.completed_jobs_poster} jobs posted
                </div>
              </div>
            </div>
          )}

          {canApply && (
            <div className="sh-foot" style={{ borderTop: 0, padding: 0 }}>
              <button className="btn btn-p btn-fw btn-lg" onClick={() => setStep('apply')}>
                Apply — costs 3 credits
              </button>
            </div>
          )}
          {isOwn && (
            <div style={{ padding: '12px', background: 'var(--brand-s)', border: '1px solid rgba(91,94,244,.2)', borderRadius: 'var(--r)', fontSize: '.875rem', color: 'var(--brand)', textAlign: 'center' }}>
              This is your job posting
            </div>
          )}
          {!canApply && !isOwn && job.status !== 'open' && (
            <div style={{ padding: '12px', background: 'var(--bg-ov)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: '.875rem', color: 'var(--tx-2)', textAlign: 'center' }}>
              This job is no longer accepting applications
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ padding: '12px 14px', background: 'var(--bg-ov)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
            <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', marginBottom: 4 }}>Applying for</div>
            <div style={{ fontWeight: 700 }}>{job.title}</div>
            <div style={{ fontSize: '.875rem', color: 'var(--tx-2)' }}>💰 {job.pay_per_worker.toLocaleString()} RSD</div>
          </div>

          <div className="fld">
            <label className="flb">Your message to the employer <span style={{ color: 'var(--tx-3)', fontWeight: 400 }}>(recommended)</span></label>
            <textarea
              className="txta"
              placeholder="Tell the employer why you're a great fit. Mention your relevant experience, availability, and anything that makes you stand out."
              value={applyMsg}
              onChange={e => setApplyMsg(e.target.value)}
              rows={5}
            />
          </div>

          <div className="cred-notice">
            <span>🪙</span>
            <span>Applying costs <strong>3 credits</strong>. You currently have <strong>{currentUser?.credits ?? 0}</strong> credits.</span>
          </div>

          <button
            className="btn btn-p btn-fw btn-lg"
            onClick={handleApply}
            disabled={applying || (currentUser?.credits ?? 0) < 3}
          >
            {applying ? 'Sending...' : 'Send Application'}
          </button>
          <button className="btn btn-s btn-fw" onClick={() => setStep('view')} style={{ marginTop: 8 }}>Back</button>
        </>
      )}
    </Modal>
  );
}
