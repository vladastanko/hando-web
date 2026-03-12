import { useEffect, useState } from 'react';
import { auth, jobs } from './lib/supabase';

type SessionUser = {
  id: string;
  email?: string;
};

type JobItem = {
  id: string;
  title: string;
  description: string;
  city: string;
  address: string;
  pay_per_worker: number;
  crew_size: number;
  accepted_workers: number;
  status: string;
  scheduled_date: string;
};

type Category = {
  id: string;
  name: string;
};

export default function App() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [user, setUser] = useState<SessionUser | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [jobsList, setJobsList] = useState<JobItem[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [payPerWorker, setPayPerWorker] = useState('');
  const [crewSize, setCrewSize] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user) {
      loadJobs();
      loadCategories();
    }
  }, [user]);

  const checkSession = async () => {
    const { session, error } = await auth.getSession();

    if (error) {
      setMessage(`Session error: ${error.message}`);
      return;
    }

    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email,
      });
    }
  };

  const loadJobs = async () => {
    setJobsLoading(true);

    const res = await jobs.getAll({ status: 'open' });

    if (res.error) {
      setMessage(`Jobs error: ${res.error}`);
      setJobsLoading(false);
      return;
    }

    setJobsList((res.data as JobItem[]) || []);
    setJobsLoading(false);
  };

  const loadCategories = async () => {
    const res = await jobs.getCategories();
    if (!res.error) {
      setCategories((res.data as Category[]) || []);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setMessage('');

    const { data, error } = await auth.signUp(email, password, fullName);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setMessage('Uspešna registracija. Proveri email ako je potrebna potvrda.');
    } else {
      setMessage('Registracija završena.');
    }

    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    setMessage('');

    const { data, error } = await auth.signIn(email, password);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email,
      });
      setMessage('Uspešan login.');
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    setMessage('');

    const { error } = await auth.signOut();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setUser(null);
    setJobsList([]);
    setMessage('Izlogovan si.');
    setLoading(false);
  };

  const handleCreateJob = async () => {
    setLoading(true);
    setMessage('');

    const res = await jobs.create({
      title,
      description,
      category_id: categoryId,
      address,
      city,
      lat: 44.8176,
      lng: 20.4633,
      scheduled_date: scheduledDate,
      duration_hours: 3,
      pay_per_worker: Number(payPerWorker),
      crew_size: Number(crewSize),
    });

    if (res.error) {
      setMessage(`Create job error: ${res.error}`);
      setLoading(false);
      return;
    }

    setMessage('Posao je uspešno kreiran.');

    setTitle('');
    setDescription('');
    setCategoryId('');
    setCity('');
    setAddress('');
    setPayPerWorker('');
    setCrewSize('');
    setScheduledDate('');

    await loadJobs();
    setLoading(false);
  };

  if (user) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.headerCard}>
            <h1>Hando</h1>
            <p>Ulogovan korisnik:</p>
            <p><strong>{user.email}</strong></p>
            <p style={{ opacity: 0.7 }}>User ID: {user.id}</p>

            <div style={styles.headerButtons}>
              <button style={styles.button} onClick={loadJobs} disabled={jobsLoading}>
                {jobsLoading ? 'Loading jobs...' : 'Refresh jobs'}
              </button>

              <button style={styles.logoutButton} onClick={handleLogout} disabled={loading}>
                {loading ? 'Loading...' : 'Logout'}
              </button>
            </div>

            {message && <p style={styles.message}>{message}</p>}
          </div>

          <div style={styles.formCard}>
            <h2>Post new job</h2>

            <input
              style={styles.input}
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              style={styles.textarea}
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <select
              style={styles.input}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <input
              style={styles.input}
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Pay per worker (RSD)"
              type="number"
              value={payPerWorker}
              onChange={(e) => setPayPerWorker(e.target.value)}
            />

            <input
              style={styles.input}
              placeholder="Crew size"
              type="number"
              value={crewSize}
              onChange={(e) => setCrewSize(e.target.value)}
            />

            <input
              style={styles.input}
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />

            <button style={styles.button} onClick={handleCreateJob} disabled={loading}>
              {loading ? 'Saving...' : 'Post job'}
            </button>
          </div>

          <div style={styles.jobsSection}>
            <h2>Open jobs</h2>

            {jobsLoading ? (
              <p>Loading jobs...</p>
            ) : jobsList.length === 0 ? (
              <p>Nema poslova trenutno.</p>
            ) : (
              <div style={styles.jobsGrid}>
                {jobsList.map((job) => (
                  <div key={job.id} style={styles.jobCard}>
                    <h3 style={{ marginTop: 0 }}>{job.title}</h3>
                    <p>{job.description}</p>
                    <p><strong>City:</strong> {job.city}</p>
                    <p><strong>Address:</strong> {job.address}</p>
                    <p><strong>Pay per worker:</strong> {job.pay_per_worker} RSD</p>
                    <p><strong>Crew:</strong> {job.accepted_workers}/{job.crew_size}</p>
                    <p><strong>Status:</strong> {job.status}</p>
                    <p><strong>Date:</strong> {new Date(job.scheduled_date).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1>Hando</h1>
        <p>{mode === 'login' ? 'Login' : 'Create account'}</p>

        {mode === 'signup' && (
          <input
            style={styles.input}
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        )}

        <input
          style={styles.input}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {mode === 'login' ? (
          <button style={styles.button} onClick={handleLogin} disabled={loading}>
            {loading ? 'Loading...' : 'Login'}
          </button>
        ) : (
          <button style={styles.button} onClick={handleSignup} disabled={loading}>
            {loading ? 'Loading...' : 'Sign up'}
          </button>
        )}

        <button
          style={styles.switchButton}
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setMessage('');
          }}
        >
          {mode === 'login'
            ? 'Nemaš nalog? Registruj se'
            : 'Već imaš nalog? Uloguj se'}
        </button>

        {message && <p style={styles.message}>{message}</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#111',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    padding: '24px',
    boxSizing: 'border-box',
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#1b1b1b',
    border: '1px solid #333',
    borderRadius: '16px',
    padding: '24px',
    boxSizing: 'border-box',
    margin: '80px auto',
  },
  headerCard: {
    background: '#1b1b1b',
    border: '1px solid #333',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
  },
  formCard: {
    background: '#1b1b1b',
    border: '1px solid #333',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
  },
  headerButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '16px',
  },
  jobsSection: {
    background: '#1b1b1b',
    border: '1px solid #333',
    borderRadius: '16px',
    padding: '24px',
  },
  jobsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  jobCard: {
    background: '#222',
    border: '1px solid #3a3a3a',
    borderRadius: '14px',
    padding: '16px',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '12px',
    borderRadius: '10px',
    border: '1px solid #444',
    background: '#222',
    color: 'white',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '12px',
    marginBottom: '12px',
    borderRadius: '10px',
    border: '1px solid #444',
    background: '#222',
    color: 'white',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  button: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    background: '#4f46e5',
    color: 'white',
    cursor: 'pointer',
  },
  logoutButton: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #444',
    background: 'transparent',
    color: 'white',
    cursor: 'pointer',
  },
  switchButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #444',
    background: 'transparent',
    color: 'white',
    cursor: 'pointer',
  },
  message: {
    marginTop: '12px',
    color: '#ccc',
  },
};