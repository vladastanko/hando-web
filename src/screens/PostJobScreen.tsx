import { useState } from 'react';
import { jobs } from '../lib/supabase';
import type { Category } from '../types';

type Props = {
  categories: Category[];
  onCreated: () => Promise<void>;
  onMessage: (message: string) => void;
  userLocation: { lat: number; lng: number } | null;
  onRequestLocation: () => void;
};

export default function PostJobScreen({ categories, onCreated, onMessage, userLocation, onRequestLocation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [payPerWorker, setPayPerWorker] = useState('');
  const [crewSize, setCrewSize] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateJob = async () => {
    if (!title || !description || !categoryId || !city || !address || !payPerWorker || !crewSize || !scheduledDate) {
      onMessage('Fill in all required fields.');
      return;
    }

    setLoading(true);

    const res = await jobs.create({
      title,
      description,
      category_id: categoryId,
      address,
      city,
      lat: userLocation?.lat ?? 44.8176,
      lng: userLocation?.lng ?? 20.4633,
      scheduled_date: scheduledDate,
      duration_hours: 3,
      pay_per_worker: Number(payPerWorker),
      crew_size: Number(crewSize),
    });

    if (res.error) {
      onMessage(`Create job error: ${res.error}`);
      setLoading(false);
      return;
    }

    onMessage('Job created successfully.');
    setTitle('');
    setDescription('');
    setCategoryId('');
    setCity('');
    setAddress('');
    setPayPerWorker('');
    setCrewSize('');
    setScheduledDate('');

    await onCreated();
    setLoading(false);
  };

  return (
    <div className="panel form-panel">
      <div className="section-head compact">
        <div>
          <h3>Post a new job</h3>
          <p>Keep the existing backend, but make the posting flow cleaner and more mobile-friendly.</p>
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Job title</span>
          <input className="input" placeholder="Need help moving furniture" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="field field-full">
          <span>Description</span>
          <textarea className="textarea" placeholder="Describe the work, timing, and what workers should bring." value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label className="field">
          <span>Category</span>
          <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Scheduled date</span>
          <input className="input" type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
        </label>

        <label className="field">
          <span>City</span>
          <input className="input" placeholder="Novi Sad" value={city} onChange={(e) => setCity(e.target.value)} />
        </label>

        <label className="field">
          <span>Address</span>
          <input className="input" placeholder="Street and number" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>

        <label className="field">
          <span>Pay per worker</span>
          <input className="input" type="number" placeholder="3000" value={payPerWorker} onChange={(e) => setPayPerWorker(e.target.value)} />
        </label>

        <label className="field">
          <span>Crew size</span>
          <input className="input" type="number" placeholder="2" value={crewSize} onChange={(e) => setCrewSize(e.target.value)} />
        </label>
      </div>

      <div className="location-strip">
        <div>
          <strong>Location for the map</strong>
          <p>
            {userLocation
              ? `Using current browser location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
              : 'No browser location yet. You can still post, but the map will use the default fallback point.'}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={onRequestLocation}>Use my current location</button>
      </div>

      <button className="btn btn-full" onClick={handleCreateJob} disabled={loading}>
        {loading ? 'Saving...' : 'Post job'}
      </button>
    </div>
  );
}
