import { useMemo, useState } from 'react';
import type { Job, Category, Profile } from '../types';
import { JobCard } from '../components/jobs/JobCard';
import { JobDetailModal } from '../components/jobs/JobDetailModal';
import { FilterPanel, type Filters, DEFAULT_FILTERS } from '../components/jobs/FilterPanel';
import { JobMap } from '../components/map/JobMap';

// All categories shown even if empty in DB – user can search/filter
const STATIC_CATEGORIES = [
  { id: '', name: 'All', icon: '✦', color: '#5b5ef4' },
];

interface Props {
  jobs: Job[];
  categories: Category[];
  loading: boolean;
  userLocation: { lat: number; lng: number } | null;
  locationLoading: boolean;
  currentUser: Profile | null;
  onRefresh: () => void;
  onRequestLocation: () => Promise<void> | void;
  onJobApplied: () => void;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

type View = 'list' | 'map' | 'split';

export default function HomeScreen({
  jobs, categories, loading, userLocation, locationLoading,
  currentUser, onRefresh, onRequestLocation, onJobApplied, onMessage,
}: Props) {
  const [view, setView] = useState<View>('list');
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Merge static "All" with DB categories
  const allCats = useMemo(() => [
    { id: '', name: 'All', icon: '✦', color: '#5b5ef4' },
    ...categories,
  ], [categories]);

  // Filter + sort jobs
  const filtered = useMemo(() => {
    let list = [...jobs];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q) ||
        j.city.toLowerCase().includes(q) ||
        j.category?.name.toLowerCase().includes(q)
      );
    }

    // Category pill
    if (activeCat) list = list.filter(j => j.category_id === activeCat);

    // Filters
    if (filters.categoryId) list = list.filter(j => j.category_id === filters.categoryId);
    if (filters.verifiedOnly) list = list.filter(j => j.poster?.verification_status === 'verified');
    if (filters.hasHistory) list = list.filter(j => (j.poster?.completed_jobs_poster ?? 0) > 0);
    if (filters.minRating > 0) list = list.filter(j => (j.poster?.rating_as_poster ?? 0) >= filters.minRating);
    if (filters.minPay > 0) list = list.filter(j => j.pay_per_worker >= filters.minPay);
    if (filters.maxPay < 50000) list = list.filter(j => j.pay_per_worker <= filters.maxPay);
    if (userLocation && filters.maxDistance < 100)
      list = list.filter(j => (j.distance_km ?? 999) <= filters.maxDistance);

    // Sort
    switch (filters.sortBy) {
      case 'closest':
        list.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
        break;
      case 'highest_pay':
        list.sort((a, b) => b.pay_per_worker - a.pay_per_worker);
        break;
      case 'best_rated':
        list.sort((a, b) => (b.poster?.rating_as_poster ?? 0) - (a.poster?.rating_as_poster ?? 0));
        break;
      default: // newest — already sorted from API
        break;
    }

    return list;
  }, [jobs, search, activeCat, filters, userLocation]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filters.categoryId) n++;
    if (filters.verifiedOnly) n++;
    if (filters.hasHistory) n++;
    if (filters.minRating > 0) n++;
    if (filters.minPay > 0) n++;
    if (filters.maxPay < 50000) n++;
    if (filters.maxDistance < 100) n++;
    if (filters.sortBy !== 'newest') n++;
    return n;
  }, [filters]);

  return (
    <>
      <div className="pg">
        {/* Top actions row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="srch-row" style={{ flex: 1, minWidth: 200 }}>
            <div className="srch-w">
              <span className="srch-ic">🔍</span>
              <input
                className="srch-inp"
                placeholder="Search jobs, cities, categories..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Location button (compact) */}
          <button
            className="btn btn-s btn-sm"
            onClick={onRequestLocation}
            disabled={locationLoading}
            title={userLocation ? 'Update location' : 'Enable location'}
            style={{ flexShrink: 0 }}
          >
            {locationLoading ? <span className="spin" style={{ width: 14, height: 14 }} /> : '📍'}
            <span style={{ display: 'none' }}>Loc</span>
          </button>

          {/* Refresh (compact) */}
          <button
            className="btn btn-s btn-sm"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh feed"
            style={{ flexShrink: 0 }}
          >
            {loading ? <span className="spin" style={{ width: 14, height: 14 }} /> : '↻'}
          </button>

          {/* Filter toggle */}
          <button
            className={`btn btn-sm ${activeFiltersCount > 0 ? 'btn-p' : 'btn-s'}`}
            onClick={() => setShowFilters(v => !v)}
            style={{ flexShrink: 0, gap: 5 }}
          >
            ⚙ Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </button>

          {/* View switch */}
          <div className="vs">
            <button className={`vs-btn${view === 'list' ? ' on' : ''}`} onClick={() => setView('list')}>☰ List</button>
            <button className={`vs-btn${view === 'map' ? ' on' : ''}`} onClick={() => setView('map')}>⊕ Map</button>
            <button className={`vs-btn${view === 'split' ? ' on' : ''}`} onClick={() => setView('split')}>⊟ Split</button>
          </div>
        </div>

        {/* Category pills */}
        <div className="cat-row" style={{ marginBottom: 20 }}>
          {allCats.map(cat => (
            <button
              key={cat.id}
              className={`cpill${activeCat === cat.id ? ' on' : ''}`}
              onClick={() => setActiveCat(activeCat === cat.id ? '' : cat.id)}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Main layout: filters sidebar + content */}
        <div className={showFilters ? 'cols' : ''}>
          {showFilters && (
            <FilterPanel categories={categories} filters={filters} onChange={setFilters} />
          )}

          <div style={{ minWidth: 0 }}>
            {/* Result count */}
            <div className="sec-hdr" style={{ marginBottom: 12 }}>
              <div>
                <span className="sec-ttl">{filtered.length} job{filtered.length !== 1 ? 's' : ''}</span>
                {userLocation && <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)', marginLeft: 8 }}>near you</span>}
              </div>
            </div>

            {/* Map view */}
            {(view === 'map' || view === 'split') && (
              <div className="map-wrap" style={{ marginBottom: view === 'split' ? 20 : 0 }}>
                <div className="map-hdr">
                  <span style={{ fontSize: '.875rem', fontWeight: 600 }}>
                    {filtered.filter(j => j.location).length} jobs on map
                  </span>
                  {!userLocation && (
                    <button className="btn btn-s btn-sm" onClick={onRequestLocation}>
                      📍 Enable location
                    </button>
                  )}
                </div>
                <JobMap
                  jobs={filtered}
                  userLocation={userLocation}
                  selectedJobId={selectedJob?.id}
                  onJobClick={setSelectedJob}
                />
              </div>
            )}

            {/* List view */}
            {(view === 'list' || view === 'split') && (
              <>
                {loading ? (
                  <div className="loading"><span className="spin" />Loading jobs...</div>
                ) : filtered.length === 0 ? (
                  <div className="empty">
                    <span className="empty-ic">🔍</span>
                    <span className="empty-t">No jobs found</span>
                    <span className="empty-s">Try adjusting your search or filters, or check back later.</span>
                  </div>
                ) : (
                  <div className="jgrid">
                    {filtered.map(job => (
                      <JobCard key={job.id} job={job} onClick={setSelectedJob} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Job detail modal */}
      <JobDetailModal
        job={selectedJob}
        currentUser={currentUser}
        onClose={() => setSelectedJob(null)}
        onApplied={onJobApplied}
        onMessage={onMessage}
      />
    </>
  );
}
