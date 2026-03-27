import { useEffect, useState } from 'react';
import type { CreditPackage, CreditTransaction } from '../types';
import { credits, supabase } from '../lib/supabase';
import { timeAgo } from '../utils/format';

interface Props {
  userId: string;
  userEmail?: string;
  balance: number;
  onPurchased: () => void;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

const FEATURED_PKG_INDEX = 1;

const TRANSACTION_ICONS: Record<string, string> = {
  purchase: '🪙', post_job: '📌', apply_job: '📋', refund: '↩', bonus: '🎁',
};

// ── Bank account info — update these! ─────────────────────────
const BANK_INFO = {
  bank:    'Banca Intesa',
  account: '160-123456789-12',
  name:    'Handoo d.o.o.',
  swift:   'DBDBRSBG',
};

function generateReference(userId: string, packageId: string): string {
  // Unique payment reference: first 6 chars of userId + package hint
  return `HANDO-${userId.slice(0, 6).toUpperCase()}-${packageId.slice(0, 4).toUpperCase()}`;
}

export default function CreditsScreen({ userId, userEmail, balance, onPurchased: _onPurchased, onMessage }: Props) {
  const [packages,       setPackages]       = useState<CreditPackage[]>([]);
  const [transactions,   setTransactions]   = useState<CreditTransaction[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedPkg,    setSelectedPkg]    = useState<CreditPackage | null>(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [pendingOrders,  setPendingOrders]  = useState<PendingOrder[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [pkgRes, txRes] = await Promise.all([
        credits.getPackages(),
        credits.getTransactions(userId),
      ]);
      if (!pkgRes.error) setPackages(pkgRes.data ?? []);
      if (!txRes.error) setTransactions(txRes.data ?? []);
      await loadPendingOrders();
      setLoading(false);
    })();
  }, [userId]);

  const loadPendingOrders = async () => {
    const { data } = await supabase
      .from('credit_orders')
      .select('*, package:credit_packages(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    setPendingOrders((data as PendingOrder[]) ?? []);
  };

  const handleSelectPackage = (pkg: CreditPackage) => {
    setSelectedPkg(prev => prev?.id === pkg.id ? null : pkg);
  };

  const handleSubmitOrder = async () => {
    if (!selectedPkg) return;
    setSubmitting(true);

    const reference = generateReference(userId, selectedPkg.id);
    const { error } = await supabase.from('credit_orders').insert({
      user_id:    userId,
      package_id: selectedPkg.id,
      credits:    selectedPkg.credits,
      amount_rsd: selectedPkg.price_rsd,
      reference,
      status:     'pending',
      email:      userEmail ?? '',
    });

    setSubmitting(false);

    if (error) {
      onMessage('Could not submit order. Please try again.', 'error');
      return;
    }

    onMessage('Order submitted! Complete the bank transfer to receive your credits.', 'success');
    setSelectedPkg(null);
    await loadPendingOrders();
  };

  if (loading) return <div className="loading"><span className="spin" />Loading...</div>;

  return (
    <div className="pg-n">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.025em', marginBottom: 6 }}>Credits</h1>
        <p style={{ fontSize: '.9375rem', color: 'var(--tx-2)' }}>Buy credits to post jobs and apply for work.</p>
      </div>

      {/* Balance card */}
      <div className="cbal-card" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '.8125rem', fontWeight: 600, color: 'var(--tx-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>Your balance</div>
        <div className="cbal-amt">{balance.toLocaleString()}</div>
        <div className="cbal-lb">credits available</div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>📌 Post a job <strong>10 credits</strong></div>
          <div style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>📋 Apply for a job <strong>3 credits</strong></div>
        </div>
      </div>

      {/* Pending orders */}
      {pendingOrders.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Pending Orders</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingOrders.map(order => (
              <div key={order.id} style={{
                padding: '13px 16px', borderRadius: 'var(--r)', border: '1.5px solid var(--border)',
                background: 'var(--bg-el)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.9375rem' }}>{order.credits} credits — {order.amount_rsd.toLocaleString()} RSD</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', marginTop: 2 }}>
                    Ref: <code style={{ background: 'var(--bg-ov)', padding: '1px 5px', borderRadius: 4 }}>{order.reference}</code>
                    {' · '}{timeAgo(order.created_at)}
                  </div>
                </div>
                <span className={`bdg ${order.status === 'approved' ? 'bdg-ok' : order.status === 'rejected' ? 'bdg-rej' : 'bdg-warn'}`}>
                  {order.status === 'approved' ? '✓ Approved' : order.status === 'rejected' ? 'Rejected' : '⏳ Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Package selection */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Choose a Package</h2>
        <div className="three-col">
          {packages.map((pkg, i) => {
            const isSelected = selectedPkg?.id === pkg.id;
            return (
              <div
                key={pkg.id}
                className={`pkg-card${i === FEATURED_PKG_INDEX ? ' feat' : ''}`}
                onClick={() => handleSelectPackage(pkg)}
                style={{
                  border: isSelected ? '2px solid var(--brand)' : undefined,
                  background: isSelected ? 'linear-gradient(135deg,rgba(79,124,255,.12),rgba(138,63,252,.08))' : undefined,
                  transform: isSelected ? 'translateY(-3px)' : undefined,
                  boxShadow: isSelected ? '0 8px 32px rgba(79,124,255,.3)' : undefined,
                }}
              >
                {i === FEATURED_PKG_INDEX && <div className="pkg-tag">Popular</div>}
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.75rem', color: '#fff', fontWeight: 800,
                  }}>✓</div>
                )}
                <div>
                  <div className="pkg-cr">{pkg.credits.toLocaleString()}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 500 }}>credits</div>
                </div>
                <div className="pkg-pr">{pkg.price_rsd.toLocaleString()} RSD</div>
                <div className="pkg-pu">{(pkg.price_rsd / pkg.credits).toFixed(2)} RSD / credit</div>
                <button
                  className={`btn ${isSelected ? 'btn-p' : i === FEATURED_PKG_INDEX ? 'btn-p' : 'btn-s'} btn-fw btn-sm`}
                  onClick={e => { e.stopPropagation(); handleSelectPackage(pkg); }}
                >
                  {isSelected ? '✓ Selected' : 'Select'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bank transfer instructions */}
      {selectedPkg && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(79,124,255,.08),rgba(138,63,252,.05))',
          border: '1.5px solid rgba(99,87,255,.3)',
          borderRadius: 'var(--r-lg)', padding: '20px 22px', marginBottom: 20,
          animation: 'fadeIn .2s ease',
        }}>
          <div style={{ fontWeight: 800, fontSize: '1.0625rem', marginBottom: 4 }}>
            📋 Payment Instructions — {selectedPkg.price_rsd.toLocaleString()} RSD
          </div>
          <div style={{ fontSize: '.875rem', color: 'var(--tx-2)', marginBottom: 16, lineHeight: 1.55 }}>
            Transfer <strong style={{ color: 'var(--tx)' }}>{selectedPkg.price_rsd.toLocaleString()} RSD</strong> to the account below.
            Use the reference number so we can match your payment. Credits are added within <strong style={{ color: 'var(--tx)' }}>1–24 hours</strong> on business days.
          </div>

          {/* Bank details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              ['🏦 Bank',       BANK_INFO.bank],
              ['👤 Name',       BANK_INFO.name],
              ['💳 Account',    BANK_INFO.account],
              ['🌐 SWIFT',      BANK_INFO.swift],
            ].map(([label, val]) => (
              <div key={label} style={{
                padding: '11px 14px', background: 'var(--bg-ov)', borderRadius: 'var(--r)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: '.9375rem', fontFamily: 'monospace', letterSpacing: '.02em' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Reference number — the most important part */}
          <div style={{
            padding: '14px 16px', background: 'rgba(245,158,11,.08)', border: '1.5px solid rgba(245,158,11,.3)',
            borderRadius: 'var(--r)', marginBottom: 16,
          }}>
            <div style={{ fontSize: '.75rem', color: 'var(--warn)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
              ⚠️ Payment Reference (required)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <code style={{
                fontSize: '1.125rem', fontWeight: 800, letterSpacing: '.08em',
                color: 'var(--tx)', background: 'var(--bg-ov)',
                padding: '6px 12px', borderRadius: 'var(--r-sm)', flex: '1 1 auto', minWidth: 0,
              }}>
                {generateReference(userId, selectedPkg.id)}
              </code>
              <button
                className="btn btn-s btn-sm"
                style={{ flexShrink: 0 }}
                onClick={() => {
                  navigator.clipboard.writeText(generateReference(userId, selectedPkg.id));
                  onMessage('Reference copied!', 'success');
                }}
              >
                Copy
              </button>
            </div>
            <div style={{ fontSize: '.8125rem', color: 'var(--warn)', marginTop: 8 }}>
              Include this reference in your bank transfer description. Without it we cannot match your payment.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-s" style={{ flex: '0 0 auto' }} onClick={() => setSelectedPkg(null)}>Cancel</button>
            <button
              className="btn btn-p btn-lg"
              style={{ flex: 1, minWidth: 200, justifyContent: 'center' }}
              onClick={handleSubmitOrder}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : "✓ I've initiated the transfer"}
            </button>
          </div>
        </div>
      )}

      {/* How it works */}
      <div style={{ marginBottom: 28, padding: '16px 18px', background: 'var(--bg-el)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ fontWeight: 700, fontSize: '.875rem', marginBottom: 12 }}>How it works</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['1', 'Select a credit package above'],
            ['2', 'Transfer the amount to our bank account using the reference number'],
            ['3', 'Click "I\'ve initiated the transfer" to notify us'],
            ['4', 'We verify and add credits to your account within 1–24h'],
            ['5', 'You receive a notification when credits are added'],
          ].map(([n, text]) => (
            <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: 'var(--brand-s)',
                border: '1px solid rgba(99,87,255,.3)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '.6875rem', fontWeight: 800, color: 'var(--brand)', flexShrink: 0,
              }}>{n}</div>
              <span style={{ fontSize: '.875rem', color: 'var(--tx-2)', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Transaction History</h2>
          <div className="card">
            <div style={{ padding: '0 20px' }}>
              {transactions.map((tx, i) => (
                <div key={tx.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0',
                  borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--r-sm)',
                    background: tx.amount > 0 ? 'var(--ok-s)' : 'var(--err-s)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', flexShrink: 0,
                  }}>
                    {TRANSACTION_ICONS[tx.type] ?? '🪙'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '.9375rem' }}>{tx.description}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', marginTop: 2 }}>{timeAgo(tx.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: tx.amount > 0 ? 'var(--ok)' : 'var(--err)' }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>bal: {tx.balance_after}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PendingOrder {
  id: string;
  user_id: string;
  package_id: string;
  credits: number;
  amount_rsd: number;
  reference: string;
  status: 'pending' | 'approved' | 'rejected';
  email: string;
  created_at: string;
  package?: CreditPackage;
}
