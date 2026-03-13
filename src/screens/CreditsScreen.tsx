import { useEffect, useState } from 'react';
import type { CreditPackage, CreditTransaction } from '../types';
import { credits } from '../lib/supabase';
import { timeAgo } from '../utils/format';

interface Props {
  userId: string;
  balance: number;
  onPurchased: () => void;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

const FEATURED_PKG_INDEX = 1; // Standard

const TRANSACTION_ICONS: Record<string, string> = {
  purchase: '🪙',
  post_job: '📌',
  apply_job: '📋',
  refund: '↩',
  bonus: '🎁',
};

export default function CreditsScreen({ userId, balance, onPurchased, onMessage }: Props) {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [pkgRes, txRes] = await Promise.all([
        credits.getPackages(),
        credits.getTransactions(userId),
      ]);
      if (!pkgRes.error) setPackages(pkgRes.data ?? []);
      if (!txRes.error) setTransactions(txRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handlePurchase = async (pkg: CreditPackage) => {
    setPurchasing(pkg.id);
    const res = await credits.purchase(pkg.id, userId);
    setPurchasing(null);
    if (res.error) {
      onMessage(res.error, 'error');
      return;
    }
    onMessage(`Purchased ${pkg.credits} credits!`, 'success');
    onPurchased();
    // Refresh transactions
    const txRes = await credits.getTransactions(userId);
    if (!txRes.error) setTransactions(txRes.data ?? []);
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

      {/* Packages */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Buy Credits</h2>
        <div className="three-col">
          {packages.map((pkg, i) => (
            <div
              key={pkg.id}
              className={`pkg-card${i === FEATURED_PKG_INDEX ? ' feat' : ''}`}
              onClick={() => !purchasing && handlePurchase(pkg)}
            >
              {i === FEATURED_PKG_INDEX && <div className="pkg-tag">Popular</div>}
              <div>
                <div className="pkg-cr">{pkg.credits.toLocaleString()}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 500 }}>credits</div>
              </div>
              <div className="pkg-pr">{pkg.price_rsd.toLocaleString()} RSD</div>
              <div className="pkg-pu">{(pkg.price_rsd / pkg.credits).toFixed(2)} RSD / credit</div>
              <button
                className={`btn ${i === FEATURED_PKG_INDEX ? 'btn-p' : 'btn-s'} btn-fw btn-sm`}
                disabled={purchasing === pkg.id}
                onClick={e => { e.stopPropagation(); handlePurchase(pkg); }}
              >
                {purchasing === pkg.id ? 'Processing...' : `Buy — ${pkg.price_rsd.toLocaleString()} RSD`}
              </button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg-ov)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: '.8125rem', color: 'var(--tx-2)' }}>
          ℹ Payment integration (Stripe, etc.) is handled at checkout. Credits are non-refundable once used.
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
                    <div style={{
                      fontWeight: 800, fontSize: '1rem',
                      color: tx.amount > 0 ? 'var(--ok)' : 'var(--err)',
                    }}>
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
