import { useMemo, useState } from 'react';
import { jobs } from '../lib/supabase';
import type { Category } from '../types';

type Props = {
  categories: Category[];
  onCreated: () => void;
  onMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
};

export default function PostJobScreen({ categories, onCreated, onMessage }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [payPerWorker, setPayPerWorker] = useState('');
  const [crewSize, setCrewSize] = useState('1');
  const [scheduledDate, setScheduledDate] = useState('');
  const [durationHours, setDurationHours] = useState('3');
  const [loading, setLoading] = useState(false);

  const totalPay = useMemo(() => {
    const pay = Number(payPerWorker) || 0;
    const crew = Number(crewSize) || 0;
    return pay * crew;
  }, [crewSize, payPerWorker]);

  const handleCreateJob = async () => {
    setLoading(true);
    onMessage('');

    const res = await jobs.create({
      title,
      description,
      category_id: categoryId,
      address,
      city,
      lat: 44.8176,
      lng: 20.4633,
      scheduled_date: scheduledDate,
      duration_hours: Number(durationHours),
      pay_per_worker: Number(payPerWorker),
      crew_size: Number(crewSize),
    });

    if (res.error) {
      onMessage(`Create job error: ${res.error}`, 'error');
      setLoading(false);
      return;
    }

    onMessage('Job created successfully.', 'success');

    setTitle('');
    setDescription('');
    setCategoryId('');
    setCity('');
    setAddress('');
    setPayPerWorker('');
    setCrewSize('1');
    setScheduledDate('');
    setDurationHours('3');

    await onCreated();
    setLoading(false);
  };

  return (
    <section className="panel">
      <div className="section-header block-mobile">
        <div>
          <h2>Post a new job</h2>
          <p className="panel-copy">UI je osvežen, ali create flow i dalje koristi isti Supabase backend.</p>
        </div>
        <div className="cost-pill">10 credits</div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="job-title">Job title</label>
        <input
          id="job-title"
          className="input"
          placeholder="e.g. Help moving furniture"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="job-description">Description</label>
        <textarea
          id="job-description"
          className="textarea"
          placeholder="Describe the work and any requirements"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="job-category">Category</label>
        <select
          id="job-category"
          className="select"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-grid two-up">
        <div className="form-group">
          <label className="form-label" htmlFor="job-city">City</label>
          <input
            id="job-city"
            className="input"
            placeholder="Belgrade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="job-address">Address</label>
          <input
            id="job-address"
            className="input"
            placeholder="Street and number"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </div>

      <div className="form-grid three-up">
        <div className="form-group">
          <label className="form-label" htmlFor="job-pay">Pay / worker</label>
          <input
            id="job-pay"
            className="input"
            type="number"
            placeholder="2000"
            value={payPerWorker}
            onChange={(e) => setPayPerWorker(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="job-crew">Crew size</label>
          <input
            id="job-crew"
            className="input"
            type="number"
            min="1"
            placeholder="1"
            value={crewSize}
            onChange={(e) => setCrewSize(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="job-duration">Duration</label>
          <input
            id="job-duration"
            className="input"
            type="number"
            min="0.5"
            step="0.5"
            placeholder="3"
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="job-date">Scheduled date</label>
        <input
          id="job-date"
          className="input"
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />
      </div>

      <div className="summary-card">
        <span>Total crew payout</span>
        <strong>{formatCurrency(totalPay)}</strong>
      </div>

      <button className="btn btn-full" onClick={handleCreateJob} disabled={loading}>
        {loading ? 'Saving...' : '🚀 Post job'}
      </button>
    </section>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}
