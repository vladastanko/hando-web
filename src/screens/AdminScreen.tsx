import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, ShieldCheck, Coins, MessageSquare, ChevronLeft, RefreshCw,
  Check, X, Hourglass, ExternalLink, Send, AlertTriangle, Users, Menu,
  CheckCircle, Clock, XCircle, ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { timeAgo } from '../utils/format';
import type { Profile, SupportTicket, SupportMessage } from '../types/index';

// ── Types ─────────────────────────────────────────────────────
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

interface CreditOrder {
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

interface DashStats {
  total_users: number;
  pending_verifs: number;
  pending_credits: number;
  open_tickets: number;
}

type Section = 'dashboard' | 'verifications' | 'credits' | 'support';

// ── Props ─────────────────────────────────────────────────────
interface Props {
  onExit: () => void;
  userId: string;
  userProfile: Profile;
}

// ── Helpers ───────────────────────────────────────────────────
function Badge({ n, color = 'warn' }: { n: number; color?: string }) {
  if (n === 0) return null;
  return (
    <span className={`bdg bdg-${color}`} style={{ marginLeft: 6, fontSize: '.625rem', padding: '1px 5px' }}>{n}</span>
  );
}

function Feedback({ msg, onClear }: { msg: string; onClear: () => void }) {
  if (!msg) return null;
  const isErr = msg.startsWith('❌');
  return (
    <div style={{
      padding: '11px 14px', borderRadius: 'var(--r)', marginBottom: 16,
      fontSize: '.875rem', fontWeight: 600,
      background: isErr ? 'var(--err-s)' : 'var(--ok-s)',
      border: `1px solid ${isErr ? 'rgba(239,68,68,.3)' : 'rgba(34,197,94,.3)'}`,
      color: isErr ? 'var(--err)' : 'var(--ok)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      {msg}
      <button onClick={onClear} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', display: 'inline-flex' }}><X size={15} strokeWidth={2} /></button>
    </div>
  );
}

// ── Send notification email via Edge Function ─────────────────
async function sendNotifEmail(to: string, subject: string, html: string) {
  try {
    await supabase.functions.invoke('send-notification-email', {
      body: { to, subject, html },
    });
  } catch {
    // non-critical, log only
    console.warn('[admin] Email send failed');
  }
}

// ── Main AdminScreen ──────────────────────────────────────────
export default function AdminScreen({ onExit, userId, userProfile }: Props) {
  const [section, setSection] = useState<Section>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Dashboard
  const [stats, setStats] = useState<DashStats>({ total_users: 0, pending_verifs: 0, pending_credits: 0, open_tickets: 0 });

  // Verifications
  const [verifs, setVerifs] = useState<VerifRecord[]>([]);
  const [verifFilter, setVerifFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [verifLoading, setVerifLoading] = useState(false);
  const [verifActionId, setVerifActionId] = useState<string | null>(null);
  const [verifRejectId, setVerifRejectId] = useState<string | null>(null);
  const [verifRejectNote, setVerifRejectNote] = useState('');

  // Credits
  const [orders, setOrders] = useState<CreditOrder[]>([]);
  const [ordersFilter, setOrdersFilter] = useState<'pending' | 'all'>('pending');
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderActionId, setOrderActionId] = useState<string | null>(null);
  const [orderRejectId, setOrderRejectId] = useState<string | null>(null);
  const [orderRejectNote, setOrderRejectNote] = useState('');

  // Support
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Loaders ───────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    const { data } = await supabase.rpc('get_admin_stats');
    if (data) setStats(data as DashStats);
  }, []);

  const loadVerifs = useCallback(async () => {
    setVerifLoading(true);
    const { data, error } = await supabase.rpc('get_pending_verifications');
    if (error) setFeedback('❌ ' + error.message);
    else setVerifs((data as VerifRecord[]) ?? []);
    setVerifLoading(false);
  }, []);

  const loadAllVerifs = useCallback(async () => {
    setVerifLoading(true);
    const { data, error } = await supabase
      .from('verifications')
      .select('user_id, id_document_url, selfie_url, status, submitted_at')
      .order('submitted_at', { ascending: false });
    if (error) { setFeedback('❌ ' + error.message); setVerifLoading(false); return; }
    // Enrich with profile data
    const enriched: VerifRecord[] = await Promise.all((data ?? []).map(async (v) => {
      const { data: p } = await supabase.from('profiles').select('full_name, phone').eq('id', v.user_id).single();
      const { data: u } = await supabase.auth.admin?.getUserById?.(v.user_id).catch(() => ({ data: { user: null } })) ?? { data: { user: null } };
      return { ...v, full_name: p?.full_name ?? '?', email: (u as { user?: { email?: string } })?.user?.email ?? '', phone: p?.phone ?? null, status: v.status ?? '' };
    }));
    setVerifs(enriched);
    setVerifLoading(false);
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    const { data, error } = await supabase
      .from('admin_credit_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setFeedback('❌ ' + error.message);
    else setOrders((data as CreditOrder[]) ?? []);
    setOrdersLoading(false);
  }, []);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*, user:profiles!support_tickets_user_id_fkey(full_name, avatar_url)')
      .order('updated_at', { ascending: false });
    if (error) setFeedback('❌ ' + error.message);
    else setTickets((data as SupportTicket[]) ?? []);
    setTicketsLoading(false);
  }, []);

