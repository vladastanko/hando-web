import { useState, useEffect } from 'react';
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

// All categories to show (will merge with DB ones)
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

export default function PostJobScreen({ categories, creditBalance, userLocation, onRequestLocation, onCreated, onGoToCredits, onMessage }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [payPerWorker, setPayPerWorker] = useState('');
  const [crewSize, setCrewSize] = useState('1');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [durationHours, setDurationHours] = useState('2');
  const [loading, setLoading] = useState(false);

  // Populate city AND street from geocode
  useEffect(() => {
    if (!userLocation?.place) return;
    if (!city && userLocation.place.city) setCity(userLocation.place.city);
    if (!address && userLocation.place.streetName) setAddress(userLocation.place.streetName);
  }, [userLocation]);

  const totalPay = (Number(payPerWorker) || 0) * (Number(crewSize) || 1);
  const canPost = creditBalance >= 10;

  // Merge DB categories with extra (show extra if not in DB)
  const displayCategories = categories.length > 0 ? categories : EXTRA_CATEGORIES.map((c, i) => ({ id: String(i), ...c, color: '#5b5ef4' }));

  const handleCreate = async () => {
    if (!title.trim()) { onMessage('Please enter a job title.', 'error'); return; }
    if (!description.trim()) { onMessage('Please describe the work.', 'error'); return; }
    if (!categoryId) { onMessage('Please select a category.', 'error'); return; }
    if (!city.trim()) { onMessage('Please enter a city.', 'error'); return; }
    if (!address.trim()) { onMessage('Please enter an address.', 'error'); return; }
    if (!payPerWorker || Number(payPerWorker) < 1) { onMessage('Please enter pay per worker.', 'error'); return; }
    if (!scheduledDate) { onMessage('Please select a date.', 'error'); return; }
    if (!canPost) { onMessage('Insufficient credits. Posting a job costs 10 credits.', 'error'); return; }

    setLoading(true);
    const combinedDatetime = scheduledTime
      ? `${scheduledDate}T${scheduledTime}:00`
      : `${scheduledDate}T09:00:00`;

    const res = await jobs.create({
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId,
      address: address.trim(),
      city: city.trim(),
      lat: userLocation?.lat ?? 44.8176,
      lng: userLocation?.lng ?? 20.4633,
      scheduled_date: combinedDatetime,
      duration_hours: Number(durationHours) || 2,
      pay_per_worker: Number(payPerWorker),
      crew_size: Number(crewSize) || 1,
    });

    setLoading(false);

    if (res.error) {
      onMessage(res.error, 'error');
      return;
    }

    onMessage('Job posted successfully! −10 credits deducted.', 'success');
    // Reset
    setTitle(''); setDescription(''); setCategoryId('');
    setCity(''); setAddress(''); setPayPerWorker('');
    setCrewSize('1'); setScheduledDate(''); setScheduledTime(''); setDurationHours('2');
    await onCreated();
  };

  return (
    <div className="pg-n">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-.025em', marginBottom: 6 }}>Post a Job</h1>
        <p style={{ fontSize: '.9375rem', color: 'var(--tx-2)' }}>Describe the work and find skilled help nearby.</p>
      </div>

      <div className="card">
        {/* Section 1 – Job details */}
        <div className="psect">
          <div className="psect-ttl">
            <div className="psect-n">1</div>
            Job Details
          </div>
          <div className="frow" style={{ gap: 16 }}>
            <div className="fld">
              <label className="flb">Job title *</label>
              <input className="inp" placeholder="e.g. Help moving furniture to 3rd floor" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="fld">
              <label className="flb">Description *</label>
              <textarea
                className="txta"
                placeholder="Describe what needs to be done, what workers should bring, any special requirements..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
              />
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

        {/* Section 2 – Date & Time */}
        <div className="psect">
          <div className="psect-ttl">
            <div className="psect-n">2</div>
            When
          </div>
          <div className="frow frow-3">
            <div className="fld">
              <label className="flb">Date *</label>
              <input className="inp" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="fld">
              <label className="flb">Start time (24h)</label>
              <input className="inp" type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
            </div>
            <div className="fld">
              <label className="flb">Duration (hours)</label>
              <select className="sel" value={durationHours} onChange={e => setDurationHours(e.target.value)}>
                {[1,2,3,4,5,6,8,10,12].map(h => (
                  <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3 – Location */}
        <div className="psect">
          <div className="psect-ttl">
            <div className="psect-n">3</div>
            Location
          </div>
          <div className="frow frow-2" style={{ marginBottom: 14 }}>
            <div className="fld">
              <label className="flb">City *</label>
              <input className="inp" placeholder="Novi Sad" value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div className="fld">
              <label className="flb">Street / Area *</label>
              <input className="inp" placeholder="Bulevar Oslobođenja" value={address} onChange={e => setAddress(e.target.value)} />
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
                  {userLocation
                    ? 'Your current location will be used for the map pin'
                    : 'Allow location for accurate map placement'}
                </div>
              </div>
            </div>
            <button className="btn btn-s btn-sm" onClick={onRequestLocation}>
              {userLocation ? 'Update' : 'Use my location'}
            </button>
          </div>
        </div>

        {/* Section 4 – Pay */}
        <div className="psect">
          <div className="psect-ttl">
            <div className="psect-n">4</div>
            Pay & Crew
          </div>
          <div className="frow frow-2">
            <div className="fld">
              <label className="flb">Pay per worker (RSD) *</label>
              <input className="inp" type="number" placeholder="3000" min={1} value={payPerWorker} onChange={e => setPayPerWorker(e.target.value)} />
            </div>
            <div className="fld">
              <label className="flb">Workers needed</label>
              <select className="sel" value={crewSize} onChange={e => setCrewSize(e.target.value)}>
                {[1,2,3,4,5,6,8,10].map(n => (
                  <option key={n} value={n}>{n} worker{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {totalPay > 0 && (
            <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg-ov)', border: '1px solid var(--border)', borderRadius: 'var(--r)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '.8125rem', color: 'var(--tx-2)' }}>Total payout</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-.02em' }}>
                {totalPay.toLocaleString()} RSD
              </span>
            </div>
          )}
        </div>

        {/* Footer – submit */}
        <div className="psect">
          <div className="cred-notice" style={{ marginBottom: !canPost ? 10 : 16 }}>
            <span style={{ fontSize: '1.25rem' }}>🪙</span>
            <span>
              Posting costs <strong>10 credits</strong>. Your balance: <strong>{creditBalance} credits</strong>.
              {!canPost && <span style={{ color: 'var(--err)', marginLeft: 6 }}>Insufficient credits.</span>}
            </span>
          </div>
          {!canPost && (
            <button
              className="btn btn-p btn-fw"
              onClick={onGoToCredits}
              style={{ marginBottom: 10 }}
            >
              🪙 Buy Credits
            </button>
          )}
          <button
            className="btn btn-xl btn-fw"
            onClick={handleCreate}
            disabled={loading || !canPost}
            style={{ background: canPost ? undefined : 'var(--bg-ov)', color: canPost ? undefined : 'var(--tx-3)', border: '1px solid var(--border)', cursor: !canPost ? 'not-allowed' : undefined }}
          >
            {loading ? 'Posting...' : 'Post Job — 10 credits'}
          </button>
        </div>
      </div>
    </div>
  );
}
