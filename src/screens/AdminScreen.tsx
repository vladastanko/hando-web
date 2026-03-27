import { useState, useEffect, useCallback } from 'react';
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

export default function AdminScreen({ onExit }: { onExit: () => void }) {
  const [authed,      setAuthed]      = useState(false);
  const [pw,          setPw]          = useState('');
  const [pwError,     setPwError]     = useState('');
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [actionId,    setActionId]    = useState<string | null>(null);
  const [rejectId,    setRejectId]    = useState<string | null>(null);
  const [rejectNote,  setRejectNote]  = useState('');
  const [tab,         setTab]         = useState<'pending' | 'all'>('pending');
  const [stats,       setStats]       = useState<Stats>({ pending: 0, approved_today: 0, total_rsd_today: 0 });
  const [feedback,    setFeedback]    = useState('');

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

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

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
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔐</div>
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
          <button className="btn btn-g btn-fw" style={{ marginTop: 8 }} onClick={onExit}>← Back to app</button>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.025em', margin: 0 }}>
              🪙 Credit Orders
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--tx-2)', fontSize: '.875rem' }}>
              Approve bank transfers to add credits to user accounts
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-s btn-sm" onClick={load} disabled={loading}>
              {loading ? <span className="spin" style={{ width: 14, height: 14 }} /> : '↻ Refresh'}
            </button>
            <button className="btn btn-g btn-sm" onClick={onExit}>← App</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Pending orders', val: stats.pending, color: 'var(--warn)', icon: '⏳' },
            { label: 'Approved today', val: stats.approved_today, color: 'var(--ok)', icon: '✅' },
            { label: 'RSD today', val: `${stats.total_rsd_today.toLocaleString()} RSD`, color: 'var(--brand)', icon: '💰' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-el)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--r-lg)', padding: '16px 20px',
            }}>
              <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                {s.icon} {s.label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.val}</div>
            </div>
          ))}
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
            <button onClick={() => setFeedback('')} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', fontSize: '1rem' }}>✕</button>
          </div>
        )}

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
          💡 You can also approve via SQL: <code style={{ color: 'var(--tx-2)' }}>SELECT approve_credit_order('ORDER_ID');</code>
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="loading"><span className="spin" />Loading orders...</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <span className="empty-ic">{tab === 'pending' ? '🎉' : '📋'}</span>
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
                      {order.status === 'approved' ? '✓ Approved' : order.status === 'rejected' ? 'Rejected' : '⏳ Pending'}
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
                          {actionId === order.id ? '...' : '✓ Approve'}
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

      </div>
    </div>
  );
}
