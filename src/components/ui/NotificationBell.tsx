import { useState, useEffect, useRef, useCallback } from 'react';
import { notifications, supabase } from '../../lib/supabase';
import type { Notification } from '../../types';
import { timeAgo } from '../../utils/format';

interface Props {
  userId: string;
  onNavigate?: (view: string) => void;
}

const NOTIF_ICONS: Record<string, string> = {
  application_accepted: '✅',
  application_rejected: '❌',
  job_completed: '🏁',
  new_rating: '⭐',
  job_nearby: '📍',
  dispute_update: '⚠️',
  credit_low: '🪙',
};

export function NotificationBell({ userId, onNavigate }: Props) {
  const [open,   setOpen]   = useState(false);
  const [items,  setItems]  = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await notifications.getAll(userId);
    if (!res.error && res.data) {
      setItems(res.data);
      setUnread(res.data.filter(n => !n.is_read).length);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Realtime: new notifications
  useEffect(() => {
    const ch = supabase
      .channel(`notif:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setItems(prev => [payload.new as Notification, ...prev]);
        setUnread(u => u + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleOpen = async () => {
    setOpen(v => !v);
    if (!open && unread > 0) {
      await notifications.markAllRead(userId);
      setUnread(0);
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleClick = (n: Notification) => {
    setOpen(false);
    if (n.type === 'application_accepted' || n.type === 'application_rejected') {
      onNavigate?.('applications');
    } else if (n.type === 'new_rating') {
      onNavigate?.('profile');
    } else if (n.type === 'job_completed') {
      onNavigate?.('applications');
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative', width: 34, height: 34, border: '1px solid var(--border)',
          borderRadius: 'var(--r-full)', background: 'var(--bg-ov)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.0625rem', transition: 'all var(--t)',
          color: unread > 0 ? 'var(--warn)' : 'var(--tx-2)',
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            background: '#ef4444', color: '#fff',
            borderRadius: 99, fontSize: '.5rem', fontWeight: 900,
            padding: '1px 4px', minWidth: 14, textAlign: 'center',
            lineHeight: '14px', border: '1.5px solid var(--bg)',
          }}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 320, maxHeight: 420, overflowY: 'auto',
          background: 'var(--bg-el)', border: '1px solid var(--border-hi)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-lg)',
          zIndex: 300, animation: 'ddIn .15s ease',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: '.9375rem' }}>
            Notifications
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--tx-3)', fontSize: '.875rem' }}>
              No notifications yet
            </div>
          ) : (
            items.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  padding: '12px 16px', display: 'flex', gap: 10, cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  background: n.is_read ? 'transparent' : 'rgba(99,87,255,.06)',
                  transition: 'background var(--tf)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-ov)')}
                onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(99,87,255,.06)')}
              >
                <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: 1 }}>
                  {NOTIF_ICONS[n.type] ?? '🔔'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '.875rem', marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: '.8125rem', color: 'var(--tx-2)', lineHeight: 1.45 }}>{n.body}</div>
                  <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && (
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0, marginTop: 5 }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
