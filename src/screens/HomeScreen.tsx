import { useMemo, useState } from 'react';
import type { Category, Job } from '../types';

type Props = {
  jobs: Job[];
  loading: boolean;
  onRefresh: () => void;
  categories: Category[];
  userName: string;
  stats: {
    completedJobs: number;
    rating: number;
    credits: number;
    openJobs: number;
    myJobs: number;
  };
  onOpenPost: () => void;
};

export default function HomeScreen({
  jobs,
  loading,
  onRefresh,
  categories,
  userName,
  stats,
  onOpenPost,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    if (!selectedCategory) return jobs;
    return jobs.filter((job) => job.category_id === selectedCategory);
  }, [jobs, selectedCategory]);

  return (
    <div className="home-stack">
      <section className="hero-card panel">
        <div className="hero-copy">
          <div className="eyebrow">👋 Welcome back</div>
          <h2>{userName}</h2>
          <p className="panel-copy">Browse open tasks, post a new job, and keep everything synced with Supabase.</p>
        </div>

        <div className="hero-actions">
          <button className="btn" onClick={onOpenPost}>✚ Post a job</button>
          <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.completedJobs}</div>
          <div className="stat-label">Jobs done</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.rating ? stats.rating.toFixed(1) : '—'}</div>
          <div className="stat-label">Rating</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.credits}</div>
          <div className="stat-label">Credits</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.openJobs}</div>
          <div className="stat-label">Open jobs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.myJobs}</div>
          <div className="stat-label">My jobs</div>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Categories</h2>
            <p className="panel-copy">Filter the feed without touching backend logic.</p>
          </div>
        </div>

        <div className="chip-row">
          <button
            className={`chip ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              className={`chip ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Nearby jobs</h2>
            <p className="panel-copy">Live jobs from the database, restyled to match the prototype direction.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <div className="empty-title">Loading jobs...</div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">No jobs found</div>
            <p className="panel-copy">Try another category or add a new task.</p>
          </div>
        ) : (
          <div className="job-list">
            {filteredJobs.map((job) => {
              const spotsLeft = Math.max(job.crew_size - job.accepted_workers, 0);
              return (
                <article className="job-card" key={job.id}>
                  <div className="job-card-header">
                    <div className="job-category-chip">
                      {job.category?.icon || '🧰'} {job.category?.name || 'General'}
                    </div>
                    <span className="badge badge-open">Open</span>
                  </div>

                  <h3 className="job-title">{job.title}</h3>
                  <p className="job-description">{job.description}</p>

                  <div className="job-meta-row">
                    <span>📍 {job.city}</span>
                    <span>📅 {formatDate(job.scheduled_date)}</span>
                    <span>⏱ {job.duration_hours}h</span>
                  </div>

                  <div className="job-footer-row">
                    <div className="job-pay">
                      {formatCurrency(job.pay_per_worker)}<small> / worker</small>
                    </div>
                    <div className="crew-inline">👥 {spotsLeft} left</div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
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
  const date = new Date(value);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
