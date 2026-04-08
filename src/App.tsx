import React, { useEffect, useState, useCallback } from 'react';
import { Briefcase, Star, Coins, MapPin, ChevronLeft } from 'lucide-react';
import './index.css';
import { auth, credits as creditsApi, jobs as jobsApi, profiles as profilesApi } from './lib/supabase';
import type { Category, Job, Profile } from './types';
import { useLanguage } from './i18n';

import { TopBar } from './components/layout/TopBar';
import { BottomNav, type TabKey } from './components/layout/BottomNav';
import { ToastArea } from './components/ui/Toast';
import { useToast } from './hooks/useToast';
import { useLocation } from './hooks/useLocation';

import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import PostJobScreen from './screens/PostJobScreen';
import ApplicationsScreen from './screens/ApplicationsScreen';
import ProfileScreen from './screens/ProfileScreen';
import CreditsScreen from './screens/CreditsScreen';
import InboxScreen from './screens/InboxScreen';
import AdminScreen from './screens/AdminScreen';
import ReferralScreen from './screens/ReferralScreen';

type AppMode = 'find' | 'post';
type View    = TabKey | 'credits' | 'referral';

interface SessionUser { id: string; email?: string; }

export default function App() {
  const [user,          setUser]          = useState<SessionUser | null>(null);
  const [profile,       setProfile]       = useState<Profile | null>(null);
  const [activeTab,     setActiveTab]     = useState<TabKey>('home');
  const [view,          setView]          = useState<View>('home');
  const [appMode,       setAppMode]       = useState<AppMode>('find');
  const [jobsList,      setJobsList]      = useState<Job[]>([]);
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [jobsLoading,   setJobsLoading]   = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [inboxUnread,   setInboxUnread]   = useState(0);

  const { toasts, toast }                                           = useToast();
  const { location: userLocation, loading: locLoading, request: requestLocation } = useLocation();
  const { t } = useLanguage();

  // ─── Auth ─────────────────────────────────────────────────────────────
  useEffect(() => {
    auth.getSession().then(({ session }) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email });
    });

    const { data: { subscription } } = auth.onAuthChange?.((_, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
      } else {
        setUser(null);
        setProfile(null);
        setCreditBalance(0);
        setJobsList([]);
        setCategories([]);
        setActiveTab('home');
        setView('home');
        setAppMode('find');
      }
    }) ?? { data: { subscription: null } };

    return () => subscription?.unsubscribe();
  }, []);

  // ─── Loaders ──────────────────────────────────────────────────────────
  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    const res = userLocation
      ? await jobsApi.getNearby(userLocation.lat, userLocation.lng, 100)
      : await jobsApi.getAll({ status: 'open' });
    if (!res.error) setJobsList((res.data as Job[]) ?? []);
    setJobsLoading(false);
  }, [userLocation]);

  const loadCredits = useCallback(async (uid: string) => {
    setCreditBalance(await creditsApi.getBalance(uid));
  }, []);

  const loadProfile = useCallback(async (uid: string) => {
    const res = await profilesApi.get(uid);
    if (!res.error && res.data) setProfile(res.data);
  }, []);

  const loadCategories = useCallback(async () => {
    const res = await jobsApi.getCategories();
    if (!res.error) setCategories((res.data as Category[]) ?? []);
  }, []);

  // Init when user logs in
  useEffect(() => {
    if (!user) return;
    loadJobs();
    loadCategories();
    loadCredits(user.id);
    loadProfile(user.id);
    // Auto-request location on app open
    requestLocation();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh jobs + save location when GPS updates
  useEffect(() => {
    if (!userLocation || !user) return;
    loadJobs();
    profilesApi.updateLocation(user.id, userLocation.lat, userLocation.lng);
  }, [userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Navigation ───────────────────────────────────────────────────────
  const navTo = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setView(tab);
    // Refresh profile stats whenever user navigates (keeps metrics fresh)
    if (user) loadProfile(user.id);
  }, [user, loadProfile]);

  const handleModeChange = useCallback((mode: AppMode) => {
    setAppMode(mode);
    setActiveTab('home');
    setView('home');
  }, []);

  const handleLogout = useCallback(() => {
    auth.signOut();
  }, []);

  // ─── Job callbacks ────────────────────────────────────────────────────
  const handleJobApplied = useCallback(() => {
    if (user) {
      loadCredits(user.id);
      loadProfile(user.id); // Refresh profile stats after applying
    }
  }, [user, loadCredits, loadProfile]);

  const handleJobCreated = useCallback(async () => {
    if (!user) return;
    await Promise.all([loadJobs(), loadCredits(user.id)]);
    setAppMode('find');
    setActiveTab('applications');
    setView('applications');
  }, [user, loadJobs, loadCredits]);

  // ─── Admin gate ───────────────────────────────────────────────────────
  const isAdminMode = new URLSearchParams(window.location.search).get('admin') === '1';
  if (isAdminMode) {
    return <AdminScreen onExit={() => window.history.replaceState({}, '', window.location.pathname)} />;
  }

  // ─── Auth gate ────────────────────────────────────────────────────────
  if (!user) return <AuthScreen onSuccess={setUser} />;

  const isPostMode = appMode === 'post' && view === 'home';

  return (
    <div className="app-shell">

      <TopBar
        profile={profile}
        email={user.email}
        userId={user.id}
        creditBalance={creditBalance}
        mode={appMode}
        onModeChange={handleModeChange}
        onCreditsClick={() => setView('credits')}
        onProfileClick={() => navTo('profile')}
        onLogout={handleLogout}
        onNavigate={(v) => navTo(v as Parameters<typeof navTo>[0])}
      />

      <ToastArea toasts={toasts} />

      <main className="app-body">

        {/* ── Credits ─────────────────────────────────────── */}
        {view === 'credits' && (
          <div className="view-enter" key="credits">
            <div className="pg" style={{ paddingBottom: 0 }}>
              <button className="btn btn-g btn-sm" onClick={() => setView(activeTab)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ChevronLeft size={16} strokeWidth={1.75} /> {t('back')}
              </button>
            </div>
            <CreditsScreen
              userId={user.id}
              userEmail={user.email}
              balance={creditBalance}
              onPurchased={() => loadCredits(user.id)}
              onMessage={(m, t) => toast(m, t ?? 'info')}
            />
          </div>
        )}

        {/* ── Home ─────────────────────────────────────────── */}
        {view === 'home' && (
          <div className="view-enter" key="home">
            {isPostMode ? (
              <PostJobScreen
                categories={categories}
                creditBalance={creditBalance}
                userLocation={userLocation}
                onRequestLocation={requestLocation}
                onCreated={handleJobCreated}
                onGoToCredits={() => setView('credits')}
                onMessage={(m, t) => toast(m, t ?? 'info')}
              />
            ) : (
              <>
                <div className="pg" style={{ paddingBottom: 0 }}>
                  <div className="stats-row">
                    {(
                      [
                        { icon: <Briefcase size={20} strokeWidth={1.75} />, value: profile?.completed_jobs_worker ?? 0, label: t('statJobsDone') },
                        { icon: <Star size={20} strokeWidth={1.75} />, value: (profile?.total_ratings_worker ?? 0) > 0 ? (profile?.rating_as_worker ?? 0).toFixed(1) : '—', label: t('statRating') },
                        { icon: <Coins size={20} strokeWidth={1.75} />, value: creditBalance, label: t('statCredits') },
                        { icon: <MapPin size={20} strokeWidth={1.75} />, value: jobsList.length, label: t('statNearby') },
                      ] as Array<{ icon: React.ReactNode; value: string | number; label: string }>
                    ).map(s => (
                      <div key={s.label} className="stat-ch">
                        <div className="stat-ic">{s.icon}</div>
                        <div className="stat-v">{s.value}</div>
                        <div className="stat-lb">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <HomeScreen
                  jobs={jobsList}
                  categories={categories}
                  loading={jobsLoading}
                  userLocation={userLocation}
                  locationLoading={locLoading}
                  currentUser={profile}
                  onRefresh={loadJobs}
                  onRequestLocation={requestLocation}
                  onJobApplied={handleJobApplied}
                  onMessage={(m, t) => toast(m, t ?? 'info')}
                />
              </>
            )}
          </div>
        )}

        {/* ── Applications ─────────────────────────────────── */}
        {view === 'applications' && (
          <div className="view-enter" key="applications">
            <ApplicationsScreen
              currentUser={profile ?? { id: user.id, email: user.email }}
              onMessage={(m, t) => toast(m, t ?? 'info')}
              onCreditChange={() => loadCredits(user.id)}
              onOpenChat={() => navTo('inbox')}
            />
          </div>
        )}

        {/* ── Inbox — uvek mountovan za realtime unread ─────── */}
        <div style={{ display: view === 'inbox' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <InboxScreen
            currentUser={user}
            profile={profile}
            onMessage={(m, t) => toast(m, t ?? 'info')}
            onUnreadChange={setInboxUnread}
            isActive={view === 'inbox'}
          />
        </div>

        {/* ── Profile ──────────────────────────────────────── */}
        {view === 'profile' && (
          <div className="view-enter" key="profile">
            <ProfileScreen
              currentUser={user}
              profile={profile}
              onProfileUpdated={setProfile}
              onMessage={(m, t) => toast(m, t ?? 'info')}
              onReferralClick={() => setView('referral')}
            />
          </div>
        )}

        {/* ── Referral ─────────────────────────────────────── */}
        {view === 'referral' && (
          <div className="view-enter" key="referral">
            <ReferralScreen
              userId={user!.id}
              referralCode={profile?.referral_code ?? null}
              onBack={() => setView('profile')}
              onMessage={(m, t) => toast(m, t === 'success' ? 'success' : 'error')}
            />
          </div>
        )}

      </main>

      <BottomNav active={activeTab} onChange={navTo} badges={{ inbox: inboxUnread }} />

    </div>
  );
}
