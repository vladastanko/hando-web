import { useEffect, useState, useCallback } from 'react';
import type { Job, Application } from '../types';
import { jobs, applications, ratings, supabase } from '../lib/supabase';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Avatar } from '../components/ui/Avatar';
import { Stars } from '../components/ui/Stars';
import { Modal } from '../components/ui/Modal';
import { formatDate, formatDatetime, timeAgo } from '../utils/format';

interface Props {
  currentUser: { id: string; email?: string } | null;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
  onCreditChange: () => void;
  onOpenChat?: () => void;
}

type MyTab = 'posted' | 'applied';
type PostedTab = 'open' | 'in_progress' | 'completed';
type SortKey = 'newest' | 'rating' | 'jobs_done';

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--warn)',
  accepted: 'var(--ok)',
  rejected: '#ef4444',
  withdrawn: 'var(--tx-3)',
};

// ── Multi-segment rating categories ─────────────────────────
interface CategoryScore { key: string; label: string; icon: string; }
const WORKER_CATEGORIES: CategoryScore[] = [
  { key: 'score_punctuality',    label: 'Punctuality',    icon: '⏰' },
  { key: 'score_quality',        label: 'Work quality',   icon: '🔧' },
  { key: 'score_communication',  label: 'Communication',  icon: '💬' },
  { key: 'score_reliability',    label: 'Reliability',    icon: '🤝' },
];
const POSTER_CATEGORIES: CategoryScore[] = [
  { key: 'score_payment',       label: 'Payment',         icon: '💰' },
  { key: 'score_clarity',       label: 'Instructions',    icon: '📋' },
  { key: 'score_communication', label: 'Communication',   icon: '💬' },
  { key: 'score_reliability',   label: 'Reliability',     icon: '🤝' },
];

