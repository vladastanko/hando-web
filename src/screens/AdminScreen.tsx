import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Coins, Hourglass, Check, X, RefreshCw, ChevronLeft, PartyPopper, ClipboardList, Banknote, Info, ShieldCheck, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { timeAgo } from '../utils/format';

// ─────────────────────────────────────────────────────────────
// HANDOO ADMIN PANEL — Credit Orders
// Access: add ?admin=1 to URL, then enter admin password
//
// To use:
//  1. Set VITE_ADMIN_PASSWORD in your .env.local
//  2. Visit https://yourapp.com?admin=1
//  3. Enter password
//  4. Approve or reject pending bank transfer orders
// ─────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'handoo-admin-2024';

interface Order {
  id: string;
  reference: string;
  credits: number;
  amount_rsd: number;
  status: 'pending' | 'approved' | 'rejected';
  email: string;
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
  full_name: string;
  user_id: string;
}

interface Stats {
  pending: number;
  approved_today: number;
  total_rsd_today: number;
}

interface VerifRecord {
  user_id: string;
  id_document_url: string | null;
  selfie_url: string | null;
  status: string;
  submitted_at: string;
  full_name: string;
  email: string;
  phone: string | null;
}

export default function AdminScreen({ onExit }: { onExit: () => void }) {
  const [authed,        setAuthed]        = useState(false);
  const [pw,            setPw]            = useState('');
  const [pwError,       setPwError]       = useState('');
  const [section,       setSection]       = useState<'orders' | 'verifications'>('orders');
  const [orders,        setOrders]        = useState<Order[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [actionId,      setActionId]      = useState<string | null>(null);
  const [rejectId,      setRejectId]      = useState<string | null>(null);
  const [rejectNote,    setRejectNote]    = useState('');
  const [tab,           setTab]           = useState<'pending' | 'all'>('pending');
  const [stats,         setStats]         = useState<Stats>({ pending: 0, approved_today: 0, total_rsd_today: 0 });
  const [feedback,      setFeedback]      = useState('');
  const [verifs,        setVerifs]        = useState<VerifRecord[]>([]);
  const [verifLoading,  setVerifLoading]  = useState(false);
  const [verifActionId, setVerifActionId] = useState<string | null>(null);
  const [verifRejectId, setVerifRejectId] = useState<string | null>(null);
  const [verifRejectNote, setVerifRejectNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_credit_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setFeedback('❌ Could not load orders. Make sure you ran 010_credit_orders.sql');
      setLoading(false);
      return;
    }

    const all = (data as Order[]) ?? [];
    setOrders(all);

    const today = new Date().toDateString();
    const approvedToday = all.filter(o =>
      o.status === 'approved' && o.approved_at && new Date(o.approved_at).toDateString() === today
    );
    setStats({
      pending: all.filter(o => o.status === 'pending').length,
      approved_today: approvedToday.length,
      total_rsd_today: approvedToday.reduce((s, o) => s + o.amount_rsd, 0),
    });

    setLoading(false);
  }, []);

  const loadVerifs = useCallback(async () => {
    setVerifLoading(true);
    const { data, error } = await supabase.rpc('get_pending_verifications');
    if (error) {
      setFeedback('❌ Could not load verifications: ' + error.message);
    } else {
      setVerifs((data as VerifRecord[]) ?? []);
    }
    setVerifLoading(false);
  }, []);

  const handleApproveVerif = async (v: VerifRecord) => {
    setVerifActionId(v.user_id);
    const { error } = await supabase.rpc('admin_approve_verification', { p_user_id: v.user_id });
    setVerifActionId(null);
    if (error) {
      setFeedback(`❌ Error: ${error.message}`);
    } else {
      setFeedback(`✅ Verified! ${v.full_name}'s identity approved.`);
      await loadVerifs();
    }
  };

  const handleRejectVerif = async () => {
    if (!verifRejectId) return;
    setVerifActionId(verifRejectId);
    const { error } = await supabase.rpc('admin_reject_verification', {
      p_user_id: verifRejectId,
      p_reason: verifRejectNote.trim() || 'Documents not accepted',
    });
    setVerifActionId(null);
    setVerifRejectId(null);
    setVerifRejectNote('');
    if (error) {
      setFeedback(`❌ Error: ${error.message}`);
    } else {
      setFeedback('✓ Verification rejected.');
      await loadVerifs();
    }
  };

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  useEffect(() => {
    if (authed && section === 'verifications') loadVerifs();
  }, [authed, section, loadVerifs]);

  const handleLogin = () => {
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true);
    } else {
      setPwError('Wrong password');
      setPw('');
    }
  };

  const handleApprove = async (order: Order) => {
    setActionId(order.id);
    const { data, error } = await supabase.rpc('approve_credit_order', { order_id: order.id });
    setActionId(null);
    if (error || !(data as { ok?: boolean })?.ok) {
      setFeedback(`❌ Error: ${error?.message ?? (data as { error?: string })?.error ?? 'Unknown error'}`);
    } else {
      setFeedback(`✅ Approved! ${order.credits} credits added to ${order.full_name}`);
    }
    await load();
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setActionId(rejectId);
    const { data, error } = await supabase.rpc('reject_credit_order', {
      order_id: rejectId,
      reason: rejectNote.trim() || 'Payment not received',
    });
    setActionId(null);
    setRejectId(null);
    setRejectNote('');
    if (error || !(data as { ok?: boolean })?.ok) {
      setFeedback(`❌ Error: ${error?.message ?? 'Unknown error'}`);
    } else {
      setFeedback('✓ Order rejected and user notified.');
    }
    await load();
  };

  const visible = tab === 'pending'
    ? orders.filter(o => o.status === 'pending')
    : orders;

  // ── Login screen ───────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', padding: 24,
      }}>
        <div style={{
          width: 360, background: 'var(--bg-el)', border: '1.5px solid var(--border)',
          borderRadius: 'var(--r-xl)', padding: 32,
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8, display: 'flex', justifyContent: 'center' }}><Lock size={36} strokeWidth={1.75} /></div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>Handoo Admin</div>
            <div style={{ fontSize: '.875rem', color: 'var(--tx-2)', marginTop: 4 }}>Credit order management</div>
          </div>
          <div className="fld" style={{ marginBottom: 16 }}>
            <label className="flb">Admin password</label>
            <input
              className="inp" type="password" placeholder="Enter password"
              value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            {pwError && <div style={{ fontSize: '.8125rem', color: 'var(--err)', marginTop: 4 }}>{pwError}</div>}
          </div>
          <button className="btn btn-p btn-fw btn-lg" onClick={handleLogin}>Sign in</button>
          <button className="btn btn-g btn-fw" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }} onClick={onExit}><ChevronLeft size={16} strokeWidth={1.75} /> Back to app</button>
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--bg-ov)', borderRadius: 'var(--r)', fontSize: '.75rem', color: 'var(--tx-3)' }}>
            Set <code>VITE_ADMIN_PASSWORD</code> in .env.local to change the default password.
          </div>
        </div>
      </div>
    );
  }

  // ── Admin panel ────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px var(--pad)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.025em', margin: 0 }}>
              Handoo Admin
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-s btn-sm" onClick={section === 'orders' ? load : loadVerifs} disabled={loading || verifLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {(loading || verifLoading) ? <span className="spin" style={{ width: 14, height: 14 }} /> : <><RefreshCw size={14} strokeWidth={1.75} /> Refresh</>}
            </button>
            <button className="btn btn-g btn-sm" onClick={onExit} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ChevronLeft size={14} strokeWidth={1.75} /> App</button>
          </div>
        </div>

        {/* Section switcher */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={`tab${section === 'orders' ? ' on' : ''}`} onClick={() => setSection('orders')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Coins size={14} strokeWidth={1.75} /> Credit Orders
            {stats.pending > 0 && <span className="bdg bdg-warn">{stats.pending}</span>}
          </button>
          <button className={`tab${section === 'verifications' ? ' on' : ''}`} onClick={() => setSection('verifications')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} strokeWidth={1.75} /> Verifications
            {verifs.length > 0 && <span className="bdg bdg-warn">{verifs.length}</span>}
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--r)', marginBottom: 16, fontSize: '.875rem', fontWeight: 600,
            background: feedback.startsWith('❌') ? 'var(--err-s)' : 'var(--ok-s)',
            border: `1px solid ${feedback.startsWith('❌') ? 'rgba(239,68,68,.3)' : 'rgba(34,197,94,.3)'}`,
            color: feedback.startsWith('❌') ? 'var(--err)' : 'var(--ok)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {feedback}
            <button onClick={() => setFeedback('')} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', display: 'inline-flex', alignItems: 'center' }}><X size={16} strokeWidth={1.75} /></button>
          </div>
        )}

        {/* ── CREDIT ORDERS ─────────────────────────────── */}
        {section === 'orders' && (<>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {([
            { label: 'Pending orders', val: stats.pending, color: 'var(--warn)', icon: <Hourglass size={14} strokeWidth={1.75} /> },
            { label: 'Approved today', val: stats.approved_today, color: 'var(--ok)', icon: <Check size={14} strokeWidth={1.75} /> },
            { label: 'RSD today', val: `${stats.total_rsd_today.toLocaleString()} RSD`, color: 'var(--brand)', icon: <Banknote size={14} strokeWidth={1.75} /> },
          ] as { label: string; val: string | number; color: string; icon: React.ReactNode }[]).map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-el)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--r-lg)', padding: '16px 20px',
            }}>
              <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                {s.icon} {s.label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab${tab === 'pending' ? ' on' : ''}`} onClick={() => setTab('pending')}>
            Pending
            {stats.pending > 0 && <span className="bdg bdg-warn" style={{ marginLeft: 6 }}>{stats.pending}</span>}
          </button>
          <button className={`tab${tab === 'all' ? ' on' : ''}`} onClick={() => setTab('all')}>
            All Orders ({orders.length})
          </button>
        </div>

        {/* SQL hint */}
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg-el)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: '.75rem', color: 'var(--tx-3)' }}>
          <Info size={14} strokeWidth={1.75} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> You can also approve via SQL: <code style={{ color: 'var(--tx-2)' }}>SELECT approve_credit_order('ORDER_ID');</code>
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="loading"><span className="spin" />Loading orders...</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <span className="empty-ic">{tab === 'pending' ? <PartyPopper size={32} strokeWidth={1.5} /> : <ClipboardList size={32} strokeWidth={1.5} />}</span>
            <span className="empty-t">{tab === 'pending' ? 'No pending orders!' : 'No orders yet'}</span>
            <span className="empty-s">{tab === 'pending' ? 'All transfers have been processed.' : 'Orders will appear here when users initiate bank transfers.'}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visible.map(order => (
              <div key={order.id} style={{
                background: 'var(--bg-el)', border: '1.5px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '16px 20px',
                borderLeft: `4px solid ${order.status === 'approved' ? 'var(--ok)' : order.status === 'rejected' ? 'var(--err)' : 'var(--warn)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {/* User info */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--brand-grad)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.875rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                      }}>
                        {order.full_name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '.9375rem' }}>{order.full_name}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>{order.email}</div>
                      </div>
                    </div>

                    {/* Order details */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Credits</div>
                        <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--brand)' }}>{order.credits}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Amount</div>
                        <div style={{ fontWeight: 700 }}>{order.amount_rsd.toLocaleString()} RSD</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Reference</div>
                        <code style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--tx)' }}>{order.reference}</code>
                      </div>
                      <div>
                        <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Submitted</div>
                        <div style={{ fontSize: '.875rem' }}>{timeAgo(order.created_at)}</div>
                      </div>
                    </div>

                    {order.admin_note && (
                      <div style={{ marginTop: 8, fontSize: '.8125rem', color: 'var(--err)', fontStyle: 'italic' }}>
                        Note: {order.admin_note}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                    <span className={`bdg ${order.status === 'approved' ? 'bdg-ok' : order.status === 'rejected' ? 'bdg-rej' : 'bdg-warn'}`}>
                      {order.status === 'approved'
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={11} strokeWidth={2} /> Approved</span>
                        : order.status === 'rejected' ? 'Rejected'
                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Hourglass size={11} strokeWidth={1.75} /> Pending</span>
                      }
                    </span>

                    {order.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-d btn-sm"
                          onClick={() => { setRejectId(order.id); setRejectNote(''); }}
                          disabled={actionId === order.id}
                        >
                          Reject
                        </button>
                        <button
                          className="btn btn-ok btn-sm"
                          onClick={() => handleApprove(order)}
                          disabled={actionId === order.id}
                        >
                          {actionId === order.id ? '...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={14} strokeWidth={2} /> Approve</span>}
                        </button>
                      </div>
                    )}

                    {order.status === 'approved' && order.approved_at && (
                      <div style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>
                        Approved {timeAgo(order.approved_at)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reject reason input */}
                {rejectId === order.id && (
                  <div style={{
                    marginTop: 14, padding: '14px', background: 'var(--err-s)',
                    border: '1px solid rgba(239,68,68,.2)', borderRadius: 'var(--r)',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--err)', marginBottom: 8 }}>
                      Reject order — reason (optional)
                    </div>
                    <input
                      className="inp"
                      placeholder="Payment not received, wrong amount, etc."
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      style={{ marginBottom: 10 }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-s btn-sm" onClick={() => setRejectId(null)}>Cancel</button>
                      <button
                        className="btn btn-d btn-sm"
                        onClick={handleReject}
                        disabled={actionId === order.id}
                      >
                        {actionId === order.id ? '...' : 'Confirm Reject'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        </>)}

        {/* ── VERIFICATIONS ─────────────────────────────── */}
        {section === 'verifications' && (
          verifLoading ? (
            <div className="loading"><span className="spin" />Loading verifications...</div>
          ) : verifs.length === 0 ? (
            <div className="empty">
              <span className="empty-ic"><ShieldCheck size={32} strokeWidth={1.5} /></span>
              <span className="empty-t">No pending verifications</span>
              <span className="empty-s">All ID submissions have been reviewed.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {verifs.map(v => (
                <div key={v.user_id} style={{
                  background: 'var(--bg-el)', border: '1.5px solid var(--border)',
                  borderRadius: 'var(--r-lg)', padding: '16px 20px',
                  borderLeft: '4px solid var(--warn)',
                }}>
                  {/* User info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', background: 'var(--brand-grad)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '.9375rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                      }}>
                        {v.full_name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '.9375rem' }}>{v.full_name}</div>
                        <div style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>{v.email}</div>
                        {v.phone && <div style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>{v.phone}</div>}
                        <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', marginTop: 2 }}>Submitted {timeAgo(v.submitted_at)}</div>
                      </div>
                    </div>
                    <span className="bdg bdg-warn" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Hourglass size={11} strokeWidth={1.75} /> Pending
                    </span>
                  </div>

                  {/* Document images */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                    {[
                      { label: 'ID Document (Front)', url: v.id_document_url },
                      { label: 'Selfie / Back', url: v.selfie_url },
                    ].map(doc => (
                      <div key={doc.label} style={{ flex: '1 1 200px', minWidth: 180 }}>
                        <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{doc.label}</div>
                        {doc.url ? (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', position: 'relative' }}>
                            <img
                              src={doc.url}
                              alt={doc.label}
                              style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 'var(--r)', border: '1px solid var(--border)', display: 'block' }}
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.5)', borderRadius: 4, padding: '2px 5px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <ExternalLink size={10} strokeWidth={2} color="#fff" />
                            </div>
                          </a>
                        ) : (
                          <div style={{ height: 140, borderRadius: 'var(--r)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx-3)', fontSize: '.8125rem' }}>
                            No file
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-d btn-sm"
                      onClick={() => { setVerifRejectId(v.user_id); setVerifRejectNote(''); }}
                      disabled={verifActionId === v.user_id}
                    >
                      Reject
                    </button>
                    <button
                      className="btn btn-ok btn-sm"
                      onClick={() => handleApproveVerif(v)}
                      disabled={verifActionId === v.user_id}
                    >
                      {verifActionId === v.user_id ? '...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={14} strokeWidth={2} /> Approve & Verify</span>}
                    </button>
                  </div>

                  {/* Reject reason */}
                  {verifRejectId === v.user_id && (
                    <div style={{ marginTop: 14, padding: 14, background: 'var(--err-s)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 'var(--r)' }}>
                      <div style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--err)', marginBottom: 8 }}>
                        Reject verification — reason (sent to user)
                      </div>
                      <input
                        className="inp"
                        placeholder="ID not clear, wrong document, photo mismatch, etc."
                        value={verifRejectNote}
                        onChange={e => setVerifRejectNote(e.target.value)}
                        style={{ marginBottom: 10 }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-s btn-sm" onClick={() => setVerifRejectId(null)}>Cancel</button>
                        <button className="btn btn-d btn-sm" onClick={handleRejectVerif} disabled={verifActionId === v.user_id}>
                          {verifActionId === v.user_id ? '...' : 'Confirm Reject'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </div>
  );
}
