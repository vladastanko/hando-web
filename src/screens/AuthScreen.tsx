import { useState } from 'react';
import { auth } from '../lib/supabase';

type Props = {
  onAuthSuccess: (user: { id: string; email?: string }) => void;
};

export default function AuthScreen({ onAuthSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    setMessage('');

    const { data, error } = await auth.signUp(email.trim(), password, fullName.trim());

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user && !data.session) {
      setMessage('Account created. Check your inbox if email confirmation is enabled.');
    } else if (data.user) {
      onAuthSuccess({ id: data.user.id, email: data.user.email });
    } else {
      setMessage('Registration completed.');
    }

    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    setMessage('');

    const { data, error } = await auth.signIn(email.trim(), password);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      onAuthSuccess({
        id: data.user.id,
        email: data.user.email,
      });
    }

    setLoading(false);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <div className="auth-logo-icon">🤝</div>
          <h1 className="auth-logo-text">Hando</h1>
          <p className="auth-tagline">Find local help. Fast. Keep the backend, upgrade the experience.</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
          <button
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Register
          </button>
        </div>

        {mode === 'signup' && (
          <div className="form-group">
            <label className="form-label" htmlFor="signup-full-name">Full name</label>
            <input
              id="signup-full-name"
              className="input"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            className="input"
            placeholder="your@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            className="input"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {mode === 'login' ? (
          <button className="btn btn-full" onClick={handleLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        ) : (
          <button className="btn btn-full" onClick={handleSignup} disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        )}

        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
}
