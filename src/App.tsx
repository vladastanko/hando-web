import { useEffect, useState } from 'react';
import './App.css';
import { auth, credits, jobs } from './lib/supabase';
import BottomNav from './components/BottomNav';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import PostJobScreen from './screens/PostJobScreen';

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

type TabKey = 'home' | 'post' | 'my-jobs' | 'profile';

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [message, setMessage] = useState('');

  const [jobsList, setJobsList] = useState<JobItem[]>([]);
  const [myJobs, setMyJobs] = useState<JobItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user) {
      initializeAppData(user.id);
    }
  }, [user]);

  const checkSession = async () => {
    const { session } = await auth.getSession();

    if (session?.user) {
      setUser({
        id: session.user.id,
        email: session.user.email,
      });
    }
  };

  const initializeAppData = async (userId: string) => {
    await Promise.all([
      loadJobs(),
      loadCategories(),
      loadCredits(userId),
      loadMyJobs(userId),
    ]);
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

  const loadMyJobs = async (userId: string) => {
    const res = await jobs.getByPoster(userId);
    if (!res.error) {
      setMyJobs((res.data as JobItem[]) || []);
    }
  };

  const loadCategories = async () => {
    const res = await jobs.getCategories();
    if (!res.error) {
      setCategories((res.data as Category[]) || []);
    }
  };

  const loadCredits = async (userId: string) => {
    const balance = await credits.getBalance(userId);
    setCreditBalance(balance);
  };

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
    setJobsList([]);
    setMyJobs([]);
    setCreditBalance(0);
    setMessage('');
    setActiveTab('home');
  };

  const afterJobCreated = async () => {
    if (!user) return;

    await Promise.all([
      loadJobs(),
      loadMyJobs(user.id),
      loadCredits(user.id),
    ]);

    setActiveTab('home');
  };

  if (!user) {
    return <AuthScreen onAuthSuccess={setUser} />;
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-inner">
          <div>
            <h1 className="topbar-title">Hando</h1>
            <div className="topbar-sub">Live marketplace MVP connected to Supabase</div>
          </div>

          <div className="topbar-right">
            <div className="credit-pill">Credits: {creditBalance}</div>
            <div className="user-pill">{user.email}</div>
            <button className="btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {message && <div className="message" style={{ marginBottom: 16 }}>{message}</div>}

        {activeTab === 'home' && (
          <div className="grid">
            <div>
              <HomeScreen jobs={jobsList} loading={jobsLoading} onRefresh={loadJobs} />
            </div>

            <div>
              <div className="panel">
                <h2>Quick overview</h2>
                <div className="kpi-row">
                  <div className="kpi">
                    <div className="kpi-label">Open jobs</div>
                    <div className="kpi-value">{jobsList.length}</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">My jobs</div>
                    <div className="kpi-value">{myJobs.length}</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">Credits</div>
                    <div className="kpi-value">{creditBalance}</div>
                  </div>
                </div>

                <div className="panel-muted">
                  Next step is to add apply flow, applicant review, notifications, and profile verification.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'post' && (
          <div className="grid">
            <div>
              <PostJobScreen
                categories={categories}
                onCreated={afterJobCreated}
                onMessage={setMessage}
              />
            </div>

            <div>
              <div className="panel">
                <h2>Posting rules</h2>
                <div className="panel-muted">
                  Posting a job currently costs 10 credits. Crew size and payment are stored in the live database.
                </div>
                <div className="profile-box">
                  <div className="profile-line">Use a clear title and exact location.</div>
                  <div className="profile-line">Describe what kind of help you need.</div>
                  <div className="profile-line">Add realistic pay per worker.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'my-jobs' && (
          <div className="panel">
            <h2>My posted jobs</h2>
            <div className="panel-muted">
              Jobs you created with your current account.
            </div>

            {myJobs.length === 0 ? (
              <div className="empty-state">You have not posted any jobs yet.</div>
            ) : (
              <div className="job-list">
                {myJobs.map((job) => (
                  <div className="job-card" key={job.id}>
                    <div className="badge-row">
                      <span className="badge">{job.status}</span>
                      <span className="badge">{job.city}</span>
                    </div>
                    <h3>{job.title}</h3>
                    <div>{job.description}</div>
                    <div className="job-meta">
                      <div><strong>Address:</strong> {job.address}</div>
                      <div><strong>Pay:</strong> {job.pay_per_worker} RSD</div>
                      <div><strong>Crew:</strong> {job.accepted_workers}/{job.crew_size}</div>
                      <div><strong>Date:</strong> {new Date(job.scheduled_date).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="panel">
            <h2>Profile</h2>
            <div className="panel-muted">Basic live account data from your current session.</div>

            <div className="profile-box">
              <div className="profile-line"><strong>Email:</strong> {user.email}</div>
              <div className="profile-line"><strong>User ID:</strong> {user.id}</div>
              <div className="profile-line"><strong>Credits:</strong> {creditBalance}</div>
              <div className="profile-line"><strong>Status:</strong> Logged in</div>
            </div>
          </div>
        )}
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}