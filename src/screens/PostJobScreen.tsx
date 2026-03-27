import { useState, useEffect, useRef, useCallback } from 'react';
import { jobs } from '../lib/supabase';
import type { Category } from '../types';
import type { UserLocation } from '../hooks/useLocation';

interface Props {
  categories: Category[];
  creditBalance: number;
  userLocation: UserLocation | null;
  onRequestLocation: () => Promise<void> | void;
  onCreated: () => Promise<void>;
  onGoToCredits: () => void;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

const EXTRA_CATEGORIES = [
  { name: 'Moving Help', icon: '📦' },
  { name: 'Furniture Assembly', icon: '🪑' },
  { name: 'Cleaning', icon: '🧹' },
  { name: 'Delivery', icon: '🚚' },
  { name: 'Handyman', icon: '🔧' },
  { name: 'Painting', icon: '🖌' },
  { name: 'Gardening', icon: '🌿' },
  { name: 'Pet Care', icon: '🐾' },
  { name: 'Elderly Assistance', icon: '🤝' },
  { name: 'Childcare', icon: '👶' },
  { name: 'Event Help', icon: '🎉' },
  { name: 'Warehouse Help', icon: '🏭' },
  { name: 'Construction Help', icon: '🏗' },
  { name: 'Electrical Work', icon: '⚡' },
  { name: 'Plumbing', icon: '🔩' },
  { name: 'Appliance Help', icon: '🛠' },
  { name: 'Car Wash / Detailing', icon: '🚗' },
  { name: 'Beauty / Personal', icon: '✂️' },
  { name: 'Tutoring', icon: '📚' },
  { name: 'Admin / Office', icon: '💼' },
  { name: 'Other', icon: '📋' },
];

// ── Nominatim autocomplete ────────────────────────────────────
interface NominatimResult {
  display_name: string;
  address: { city?: string; town?: string; village?: string; road?: string; pedestrian?: string; suburb?: string; };
}

function useNominatimSearch(query: string, type: 'city' | 'street', city?: string) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const q = type === 'city'
          ? `${query}, Serbia`
          : city ? `${query}, ${city}, Serbia` : `${query}, Serbia`;
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=7&countrycodes=rs`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'sr,en' } });
        const data: NominatimResult[] = await res.json();
        // Deduplicate by label
        const seen = new Set<string>();
        setResults(data.filter(r => {
          const label = getLabel(r, type);
          if (seen.has(label)) return false;
          seen.add(label);
          return true;
        }));
      } catch { setResults([]); }
    }, 320);
    return () => clearTimeout(timer.current);
  }, [query, type, city]);

  return results;
}

function getLabel(r: NominatimResult, type: 'city' | 'street'): string {
  const a = r.address;
  if (type === 'city') return a.city ?? a.town ?? a.village ?? r.display_name.split(',')[0];
  return a.road ?? a.pedestrian ?? a.suburb ?? r.display_name.split(',')[0];
}

interface AutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type: 'city' | 'street';
  cityContext?: string;
}

function LocationAutocomplete({ value, onChange, placeholder, type, cityContext }: AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const results = useNominatimSearch(inputVal, type, cityContext);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputVal(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (r: NominatimResult) => {
    const label = getLabel(r, type);
    setInputVal(label);
    onChange(label);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        className="inp"
        placeholder={placeholder}
        value={inputVal}
        onChange={e => { setInputVal(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (inputVal.length >= 2) setOpen(true); }}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-el)', border: '1.5px solid var(--border)',
          borderRadius: 'var(--r)', marginTop: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,.45)', overflow: 'hidden',
        }}>
          {results.map((r, i) => (
            <div
              key={i}
              onMouseDown={e => { e.preventDefault(); handleSelect(r); }}
              style={{
                padding: '9px 14px', cursor: 'pointer', fontSize: '.875rem',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-ov)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <div style={{ fontWeight: 600 }}>{getLabel(r, type)}</div>
              <div style={{ fontSize: '.75rem', color: 'var(--tx-3)', marginTop: 1 }}>
                {r.display_name.split(',').slice(1, 3).join(',').trim()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Custom 24h time picker ────────────────────────────────────
function TimePicker24h({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];
  const parts = value.split(':');
  const h = parts[0] ?? '09';
  const m = parts[1] ?? '00';

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select
        className="sel"
        value={h}
        onChange={e => onChange(`${e.target.value}:${m}`)}
        style={{ flex: 1 }}
      >
        {hours.map(hr => <option key={hr} value={hr}>{hr}:00</option>)}
      </select>
      <span style={{ color: 'var(--tx-3)', fontWeight: 700, flexShrink: 0 }}>:</span>
      <select
        className="sel"
        value={m}
        onChange={e => onChange(`${h}:${e.target.value}`)}
        style={{ flex: 1 }}
      >
        {minutes.map(mn => <option key={mn} value={mn}>{mn}</option>)}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function PostJobScreen({ categories, creditBalance, userLocation, onRequestLocation, onCreated, onGoToCredits, onMessage }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [payPerWorker, setPayPerWorker] = useState('');
  const [crewSize, setCrewSize] = useState('1');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [durationHours, setDurationHours] = useState('2');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userLocation?.place) return;
    if (!city && userLocation.place.city) setCity(userLocation.place.city);
    if (!address && userLocation.place.streetName) setAddress(userLocation.place.streetName);
  }, [userLocation]);

  const totalPay = (Number(payPerWorker) || 0) * (Number(crewSize) || 1);
  const canPost = creditBalance >= 10;
  const displayCategories = categories.length > 0
    ? categories
    : EXTRA_CATEGORIES.map((c, i) => ({ id: String(i), ...c, color: '#5b5ef4' }));

  const handleCreate = useCallback(async () => {
    if (!title.trim()) { onMessage('Please enter a job title.', 'error'); return; }
    if (!description.trim()) { onMessage('Please describe the work.', 'error'); return; }
    if (!categoryId) { onMessage('Please select a category.', 'error'); return; }
    if (!city.trim()) { onMessage('Please enter a city.', 'error'); return; }
    if (!address.trim()) { onMessage('Please enter an address.', 'error'); return; }
    if (!payPerWorker || Number(payPerWorker) < 1) { onMessage('Please enter pay per worker.', 'error'); return; }
    if (!scheduledDate) { onMessage('Please select a date.', 'error'); return; }
    if (!canPost) { onMessage('Insufficient credits.', 'error'); return; }

    setLoading(true);
    const res = await jobs.create({
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId,
      address: address.trim(),
      city: city.trim(),
      lat: userLocation?.lat ?? 44.8176,
      lng: userLocation?.lng ?? 20.4633,
      scheduled_date: `${scheduledDate}T${scheduledTime}:00`,
      duration_hours: Number(durationHours) || 2,
      pay_per_worker: Number(payPerWorker),
      crew_size: Number(crewSize) || 1,
    });
    setLoading(false);

    if (res.error) { onMessage(res.error, 'error'); return; }
    onMessage('Job posted successfully! −10 credits deducted.', 'success');
    setTitle(''); setDescription(''); setCategoryId('');
    setCity(''); setAddress(''); setPayPerWorker('');
    setCrewSize('1'); setScheduledDate(''); setScheduledTime('09:00'); setDurationHours('2');
    await onCreated();
  }, [title, description, categoryId, city, address, payPerWorker, scheduledDate, scheduledTime, durationHours, crewSize, canPost, userLocation, onCreated, onMessage]);

  return (
    <div className="pg-n">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.025em', marginBottom: 6 }}>Post a Job</h1>
        <p style={{ fontSize: '.9375rem', color: 'var(--tx-2)' }}>Describe the work and find skilled help nearby.</p>
      </div>

      <div className="card">
        {/* 1 – Details */}
        <div className="psect">
          <div className="psect-ttl"><div className="psect-n">1</div>Job Details</div>
          <div className="frow" style={{ gap: 16 }}>
            <div className="fld">
              <label className="flb">Job title *</label>
              <input className="inp" placeholder="e.g. Help moving furniture to 3rd floor" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="fld">
              <label className="flb">Description *</label>
              <textarea className="txta" placeholder="Describe what needs to be done..." value={description} onChange={e => setDescription(e.target.value)} rows={4} />
            </div>
            <div className="fld">
              <label className="flb">Category *</label>
              <select className="sel" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">Select a category</option>
                {displayCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2 – When */}
        <div className="psect">
          <div className="psect-ttl"><div className="psect-n">2</div>When</div>
          <div className="frow frow-3">
            <div className="fld">
              <label className="flb">Date *</label>
              <input className="inp" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="fld">
              <label className="flb">Start time</label>
              <TimePicker24h value={scheduledTime} onChange={setScheduledTime} />
            </div>
            <div className="fld">
              <label className="flb">Duration</label>
              <select className="sel" value={durationHours} onChange={e => setDurationHours(e.target.value)}>
                {[1,2,3,4,5,6,8,10,12].map(h => (
                  <option key={h} value={h}>{h}h</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3 – Location */}
        <div className="psect">
          <div className="psect-ttl"><div className="psect-n">3</div>Location</div>
          <div className="frow frow-2" style={{ marginBottom: 14 }}>
            <div className="fld">
              <label className="flb">City *</label>
              <LocationAutocomplete value={city} onChange={setCity} placeholder="Novi Sad" type="city" />
            </div>
            <div className="fld">
              <label className="flb">Street / Area *</label>
              <LocationAutocomplete value={address} onChange={setAddress} placeholder="Bulevar Oslobođenja" type="street" cityContext={city} />
            </div>
          </div>
          <div className="loc-strip">
            <div className="loc-info">
              <span style={{ fontSize: '1.25rem' }}>📍</span>
              <div>
                <div style={{ fontSize: '.875rem', fontWeight: 600 }}>
                  {userLocation?.place?.display ?? (userLocation ? 'Location captured' : 'No location set')}
                </div>
                <div style={{ fontSize: '.75rem', color: 'var(--tx-2)', marginTop: 2 }}>
                  {userLocation ? 'GPS coordinates used for map pin' : 'Allow location for accurate map placement'}
                </div>
              </div>
            </div>
            <button className="btn btn-s btn-sm" onClick={onRequestLocation}>
              {userLocation ? 'Update GPS' : 'Use my location'}
            </button>
          </div>
        </div>

        {/* 4 – Pay */}
        <div className="psect">
          <div className="psect-ttl"><div className="psect-n">4</div>Pay & Crew</div>
          <div className="frow frow-2">
            <div className="fld">
              <label className="flb">Pay per worker (RSD) *</label>
              <input className="inp" type="number" placeholder="3000" min={1} value={payPerWorker} onChange={e => setPayPerWorker(e.target.value)} />
            </div>
            <div className="fld">
              <label className="flb">Workers needed</label>
              <select className="sel" value={crewSize} onChange={e => setCrewSize(e.target.value)}>
                {[1,2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} worker{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>
          {totalPay > 0 && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg-ov)', border: '1px solid var(--border)', borderRadius: 'var(--r)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>Total payout</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{totalPay.toLocaleString()} RSD</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="psect">
          <div className="cred-notice" style={{ marginBottom: !canPost ? 10 : 16 }}>
            <span style={{ fontSize: '1.25rem' }}>🪙</span>
            <span>
              Posting costs <strong>10 credits</strong>. Your balance: <strong>{creditBalance} credits</strong>.
              {!canPost && <span style={{ color: 'var(--err)', marginLeft: 6 }}>Insufficient credits.</span>}
            </span>
          </div>
          {!canPost && (
            <button className="btn btn-p btn-fw" onClick={onGoToCredits} style={{ marginBottom: 10 }}>
              🪙 Buy Credits
            </button>
          )}
          <button
            className="btn btn-xl btn-fw"
            onClick={handleCreate}
            disabled={loading || !canPost}
            style={!canPost ? { background: 'var(--bg-ov)', color: 'var(--tx-3)', border: '1px solid var(--border)', cursor: 'not-allowed' } : undefined}
          >
            {loading ? 'Posting...' : 'Post Job — 10 credits'}
          </button>
        </div>
      </div>
    </div>
  );
}
