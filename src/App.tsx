import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { auth, credits, jobs, profiles } from './lib/supabase';
import type { Category, Job, Profile } from './types';
import BottomNav from './components/BottomNav';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import PostJobScreen from './screens/PostJobScreen';

type SessionUser = {
  id: string;
  email?: string;
};

type TabKey = 'home' | 'post' | 'my-jobs' | 'profile';

type Flash = {
  type: 'success' | 'error' | 'info';
  text: string;
} | null;

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [flash, setFlash] = useState<Flash>(null);

  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [profileSaving, setProfileSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editBio, setEditBio] = useState('');

  useEffect(() => {
    void checkSession();
  }, []);

  useEffect(() => {
    if (!user) return;
    void initializeAppData(user.id);
  }, [user]);

  useEffect(() => {
    if (!flash) return;
    const timeout = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [flash]);

  const openJobsCount = useMemo(
    () => jobsList.filter((job) => job.status === 'open').length,
    [jobsList],
  );

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
      loadProfile(userId),
    ]);
  };

  const loadJobs = async () => {
    setJobsLoading(true);
    const res = await jobs.getAll({ status: 'open' });

    if (res.error) {
      setFlash({ type: 'error', text: `Jobs error: ${res.error}` });
      setJobsLoading(false);
      return;
    }

    setJobsList(res.data || []);
    setJobsLoading(false);
  };

  const loadMyJobs = async (userId: string) => {
    const res = await jobs.getByPoster(userId);
    if (res.error) return;
    setMyJobs(res.data || []);
  };

  const loadCategories = async () => {
    const res = await jobs.getCategories();
    if (res.error) return;
    setCategories(res.data || []);
  };

  const loadCredits = async (userId: string) => {
    const balance = await credits.getBalance(userId);
    setCreditBalance(balance);
  };

  const loadProfile = async (userId: string) => {
    const res = await profiles.get(userId);
    if (res.error || !res.data) return;

    setProfile(res.data);
    setEditName(res.data.full_name || '');
    setEditCity(res.data.city || '');
    setEditBio(res.data.bio || '');
  };

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    setJobsList([]);
    setMyJobs([]);
    setCreditBalance(0);
    setFlash(null);
    setActiveTab('home');
  };

  const afterJobCreated = async () => {
    if (!user) return;

    await Promise.all([
      loadJobs(),
      loadMyJobs(user.id),
      loadCredits(user.id),
      loadProfile(user.id),
    ]);

    setFlash({ type: 'success', text: 'Job posted successfully.' });
    setActiveTab('home');
  };

  const saveProfile = async () => {
    if (!user) return;
    if (!editName.trim()) {
      setFlash({ type: 'error', text: 'Full name is required.' });
      return;
    }

    setProfileSaving(true);
    const res = await profiles.update(user.id, {
      full_name: editName.trim(),
      city: editCity.trim(),
      bio: editBio.trim(),
    });

    if (res.error || !res.data) {
      setFlash({ type: 'error', text: res.error || 'Profile update failed.' });
      setProfileSaving(false);
      return;
    }

    setProfile(res.data);
    setFlash({ type: 'success', text: 'Profile updated.' });
    setProfileSaving(false);
  };

  if (!user) {
    return <AuthScreen onAuthSuccess={setUser} />;
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-inner">
          <div>
            <div className="topbar-brand">🤝 Hando</div>
            <div className="topbar-sub">Local job marketplace connected to your live Supabase backend</div>
          </div>

          <div className="topbar-right">
            <div className="credit-badge">🪙 {creditBalance} credits</div>
            <div className="user-badge">{profile?.full_name || user.email || 'User'}</div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      <main className="container app-content">
        {flash && <div className={`alert alert-${flash.type}`}>{flash.text}</div>}

        {activeTab === 'home' && (
          <div className="tab-screen active">
            <HomeScreen
              jobs={jobsList}
              loading={jobsLoading}
              onRefresh={loadJobs}
              categories={categories}
              userName={profile?.full_name || user.email || 'Friend'}
              stats={{
                completedJobs: profile?.completed_jobs_worker || 0,
                rating: profile?.rating_as_worker || 0,
                credits: creditBalance,
                openJobs: openJobsCount,
                myJobs: myJobs.length,
              }}
              onOpenPost={() => setActiveTab('post')}
            />
          </div>
        )}

        {activeTab === 'post' && (
          <div className="grid-layout">
            <div>
              <PostJobScreen
                categories={categories}
                onCreated={afterJobCreated}
                onMessage={(text, type = 'info') => setFlash({ text, type })}
              />
            </div>

            <aside className="panel side-panel">
              <h2>Posting tips</h2>
              <p className="panel-copy">
                Backend ostaje isti: job ide kroz Supabase RPC i troši 10 kredita atomski,
                baš kao u tvojoj postojećoj logici.
              </p>
              <div className="rule-list">
                <div className="rule-item">Napiši jasan naslov i šta tačno treba da se uradi.</div>
                <div className="rule-item">Unesi realnu cenu po radniku i tačnu adresu.</div>
                <div className="rule-item">Crew size i datum se upisuju direktno u bazu.</div>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'my-jobs' && (
          <div className="grid-layout">
            <section className="panel">
              <div className="section-header">
                <div>
                  <h2>My posted jobs</h2>
                  <p className="panel-copy">Sve što si kreirao sa trenutnim nalogom.</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => user && loadMyJobs(user.id)}>
                  Refresh
                </button>
              </div>

              {myJobs.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <div className="empty-title">No jobs posted yet</div>
                  <p className="panel-copy">Post your first task and it will appear here.</p>
                </div>
              ) : (
                <div className="job-list">
                  {myJobs.map((job) => {
                    const spotsLeft = Math.max(job.crew_size - job.accepted_workers, 0);
                    return (
                      <article className="job-card" key={job.id}>
                        <div className="job-card-header">
                          <div>
                            <div className="job-category-chip">🗂 {job.city}</div>
                            <h3 className="job-title">{job.title}</h3>
                          </div>
                          <span className={`badge badge-${job.status === 'open' ? 'open' : 'pending'}`}>
                            {job.status}
                          </span>
                        </div>

                        <p className="job-description">{job.description}</p>

                        <div className="job-meta-row">
                          <span>📍 {job.address}</span>
                          <span>📅 {formatDate(job.scheduled_date)}</span>
                          <span>👥 {spotsLeft} spots left</span>
                        </div>

                        <div className="job-footer-row">
                          <div className="job-pay">{formatCurrency(job.pay_per_worker)}<small> / worker</small></div>
                          <div className="crew-inline">
                            <span>{job.accepted_workers}/{job.crew_size} accepted</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="panel side-panel">
              <h2>Summary</h2>
              <div className="stats-grid compact">
                <div className="stat-card">
                  <div className="stat-value">{myJobs.length}</div>
                  <div className="stat-label">Posted</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{myJobs.filter((job) => job.status === 'open').length}</div>
                  <div className="stat-label">Open</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{myJobs.reduce((sum, job) => sum + job.accepted_workers, 0)}</div>
                  <div className="stat-label">Workers</div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="grid-layout">
            <section className="panel">
              <div className="profile-hero">
                <div className="avatar-xl">{(profile?.full_name || user.email || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <h2>{profile?.full_name || 'Profile'}</h2>
                  <p className="panel-copy">{profile?.city || 'No city added yet'}</p>
                  <div className="badge-row">
                    <span className={`badge badge-${profile?.verification_status === 'verified' ? 'accepted' : 'pending'}`}>
                      {profile?.verification_status || 'unverified'}
                    </span>
                    {profile?.is_email_verified && <span className="badge badge-open">email verified</span>}
                    {profile?.is_phone_verified && <span className="badge badge-accepted">phone verified</span>}
                  </div>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{profile?.completed_jobs_worker || 0}</div>
                  <div className="stat-label">Jobs done</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{profile?.rating_as_worker ? profile.rating_as_worker.toFixed(1) : '—'}</div>
                  <div className="stat-label">Worker rating</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{creditBalance}</div>
                  <div className="stat-label">Credits</div>
                </div>
              </div>

              <div className="profile-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-name">Full name</label>
                  <input
                    id="edit-name"
                    className="input"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-city">City</label>
                  <input
                    id="edit-city"
                    className="input"
                    value={editCity}
                    onChange={(event) => setEditCity(event.target.value)}
                    placeholder="Belgrade"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-bio">Bio</label>
                <textarea
                  id="edit-bio"
                  className="textarea"
                  value={editBio}
                  onChange={(event) => setEditBio(event.target.value)}
                  placeholder="Tell people what kind of jobs you usually do"
                />
              </div>

              <button className="btn" onClick={saveProfile} disabled={profileSaving}>
                {profileSaving ? 'Saving...' : 'Save changes'}
              </button>
            </section>

            <aside className="panel side-panel">
              <h2>Account details</h2>
              <div className="rule-list">
                <div className="rule-item"><strong>Email:</strong> {profile?.email || user.email || '—'}</div>
                <div className="rule-item"><strong>Role:</strong> {profile?.role || 'both'}</div>
                <div className="rule-item"><strong>Poster rating:</strong> {profile?.rating_as_poster ? profile.rating_as_poster.toFixed(1) : '—'}</div>
                <div className="rule-item"><strong>Completed as poster:</strong> {profile?.completed_jobs_poster || 0}</div>
              </div>
            </aside>
          </div>
        )}
      </main>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string) {
  if (!value) return 'No date';
  const date = new Date(value);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
