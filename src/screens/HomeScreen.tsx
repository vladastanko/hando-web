import { useMemo, useState } from 'react';
import { Search, MapPin, RefreshCw, SlidersHorizontal, List, Map, Columns2, Grid3x3 } from 'lucide-react';
import type { Job, Category, Profile } from '../types';
import { JobCard } from '../components/jobs/JobCard';
import { JobDetailModal } from '../components/jobs/JobDetailModal';
import { FilterPanel, type Filters, DEFAULT_FILTERS } from '../components/jobs/FilterPanel';
import { JobMap } from '../components/map/JobMap';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { useLanguage } from '../i18n';

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
  const [view,        setView]        = useState<View>('split');
  const [search,      setSearch]      = useState('');
  // Category is tracked only in filters — pills and dropdown are in sync
  const [filters,     setFilters]     = useState<Filters>(DEFAULT_FILTERS);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { t } = useLanguage();

  const allCats = useMemo(() => [
    { id: '', name: 'All', icon: null as null, color: '#5b5ef4' },
    ...categories,
  ], [categories]);

  // Filter + sort — reactive to every state change
  const filtered = useMemo(() => {
    let list = [...jobs];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q) ||
        j.city.toLowerCase().includes(q) ||
        j.category?.name.toLowerCase().includes(q)
      );
    }

    if (filters.categoryId) list = list.filter(j => j.category_id === filters.categoryId);
    if (filters.verifiedOnly) list = list.filter(j => j.poster?.verification_status === 'verified');
    if (filters.hasHistory)   list = list.filter(j => (j.poster?.completed_jobs_poster ?? 0) > 0);
    if (filters.minRating > 0) list = list.filter(j => (j.poster?.rating_as_poster ?? 0) >= filters.minRating);
    if (filters.minPay > 0)    list = list.filter(j => j.pay_per_worker >= filters.minPay);
    if (filters.maxPay < 50000) list = list.filter(j => j.pay_per_worker <= filters.maxPay);
    if (filters.maxDistance < 100 && userLocation) {  // 100 = 'any distance'
      list = list.filter(j => (j.distance_km ?? 999) <= filters.maxDistance);
    }

    switch (filters.sortBy) {
      case 'closest':     list.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999)); break;
      case 'highest_pay': list.sort((a, b) => b.pay_per_worker - a.pay_per_worker); break;
      case 'best_rated':  list.sort((a, b) => (b.poster?.rating_as_poster ?? 0) - (a.poster?.rating_as_poster ?? 0)); break;
    }

    return list;
  }, [jobs, search, filters, userLocation]);

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

  const jobsOnMap = filtered.filter(j =>
    j.location?.lat && j.location?.lng
    || (j as unknown as Record<string, number>).lat
  );

  return (
    <>
      <div className="pg">

        {/* ── Search + controls row ───────────────────────── */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          {/* Search input — takes all available space */}
          <div style={{ flex: '1 1 160px', minWidth: 0, position: 'relative' }}>
            <span className="srch-ic"><Search size={16} strokeWidth={1.75} /></span>
            <input
              className="srch-inp"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Icon-only action buttons grouped */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              className="btn btn-s btn-sm"
              onClick={onRequestLocation}
              disabled={locationLoading}
              title={userLocation ? t('updateLocation') : t('enableLocation')}
            >
              {locationLoading
                ? <span className="spin" style={{ width: 14, height: 14 }} />
                : <MapPin size={16} strokeWidth={1.75} color={userLocation ? 'var(--ok)' : undefined} />
              }
            </button>

            <button className="btn btn-s btn-sm" onClick={onRefresh} disabled={loading} title={t('refresh')}>
              {loading ? <span className="spin" style={{ width: 14, height: 14 }} /> : <RefreshCw size={16} strokeWidth={1.75} />}
            </button>

            <button
              className={`btn btn-sm ${activeFiltersCount > 0 ? 'btn-p' : 'btn-s'}`}
              onClick={() => setShowFilters(v => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <SlidersHorizontal size={16} strokeWidth={1.75} />
              {activeFiltersCount > 0 ? activeFiltersCount : ''}
            </button>
          </div>

          {/* View switcher */}
          <div className="vs" style={{ flexShrink: 0 }}>
            <button className={`vs-btn${view === 'list' ? ' on' : ''}`} onClick={() => setView('list')} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><List size={14} strokeWidth={1.75} /><span className="vs-label">{t('listView')}</span></button>
            <button className={`vs-btn${view === 'map'  ? ' on' : ''}`} onClick={() => setView('map')} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Map size={14} strokeWidth={1.75} /><span className="vs-label">{t('mapView')}</span></button>
            <button className={`vs-btn${view === 'split'? ' on' : ''}`} onClick={() => setView('split')} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Columns2 size={14} strokeWidth={1.75} /><span className="vs-label">{t('splitView')}</span></button>
          </div>
        </div>

        {/* ── Category pills ──────────────────────────────── */}
        <div className="cat-row" style={{ marginBottom: 16 }}>
          {allCats.map(cat => (
            <button
              key={cat.id}
              className={`cpill${filters.categoryId === cat.id ? ' on' : ''}`}
              onClick={() => setFilters(f => ({ ...f, categoryId: f.categoryId === cat.id ? '' : cat.id }))}
            >
              {cat.icon === null
                ? <Grid3x3 size={14} strokeWidth={1.75} />
                : <span>{cat.icon}</span>
              }
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* ── Filter panel (drops inline, above content) ──── */}
        {showFilters && (
          <div style={{ marginBottom: 16 }}>
            <FilterPanel categories={categories} filters={filters} onChange={setFilters} />
          </div>
        )}

        {/* ── Result count + location notice ──────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="sec-ttl">{filtered.length} job{filtered.length !== 1 ? 's' : ''}</span>
            {userLocation
              ? <span style={{ fontSize: '.8125rem', color: 'var(--ok)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}><MapPin size={13} strokeWidth={1.75} /> {t('nearYou')}</span>
              : <span style={{ fontSize: '.8125rem', color: 'var(--tx-3)' }}>• {t('enableLocationDistance')}</span>
            }
            {activeFiltersCount > 0 && (
              <span style={{ fontSize: '.75rem', color: 'var(--brand)', fontWeight: 700 }}>
                ({activeFiltersCount} {t('filtersActive')})
              </span>
            )}
          </div>
          {!userLocation && (
            <button className="btn btn-s btn-sm" onClick={onRequestLocation} disabled={locationLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {locationLoading ? '...' : <><MapPin size={14} strokeWidth={1.75} /> {t('enableLocation')}</>}
            </button>
          )}
        </div>

        {/* ── Map view ────────────────────────────────────── */}
        {view === 'map' && (
          <div className="map-wrap">
            <div className="map-hdr">
              <span style={{ fontSize: '.875rem', fontWeight: 600 }}>{jobsOnMap.length} {t('jobsOnMap')}</span>
            </div>
            <JobMap
              jobs={filtered}
              userLocation={userLocation}
              selectedJobId={selectedJob?.id}
              onJobClick={setSelectedJob}
            />
          </div>
        )}

        {/* ── List view ───────────────────────────────────── */}
        {view === 'list' && (
          loading ? (
            <div className="jgrid">
              {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <span className="empty-ic"><Search size={32} strokeWidth={1.5} /></span>
              <span className="empty-t">{t('noJobsFound')}</span>
              <span className="empty-s">
                {activeFiltersCount > 0
                  ? t('tryFilters')
                  : t('tryLater')}
              </span>
            </div>
          ) : (
            <div className="jgrid">
              {filtered.map((job, index) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onClick={setSelectedJob}
                  animationDelay={Math.min(index, 7) * 60}
                />
              ))}
            </div>
          )
        )}

        {/* ── Split view ──────────────────────────────────── */}
        {view === 'split' && (
          <div className="split-view">
            {/* Map panel */}
            <div className="split-map">
              <div className="map-wrap">
                <div className="map-hdr">
                  <span style={{ fontSize: '.875rem', fontWeight: 600 }}>{jobsOnMap.length} {t('onMap')}</span>
                </div>
                <JobMap
                  jobs={filtered}
                  userLocation={userLocation}
                  selectedJobId={selectedJob?.id}
                  onJobClick={job => { setSelectedJob(job); }}
                />
              </div>
            </div>

            {/* List panel */}
            <div className="split-list">
              {loading ? (
                <div className="jgrid" style={{ gridTemplateColumns: '1fr' }}>
                  {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty">
                  <span className="empty-ic"><Search size={32} strokeWidth={1.5} /></span>
                  <span className="empty-t">{t('noJobsFound')}</span>
                  <span className="empty-s">
                    {activeFiltersCount > 0 ? t('tryFilters') : t('tryLater')}
                  </span>
                </div>
              ) : (
                <div className="jgrid" style={{ gridTemplateColumns: '1fr' }}>
                  {filtered.map((job, index) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onClick={j => setSelectedJob(j)}
                      animationDelay={Math.min(index, 7) * 60}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

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
