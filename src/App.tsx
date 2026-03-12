import { useEffect, useMemo, useState } from 'react';
import './App.css';
import 'leaflet/dist/leaflet.css';
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

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [message, setMessage] = useState('');
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user) {
      initializeAppData(user.id);
    }
  }, [user]);

  const firstName = useMemo(() => {
    const source = profile?.full_name || user?.email || 'there';
    return source.split(' ')[0].split('@')[0];
  }, [profile, user]);

  const checkSession = async () => {
    const { session } = await auth.getSession();
    if (session?.user) {
      setUser({ id: session.user.id, email: session.user.email });
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
    const res = userLocation
      ? await jobs.getNearby(userLocation.lat, userLocation.lng, 30)
      : await jobs.getAll({ status: 'open' });

    if (res.error) {
      setMessage(`Jobs error: ${res.error}`);
      setJobsLoading(false);
      return;
    }

    setJobsList((res.data as Job[]) || []);
    setJobsLoading(false);
  };

  const loadMyJobs = async (userId: string) => {
    const res = await jobs.getByPoster(userId);
    if (!res.error) setMyJobs((res.data as Job[]) || []);
  };

  const loadCategories = async () => {
    const res = await jobs.getCategories();
    if (!res.error) setCategories((res.data as Category[]) || []);
  };

  const loadCredits = async (userId: string) => {
    const balance = await credits.getBalance(userId);
    setCreditBalance(balance);
  };

  const loadProfile = async (userId: string) => {
    const res = await profiles.get(userId);
    if (!res.error && res.data) setProfile(res.data);
  };

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    setJobsList([]);
    setMyJobs([]);
    setCreditBalance(0);
    setMessage('');
    setActiveTab('home');
  };

  const afterJobCreated = async () => {
    if (!user) return;
    await Promise.all([loadJobs(), loadMyJobs(user.id), loadCredits(user.id)]);
    setActiveTab('home');
  };

  const requestLocation = async () => {
    if (!navigator.geolocation || !user) {
      setMessage('Geolocation is not available in this browser.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);
        await profiles.updateLocation(user.id, loc.lat, loc.lng);
        setMessage('Location updated. Showing nearby jobs.');
        setLocationLoading(false);
      },
      (error) => {
        setMessage(`Location error: ${error.message}`);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (userLocation) loadJobs();
  }, [userLocation]);

  if (!user) return <AuthScreen onAuthSuccess={setUser} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-block">
            <div className="brand-row">
              <div className="brand-mark">❤</div>
              <h1 className="topbar-title">Hando</h1>
            </div>
            <div className="topbar-sub">Local job marketplace connected to your live Supabase backend</div>
          </div>

          <div className="topbar-right">
            <div className="credit-pill">🪙 {creditBalance} credits</div>
            <div className="user-pill">{firstName}</div>
            <button className="btn-secondary" onClick={handleLogout}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="container">
        {message && <div className="message-banner">{message}</div>}

        {activeTab === 'home' && (
          <>
            <section className="stats-grid shell-wide">
              <div className="stat-card"><div className="stat-value">{profile?.completed_jobs_worker ?? 0}</div><div className="stat-label">Jobs done</div></div>
              <div className="stat-card"><div className="stat-value">{profile?.rating_as_worker ? profile.rating_as_worker.toFixed(1) : '—'}</div><div className="stat-label">Rating</div></div>
              <div className="stat-card"><div className="stat-value">{creditBalance}</div><div className="stat-label">Credits</div></div>
              <div className="stat-card"><div className="stat-value">{jobsList.length}</div><div className="stat-label">Open jobs</div></div>
            </section>

            <HomeScreen
              jobs={jobsList}
              loading={jobsLoading}
              onRefresh={loadJobs}
              userLocation={userLocation}
              onRequestLocation={requestLocation}
              locationLoading={locationLoading}
            />
          </>
        )}

        {activeTab === 'post' && (
          <PostJobScreen
            categories={categories}
            onCreated={afterJobCreated}
            onMessage={setMessage}
            userLocation={userLocation}
            onRequestLocation={requestLocation}
          />
        )}

        {activeTab === 'my-jobs' && (
          <section className="panel shell-wide">
            <div className="section-head compact">
              <div>
                <h3>My posted jobs</h3>
                <p>Everything created with the current account.</p>
              </div>
            </div>
            {myJobs.length === 0 ? (
              <div className="empty-state">You have not posted any jobs yet.</div>
            ) : (
              <div className="job-list-grid">
                {myJobs.map((job) => (
                  <article className="job-card job-card-rich" key={job.id}>
                    <div className="job-card-top">
                      <span className="badge">{job.status}</span>
                      <span className="badge">{job.city}</span>
                    </div>
                    <h3>{job.title}</h3>
                    <p className="job-description">{job.description}</p>
                    <div className="job-meta-row"><span>📍 {job.address}</span></div>
                    <div className="job-meta-row"><span>💰 {job.pay_per_worker} RSD</span><span>👥 {job.accepted_workers}/{job.crew_size}</span></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="panel shell-narrow">
            <div className="profile-hero">
              <div className="avatar-lg">{firstName.slice(0, 1).toUpperCase()}</div>
              <div>
                <h3>{profile?.full_name || firstName}</h3>
                <p>{user.email}</p>
              </div>
            </div>
            <div className="profile-box">
              <div className="profile-line"><strong>User ID:</strong> {user.id}</div>
              <div className="profile-line"><strong>Credits:</strong> {creditBalance}</div>
              <div className="profile-line"><strong>Verification:</strong> {profile?.verification_status || 'unknown'}</div>
              <div className="profile-line"><strong>Current location:</strong> {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Not shared yet'}</div>
            </div>
          </section>
        )}
      </main>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
