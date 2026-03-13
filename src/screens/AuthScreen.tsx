import { useState } from 'react';
import { auth } from '../lib/supabase';

type Mode = 'login' | 'signup' | 'forgot';

interface Props {
  onSuccess: (user: { id: string; email?: string }) => void;
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
    if (error) { showMsg(error.message); return; }
    if (data.user && !data.session) {
      showMsg('Account created! Check your inbox to confirm before signing in.', 'ok');
    } else if (data.user) {
      onSuccess({ id: data.user.id, email: data.user.email });
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) { showMsg('Enter your email address to reset your password.'); return; }
    setLoading(true); clear();
    const { error } = await auth.resetPassword(email.trim());
    setLoading(false);
    if (error) { showMsg(error.message); return; }
    showMsg('Reset link sent — check your email inbox.', 'ok');
  };

  const msgBox = msg ? (
    <div style={{
      padding: '11px 14px', borderRadius: 'var(--r)', fontSize: '.875rem',
      background: msgType === 'ok' ? 'var(--ok-s)' : 'var(--err-s)',
      border: `1px solid ${msgType === 'ok' ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`,
      color: msgType === 'ok' ? 'var(--ok)' : 'var(--err)',
    }}>{msg}</div>
  ) : null;

  return (
    <div className="auth-pg">
      <div className="auth-split">
        <div className="auth-side">
          <div className="auth-brand">
            <div className="auth-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="#fff"/>
              </svg>
            </div>
            <span className="auth-logo-name">Hando</span>
          </div>
          <h1 className="auth-hl">Local work,<br /><em>instantly connected</em></h1>
          <p className="auth-sub">Find skilled people nearby or earn money helping your neighbours with real tasks.</p>
          <div className="auth-trust">
            {[
              ['🔒', 'Verified profiles with real ID confirmation'],
              ['⭐', 'Trusted ratings from real completed jobs'],
              ['🗺', 'Map-based matching in your area'],
              ['💰', 'Fair pay, agreed directly between people'],
            ].map(([icon, text]) => (
              <div key={text as string} className="auth-ti">
                <div className="auth-tic">{icon}</div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-card">
          {mode === 'forgot' ? (
            <div className="auth-form">
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '1.1875rem', fontWeight: 800, marginBottom: 5 }}>Reset your password</div>
                <div style={{ fontSize: '.9375rem', color: 'var(--tx-2)' }}>Enter your email and we'll send a reset link.</div>
              </div>
              <div className="fld">
                <label className="flb">Email address</label>
                <input className="inp" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              </div>
              {msgBox}
              <button className="btn btn-p btn-fw btn-lg" onClick={handleForgot} disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
              <button className="btn btn-g btn-fw" style={{ marginTop: -4 }} onClick={() => { setMode('login'); clear(); }}>
                ← Back to sign in
              </button>
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
                  <input className="inp" type="password" placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())} />
                </div>
                {mode === 'login' && (
                  <span className="forgot" onClick={() => { setMode('forgot'); clear(); }}>Forgot password?</span>
                )}
                {msgBox}
                <button className="btn btn-p btn-fw btn-lg" style={{ marginTop: 4 }} onClick={mode === 'login' ? handleLogin : handleSignup} disabled={loading}>
                  {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign in' : 'Create account')}
                </button>
              </div>
              {mode === 'signup' && (
                <div className="auth-foot">By registering you agree to our Terms of Service and Privacy Policy.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
