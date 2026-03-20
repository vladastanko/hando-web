import { useState } from 'react';
import { auth } from '../lib/supabase';

type Mode = 'login' | 'signup' | 'forgot';

interface Props {
  onSuccess: (user: { id: string; email?: string }) => void;
}

function HandooIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hga" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.85)"/>
        </linearGradient>
      </defs>
      <g fill="url(#hga)">
        <rect x="96" y="96" width="96" height="320" rx="24"/>
        <rect x="320" y="96" width="96" height="320" rx="24"/>
        <rect x="192" y="208" width="128" height="96" rx="24"/>
      </g>
    </svg>
  );
}

export default function AuthScreen({ onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('err');
  const [loading, setLoading] = useState(false);

  const showMsg = (m: string, t: 'ok' | 'err' = 'err') => { setMsg(m); setMsgType(t); };
  const clear = () => setMsg('');

  const handleLogin = async () => {
    if (!email.trim() || !password) { showMsg('Please enter your email and password.'); return; }
    setLoading(true); clear();
    const { data, error } = await auth.signIn(email.trim(), password);
    setLoading(false);
    if (error) { showMsg(error.message); return; }
    if (data.user) onSuccess({ id: data.user.id, email: data.user.email });
  };

  const handleSignup = async () => {
    if (!fullName.trim()) { showMsg('Please enter your full name.'); return; }
    if (!email.trim()) { showMsg('Please enter your email address.'); return; }
    if (password.length < 6) { showMsg('Password must be at least 6 characters.'); return; }
    setLoading(true); clear();
    const { data, error } = await auth.signUp(email.trim(), password, fullName.trim());
    setLoading(false);
    if (error) {
      // "Database error saving new user" usually means the profile trigger is missing
      // Provide a helpful message and guidance
      if (error.message?.toLowerCase().includes('database error')) {
        showMsg('Registration failed: the database trigger is missing. Please run supabase/005_fixes.sql in your Supabase SQL Editor, then try again.');
      } else {
        showMsg(error.message);
      }
      return;
    }
    if (data.user) {
      // Try to create profile manually in case trigger doesn't exist
      try {
        const { supabase: sb } = await import('../lib/supabase');
        await sb.from('profiles').upsert({
          id: data.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
          credits: 20,
          role: 'both',
          rating_as_worker: 0,
          rating_as_poster: 0,
          total_ratings_worker: 0,
          total_ratings_poster: 0,
          completed_jobs_worker: 0,
          completed_jobs_poster: 0,
          verification_status: 'unverified',
          is_email_verified: false,
          is_phone_verified: false,
        }, { onConflict: 'id' });
      } catch {
        // Trigger already handled it — ignore
      }

      if (!data.session) {
        showMsg('Account created! Check your inbox to verify your email before signing in.', 'ok');
      } else {
        onSuccess({ id: data.user.id, email: data.user.email });
      }
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) { showMsg('Enter your email to receive a reset link.'); return; }
    setLoading(true); clear();
    const { error } = await auth.resetPassword(email.trim());
    setLoading(false);
    if (error) { showMsg(error.message); return; }
    showMsg('Reset link sent — check your email inbox.', 'ok');
  };

  const msgBox = msg ? (
    <div style={{
      padding: '11px 14px', borderRadius: 'var(--r)', fontSize: '.875rem', fontWeight: 500,
      background: msgType === 'ok' ? 'var(--ok-s)' : 'var(--err-s)',
      border: `1.5px solid ${msgType === 'ok' ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
      color: msgType === 'ok' ? '#4ade80' : 'var(--err)',
    }}>{msg}</div>
  ) : null;

  return (
    <div className="auth-pg">
      <div className="auth-split">

        {/* ── Left hero ────────────────────────────────── */}
        <div className="auth-side">
          <div className="auth-brand">
            <div className="auth-logo"><HandooIcon size={28} /></div>
            <span className="auth-logo-name">Handoo</span>
          </div>
          <h1 className="auth-hl">
            Local work,<br /><em>done right</em>
          </h1>
          <p className="auth-sub">
            Find skilled people nearby for any physical task — moving, cleaning, delivery, assembly, and more.
            Or earn money by helping your neighbours.
          </p>
          <div className="auth-trust">
            {([
              ['🔒', 'Verified profiles — real ID and email confirmation'],
              ['⭐', 'Transparent ratings from completed real jobs'],
              ['🗺', 'Map-based matching in your neighbourhood'],
              ['💰', 'Fair pay, agreed directly between people'],
            ] as [string, string][]).map(([icon, text]) => (
              <div key={text} className="auth-ti">
                <div className="auth-tic">{icon}</div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right form ───────────────────────────────── */}
        <div className="auth-card">
          {mode === 'forgot' ? (
            <div className="auth-form">
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '1.1875rem', fontWeight: 800, marginBottom: 5 }}>Reset password</div>
                <div style={{ fontSize: '.9375rem', color: 'var(--tx-2)' }}>We'll send a link to your email.</div>
              </div>
              <div className="fld">
                <label className="flb">Email address</label>
                <input className="inp" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              </div>
              {msgBox}
              <button className="btn btn-p btn-fw btn-lg" onClick={handleForgot} disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
              <button className="btn btn-g btn-fw" onClick={() => { setMode('login'); clear(); }}>← Back to sign in</button>
            </div>
          ) : (
            <>
              <div className="auth-tabs">
                <button className={`auth-tab${mode === 'login' ? ' on' : ''}`} onClick={() => { setMode('login'); clear(); }}>Sign in</button>
                <button className={`auth-tab${mode === 'signup' ? ' on' : ''}`} onClick={() => { setMode('signup'); clear(); }}>Register</button>
              </div>

              <div className="auth-form">
                {mode === 'signup' && (
                  <div className="fld">
                    <label className="flb">Full name</label>
                    <input className="inp" placeholder="Ana Marić" value={fullName} onChange={e => setFullName(e.target.value)} autoFocus />
                  </div>
                )}
                <div className="fld">
                  <label className="flb">Email address</label>
                  <input className="inp" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus={mode === 'login'} />
                </div>
                <div className="fld">
                  <label className="flb">Password</label>
                  <input
                    className="inp" type="password"
                    placeholder={mode === 'signup' ? 'Minimum 6 characters' : '••••••••'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())}
                  />
                </div>

                {mode === 'login' && (
                  <span className="forgot" onClick={() => { setMode('forgot'); clear(); }}>Forgot password?</span>
                )}

                {mode === 'signup' && (
                  <div className="info-box brand" style={{ fontSize: '.8125rem' }}>
                    <span style={{ flexShrink: 0 }}>ℹ️</span>
                    <span>After registering, you'll receive a <strong>verification email</strong>. Click the link to activate your account before signing in.</span>
                  </div>
                )}

                {msgBox}

                <button
                  className="btn btn-p btn-fw btn-lg"
                  style={{ marginTop: 4 }}
                  onClick={mode === 'login' ? handleLogin : handleSignup}
                  disabled={loading}
                >
                  {loading
                    ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                    : (mode === 'login' ? 'Sign in' : 'Create account')}
                </button>
              </div>

              {mode === 'signup' && (
                <div className="auth-foot">
                  By registering you agree to our Terms of Service and Privacy Policy.
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
