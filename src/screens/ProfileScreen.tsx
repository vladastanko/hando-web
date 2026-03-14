import { useState, useCallback, useEffect } from 'react';
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

export default function ProfileScreen({ currentUser, profile, onProfileUpdated, onMessage }: Props) {
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [ratingsList, setRatingsList] = useState<Rating[]>([]);
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

  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
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
    const res = await ratingsApi.getForUser(currentUser.id);
    if (!res.error) setRatingsList(res.data ?? []);
    setLoadingRatings(false);
  }, [currentUser.id]);

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
    onMessage('Profile updated successfully.', 'success');
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    onMessage("Verification submitted. You'll be notified when approved.", 'success');
    // Refresh profile
    const pr = await profiles.get(currentUser.id);
    if (pr.data) onProfileUpdated(pr.data);
  };

  const displayName = profile?.full_name || currentUser.email?.split('@')[0] || 'User';

  return (
    <div className="pg-n">
      {/* Profile card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="prof-hdr">
          <div style={{ position: 'relative' }}>
            <Avatar name={displayName} url={profile?.avatar_url} size="lg" />
            {tab === 'edit' && (
              <label style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--brand)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', fontSize: '.75rem',
              }}>
                📷
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} disabled={avatarUploading} />
              </label>
            )}
          </div>
          <div className="prof-info">
            <div className="prof-n">{displayName}</div>
            {profile?.city && <div className="prof-c">📍 {profile.city}</div>}
            <div className="prof-bdgs">
              <StatusBadge status={profile?.verification_status ?? 'unverified'} />
              {profile?.is_email_verified && <span className="bdg bdg-ok">✉ Email verified</span>}
              {profile?.is_phone_verified && <span className="bdg bdg-ok">📱 Phone verified</span>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="prof-stats">
          <div className="pstat">
            <div className="pstat-v">{profile?.completed_jobs_worker ?? 0}</div>
            <div className="pstat-l">Jobs done</div>
          </div>
          <div className="pstat">
            <div className="pstat-v">{profile?.rating_as_worker ? profile.rating_as_worker.toFixed(1) : '—'}</div>
            <div className="pstat-l">Worker rating</div>
          </div>
          <div className="pstat">
            <div className="pstat-v">{profile?.completed_jobs_poster ?? 0}</div>
            <div className="pstat-l">Jobs posted</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {(['overview', 'edit', 'ratings', 'verification'] as ProfileTab[]).map(t => (
          <button key={t} className={`tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Overview' : t === 'edit' ? 'Edit Profile' : t === 'ratings' ? 'Ratings' : 'Verification'}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="card">
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['👤', 'Full name', displayName],
              ['✉', 'Email', currentUser.email ?? '—'],
              ['📍', 'City', profile?.city || 'Not set'],
            ].map(([icon, label, val]) => (
              <div key={label as string} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--bg-ov)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
                <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: '.9375rem', fontWeight: 500 }}>{val as string}</div>
                </div>
              </div>
            ))}
            {profile?.bio && (
              <div style={{ padding: '12px 14px', background: 'var(--bg-ov)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 600, marginBottom: 6 }}>📝 Bio</div>
                <div style={{ fontSize: '.9375rem', color: 'var(--tx-2)', lineHeight: 1.65 }}>{profile.bio}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT */}
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
              <label className="flb">Bio</label>
              <textarea
                className="txta"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell employers a bit about yourself — your skills, experience, availability..."
                rows={4}
              />
            </div>
            <button className="btn btn-p btn-fw btn-lg" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* RATINGS */}
      {tab === 'ratings' && (
        <div className="card">
          <div style={{ padding: '18px 20px' }}>
            {loadingRatings ? (
              <div className="loading"><span className="spin" />Loading ratings...</div>
            ) : ratingsList.length === 0 ? (
              <div className="empty" style={{ padding: '32px 0' }}>
                <span className="empty-ic">⭐</span>
                <span className="empty-t">No ratings yet</span>
                <span className="empty-s">Complete jobs to start receiving ratings from employers and workers.</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 20, marginBottom: 20, padding: '14px', background: 'var(--bg-ov)', border: '1px solid var(--border)', borderRadius: 'var(--r)', flexWrap: 'wrap' }}>
                  {profile?.rating_as_worker && profile.rating_as_worker > 0 && (
                    <div>
                      <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 600, marginBottom: 4 }}>As worker</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Stars value={profile.rating_as_worker} />
                        <span style={{ fontWeight: 700 }}>{profile.rating_as_worker.toFixed(1)}</span>
                        <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>({profile.total_ratings_worker})</span>
                      </div>
                    </div>
                  )}
                  {profile?.rating_as_poster && profile.rating_as_poster > 0 && (
                    <div>
                      <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', fontWeight: 600, marginBottom: 4 }}>As employer</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Stars value={profile.rating_as_poster} />
                        <span style={{ fontWeight: 700 }}>{profile.rating_as_poster.toFixed(1)}</span>
                        <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>({profile.total_ratings_poster})</span>
                      </div>
                    </div>
                  )}
                </div>
                {ratingsList.map(r => (
                  <div key={r.id} className="rating-row">
                    <Avatar name={r.rater?.full_name ?? '?'} url={r.rater?.avatar_url} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '.9375rem' }}>{r.rater?.full_name ?? 'User'}</span>
                        <Stars value={r.score} />
                        <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>{timeAgo(r.created_at)}</span>
                      </div>
                      {r.comment && <div className="rating-cmt">"{r.comment}"</div>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* VERIFICATION */}
      {tab === 'verification' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ padding: '18px 20px' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>Identity Verification</div>
                <div style={{ fontSize: '.9375rem', color: 'var(--tx-2)', lineHeight: 1.65 }}>
                  Upload your ID card to become a verified user. Verification builds trust with employers and workers.
                  Your documents are stored securely and never shared publicly.
                </div>
              </div>

              {[
                ['verif-front', 'ID Card — Front side', idFront, setIdFront],
                ['verif-back', 'ID Card — Back side', idBack, setIdBack],
              ].map(([id, label, file, setter]) => (
                <div key={id as string} className="verif-item" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ fontSize: '1.25rem' }}>🪪</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.9375rem' }}>{label as string}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--tx-2)', marginTop: 2 }}>
                        {(file as File | null) ? (file as File).name : 'No file selected'}
                      </div>
                    </div>
                  </div>
                  <label className="btn btn-s btn-sm" style={{ cursor: 'pointer' }}>
                    {(file as File | null) ? 'Change' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                      onChange={e => (setter as (f: File | null) => void)(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              ))}

              <div style={{ marginBottom: 16, padding: '11px 14px', background: 'var(--warn-s)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 'var(--r)', fontSize: '.8125rem', color: 'var(--warn)' }}>
                ⚠ Document number (JMBG) will be stored securely for verification only. It will never be shown to other users.
              </div>

              <button
                className="btn btn-p btn-fw btn-lg"
                onClick={handleVerification}
                disabled={verifying || !idFront || !idBack || profile?.verification_status === 'pending' || profile?.verification_status === 'verified'}
              >
                {verifying ? 'Submitting...' :
                  profile?.verification_status === 'verified' ? '✓ Already verified' :
                  profile?.verification_status === 'pending' ? '⏳ Under review' :
                  'Submit for verification'}
              </button>
            </div>
          </div>

          {/* Verification items */}
          <div className="card">
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--tx-2)', marginBottom: 4 }}>Verification Status</div>
              {[
                ['✉', 'Email', profile?.is_email_verified ? 'Verified' : 'Not verified', profile?.is_email_verified],
                ['📱', 'Phone number', profile?.is_phone_verified ? 'Verified' : 'Not verified', profile?.is_phone_verified],
                ['🪪', 'Identity (ID card)', profile?.verification_status === 'verified' ? 'Verified' : profile?.verification_status === 'pending' ? 'Under review' : 'Not submitted', profile?.verification_status === 'verified'],
              ].map(([icon, label, status, ok]) => (
                <div key={label as string} className="verif-item">
                  <div className="verif-l">
                    <span style={{ fontSize: '1.25rem' }}>{icon as string}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.9375rem' }}>{label as string}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--tx-2)', marginTop: 2 }}>{status as string}</div>
                    </div>
                  </div>
                  <span className={`bdg ${ok ? 'bdg-ok' : 'bdg-neu'}`}>{ok ? '✓' : '–'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