  const loadMessages = useCallback(async (ticketId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setMessages((data as SupportMessage[]) ?? []);
  }, []);

  // Initial load
  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (section === 'verifications') {
      if (verifFilter === 'pending') loadVerifs();
      else loadAllVerifs();
    }
    if (section === 'credits') loadOrders();
    if (section === 'support') loadTickets();
  }, [section, verifFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedTicket) loadMessages(selectedTicket.id);
  }, [selectedTicket, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time support messages
  useEffect(() => {
    if (!selectedTicket) return;
    const ch = supabase.channel(`admin-ticket-${selectedTicket.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${selectedTicket.id}` },
        (payload) => { setMessages(prev => [...prev, payload.new as SupportMessage]); }
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedTicket]);

  // ── Verification actions ──────────────────────────────────
  const handleApproveVerif = async (v: VerifRecord) => {
    setVerifActionId(v.user_id);
    const { error } = await supabase.rpc('admin_approve_verification', { p_user_id: v.user_id });
    setVerifActionId(null);
    if (error) { setFeedback('❌ ' + error.message); return; }
    setFeedback(`✅ ${v.full_name} verified.`);
    await sendNotifEmail(v.email, 'Vaša verifikacija je odobrena — Hando',
      `<div style="font-family:sans-serif;max-width:500px"><h2>Verifikacija odobrena</h2><p>Poštovani/a <strong>${v.full_name}</strong>,</p><p>Vaš identitet je uspešno verifikovan. Sada možete koristiti Hando sa punim pristupom.</p><p style="margin-top:24px;color:#666">Tim Hando</p></div>`
    );
    loadVerifs(); loadStats();
  };

  const handleRejectVerif = async () => {
    if (!verifRejectId) return;
    const v = verifs.find(x => x.user_id === verifRejectId);
    setVerifActionId(verifRejectId);
    const reason = verifRejectNote.trim() || 'Dokumenta nisu prihvaćena.';
    const { error } = await supabase.rpc('admin_reject_verification', { p_user_id: verifRejectId, p_reason: reason });
    setVerifActionId(null);
    setVerifRejectId(null);
    setVerifRejectNote('');
    if (error) { setFeedback('❌ ' + error.message); return; }
    setFeedback('✓ Verification rejected.');
    if (v) {
      await sendNotifEmail(v.email, 'Vaša verifikacija je odbijena — Hando',
        `<div style="font-family:sans-serif;max-width:500px"><h2>Verifikacija odbijena</h2><p>Poštovani/a <strong>${v.full_name}</strong>,</p><p>Nažalost, vaša verifikacija nije odobrena.</p><p><strong>Razlog:</strong> ${reason}</p><p>Možete ponovo podneti dokumenta u aplikaciji.</p><p style="margin-top:24px;color:#666">Tim Hando</p></div>`
      );
    }
    loadVerifs(); loadStats();
  };

  // ── Credit order actions ──────────────────────────────────
  const handleApproveOrder = async (order: CreditOrder) => {
    setOrderActionId(order.id);
    const { data, error } = await supabase.rpc('approve_credit_order', { order_id: order.id });
    setOrderActionId(null);
    if (error || !(data as { ok?: boolean })?.ok) {
      setFeedback(`❌ ${error?.message ?? (data as { error?: string })?.error ?? 'Error'}`);
      return;
    }
    setFeedback(`✅ ${order.credits} credits added to ${order.full_name}.`);
    loadOrders(); loadStats();
  };

  const handleRejectOrder = async () => {
    if (!orderRejectId) return;
    setOrderActionId(orderRejectId);
    const { data, error } = await supabase.rpc('reject_credit_order', {
      order_id: orderRejectId,
      reason: orderRejectNote.trim() || 'Payment not received',
    });
    setOrderActionId(null);
    setOrderRejectId(null);
    setOrderRejectNote('');
    if (error || !(data as { ok?: boolean })?.ok) {
      setFeedback('❌ Error');
      return;
    }
    setFeedback('✓ Order rejected.');
    loadOrders(); loadStats();
  };

  // ── Support actions ───────────────────────────────────────
  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setReplying(true);
    const { error } = await supabase.from('support_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: userId,
      message: replyText.trim(),
      is_admin: true,
    });
    if (!error) {
      await supabase.from('support_tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', selectedTicket.id);
      setReplyText('');
      loadMessages(selectedTicket.id);
      loadTickets();
    }
    setReplying(false);
  };

  const handleTicketStatus = async (status: SupportTicket['status']) => {
    if (!selectedTicket) return;
    setStatusChanging(true);
    await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', selectedTicket.id);
    setSelectedTicket(prev => prev ? { ...prev, status } : null);
    setStatusChanging(false);
    loadTickets();
  };

  // ── Sidebar ───────────────────────────────────────────────
  const navItems: { key: Section; label: string; icon: React.ReactNode; badge: number }[] = [
    { key: 'dashboard',     label: 'Dashboard',     icon: <LayoutDashboard size={18} strokeWidth={1.75} />, badge: 0 },
    { key: 'verifications', label: 'Verifications',  icon: <ShieldCheck size={18} strokeWidth={1.75} />,    badge: stats.pending_verifs },
    { key: 'credits',       label: 'Credit Requests',icon: <Coins size={18} strokeWidth={1.75} />,          badge: stats.pending_credits },
    { key: 'support',       label: 'Support',        icon: <MessageSquare size={18} strokeWidth={1.75} />,  badge: stats.open_tickets },
  ];

  const sidebar = (
    <nav style={{
      width: 220, flexShrink: 0, background: 'var(--bg-el)', borderRight: '1.5px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '20px 0',
    }}>
      <div style={{ padding: '0 16px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-.02em' }}>Hando Admin</div>
        <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', marginTop: 2 }}>{userProfile.email ?? userProfile.full_name}</div>
      </div>

      {navItems.map(item => (
        <button key={item.key} onClick={() => { setSection(item.key); setSidebarOpen(false); }} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', margin: '1px 8px', borderRadius: 'var(--r)',
          background: section === item.key ? 'var(--brand-dim, rgba(99,87,255,.12))' : 'transparent',
          color: section === item.key ? 'var(--brand)' : 'var(--tx-2)',
          fontWeight: section === item.key ? 700 : 500,
          border: 0, cursor: 'pointer', fontSize: '.9rem', textAlign: 'left', width: 'calc(100% - 16px)',
        }}>
          {item.icon}
          <span style={{ flex: 1 }}>{item.label}</span>
          <Badge n={item.badge} />
        </button>
      ))}

      <div style={{ marginTop: 'auto', padding: '16px 16px 0', borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-g btn-fw btn-sm" onClick={onExit} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          <ChevronLeft size={14} strokeWidth={1.75} /> Back to app
        </button>
      </div>
    </nav>
  );

  // ── Filtered verif/orders ─────────────────────────────────
  const filteredVerifs = verifs.filter(v => {
    if (verifFilter === 'pending') return v.status === 'pending';
    if (verifFilter === 'approved') return v.status === 'verified';
    return v.status === 'rejected';
  });

  const filteredOrders = ordersFilter === 'pending'
    ? orders.filter(o => o.status === 'pending')
    : orders;

  const statusIcon = (s: SupportTicket['status']) => {
    if (s === 'open') return <CheckCircle size={13} style={{ color: 'var(--brand)' }} />;
    if (s === 'in_progress') return <Clock size={13} style={{ color: 'var(--warn)' }} />;
    if (s === 'resolved') return <Check size={13} style={{ color: 'var(--ok)' }} />;
    return <XCircle size={13} style={{ color: 'var(--tx-3)' }} />;
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Sidebar — desktop */}
      <div style={{ display: 'none' }} className="admin-sidebar-desktop">{sidebar}</div>
      <style>{`.admin-sidebar-desktop{display:flex!important}@media(max-width:768px){.admin-sidebar-desktop{display:none!important}}`}</style>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 220 }}>{sidebar}</div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'auto' }}>

        {/* Mobile top bar */}
        <div style={{ display: 'none' }} className="admin-topbar">
          <style>{`.admin-topbar{display:flex!important;padding:12px 16px;border-bottom:1.5px solid var(--border);background:var(--bg-el);align-items:center;gap:12px;position:sticky;top:0;z-index:100}@media(min-width:769px){.admin-topbar{display:none!important}}`}</style>
          <button className="btn btn-g btn-sm" onClick={() => setSidebarOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Menu size={16} strokeWidth={1.75} />
          </button>
          <div style={{ fontWeight: 700, fontSize: '.9375rem' }}>
            {navItems.find(n => n.key === section)?.label ?? 'Admin'}
          </div>
          <button className="btn btn-g btn-sm" onClick={onExit} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} strokeWidth={1.75} /> App
          </button>
        </div>

        <div style={{ padding: '28px var(--pad)', maxWidth: 960, width: '100%', margin: '0 auto' }}>

          <Feedback msg={feedback} onClear={() => setFeedback('')} />

          {/* ── DASHBOARD ────────────────────────────────── */}
          {section === 'dashboard' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Dashboard</h1>
                <button className="btn btn-s btn-sm" onClick={loadStats} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={13} strokeWidth={1.75} /> Refresh
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 32 }}>
                {[
                  { label: 'Total Users', val: stats.total_users, icon: <Users size={18} strokeWidth={1.75} />, color: 'var(--brand)' },
                  { label: 'Pending Verifications', val: stats.pending_verifs, icon: <ShieldCheck size={18} strokeWidth={1.75} />, color: 'var(--warn)', action: () => setSection('verifications') },
                  { label: 'Pending Credit Requests', val: stats.pending_credits, icon: <Coins size={18} strokeWidth={1.75} />, color: '#22c55e', action: () => setSection('credits') },
                  { label: 'Open Support Tickets', val: stats.open_tickets, icon: <MessageSquare size={18} strokeWidth={1.75} />, color: '#3b82f6', action: () => setSection('support') },
                ].map(s => (
                  <div key={s.label}
                    onClick={s.action}
                    style={{
                      background: 'var(--bg-el)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)',
                      padding: '18px 20px', cursor: s.action ? 'pointer' : 'default',
                    }}
                    onMouseEnter={e => s.action && (e.currentTarget.style.borderColor = 'var(--border-hi)')}
                    onMouseLeave={e => s.action && (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ color: s.color, marginBottom: 10 }}>{s.icon}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--tx-3)', marginTop: 4 }}>{s.label}</div>
                    {s.action && <div style={{ fontSize: '.75rem', color: 'var(--brand)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 3 }}>View <ChevronRight size={12} /></div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── VERIFICATIONS ────────────────────────────── */}
          {section === 'verifications' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Verifications</h1>
                <button className="btn btn-s btn-sm" onClick={() => verifFilter === 'pending' ? loadVerifs() : loadAllVerifs()} disabled={verifLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {verifLoading ? <span className="spin" style={{ width: 13, height: 13 }} /> : <><RefreshCw size={13} strokeWidth={1.75} /> Refresh</>}
                </button>
              </div>

              <div className="tabs" style={{ marginBottom: 16 }}>
                {(['pending', 'approved', 'rejected'] as const).map(f => (
                  <button key={f} className={`tab${verifFilter === f ? ' on' : ''}`} onClick={() => setVerifFilter(f)}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f === 'pending' && stats.pending_verifs > 0 && <Badge n={stats.pending_verifs} />}
                  </button>
                ))}
              </div>

              {verifLoading ? (
                <div className="loading"><span className="spin" />Loading...</div>
              ) : filteredVerifs.length === 0 ? (
                <div className="empty">
                  <span className="empty-ic"><ShieldCheck size={32} strokeWidth={1.5} /></span>
                  <span className="empty-t">No {verifFilter} verifications</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredVerifs.map(v => (
                    <div key={v.user_id} style={{
                      background: 'var(--bg-el)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 20px',
                      borderLeft: `4px solid ${v.status === 'pending' ? 'var(--warn)' : v.status === 'verified' ? 'var(--ok)' : 'var(--err)'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--brand-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                            {v.full_name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{v.full_name}</div>
                            <div style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>{v.email}</div>
                            {v.phone && <div style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>{v.phone}</div>}
                            <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', marginTop: 2 }}>Submitted {timeAgo(v.submitted_at)}</div>
                          </div>
                        </div>
                        <span className={`bdg ${v.status === 'pending' ? 'bdg-warn' : v.status === 'verified' ? 'bdg-ok' : 'bdg-rej'}`}>
                          {v.status === 'pending' ? <><Hourglass size={10} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />Pending</> : v.status === 'verified' ? 'Verified' : 'Rejected'}
                        </span>
                      </div>

                      {/* Document images */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: v.status === 'pending' ? 14 : 0, flexWrap: 'wrap' }}>
                        {[{ label: 'ID Document', url: v.id_document_url }, { label: 'Selfie / Back', url: v.selfie_url }].map(doc => (
                          <div key={doc.label} style={{ flex: '1 1 180px', minWidth: 160 }}>
                            <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>{doc.label}</div>
                            {doc.url ? (
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', position: 'relative' }}>
                                <img src={doc.url} alt={doc.label} style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 'var(--r)', border: '1px solid var(--border)', display: 'block' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                <div style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,.5)', borderRadius: 4, padding: '2px 4px', display: 'inline-flex' }}>
                                  <ExternalLink size={10} strokeWidth={2} color="#fff" />
                                </div>
                              </a>
                            ) : (
                              <div style={{ height: 130, borderRadius: 'var(--r)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx-3)', fontSize: '.8125rem' }}>No file</div>
                            )}
                          </div>
                        ))}
                      </div>

                      {v.status === 'pending' && (
                        <>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-d btn-sm" onClick={() => { setVerifRejectId(v.user_id); setVerifRejectNote(''); }} disabled={verifActionId === v.user_id}>Reject</button>
                            <button className="btn btn-ok btn-sm" onClick={() => handleApproveVerif(v)} disabled={verifActionId === v.user_id}>
                              {verifActionId === v.user_id ? '...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={13} strokeWidth={2} /> Approve & Verify</span>}
                            </button>
                          </div>
                          {verifRejectId === v.user_id && (
                            <div style={{ marginTop: 12, padding: 14, background: 'var(--err-s)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 'var(--r)' }}>
                              <div style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--err)', marginBottom: 8 }}>Rejection reason (sent to user)</div>
                              <input className="inp" placeholder="ID not clear, wrong document, etc." value={verifRejectNote} onChange={e => setVerifRejectNote(e.target.value)} style={{ marginBottom: 10 }} autoFocus />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-s btn-sm" onClick={() => setVerifRejectId(null)}>Cancel</button>
                                <button className="btn btn-d btn-sm" onClick={handleRejectVerif} disabled={verifActionId === v.user_id}>{verifActionId === v.user_id ? '...' : 'Confirm Reject'}</button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── CREDIT REQUESTS ──────────────────────────── */}
          {section === 'credits' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Credit Requests</h1>
                <button className="btn btn-s btn-sm" onClick={loadOrders} disabled={ordersLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {ordersLoading ? <span className="spin" style={{ width: 13, height: 13 }} /> : <><RefreshCw size={13} strokeWidth={1.75} /> Refresh</>}
                </button>
              </div>
              <div className="tabs" style={{ marginBottom: 16 }}>
                <button className={`tab${ordersFilter === 'pending' ? ' on' : ''}`} onClick={() => setOrdersFilter('pending')}>
                  Pending {stats.pending_credits > 0 && <Badge n={stats.pending_credits} />}
                </button>
                <button className={`tab${ordersFilter === 'all' ? ' on' : ''}`} onClick={() => setOrdersFilter('all')}>
                  All ({orders.length})
                </button>
              </div>

              {ordersLoading ? (
                <div className="loading"><span className="spin" />Loading...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="empty">
                  <span className="empty-ic"><Coins size={32} strokeWidth={1.5} /></span>
                  <span className="empty-t">{ordersFilter === 'pending' ? 'No pending requests' : 'No requests yet'}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredOrders.map(order => (
                    <div key={order.id} style={{
                      background: 'var(--bg-el)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 20px',
                      borderLeft: `4px solid ${order.status === 'approved' ? 'var(--ok)' : order.status === 'rejected' ? 'var(--err)' : 'var(--warn)'}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.875rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                              {order.full_name?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{order.full_name}</div>
                              <div style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>{order.email}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <div><div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Credits</div><div style={{ fontWeight: 800, color: 'var(--brand)' }}>{order.credits}</div></div>
                            <div><div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Amount</div><div style={{ fontWeight: 700 }}>{order.amount_rsd.toLocaleString()} RSD</div></div>
                            <div><div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Reference</div><code style={{ fontWeight: 700, fontSize: '.875rem' }}>{order.reference}</code></div>
                            <div><div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Submitted</div><div style={{ fontSize: '.875rem' }}>{timeAgo(order.created_at)}</div></div>
                          </div>
                          {order.admin_note && <div style={{ marginTop: 8, fontSize: '.8125rem', color: 'var(--err)', fontStyle: 'italic' }}>Note: {order.admin_note}</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                          <span className={`bdg ${order.status === 'approved' ? 'bdg-ok' : order.status === 'rejected' ? 'bdg-rej' : 'bdg-warn'}`}>
                            {order.status === 'approved' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={10} strokeWidth={2} />Approved</span> : order.status === 'rejected' ? 'Rejected' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Hourglass size={10} strokeWidth={2} />Pending</span>}
                          </span>
                          {order.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-d btn-sm" onClick={() => { setOrderRejectId(order.id); setOrderRejectNote(''); }} disabled={orderActionId === order.id}>Reject</button>
                              <button className="btn btn-ok btn-sm" onClick={() => handleApproveOrder(order)} disabled={orderActionId === order.id}>
                                {orderActionId === order.id ? '...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={13} strokeWidth={2} />Approve</span>}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {orderRejectId === order.id && (
                        <div style={{ marginTop: 12, padding: 14, background: 'var(--err-s)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 'var(--r)' }}>
                          <div style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--err)', marginBottom: 8 }}>Reject reason (optional)</div>
                          <input className="inp" placeholder="Payment not received, wrong amount..." value={orderRejectNote} onChange={e => setOrderRejectNote(e.target.value)} style={{ marginBottom: 10 }} autoFocus />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-s btn-sm" onClick={() => setOrderRejectId(null)}>Cancel</button>
                            <button className="btn btn-d btn-sm" onClick={handleRejectOrder} disabled={orderActionId === order.id}>{orderActionId === order.id ? '...' : 'Confirm Reject'}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── SUPPORT ──────────────────────────────────── */}
          {section === 'support' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Support Tickets</h1>
                {selectedTicket && (
                  <button className="btn btn-s btn-sm" onClick={() => setSelectedTicket(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ChevronLeft size={14} strokeWidth={1.75} /> All tickets
                  </button>
                )}
                {!selectedTicket && (
                  <button className="btn btn-s btn-sm" onClick={loadTickets} disabled={ticketsLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {ticketsLoading ? <span className="spin" style={{ width: 13, height: 13 }} /> : <><RefreshCw size={13} strokeWidth={1.75} />Refresh</>}
                  </button>
                )}
              </div>

              {!selectedTicket ? (
                ticketsLoading ? (
                  <div className="loading"><span className="spin" />Loading...</div>
                ) : tickets.length === 0 ? (
                  <div className="empty">
                    <span className="empty-ic"><MessageSquare size={32} strokeWidth={1.5} /></span>
                    <span className="empty-t">No support tickets</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tickets.map(ticket => (
                      <div key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        style={{
                          background: 'var(--bg-el)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)',
                          padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                          borderLeft: `4px solid ${ticket.status === 'open' ? 'var(--brand)' : ticket.status === 'in_progress' ? 'var(--warn)' : 'var(--border)'}`,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hi)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '.9375rem', marginBottom: 2 }}>{ticket.subject}</div>
                          <div style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>
                            {(ticket.user as { full_name?: string })?.full_name ?? 'User'} · {timeAgo(ticket.updated_at)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {statusIcon(ticket.status)}
                          <span style={{ fontSize: '.75rem', color: 'var(--tx-2)', fontWeight: 600 }}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                          <ChevronRight size={14} style={{ color: 'var(--tx-3)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Ticket conversation view */
                <div>
                  <div style={{ background: 'var(--bg-el)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 20px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>{selectedTicket.subject}</div>
                        <div style={{ fontSize: '.8125rem', color: 'var(--tx-3)' }}>
                          {(selectedTicket.user as { full_name?: string })?.full_name ?? 'User'} · Opened {timeAgo(selectedTicket.created_at)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 600 }}>Status:</span>
                        {(['open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                          <button key={s} className={`btn btn-sm ${selectedTicket.status === s ? 'btn-p' : 'btn-s'}`}
                            onClick={() => handleTicketStatus(s)} disabled={statusChanging || selectedTicket.status === s}
                            style={{ fontSize: '.75rem', padding: '3px 8px' }}
                          >
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, maxHeight: 400, overflowY: 'auto', padding: 4 }}>
                    {messages.map(msg => (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: msg.is_admin ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '72%', padding: '10px 14px', borderRadius: 'var(--r-lg)',
                          background: msg.is_admin ? 'var(--brand)' : 'var(--bg-el)',
                          color: msg.is_admin ? '#fff' : 'var(--tx)',
                          border: msg.is_admin ? 'none' : '1px solid var(--border)',
                          fontSize: '.9rem', lineHeight: 1.5,
                        }}>
                          {msg.message}
                          <div style={{ fontSize: '.6875rem', marginTop: 4, opacity: 0.7 }}>
                            {msg.is_admin ? 'Admin · ' : ''}{timeAgo(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply input */}
                  {selectedTicket.status !== 'closed' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <textarea
                        className="txta"
                        placeholder="Type a reply..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        rows={2}
                        style={{ flex: 1, resize: 'none' }}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendReply(); }}
                      />
                      <button className="btn btn-p" onClick={handleSendReply} disabled={replying || !replyText.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {replying ? <span className="spin" style={{ width: 14, height: 14 }} /> : <><Send size={14} strokeWidth={1.75} />Send</>}
                      </button>
                    </div>
                  )}
                  {selectedTicket.status === 'closed' && (
                    <div style={{ textAlign: 'center', color: 'var(--tx-3)', fontSize: '.875rem', padding: 16 }}>
                      <XCircle size={20} style={{ display: 'block', margin: '0 auto 8px', color: 'var(--tx-3)' }} />
                      This ticket is closed.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