function avgScores(scores: Record<string, number>): number {
  const vals = Object.values(scores).filter(v => v > 0);
  if (!vals.length) return 5;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export default function ApplicationsScreen({ currentUser, onMessage, onCreditChange: _cc, onOpenChat }: Props) {
  const [myTab,          setMyTab]          = useState<MyTab>('applied');
  const [postedTab,      setPostedTab]      = useState<PostedTab>('open');
  const [myJobs,         setMyJobs]         = useState<Job[]>([]);
  const [myApps,         setMyApps]         = useState<Application[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [actionLoading,  setActionLoading]  = useState<string | null>(null);

  const [panelJob,       setPanelJob]       = useState<Job | null>(null);
  const [applicants,     setApplicants]     = useState<Application[]>([]);
  const [appsLoading,    setAppsLoading]    = useState(false);
  const [sortBy,         setSortBy]         = useState<SortKey>('newest');
  const [selectedApp,    setSelectedApp]    = useState<Application | null>(null);

  const [editJob,        setEditJob]        = useState<Job | null>(null);
  const [editDesc,       setEditDesc]       = useState('');
  const [editSaving,     setEditSaving]     = useState(false);

  // Rating state — full multi-segment
  const [rateTarget,     setRateTarget]     = useState<{ app: Application; asRole: 'worker' | 'poster' } | null>(null);
  const [rateScores,     setRateScores]     = useState<Record<string, number>>({});
  const [ratePublic,     setRatePublic]     = useState('');
  const [ratePrivate,    setRatePrivate]    = useState('');
  const [rateSubmitting, setRateSubmitting] = useState(false);
  const [ratedIds,       setRatedIds]       = useState<Set<string>>(new Set());

  const [completeTarget, setCompleteTarget] = useState<string | null>(null);

  // FIX: withdraw confirmation modal
  const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentUser) { setLoading(false); return; }
    setLoading(true);
    const [jr, ar] = await Promise.all([
      jobs.getByPoster(currentUser.id),
      applications.getForWorker(currentUser.id),
    ]);
    if (!jr.error) setMyJobs(jr.data ?? []);
    if (!ar.error) setMyApps(ar.data ?? []);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const openPanel = async (job: Job) => {
    setPanelJob(job);
    setSelectedApp(null);
    setAppsLoading(true);
    const r = await applications.getForJob(job.id);
    if (!r.error) setApplicants(r.data ?? []);
    setAppsLoading(false);
  };

  // FIX: refreshPanel also refreshes job data so accepted_workers updates
  const refreshPanel = async (jobId: string) => {
    const [ar, jr] = await Promise.all([
      applications.getForJob(jobId),
      jobs.getById(jobId),
    ]);
    if (!ar.error) setApplicants(ar.data ?? []);
    if (!jr.error && jr.data) {
      setPanelJob(prev => prev?.id === jobId ? { ...prev, ...jr.data! } : prev);
      setMyJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...jr.data! } : j));
    }
  };

  const handleAccept = async (appId: string, jobId: string) => {
    setActionLoading(appId);
    const res = await applications.accept(appId, jobId);
    setActionLoading(null);
    if (res.error) { onMessage(res.error, 'error'); return; }
    onMessage('Applicant accepted! A conversation has started.', 'success');

    const job = myJobs.find(j => j.id === jobId);
    if (job && job.status === 'open') {
      await jobs.update(jobId, { status: 'in_progress' });
    }

    await refreshPanel(jobId);
    load();
  };

  const handleReject = async (appId: string) => {
    setActionLoading(appId);
    await applications.reject(appId);
    setActionLoading(null);
    if (panelJob) await refreshPanel(panelJob.id);
  };

  // FIX: withdraw shows confirmation modal first
  const handleWithdrawConfirm = async () => {
    if (!withdrawTarget) return;
    setActionLoading(withdrawTarget);
    const res = await applications.withdraw(withdrawTarget);
    setActionLoading(null);
    setWithdrawTarget(null);
    if (res.error) { onMessage(res.error, 'error'); return; }
    onMessage('Application withdrawn.', 'success');
    load();
  };

  const handleMarkComplete = async (jobId: string) => {
    setActionLoading(jobId);
    // FIX: use RPC for server-side completion with notification trigger
    const { error } = await supabase.rpc('poster_mark_complete', {
      p_job_id: jobId,
      p_poster_id: currentUser?.id,
    });
    setActionLoading(null);
    if (error) { onMessage(error.message, 'error'); return; }
    onMessage('Job marked as completed! You can now rate workers.', 'success');
    setCompleteTarget(null);
    await refreshPanel(jobId);
    load();
  };

  const openEdit = (job: Job) => { setEditJob(job); setEditDesc(job.description ?? ''); };
  const handleEditSave = async () => {
    if (!editJob) return;
    setEditSaving(true);
    const res = await jobs.update(editJob.id, { description: editDesc.trim() });
    setEditSaving(false);
    if (res.error) { onMessage(res.error, 'error'); return; }
    onMessage('Description updated.', 'success');
    setEditJob(null);
    load();
  };

  const openRate = (app: Application, asRole: 'worker' | 'poster') => {
    setRateTarget({ app, asRole });
    const cats = asRole === 'worker' ? WORKER_CATEGORIES : POSTER_CATEGORIES;
    const init: Record<string, number> = {};
    cats.forEach(c => { init[c.key] = 5; });
    setRateScores(init);
    setRatePublic('');
    setRatePrivate('');
  };

  const submitRating = async () => {
    if (!rateTarget || !currentUser) return;
    setRateSubmitting(true);
    const { app, asRole } = rateTarget;
    const rateeId = asRole === 'poster' ? app.job?.poster_id : app.worker_id;
    if (!rateeId || !app.job_id) { setRateSubmitting(false); return; }

    const overallScore = avgScores(rateScores);

    const res = await ratings.submit({
      job_id: app.job_id,
      ratee_id: rateeId,
      score: overallScore,
      comment: ratePublic.trim() || undefined,
      rater_role: asRole,
    });

    // Save extended fields via direct update (if migration ran)
    if (res.data?.id) {
      await supabase.from('ratings').update({
        public_feedback: ratePublic.trim() || null,
        private_feedback: ratePrivate.trim() || null,
        ...rateScores,
      }).eq('id', res.data.id);
    }

    setRateSubmitting(false);
    if (res.error) { onMessage(res.error, 'error'); return; }
    onMessage('Rating submitted!', 'success');
    setRatedIds(prev => new Set([...prev, app.id]));
    setRateTarget(null);
  };

  const sortedApplicants = [...applicants].sort((a, b) => {
    if (sortBy === 'rating') return (b.worker?.rating_as_worker ?? 0) - (a.worker?.rating_as_worker ?? 0);
    if (sortBy === 'jobs_done') return (b.worker?.completed_jobs_worker ?? 0) - (a.worker?.completed_jobs_worker ?? 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const pendingCount  = applicants.filter(a => a.status === 'pending').length;
  const acceptedCount = applicants.filter(a => a.status === 'accepted').length;

  const postedFiltered = myJobs.filter(j => {
    if (postedTab === 'open') return j.status === 'open';
    if (postedTab === 'in_progress') return j.status === 'in_progress';
    return ['completed', 'cancelled', 'disputed'].includes(j.status);
  });

  if (loading) return (
    <div className="loading" style={{ height: '60vh' }}>
      <span className="spin" />Loading your jobs...
    </div>
  );

  const rateCategories = rateTarget
    ? (rateTarget.asRole === 'worker' ? WORKER_CATEGORIES : POSTER_CATEGORIES)
    : [];

  return (
    <div className="pg" style={{ maxWidth: panelJob ? 'none' : undefined }}>

      {/* ── Top tabs ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div className="tabs" style={{ margin: 0 }}>
          <button className={`tab${myTab === 'applied' ? ' on' : ''}`} onClick={() => { setMyTab('applied'); setPanelJob(null); }}>
            My Applications
            {myApps.filter(a => a.status === 'pending').length > 0 && (
              <span className="bdg bdg-warn" style={{ marginLeft: 6 }}>{myApps.filter(a => a.status === 'pending').length}</span>
            )}
          </button>
          <button className={`tab${myTab === 'posted' ? ' on' : ''}`} onClick={() => { setMyTab('posted'); }}>
            Posted Jobs
            {myJobs.filter(j => j.status === 'open' || j.status === 'in_progress').length > 0 && (
              <span className="bdg bdg-neu" style={{ marginLeft: 6 }}>{myJobs.filter(j => j.status === 'open' || j.status === 'in_progress').length}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── MY APPLICATIONS ──────────────────────────────── */}
      {myTab === 'applied' && (
        <div>
          {myApps.length === 0 ? (
            <div className="empty" style={{ marginTop: 48 }}>
              <span className="empty-ic">📋</span>
              <span className="empty-t">No applications yet</span>
              <span className="empty-s">Browse Discover to find jobs and apply.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myApps.map(app => {
                const statusColor = STATUS_COLORS[app.status] ?? 'var(--tx-3)';
                const isCompleted = app.job?.status === 'completed';
                const canRate = isCompleted && app.status === 'accepted' && !ratedIds.has(app.id);
                return (
                  <div key={app.id} style={{
                    background: 'var(--bg-el)', border: '1.5px solid var(--border)',
                    borderRadius: 'var(--r-lg)', overflow: 'hidden',
                    borderLeft: `4px solid ${statusColor}`,
                    transition: 'box-shadow var(--tf)',
                  }}>
                    <div style={{ padding: '16px 18px' }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 3, letterSpacing: '-.01em' }}>
                            {app.job?.title ?? 'Job'}
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {app.job?.city && <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>📍 {app.job.city}</span>}
                            {app.job?.pay_per_worker && <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>💰 {app.job.pay_per_worker.toLocaleString()} RSD</span>}
                            {app.job?.scheduled_date && <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>🗓 {formatDate(app.job.scheduled_date)}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: '.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: statusColor }}>
                            {app.status}
                          </span>
                          <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>{timeAgo(app.created_at)}</span>
                        </div>
                      </div>

                      {app.message && (
                        <div style={{
                          padding: '10px 13px', background: 'var(--bg-ov)', borderRadius: 'var(--r)',
                          border: '1px solid var(--border)', fontSize: '.875rem', color: 'var(--tx-2)',
                          fontStyle: 'italic', lineHeight: 1.55, marginBottom: 12,
                        }}>
                          "{app.message}"
                        </div>
                      )}

                      {app.status === 'accepted' && !isCompleted && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 'var(--r)', marginBottom: 12 }}>
                          <span>✅</span>
                          <span style={{ fontSize: '.875rem', fontWeight: 600, color: 'var(--ok)', flex: 1 }}>Accepted — check your inbox.</span>
                          <button className="btn btn-s btn-sm" onClick={onOpenChat} style={{ flexShrink: 0 }}>
                            💬 Chat
                          </button>
                        </div>
                      )}
                      {app.status === 'rejected' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 'var(--r)', marginBottom: 12 }}>
                          <span>❌</span>
                          <span style={{ fontSize: '.875rem', color: '#ef4444' }}>Your application was not selected for this job.</span>
                        </div>
                      )}
                      {isCompleted && app.status === 'accepted' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'rgba(91,94,244,.08)', border: '1px solid rgba(91,94,244,.25)', borderRadius: 'var(--r)', marginBottom: 12 }}>
                          <span>🏁</span>
                          <span style={{ fontSize: '.875rem', fontWeight: 600, color: 'var(--brand)' }}>Job completed! Leave a rating for the employer.</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {/* FIX: withdraw opens confirmation modal */}
                        {app.status === 'pending' && (
                          <button className="btn btn-d btn-sm" onClick={() => setWithdrawTarget(app.id)} disabled={actionLoading === app.id}>
                            {actionLoading === app.id ? '...' : 'Withdraw'}
                          </button>
                        )}
                        {canRate && (
                          <button className="btn btn-p btn-sm" onClick={() => openRate(app, 'poster')}>
                            ⭐ Rate Employer
                          </button>
                        )}
                        {ratedIds.has(app.id) && (
                          <span style={{ fontSize: '.8125rem', color: 'var(--ok)', fontWeight: 600 }}>✓ Rated</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── POSTED JOBS ──────────────────────────────────── */}
      {myTab === 'posted' && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

          {/* Left: job list */}
          <div style={{ flex: panelJob ? '0 0 360px' : '1', minWidth: 0, transition: 'flex var(--tf)' }}>
            <div className="tabs" style={{ marginBottom: 16 }}>
              {(['open', 'in_progress', 'completed'] as PostedTab[]).map(t => {
                const count = myJobs.filter(j =>
                  t === 'open' ? j.status === 'open'
                  : t === 'in_progress' ? j.status === 'in_progress'
                  : ['completed','cancelled','disputed'].includes(j.status)
                ).length;
                return (
                  <button key={t} className={`tab${postedTab === t ? ' on' : ''}`} onClick={() => setPostedTab(t)}>
                    {t === 'in_progress' ? 'In Progress' : t === 'open' ? 'Open' : 'Closed'}
                    <span className="bdg bdg-neu" style={{ marginLeft: 5 }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {postedFiltered.length === 0 ? (
              <div className="empty" style={{ marginTop: 32 }}>
                <span className="empty-ic">📌</span>
                <span className="empty-t">No {postedTab.replace('_', ' ')} jobs</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {postedFiltered.map(job => {
                  // FIX: use live acceptedCount from job data
                  const accepted = job.accepted_workers ?? 0;
                  const spots = Math.max((job.crew_size ?? 1) - accepted, 0);
                  const isActive = panelJob?.id === job.id;
                  return (
                    <div
                      key={job.id}
                      onClick={() => openPanel(job)}
                      style={{
                        background: isActive ? 'var(--brand-s)' : 'var(--bg-el)',
                        border: `1.5px solid ${isActive ? 'var(--brand)' : 'var(--border)'}`,
                        borderRadius: 'var(--r-lg)', padding: '14px 16px',
                        cursor: 'pointer', transition: 'all var(--tf)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: '.9375rem', letterSpacing: '-.01em', flex: 1, minWidth: 0 }}>{job.title}</span>
                        <StatusBadge status={job.status} />
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={{ fontSize: '.75rem', color: 'var(--tx-2)' }}>📍 {job.city}</span>
                        <span style={{ fontSize: '.75rem', color: 'var(--tx-2)' }}>💰 {job.pay_per_worker.toLocaleString()} RSD</span>
                        <span style={{ fontSize: '.75rem', color: 'var(--tx-2)' }}>🗓 {formatDate(job.scheduled_date)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          {/* FIX: show real accepted count */}
                          <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>
                            👥 {accepted}/{job.crew_size} accepted
                          </span>
                          {spots > 0 && job.status === 'open' && (
                            <span style={{ fontSize: '.75rem', color: 'var(--warn)', fontWeight: 600 }}>{spots} spot{spots > 1 ? 's' : ''} open</span>
                          )}
                        </div>
                        <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>Posted {timeAgo(job.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: applicant panel */}
          {panelJob && (
            <div style={{
              flex: 1, minWidth: 0,
              background: 'var(--bg-el)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--r-lg)', overflow: 'hidden',
              animation: 'fadeIn .18s ease',
            }}>
              {/* Panel header */}
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-ov)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '-.02em', marginBottom: 4 }}>{panelJob.title}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>📍 {panelJob.city}</span>
                    <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>💰 {panelJob.pay_per_worker.toLocaleString()} RSD/worker</span>
                    <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>🗓 {formatDatetime(panelJob.scheduled_date)}</span>
                    <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>⏱ {panelJob.duration_hours}h</span>
                  </div>
                  {/* FIX: Stats use live acceptedCount */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Applied', val: applicants.length, color: 'var(--tx)' },
                      { label: 'Pending', val: pendingCount, color: 'var(--warn)' },
                      { label: 'Accepted', val: acceptedCount, color: 'var(--ok)' },
                      { label: 'Spots left', val: Math.max((panelJob.crew_size ?? 1) - acceptedCount, 0), color: 'var(--brand)' },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                        <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
                  <button className="btn btn-g btn-sm" onClick={() => { setPanelJob(null); setSelectedApp(null); }}>✕</button>
                  {(panelJob.status === 'open' || panelJob.status === 'in_progress') && (
                    <button className="btn btn-s btn-sm" onClick={() => openEdit(panelJob)}>✏️ Edit</button>
                  )}
                  {/* FIX: Complete button available for in_progress jobs */}
                  {panelJob.status === 'in_progress' && (
                    <button className="btn btn-ok btn-sm" onClick={() => setCompleteTarget(panelJob.id)}>
                      ✓ Complete
                    </button>
                  )}
                </div>
              </div>

              {/* Sort */}
              {applicants.length > 1 && (
                <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Sort:</span>
                  {(['newest', 'rating', 'jobs_done'] as SortKey[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600,
                        background: sortBy === s ? 'var(--brand-s)' : 'var(--bg-ov)',
                        border: `1px solid ${sortBy === s ? 'var(--brand)' : 'var(--border)'}`,
                        color: sortBy === s ? 'var(--brand)' : 'var(--tx-2)',
                        cursor: 'pointer', transition: 'all var(--tf)',
                      }}
                    >
                      {s === 'newest' ? 'Newest' : s === 'rating' ? '⭐ Rating' : '✓ Jobs done'}
                    </button>
                  ))}
                </div>
              )}

              {/* Applicant list / detail */}
              {appsLoading ? (
                <div className="loading" style={{ padding: '40px 0' }}><span className="spin" />Loading applicants...</div>
              ) : applicants.length === 0 ? (
                <div className="empty" style={{ padding: '48px 0' }}>
                  <span className="empty-ic">👤</span>
                  <span className="empty-t">No applications yet</span>
                  <span className="empty-s">Share your job to attract workers.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', minHeight: 400 }}>
                  {/* List */}
                  <div style={{ width: 260, borderRight: '1px solid var(--border)', overflowY: 'auto', maxHeight: 520 }}>
                    {sortedApplicants.map(app => {
                      const isSelected = selectedApp?.id === app.id;
                      const statusColor = STATUS_COLORS[app.status] ?? 'var(--tx-3)';
                      return (
                        <div
                          key={app.id}
                          onClick={() => setSelectedApp(app)}
                          style={{
                            padding: '12px 14px', cursor: 'pointer',
                            background: isSelected ? 'var(--brand-s)' : 'transparent',
                            borderBottom: '1px solid var(--border)',
                            borderLeft: `3px solid ${isSelected ? 'var(--brand)' : 'transparent'}`,
                            transition: 'all .12s',
                          }}
                        >
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <Avatar name={app.worker?.full_name ?? '?'} url={app.worker?.avatar_url} size="sm" />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                                <span style={{ fontWeight: 700, fontSize: '.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {app.worker?.full_name ?? 'Worker'}
                                </span>
                                <span style={{ fontSize: '.625rem', fontWeight: 700, color: statusColor, textTransform: 'uppercase', flexShrink: 0 }}>
                                  {app.status}
                                </span>
                              </div>
                              <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', marginTop: 1 }}>
                                {timeAgo(app.created_at)}
                              </div>
                              {app.worker && app.worker.rating_as_worker > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                  <Stars value={app.worker.rating_as_worker} size=".625rem" />
                                  <span style={{ fontSize: '.6875rem', color: 'var(--tx-2)' }}>{app.worker.rating_as_worker.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detail */}
                  {selectedApp ? (
                    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', maxHeight: 520 }}>
                      <div style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-start' }}>
                        <Avatar name={selectedApp.worker?.full_name ?? '?'} url={selectedApp.worker?.avatar_url} size="lg" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-.02em', marginBottom: 3 }}>
                            {selectedApp.worker?.full_name ?? 'Worker'}
                          </div>
                          {selectedApp.worker?.city && (
                            <div style={{ fontSize: '.875rem', color: 'var(--tx-2)', marginBottom: 4 }}>📍 {selectedApp.worker.city}</div>
                          )}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {selectedApp.worker?.verification_status === 'verified' && (
                              <span className="bdg bdg-verif">✓ Verified</span>
                            )}
                            {selectedApp.worker?.is_phone_verified && (
                              <span className="bdg bdg-ok">📱 Phone</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: STATUS_COLORS[selectedApp.status] ?? 'var(--tx-3)' }}>
                            {selectedApp.status}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                        {[
                          { icon: '⭐', label: 'Rating', val: selectedApp.worker?.rating_as_worker ? selectedApp.worker.rating_as_worker.toFixed(1) : '—' },
                          { icon: '✓', label: 'Jobs done', val: selectedApp.worker?.completed_jobs_worker ?? 0 },
                          { icon: '📋', label: 'Jobs posted', val: selectedApp.worker?.completed_jobs_poster ?? 0 },
                        ].map(s => (
                          <div key={s.label} style={{ padding: '10px 12px', background: 'var(--bg-ov)', border: '1px solid var(--border)', borderRadius: 'var(--r)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>{s.val}</div>
                            <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', textTransform: 'uppercase', letterSpacing: '.03em', marginTop: 2 }}>{s.icon} {s.label}</div>
                          </div>
                        ))}
                      </div>

                      {selectedApp.message && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--tx-3)', marginBottom: 8 }}>Cover message</div>
                          <div style={{ padding: '12px 14px', background: 'var(--bg-ov)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: '.9375rem', color: 'var(--tx-2)', lineHeight: 1.65, fontStyle: 'italic' }}>
                            "{selectedApp.message}"
                          </div>
                        </div>
                      )}

                      {selectedApp.worker?.bio && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--tx-3)', marginBottom: 8 }}>About</div>
                          <p style={{ fontSize: '.875rem', color: 'var(--tx-2)', lineHeight: 1.65, margin: 0 }}>{selectedApp.worker.bio}</p>
                        </div>
                      )}

                      <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', marginBottom: 16 }}>
                        Applied {timeAgo(selectedApp.created_at)}
                      </div>

                      {selectedApp.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            className="btn btn-ok btn-fw"
                            onClick={() => handleAccept(selectedApp.id, selectedApp.job_id)}
                            disabled={actionLoading === selectedApp.id}
                          >
                            {actionLoading === selectedApp.id ? 'Accepting...' : '✓ Accept applicant'}
                          </button>
                          <button
                            className="btn btn-d"
                            style={{ flexShrink: 0 }}
                            onClick={() => { handleReject(selectedApp.id); setSelectedApp({ ...selectedApp, status: 'rejected' }); }}
                            disabled={actionLoading === selectedApp.id}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {selectedApp.status === 'accepted' && panelJob.status !== 'completed' && (
                        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                          <div style={{ padding: '10px 13px', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 'var(--r)', fontSize: '.875rem', color: 'var(--ok)', fontWeight: 600 }}>
                            ✅ Accepted — conversation started in Inbox
                          </div>
                          <button className="btn btn-s btn-fw" onClick={onOpenChat}>
                            💬 Open Chat
                          </button>
                          {/* FIX: mark complete also accessible from worker detail */}
                          {panelJob.status === 'in_progress' && (
                            <button className="btn btn-ok btn-fw" onClick={() => setCompleteTarget(panelJob.id)}>
                              🏁 Mark job as completed
                            </button>
                          )}
                        </div>
                      )}
                      {selectedApp.status === 'accepted' && panelJob.status === 'completed' && !ratedIds.has(selectedApp.id) && (
                        <button className="btn btn-p btn-fw" onClick={() => openRate(selectedApp, 'worker')}>
                          ⭐ Rate this worker
                        </button>
                      )}
                      {ratedIds.has(selectedApp.id) && (
                        <div style={{ padding: '10px 13px', background: 'var(--brand-s)', border: '1px solid rgba(91,94,244,.2)', borderRadius: 'var(--r)', fontSize: '.875rem', color: 'var(--brand)', fontWeight: 600 }}>
                          ✓ You rated this worker
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--tx-3)', padding: 24 }}>
                      <span style={{ fontSize: '2rem', opacity: .4 }}>👤</span>
                      <span style={{ fontSize: '.875rem' }}>Select an applicant to review</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Withdraw confirmation modal ───────────────────── */}
      <Modal open={!!withdrawTarget} onClose={() => setWithdrawTarget(null)} title="Withdraw application?" center>
        <div style={{ padding: '4px 0 16px' }}>
          <div style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 'var(--r)', marginBottom: 16 }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9375rem', marginBottom: 4 }}>Are you sure?</div>
              <div style={{ fontSize: '.875rem', color: 'var(--tx-2)', lineHeight: 1.6 }}>
                The employer will no longer see your application. Credits spent on this application <strong>will not be refunded</strong>.
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-s btn-fw" onClick={() => setWithdrawTarget(null)}>← Go back</button>
          <button
            className="btn btn-d btn-fw"
            onClick={handleWithdrawConfirm}
            disabled={actionLoading === withdrawTarget}
          >
            {actionLoading === withdrawTarget ? 'Withdrawing...' : 'Confirm withdraw'}
          </button>
        </div>
      </Modal>

      {/* ── Mark complete confirm ────────────────────────── */}
      <Modal open={!!completeTarget} onClose={() => setCompleteTarget(null)} title="Mark job as complete?" center>
        <p style={{ fontSize: '.9375rem', color: 'var(--tx-2)', lineHeight: 1.65, marginBottom: 4 }}>
          This will close the job. Accepted workers will be able to rate you, and you'll be able to rate them.
        </p>
        <p style={{ fontSize: '.875rem', color: 'var(--tx-3)', marginBottom: 20 }}>This action cannot be undone.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-s btn-fw" onClick={() => setCompleteTarget(null)}>Cancel</button>
          <button
            className="btn btn-ok btn-fw btn-lg"
            onClick={() => completeTarget && handleMarkComplete(completeTarget)}
            disabled={actionLoading === completeTarget}
          >
            {actionLoading === completeTarget ? 'Completing...' : '✓ Mark as completed'}
          </button>
        </div>
      </Modal>

      {/* ── Edit description modal ───────────────────────── */}
      <Modal open={!!editJob} onClose={() => setEditJob(null)} title={`Edit: "${editJob?.title ?? ''}"`}>
        <div className="info-box warn" style={{ marginBottom: 14 }}>
          <span>ℹ️</span>
          <span>Only the description can be changed. Pay, crew size and date are locked after posting.</span>
        </div>
        <div className="fld">
          <label className="flb">Description</label>
          <textarea className="txta" value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={6} />
        </div>
        <button className="btn btn-p btn-fw btn-lg" onClick={handleEditSave} disabled={editSaving}>
          {editSaving ? 'Saving...' : 'Save changes'}
        </button>
        <button className="btn btn-s btn-fw" onClick={() => setEditJob(null)} style={{ marginTop: 8 }}>Cancel</button>
      </Modal>

      {/* ── Multi-segment Rating modal ───────────────────── */}
      <Modal open={!!rateTarget} onClose={() => setRateTarget(null)} title="Leave a rating">
        <div style={{ paddingBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>
            {rateTarget?.asRole === 'worker'
              ? rateTarget?.app.worker?.full_name
              : 'Employer'}
          </div>
          <div style={{ fontSize: '.875rem', color: 'var(--tx-3)', marginBottom: 20 }}>
            How was your experience working {rateTarget?.asRole === 'worker' ? 'with this person' : 'for this employer'}?
          </div>

          {/* Category scores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            {rateCategories.map(cat => (
              <div key={cat.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '.875rem', fontWeight: 600 }}>{cat.icon} {cat.label}</span>
                  <span style={{ fontSize: '.875rem', fontWeight: 800, color: 'var(--brand)' }}>
                    {rateScores[cat.key] ?? 5}/5
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1,2,3,4,5].map(n => (
                    <span
                      key={n}
                      onClick={() => setRateScores(prev => ({ ...prev, [cat.key]: n }))}
                      style={{
                        fontSize: '1.5rem', cursor: 'pointer',
                        color: n <= (rateScores[cat.key] ?? 5) ? '#f59e0b' : 'var(--border)',
                        transition: 'all .1s',
                        filter: n <= (rateScores[cat.key] ?? 5) ? 'drop-shadow(0 0 4px rgba(245,158,11,.4))' : 'none',
                      }}
                    >★</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Overall average preview */}
          <div style={{
            padding: '8px 12px', background: 'var(--bg-ov)', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 18,
          }}>
            <span style={{ fontSize: '.875rem', color: 'var(--tx-2)' }}>Overall rating</span>
            <span style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--brand)' }}>
              ⭐ {avgScores(rateScores).toFixed(1)}
            </span>
          </div>

          {/* Public feedback */}
          <div className="fld" style={{ marginBottom: 12 }}>
            <label className="flb">
              Public review <span style={{ fontWeight: 400, color: 'var(--tx-3)' }}>(visible to everyone)</span>
            </label>
            <textarea
              className="txta"
              placeholder="Share your experience — this will be visible on their profile..."
              value={ratePublic}
              onChange={e => setRatePublic(e.target.value)}
              rows={3}
            />
          </div>

          {/* Private feedback */}
          <div className="fld">
            <label className="flb">
              Private note <span style={{ fontWeight: 400, color: 'var(--tx-3)' }}>(only visible to admins)</span>
            </label>
            <textarea
              className="txta"
              placeholder="Anything you'd prefer to keep private..."
              value={ratePrivate}
              onChange={e => setRatePrivate(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-s btn-fw" onClick={() => setRateTarget(null)}>Cancel</button>
          <button className="btn btn-p btn-fw" onClick={submitRating} disabled={rateSubmitting}>
            {rateSubmitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </Modal>

    </div>
  );
}
