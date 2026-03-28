import { useState, useCallback, useEffect, type ChangeEvent } from 'react';
import type { Profile, Rating } from '../types';
import { profiles, ratings as ratingsApi } from '../lib/supabase';
import { Avatar } from '../components/ui/Avatar';
import { Stars } from '../components/ui/Stars';
import { StatusBadge } from '../components/ui/StatusBadge';
import { timeAgo } from '../utils/format';

interface Props {
  currentUser: { id: string; email?: string };
  profile: Profile | null;
  onProfileUpdated: (p: Profile) => void;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

type ProfileTab = 'overview' | 'edit' | 'ratings' | 'verification';
type RatingsTab = 'received' | 'given';

export default function ProfileScreen({ currentUser, profile, onProfileUpdated, onMessage }: Props) {
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [ratingsTab, setRatingsTab] = useState<RatingsTab>('received');
  const [ratingsReceived, setRatingsReceived] = useState<Rating[]>([]);
  const [ratingsGiven, setRatingsGiven] = useState<Rating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);

  // Edit form
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [cityField, setCityField] = useState(profile?.city ?? '');
  const [saving, setSaving] = useState(false);

  // Verification
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setBio(profile.bio ?? '');
      setCityField(profile.city ?? '');
    }
  }, [profile]);

  const loadRatings = useCallback(async () => {
    setLoadingRatings(true);
    const [recv, given, freshProfile] = await Promise.all([
      ratingsApi.getForUser(currentUser.id),
      ratingsApi.getByRater?.(currentUser.id) ?? { data: [], error: null },
      // Uvek osvježi profil kad otvorimo Ratings tab, da total_ratings bude tačan
      profiles.get(currentUser.id),
    ]);
    if (!recv.error) setRatingsReceived(recv.data ?? []);
    if (!given.error) setRatingsGiven(given.data ?? []);
    if (!freshProfile.error && freshProfile.data) onProfileUpdated(freshProfile.data);
    setLoadingRatings(false);
  }, [currentUser.id, onProfileUpdated]);

  useEffect(() => {
    if (tab === 'ratings') loadRatings();
  }, [tab, loadRatings]);

  const handleSave = async () => {
    setSaving(true);
    const res = await profiles.update(currentUser.id, {
      full_name: fullName.trim(),
      bio: bio.trim(),
      city: cityField.trim(),
    });
    setSaving(false);
    if (res.error) { onMessage(res.error, 'error'); return; }
    if (res.data) onProfileUpdated(res.data);
    onMessage('Profile updated.', 'success');
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const uploadRes = await profiles.uploadAvatar(currentUser.id, file);
    if (uploadRes.error) { onMessage(uploadRes.error, 'error'); setAvatarUploading(false); return; }
    const profileRes = await profiles.update(currentUser.id, { avatar_url: uploadRes.data! });
    setAvatarUploading(false);
    if (profileRes.data) onProfileUpdated(profileRes.data);
    onMessage('Photo updated.', 'success');
  };

  const handleVerification = async () => {
    if (!idFront || !idBack) { onMessage('Please upload both sides of your ID.', 'error'); return; }
    setVerifying(true);
    const res = await profiles.submitVerification(currentUser.id, idFront, idBack);
    setVerifying(false);
    if (res.error) { onMessage(res.error, 'error'); return; }
    onMessage("Verification submitted. You'll be notified when approved (up to 48h).", 'success');
    const pr = await profiles.get(currentUser.id);
    if (pr.data) onProfileUpdated(pr.data);
  };

  // Verification sub-flows
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone ?? '');
  const [phoneStep, setPhoneStep] = useState<'idle' | 'enter_phone' | 'enter_otp'>('idle');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  const handleEmailVerify = async () => {
    setEmailLoading(true);
    try {
      const { supabase: sb } = await import('../lib/supabase');
      const { error } = await sb.auth.resend({
        type: 'signup',
        email: currentUser.email ?? '',
      });
      if (error) {
        if (error.message?.includes('already confirmed') || error.message?.includes('Email link')) {
          const { profiles: pl } = await import('../lib/supabase');
          await pl.update(currentUser.id, { is_email_verified: true });
          const pr = await pl.get(currentUser.id);
          if (pr.data) onProfileUpdated(pr.data);
          onMessage('Email is already verified!', 'success');
        } else {
          onMessage('Could not send email: ' + error.message, 'error');
        }
        setEmailLoading(false);
        return;
      }
      setEmailSent(true);
      onMessage('Verification email sent! Check your inbox.', 'success');
    } catch {
      onMessage('Failed to send verification email.', 'error');
    }
    setEmailLoading(false);
  };

  const handlePhoneSend = async () => {
    if (!phoneNumber.trim()) { onMessage('Please enter your phone number.', 'error'); return; }
    setPhoneLoading(true);
    try {
      const { auth: authLib } = await import('../lib/supabase');
      const res = await authLib.sendPhoneOtp(phoneNumber.trim());
      if (res.error) {
        // Twilio not configured — fall back to saving number directly
        const errMsg = String((res.error as { message?: string })?.message ?? res.error);
        if (errMsg.includes('Unsupported') || errMsg.includes('phone provider') || errMsg.includes('not enabled')) {
          // Save directly without OTP
          const { profiles: pl } = await import('../lib/supabase');
          const upd = await pl.update(currentUser.id, { phone: phoneNumber.trim(), is_phone_verified: true });
          if (upd.data) onProfileUpdated(upd.data);
          setPhoneStep('idle');
          onMessage('Phone number saved. (OTP requires Twilio — see PROVIDERS.md)', 'success');
        } else {
          onMessage('Could not send OTP: ' + errMsg, 'error');
        }
        setPhoneLoading(false);
        return;
      }
      setPhoneStep('enter_otp');
      onMessage('OTP sent! Check your SMS.', 'success');
    } catch {
      onMessage('Failed to send OTP.', 'error');
    }
    setPhoneLoading(false);
  };

  const handlePhoneVerify = async () => {
    if (!phoneOtp.trim()) { onMessage('Please enter the OTP code.', 'error'); return; }
    setPhoneLoading(true);
    try {
      const { auth: authLib } = await import('../lib/supabase');
      const res = await authLib.verifyPhoneOtp(phoneNumber.trim(), phoneOtp.trim());
      if (res.error) {
        onMessage('Invalid code: ' + String((res.error as { message?: string })?.message ?? res.error), 'error');
        setPhoneLoading(false);
        return;
      }
      const { profiles: pl } = await import('../lib/supabase');
      await pl.update(currentUser.id, { phone: phoneNumber.trim(), is_phone_verified: true });
      const pr = await pl.get(currentUser.id);
      if (pr.data) onProfileUpdated(pr.data);
      setPhoneStep('idle');
      setPhoneOtp('');
      onMessage('Phone verified!', 'success');
    } catch {
      onMessage('Verification failed.', 'error');
    }
    setPhoneLoading(false);
  };

  // Estimated earnings: completed jobs * pay average (we don't have exact data, show from profile if available)
  const totalEarnings = (profile as Profile & { total_earnings?: number })?.total_earnings ?? null;
  const displayName = profile?.full_name || currentUser.email?.split('@')[0] || 'User';


  const activeRatings = ratingsTab === 'received' ? ratingsReceived : ratingsGiven;

  return (
    <div className="pg-n">

      {/* ── Profile header card ───────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="prof-hdr">
          <div style={{ position: 'relative' }}>
            <Avatar name={displayName} url={profile?.avatar_url} size="lg" />
            {tab === 'edit' && (
              <label style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--brand-grad)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: avatarUploading ? 'wait' : 'pointer', fontSize: '.75rem',
                boxShadow: '0 2px 8px rgba(0,0,0,.4)',
              }}>
                {avatarUploading ? '⏳' : '📷'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} disabled={avatarUploading} />
              </label>
            )}
          </div>

          <div className="prof-info">
            <div className="prof-n">{displayName}</div>
            {profile?.city && <div className="prof-c">📍 {profile.city}</div>}

            {/* Inline rating summary */}
            {(profile?.rating_as_worker ?? 0) > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Stars value={profile!.rating_as_worker} />
                <span style={{ fontWeight: 700, fontSize: '.9375rem' }}>{profile!.rating_as_worker.toFixed(1)}</span>
                <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>({profile!.total_ratings_worker} ratings)</span>
              </div>
            )}

            <div className="prof-bdgs">
              <StatusBadge status={profile?.verification_status ?? 'unverified'} />
              {profile?.is_email_verified && <span className="bdg bdg-ok">✉ Email verified</span>}
              {profile?.is_phone_verified && <span className="bdg bdg-ok">📱 Phone verified</span>}
            </div>
          </div>
        </div>

        {/* Stats — 4 cols */}
        <div className="prof-stats">
          <div className="pstat">
            <div className="pstat-v">{profile?.completed_jobs_worker ?? 0}</div>
            <div className="pstat-l">Jobs done</div>
          </div>
          <div className="pstat">
            <div className="pstat-v">
              {profile?.rating_as_worker ? profile.rating_as_worker.toFixed(1) : '—'}
            </div>
            <div className="pstat-l">Worker rating</div>
          </div>
          <div className="pstat">
            <div className="pstat-v">{profile?.completed_jobs_poster ?? 0}</div>
            <div className="pstat-l">Jobs posted</div>
          </div>
          <div className="pstat">
            <div className="pstat-v" style={{ fontSize: totalEarnings !== null && totalEarnings > 9999 ? '1rem' : undefined }}>
              {totalEarnings !== null ? `${totalEarnings.toLocaleString()} RSD` : '—'}
            </div>
            <div className="pstat-l">Total earned</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {(['overview', 'edit', 'ratings', 'verification'] as ProfileTab[]).map(t => (
          <button key={t} className={`tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Overview'
              : t === 'edit' ? 'Edit Profile'
              : t === 'ratings' ? `Ratings (${(profile?.total_ratings_worker ?? 0) + (profile?.total_ratings_poster ?? 0)})`
              : 'Verification'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="card">
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {([
              ['👤', 'Full name', displayName],
              ['✉', 'Email', currentUser.email ?? '—'],
              ['📍', 'City', profile?.city || 'Not set'],
            ] as [string, string, string][]).map(([icon, label, val]) => (
              <div key={label} style={{
                display: 'flex', gap: 12, padding: '12px 14px',
                background: 'var(--bg-ov)', border: '1.5px solid var(--border)', borderRadius: 'var(--r)',
              }}>
                <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
                  <div style={{ fontSize: '.9375rem', fontWeight: 500 }}>{val}</div>
                </div>
              </div>
            ))}
            {profile?.bio && (
              <div style={{ padding: '12px 14px', background: 'var(--bg-ov)', border: '1.5px solid var(--border)', borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>📝 Bio</div>
                <div style={{ fontSize: '.9375rem', color: 'var(--tx-2)', lineHeight: 1.65 }}>{profile.bio}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT ─────────────────────────────────────── */}
      {tab === 'edit' && (
        <div className="card">
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="fld">
              <label className="flb">Full name</label>
              <input className="inp" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="fld">
              <label className="flb">City</label>
              <input className="inp" value={cityField} onChange={e => setCityField(e.target.value)} placeholder="Novi Sad" />
            </div>
            <div className="fld">
              <label className="flb">Bio <span style={{ color: 'var(--tx-3)', fontWeight: 400 }}>(optional)</span></label>
              <textarea
                className="txta"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Describe your skills, experience and availability..."
                rows={4}
              />
            </div>
            <button className="btn btn-p btn-fw btn-lg" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── RATINGS ──────────────────────────────────── */}
      {tab === 'ratings' && (
        <div className="card">
          <div style={{ padding: '0 20px' }}>
            {/* Sub-tabs */}
            <div className="tabs">
              <button
                className={`tab${ratingsTab === 'received' ? ' on' : ''}`}
                onClick={() => setRatingsTab('received')}
              >
                Received ({profile?.total_ratings_worker ?? 0})
              </button>
              <button
                className={`tab${ratingsTab === 'given' ? ' on' : ''}`}
                onClick={() => setRatingsTab('given')}
              >
                Given ({ratingsGiven.length})
              </button>
            </div>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            {/* Average summary */}
            {ratingsTab === 'received' && (profile?.rating_as_worker ?? 0) > 0 && (
              <div style={{ display: 'flex', gap: 20, margin: '16px 0', padding: '14px', background: 'var(--bg-ov)', border: '1.5px solid var(--border)', borderRadius: 'var(--r)', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>As worker</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Stars value={profile!.rating_as_worker} />
                    <span style={{ fontWeight: 800, fontSize: '1rem' }}>{profile!.rating_as_worker.toFixed(1)}</span>
                    <span style={{ fontSize: '.8125rem', color: 'var(--tx-3)' }}>({profile!.total_ratings_worker})</span>
                  </div>
                </div>
                {(profile?.rating_as_poster ?? 0) > 0 && (
                  <div>
                    <div style={{ fontSize: '.6875rem', color: 'var(--tx-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>As employer</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Stars value={profile!.rating_as_poster} />
                      <span style={{ fontWeight: 800, fontSize: '1rem' }}>{profile!.rating_as_poster.toFixed(1)}</span>
                      <span style={{ fontSize: '.8125rem', color: 'var(--tx-3)' }}>({profile!.total_ratings_poster})</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {loadingRatings ? (
              <div className="loading"><span className="spin" />Loading...</div>
            ) : activeRatings.length === 0 ? (
              <div className="empty" style={{ padding: '28px 0' }}>
                <span className="empty-ic">⭐</span>
                <span className="empty-t">{ratingsTab === 'received' ? 'No ratings received yet' : 'No ratings given yet'}</span>
                <span className="empty-s">
                  {ratingsTab === 'received'
                    ? 'Complete jobs to start receiving ratings.'
                    : "You haven't rated anyone yet."}
                </span>
              </div>
            ) : (
              activeRatings.map(r => (
                <div key={r.id} className="rating-row">
                  <Avatar name={r.rater?.full_name ?? '?'} url={r.rater?.avatar_url} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700 }}>{r.rater?.full_name ?? 'User'}</span>
                      <Stars value={r.score} />
                      <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>{timeAgo(r.created_at)}</span>
                    </div>
                    {r.comment && <div className="rating-cmt">"{r.comment}"</div>}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: r.score >= 4 ? 'var(--ok)' : r.score >= 3 ? 'var(--warn)' : 'var(--err)', flexShrink: 0 }}>
                    {r.score}.0
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── VERIFICATION ─────────────────────────────── */}
      {tab === 'verification' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Status overview */}
          <div className="card">
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--tx-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Verification Status</div>

              {/* Email */}
              <div className="verif-item">
                <div className="verif-l">
                  <span style={{ fontSize: '1.25rem' }}>✉</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.9375rem' }}>Email address</div>
                    <div style={{ fontSize: '.75rem', color: profile?.is_email_verified ? 'var(--ok)' : 'var(--tx-2)', marginTop: 2 }}>
                      {profile?.is_email_verified ? `Verified — ${currentUser.email}` : emailSent ? 'Check your inbox for the link' : `Not verified — ${currentUser.email}`}
                    </div>
                  </div>
                </div>
                {profile?.is_email_verified
                  ? <span className="bdg bdg-ok">✓ Verified</span>
                  : <button className="btn btn-s btn-sm" onClick={handleEmailVerify} disabled={emailSent || emailLoading}>
                      {emailLoading ? '...' : emailSent ? 'Sent ✓' : 'Send link'}
                    </button>
                }
              </div>

              {/* Phone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="verif-item">
                  <div className="verif-l">
                    <span style={{ fontSize: '1.25rem' }}>📱</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.9375rem' }}>Phone number</div>
                      <div style={{ fontSize: '.75rem', color: profile?.is_phone_verified ? 'var(--ok)' : 'var(--tx-2)', marginTop: 2 }}>
                        {profile?.is_phone_verified ? `Saved — ${profile.phone ?? ''}` : 'Not added'}
                      </div>
                    </div>
                  </div>
                  {phoneStep === 'idle'
                    ? <button className="btn btn-s btn-sm" onClick={() => setPhoneStep('enter_phone')}>
                        {profile?.is_phone_verified ? 'Edit' : 'Add'}
                      </button>
                    : <button className="btn btn-s btn-sm" onClick={() => { setPhoneStep('idle'); setPhoneOtp(''); }}>Cancel</button>
                  }
                </div>
                {phoneStep === 'enter_phone' && (
                  <div style={{ display: 'flex', gap: 8, paddingLeft: 40 }}>
                    <input
                      className="inp" placeholder="+381641234567" value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      style={{ flex: 1, height: 36, fontSize: '.875rem' }}
                    />
                    <button className="btn btn-p btn-sm" onClick={handlePhoneSend} disabled={phoneLoading}>
                      {phoneLoading ? '...' : 'Send OTP'}
                    </button>
                  </div>
                )}
                {phoneStep === 'enter_otp' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 40 }}>
                    <div style={{ fontSize: '.75rem', color: 'var(--tx-2)' }}>SMS sent to {phoneNumber}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="inp" placeholder="Enter 6-digit code" value={phoneOtp}
                        onChange={e => setPhoneOtp(e.target.value)}
                        style={{ flex: 1, height: 36, fontSize: '.875rem', letterSpacing: '0.1em' }}
                        maxLength={6}
                      />
                      <button className="btn btn-p btn-sm" onClick={handlePhoneVerify} disabled={phoneLoading}>
                        {phoneLoading ? '...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ID card status */}
              <div className="verif-item">
                <div className="verif-l">
                  <span style={{ fontSize: '1.25rem' }}>🪪</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.9375rem' }}>Identity (ID card)</div>
                    <div style={{ fontSize: '.75rem', color: profile?.verification_status === 'verified' ? 'var(--ok)' : 'var(--tx-2)', marginTop: 2 }}>
                      {profile?.verification_status === 'verified' ? 'Verified'
                        : profile?.verification_status === 'pending' ? 'Under review (up to 48h)'
                        : 'Not submitted'}
                    </div>
                  </div>
                </div>
                <span className={`bdg ${profile?.verification_status === 'verified' ? 'bdg-ok' : 'bdg-neu'}`}>
                  {profile?.verification_status === 'verified' ? '✓ Verified' : '–'}
                </span>
              </div>
            </div>
          </div>

          {/* ID upload */}
          <div className="card">
            <div style={{ padding: '18px 20px' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 6 }}>Identity Verification</div>
              <div style={{ fontSize: '.9375rem', color: 'var(--tx-2)', lineHeight: 1.65, marginBottom: 16 }}>
                Upload both sides of your personal ID card. Your documents are stored securely and reviewed manually by the Handoo team. This process takes <strong style={{ color: 'var(--tx)' }}>up to 48 hours</strong>.
              </div>

              {profile?.verification_status === 'pending' && (
                <div className="info-box warn" style={{ marginBottom: 16 }}>
                  <span>⏳</span>
                  <span>Your documents are currently under review. You'll be notified by email once verification is complete (up to 48h).</span>
                </div>
              )}

              {profile?.verification_status === 'verified' && (
                <div className="info-box ok" style={{ marginBottom: 16 }}>
                  <span>✅</span>
                  <span>Your identity has been verified. Your profile shows the verified badge.</span>
                </div>
              )}

              {profile?.verification_status !== 'verified' && profile?.verification_status !== 'pending' && (
                <>
                  {([
                    ['verif-front', 'ID Card — Front side', idFront, setIdFront],
                    ['verif-back', 'ID Card — Back side', idBack, setIdBack],
                  ] as [string, string, File | null, (f: File | null) => void][]).map(([id, label, file, setter]) => (
                    <div key={id} className="verif-item" style={{ marginBottom: 10 }}>
                      <div className="verif-l">
                        <span style={{ fontSize: '1.25rem' }}>🪪</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '.9375rem' }}>{label}</div>
                          <div style={{ fontSize: '.75rem', color: file ? 'var(--ok)' : 'var(--tx-2)', marginTop: 2 }}>
                            {file ? `✓ ${file.name}` : 'No file selected'}
                          </div>
                        </div>
                      </div>
                      <label className="btn btn-s btn-sm" style={{ cursor: 'pointer' }}>
                        {file ? 'Change' : 'Upload'}
                        <input
                          type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                          onChange={e => setter(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>
                  ))}

                  <div className="info-box warn" style={{ marginBottom: 16 }}>
                    <span>⚠️</span>
                    <span>Your ID number (JMBG) is stored encrypted and used only for identity verification. It is <strong>never shown</strong> to other users.</span>
                  </div>

                  <button
                    className="btn btn-p btn-fw btn-lg"
                    onClick={handleVerification}
                    disabled={verifying || !idFront || !idBack}
                  >
                    {verifying ? 'Submitting...' : 'Submit for Verification'}
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
