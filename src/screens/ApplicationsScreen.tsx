import { useEffect, useState, useCallback } from 'react';
import type { Job, Application, Profile } from '../types';
import { jobs, applications, ratings } from '../lib/supabase';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Avatar } from '../components/ui/Avatar';
import { Stars } from '../components/ui/Stars';
import { Modal } from '../components/ui/Modal';
import { formatDate, formatDatetime, timeAgo } from '../utils/format';

interface Props {
  currentUser: Profile | null;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
  onCreditChange: () => void;
}

type MyTab = 'posted' | 'applied';
type PostedTab = 'open' | 'in_progress' | 'completed';

export default function ApplicationsScreen({ currentUser, onMessage, onCreditChange }: Props) {
  const [myTab, setMyTab] = useState<MyTab>('applied');
  const [postedTab, setPostedTab] = useState<PostedTab>('open');
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myApps, setMyApps] = useState<Application[]>([]);
  const [jobApplicants, setJobApplicants] = useState<Application[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applicantsOpen, setApplicantsOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateTarget, setRateTarget] = useState<{ app: Application; asRole: 'worker' | 'poster' } | null>(null);
  const [rateScore, setRateScore] = useState(5);
  const [rateComment, setRateComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    const [jobsRes, appsRes] = await Promise.all([
      jobs.getByPoster(currentUser.id),
      applications.getForWorker(currentUser.id),
    ]);
    if (!jobsRes.error) setMyJobs(jobsRes.data ?? []);
    if (!appsRes.error) setMyApps(appsRes.data ?? []);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const openApplicants = async (job: Job) => {
    setSelectedJob(job);
    const res = await applications.getForJob(job.id);
    if (!res.error) setJobApplicants(res.data ?? []);
    setApplicantsOpen(true);
  };

  const handleAccept = async (appId: string, jobId: string) => {
    setActionLoading(appId);
    const res = await applications.accept(appId, jobId);
    setActionLoading(null);
    if (res.error) { onMessage(res.error, 'error'); return; }
    onMessage('Applicant accepted.', 'success');
    // Refresh applicants
    const r = await applications.getForJob(jobId);
    if (!r.error) setJobApplicants(r.data ?? []);
    load();
  };

  const handleReject = async (appId: string) => {
    setActionLoading(appId);
    await applications.reject(appId);
    setActionLoading(null);
    if (selectedJob) {
      const r = await applications.getForJob(selectedJob.id);
      if (!r.error) setJobApplicants(r.data ?? []);
    }
  };

  const handleWithdraw = async (appId: string) => {
    setActionLoading(appId);
    const res = await applications.withdraw(appId);
    setActionLoading(null);
    if (res.error) { onMessage(res.error, 'error'); return; }
    onMessage('Application withdrawn.', 'success');
    load();
  };

  const handleMarkComplete = async (jobId: string) => {
    setActionLoading(jobId);
    const res = await jobs.complete(jobId);
    setActionLoading(null);
    if (res.error) { onMessage(res.error, 'error'); return; }
    onMessage('Job marked as completed.', 'success');
    load();
  };

  const openRate = (app: Application, asRole: 'worker' | 'poster') => {
    setRateTarget({ app, asRole });
    setRateScore(5);
    setRateComment('');
    setRateOpen(true);
  };

  const submitRating = async () => {
    if (!rateTarget || !currentUser) return;
    const { app, asRole } = rateTarget;
    const rateeId = asRole === 'poster' ? app.job?.poster_id : app.worker_id;
    if (!rateeId || !app.job_id) return;
    const res = await ratings.submit({
      job_id: app.job_id,
      ratee_id: rateeId,
      score: rateScore,
      comment: rateComment.trim() || undefined,
      rater_role: asRole,
    });
    if (res.error) { onMessage(res.error, 'error'); return; }
    onMessage('Rating submitted!', 'success');
    setRateOpen(false);
  };

  const postedFiltered = myJobs.filter(j => {
    if (postedTab === 'open') return j.status === 'open';
    if (postedTab === 'in_progress') return j.status === 'in_progress';
    return ['completed', 'cancelled', 'disputed'].includes(j.status);
  });

  if (loading) return <div className="loading"><span className="spin" />Loading...</div>;

  return (
    <div className="pg">
      {/* Top tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab${myTab === 'applied' ? ' on' : ''}`} onClick={() => setMyTab('applied')}>
          My Applications {myApps.length > 0 && <span className="bdg bdg-neu" style={{ marginLeft: 6 }}>{myApps.length}</span>}
        </button>
        <button className={`tab${myTab === 'posted' ? ' on' : ''}`} onClick={() => setMyTab('posted')}>
          Posted Jobs {myJobs.length > 0 && <span className="bdg bdg-neu" style={{ marginLeft: 6 }}>{myJobs.length}</span>}
        </button>
      </div>

      {/* MY APPLICATIONS */}
      {myTab === 'applied' && (
        <>
          {myApps.length === 0 ? (
            <div className="empty">
              <span className="empty-ic">📋</span>
              <span className="empty-t">No applications yet</span>
              <span className="empty-s">Browse the Discover tab to find jobs and apply.</span>
            </div>
          ) : (
            <div className="jgrid">
              {myApps.map(app => (
                <div key={app.id} className="card">
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <StatusBadge status={app.status} />
                      <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>{timeAgo(app.created_at)}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>{app.job?.title ?? 'Job'}</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                      {app.job?.city && <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>📍 {app.job.city}</span>}
                      {app.job?.pay_per_worker && <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>💰 {app.job.pay_per_worker.toLocaleString()} RSD</span>}
                      {app.job?.scheduled_date && <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>🗓 {formatDate(app.job.scheduled_date)}</span>}
                    </div>
                    {app.message && (
                      <div style={{ padding: '10px 12px', background: 'var(--bg-ov)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: '.8125rem', color: 'var(--tx-2)', fontStyle: 'italic', marginBottom: 10 }}>
                        "{app.message}"
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {app.status === 'pending' && (
                        <button
                          className="btn btn-d btn-sm"
                          onClick={() => handleWithdraw(app.id)}
                          disabled={actionLoading === app.id}
                        >
                          Withdraw
                        </button>
                      )}
                      {app.status === 'accepted' && app.job?.status === 'completed' && (
                        <button className="btn btn-s btn-sm" onClick={() => openRate(app, 'poster')}>
                          ⭐ Rate employer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* POSTED JOBS */}
      {myTab === 'posted' && (
        <>
          <div className="tabs" style={{ marginBottom: 20 }}>
            {(['open', 'in_progress', 'completed'] as PostedTab[]).map(t => (
              <button key={t} className={`tab${postedTab === t ? ' on' : ''}`} onClick={() => setPostedTab(t)}>
                {t === 'in_progress' ? 'In Progress' : t.charAt(0).toUpperCase() + t.slice(1)}
                <span className="bdg bdg-neu" style={{ marginLeft: 5 }}>
                  {myJobs.filter(j => t === 'open' ? j.status === 'open' : t === 'in_progress' ? j.status === 'in_progress' : ['completed','cancelled','disputed'].includes(j.status)).length}
                </span>
              </button>
            ))}
          </div>

          {postedFiltered.length === 0 ? (
            <div className="empty">
              <span className="empty-ic">📌</span>
              <span className="empty-t">No {postedTab} jobs</span>
            </div>
          ) : (
            <div className="jgrid">
              {postedFiltered.map(job => {
                const spots = Math.max(job.crew_size - job.accepted_workers, 0);
                return (
                  <div key={job.id} className="card">
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                        <StatusBadge status={job.status} />
                        <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>{timeAgo(job.created_at)}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{job.title}</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                        <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>📍 {job.city}</span>
                        <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>💰 {job.pay_per_worker.toLocaleString()} RSD</span>
                        <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>🗓 {formatDatetime(job.scheduled_date)}</span>
                        <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>👥 {job.accepted_workers}/{job.crew_size}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-s btn-sm" onClick={() => openApplicants(job)}>
                          View applicants
                        </button>
                        {job.status === 'in_progress' && (
                          <button
                            className="btn btn-ok btn-sm"
                            onClick={() => handleMarkComplete(job.id)}
                            disabled={actionLoading === job.id}
                          >
                            Mark complete
                          </button>
                        )}
                        {job.status === 'open' && spots === 0 && (
                          <span className="bdg bdg-ok">Crew full</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Applicants modal */}
      <Modal
        open={applicantsOpen}
        onClose={() => setApplicantsOpen(false)}
        title={`Applicants for "${selectedJob?.title ?? ''}"`}
      >
        {jobApplicants.length === 0 ? (
          <div className="empty" style={{ padding: '32px 0' }}>
            <span className="empty-ic">👤</span>
            <span className="empty-t">No applications yet</span>
            <span className="empty-s">Share your job listing to attract workers.</span>
          </div>
        ) : (
          <div>
            {jobApplicants.map(app => (
              <div key={app.id} className="app-row">
                <Avatar name={app.worker?.full_name ?? '?'} url={app.worker?.avatar_url} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '.9375rem' }}>{app.worker?.full_name}</span>
                    {app.worker?.verification_status === 'verified' && <span className="bdg bdg-verif">✓</span>}
                    <StatusBadge status={app.status} />
                  </div>
                  {app.worker && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                      {app.worker.rating_as_worker > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Stars value={app.worker.rating_as_worker} />
                          <span style={{ fontSize: '.75rem', color: 'var(--tx-2)' }}>{app.worker.rating_as_worker.toFixed(1)}</span>
                        </div>
                      )}
                      <span style={{ fontSize: '.75rem', color: 'var(--tx-2)' }}>{app.worker.completed_jobs_worker} jobs done</span>
                    </div>
                  )}
                  {app.message && (
                    <div style={{ fontSize: '.8125rem', color: 'var(--tx-2)', marginTop: 6, fontStyle: 'italic' }}>
                      "{app.message}"
                    </div>
                  )}
                </div>
                <div className="app-acts">
                  {app.status === 'pending' && (
                    <>
                      <button
                        className="btn btn-ok btn-sm"
                        onClick={() => handleAccept(app.id, app.job_id)}
                        disabled={actionLoading === app.id}
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-d btn-sm"
                        onClick={() => handleReject(app.id)}
                        disabled={actionLoading === app.id}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {app.status === 'accepted' && selectedJob?.status === 'completed' && (
                    <button className="btn btn-s btn-sm" onClick={() => openRate(app, 'worker')}>
                      ⭐ Rate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedJob?.status === 'in_progress' && (
          <div className="cred-notice">
            <span>ℹ</span>
            <span>You can contact accepted workers through their phone number once accepted.</span>
          </div>
        )}
      </Modal>

      {/* Rate modal */}
      <Modal open={rateOpen} onClose={() => setRateOpen(false)} title="Leave a Rating" center>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '.9375rem', color: 'var(--tx-2)', marginBottom: 16 }}>
            How was your experience?
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            <Stars value={rateScore} clickable onChange={setRateScore} />
          </div>
          <div className="fld">
            <label className="flb">Comment (optional)</label>
            <textarea
              className="txta"
              placeholder="Share your experience..."
              value={rateComment}
              onChange={e => setRateComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-s btn-fw" onClick={() => setRateOpen(false)}>Cancel</button>
          <button className="btn btn-p btn-fw" onClick={submitRating}>Submit Rating</button>
        </div>
      </Modal>
    </div>
  );
}
