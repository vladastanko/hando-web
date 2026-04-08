import React, { useEffect, useState, useCallback } from 'react';
import { Gift, Copy, Check, Users, ChevronLeft, Coins } from 'lucide-react';
import type { Referral } from '../types';
import { referrals as referralsApi } from '../lib/supabase';
import { timeAgo } from '../utils/format';

interface Props {
  userId: string;
  referralCode: string | null;
  onBack: () => void;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

export default function ReferralScreen({ userId, referralCode, onBack, onMessage }: Props) {
  const [myReferrals, setMyReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const referralUrl = referralCode
    ? `${window.location.origin}${window.location.pathname}?ref=${referralCode}`
    : null;

  const completedCount = myReferrals.filter(r => r.status === 'completed').length;
  // Credits awarded: floor(completed / 2) * 30
  const creditsEarned = Math.floor(completedCount / 2) * 30;
  // Next milestone: next even number
  const nextMilestone = completedCount % 2 === 0 ? completedCount + 2 : completedCount + 1;
  const progressToNext = completedCount % 2; // 0 or 1

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await referralsApi.getMyReferrals(userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setMyReferrals((data as any as Referral[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const copyLink = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      onMessage('Referral link copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onMessage('Could not copy — please copy the link manually.', 'error');
    }
  };

  return (
    <div style={{ paddingBottom: 'var(--space-12)' }}>
      {/* Header */}
      <div className="pg" style={{ paddingBottom: 0 }}>
        <button
          className="btn btn-g btn-sm"
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 'var(--space-4)' }}
        >
          <ChevronLeft size={16} strokeWidth={1.75} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--acc), var(--acc-lt))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Gift size={22} strokeWidth={1.75} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 900, letterSpacing: '-.025em', margin: 0 }}>
              Refer a Friend
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--tx-3)', margin: 0 }}>
              Earn 30 credits for every 2 friends who join
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="pg" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div className="jcard" style={{ padding: 'var(--space-4)', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Users size={18} strokeWidth={1.75} color="var(--acc)" />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--tx-3)', fontWeight: 600 }}>Friends joined</span>
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, letterSpacing: '-.03em' }}>
              {completedCount}
            </div>
          </div>
          <div className="jcard" style={{ padding: 'var(--space-4)', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Coins size={18} strokeWidth={1.75} color="var(--acc)" />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--tx-3)', fontWeight: 600 }}>Credits earned</span>
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, letterSpacing: '-.03em' }}>
              {creditsEarned}
            </div>
          </div>
        </div>

        {/* Progress to next reward */}
        <div className="jcard" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--tx-2)' }}>
              Progress to next reward
            </span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--acc)' }}>
              {progressToNext}/2
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-sub)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(progressToNext / 2) * 100}%`,
              background: 'linear-gradient(90deg, var(--acc), var(--acc-lt))',
              borderRadius: 99,
              transition: 'width 0.6s var(--ease-spring)',
            }} />
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--tx-3)', margin: 'var(--space-2) 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {nextMilestone - completedCount} more friend{nextMilestone - completedCount !== 1 ? 's' : ''} = +30 credits
          </p>
        </div>

        {/* Referral link */}
        <div className="jcard" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--tx-2)', marginBottom: 'var(--space-2)' }}>
            Your referral link
          </p>
          {referralUrl ? (
            <>
              <div style={{
                background: 'var(--bg-sub)', borderRadius: 10, padding: 'var(--space-3)',
                fontSize: 'var(--text-sm)', color: 'var(--tx-3)', wordBreak: 'break-all',
                marginBottom: 'var(--space-3)', fontFamily: 'monospace',
              }}>
                {referralUrl}
              </div>
              <button className="btn btn-p" onClick={copyLink} style={{ width: '100%', gap: 'var(--space-2)' }}>
                {copied
                  ? <><Check size={16} strokeWidth={2} /> Copied!</>
                  : <><Copy size={16} strokeWidth={1.75} /> Copy link</>
                }
              </button>
            </>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--tx-3)' }}>Generating your code…</p>
          )}
        </div>

        {/* How it works */}
        <div className="jcard" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--tx-1)', marginBottom: 'var(--space-3)' }}>
            How it works
          </p>
          {[
            { step: '1', text: 'Share your referral link with friends' },
            { step: '2', text: 'They sign up using your link' },
            { step: '3', text: 'Every 2 friends = 30 credits added to your balance' },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-2)', alignItems: 'flex-start' }}>
              <div style={{
                minWidth: 24, height: 24, borderRadius: 99,
                background: 'linear-gradient(135deg, var(--acc), var(--acc-lt))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'var(--text-xs)', fontWeight: 900, color: '#fff',
              }}>
                {step}
              </div>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--tx-2)', fontWeight: 600, paddingTop: 2 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Referral history */}
        <div>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 'var(--space-3)' }}>
            Your referrals
          </h3>
          {loading ? (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--tx-3)' }}>Loading…</p>
          ) : myReferrals.length === 0 ? (
            <div className="jcard" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <Users size={32} strokeWidth={1.5} color="var(--tx-3)" style={{ margin: '0 auto var(--space-2)' }} />
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--tx-3)', fontWeight: 600 }}>
                No referrals yet — share your link to start earning!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {myReferrals.map(r => (
                <div key={r.id} className="jcard" style={{ padding: 'var(--space-3) var(--space-4)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--tx-1)' }}>
                      {/* Supabase returns FK joins as array */}
                      {(Array.isArray(r.referred_user)
                        ? (r.referred_user as { full_name: string }[])[0]?.full_name
                        : (r.referred_user as { full_name: string } | undefined)?.full_name
                      ) ?? 'User'}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--tx-3)', fontWeight: 600 }}>
                      {timeAgo(r.created_at)}
                    </div>
                  </div>
                  <span className={`bdg ${r.status === 'completed' ? 'bdg-ok' : 'bdg-neu'}`}>
                    {r.status === 'completed' ? 'Joined' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
