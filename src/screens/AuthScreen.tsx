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

    if (data.user) {
      setMessage('Registracija uspešna. Ako je uključena potvrda email-a, proveri inbox.');
    } else {
      setMessage('Registracija završena.');
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
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="brand">Hando</h1>
        <p className="brand-sub">
          Find trusted local help or earn money with short local jobs.
        </p>

        <div className="mode-switch">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
        </div>

        {mode === 'signup' && (
          <input
            className="input"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        )}

        <input
          className="input"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {mode === 'login' ? (
          <button className="btn" onClick={handleLogin} disabled={loading}>
            {loading ? 'Loading...' : 'Login'}
          </button>
        ) : (
          <button className="btn" onClick={handleSignup} disabled={loading}>
            {loading ? 'Loading...' : 'Create account'}
          </button>
        )}

        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
}