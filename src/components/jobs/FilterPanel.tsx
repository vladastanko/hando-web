import { useState } from 'react';
import type { Category } from '../../types';

export interface Filters {
  categoryId: string;
  maxDistance: number;
  verifiedOnly: boolean;
  hasHistory: boolean;
  minRating: number;
  minPay: number;
  maxPay: number;
  sortBy: 'newest' | 'closest' | 'highest_pay' | 'best_rated';
}

const DEFAULT_FILTERS: Filters = {
  categoryId: '',
  maxDistance: 50,
  verifiedOnly: false,
  hasHistory: false,
  minRating: 0,
  minPay: 0,
  maxPay: 50000,
  sortBy: 'newest',
};

interface Props {
  categories: Category[];
  filters: Filters;
  onChange: (f: Filters) => void;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'closest', label: 'Closest first' },
  { value: 'highest_pay', label: 'Highest pay' },
  { value: 'best_rated', label: 'Best rated poster' },
] as const;

const RATING_OPTIONS = [
  { value: 0, label: 'Any rating' },
  { value: 4, label: '4+ stars' },
  { value: 5, label: '5 stars only' },
];

function Check({ on }: { on: boolean }) {
  return <div className={`flt-chk${on ? ' on' : ''}`}>{on && <span style={{ color: '#fff', fontSize: '.625rem', fontWeight: 800 }}>✓</span>}</div>;
}

function Radio({ on }: { on: boolean }) {
  return <div className={`flt-rad${on ? ' on' : ''}`} />;
}

export function FilterPanel({ categories, filters, onChange }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <aside className="flt-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '.9375rem', fontWeight: 700 }}>Filters</span>
        <button className="btn btn-g btn-sm" onClick={() => onChange({ ...DEFAULT_FILTERS })}>Reset</button>
      </div>

      {/* Sort */}
      <div className="flt-sect">
        <div className="flt-lbl">Sort by</div>
        {SORT_OPTIONS.map(o => (
          <label key={o.value} className="flt-opt">
            <Radio on={filters.sortBy === o.value} />
            <span onClick={() => set({ sortBy: o.value })}>{o.label}</span>
          </label>
        ))}
      </div>

      {/* Category */}
      <div className="flt-sect">
        <div className="flt-lbl">Category</div>
        <select
          className="sel"
          value={filters.categoryId}
          onChange={e => set({ categoryId: e.target.value })}
          style={{ height: 38, fontSize: '.8125rem' }}
        >
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      {/* Distance */}
      <div className="flt-sect">
        <div className="flt-lbl">Max distance: {filters.maxDistance} km</div>
        <input
          type="range" min={1} max={100} step={1}
          value={filters.maxDistance}
          onChange={e => set({ maxDistance: Number(e.target.value) })}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--tx-3)' }}>
          <span>1 km</span><span>100 km</span>
        </div>
      </div>

      {/* Rating */}
      <div className="flt-sect">
        <div className="flt-lbl">Poster rating</div>
        {RATING_OPTIONS.map(o => (
          <label key={o.value} className="flt-opt">
            <Radio on={filters.minRating === o.value} />
            <span onClick={() => set({ minRating: o.value })}>{o.label}</span>
          </label>
        ))}
      </div>

      {/* Pay range */}
      <div className="flt-sect">
        <div className="flt-lbl">Pay per worker</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="inp" type="number" placeholder="Min" min={0}
            value={filters.minPay || ''}
            onChange={e => set({ minPay: Number(e.target.value) })}
            style={{ height: 36, fontSize: '.8125rem' }}
          />
          <input
            className="inp" type="number" placeholder="Max" min={0}
            value={filters.maxPay === 50000 ? '' : filters.maxPay}
            onChange={e => set({ maxPay: e.target.value ? Number(e.target.value) : 50000 })}
            style={{ height: 36, fontSize: '.8125rem' }}
          />
        </div>
        <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>RSD</span>
      </div>

      {/* Trust */}
      <div className="flt-sect">
        <div className="flt-lbl">Trust & verification</div>
        <label className="flt-opt" onClick={() => set({ verifiedOnly: !filters.verifiedOnly })}>
          <Check on={filters.verifiedOnly} />
          <span>Verified users only</span>
        </label>
        <label className="flt-opt" onClick={() => set({ hasHistory: !filters.hasHistory })}>
          <Check on={filters.hasHistory} />
          <span>Has completed jobs</span>
        </label>
      </div>
    </aside>
  );
}

export { DEFAULT_FILTERS };
