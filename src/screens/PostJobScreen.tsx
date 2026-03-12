import { useState } from 'react';
import { jobs } from '../lib/supabase';

type Category = {
  id: string;
  name: string;
};

type Props = {
  categories: Category[];
  onCreated: () => void;
  onMessage: (msg: string) => void;
};

export default function PostJobScreen({ categories, onCreated, onMessage }: Props) {
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
    <div className="panel">
      <h2>Post a new job</h2>
      <div className="panel-muted">
        Create a real job post with your live backend and credit logic.
      </div>

      <input
        className="input"
        placeholder="Job title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="textarea"
        placeholder="Describe the work"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <select
        className="select"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      >
        <option value="">Select category</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      <input
        className="input"
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />

      <input
        className="input"
        placeholder="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <input
        className="input"
        type="number"
        placeholder="Pay per worker (RSD)"
        value={payPerWorker}
        onChange={(e) => setPayPerWorker(e.target.value)}
      />

      <input
        className="input"
        type="number"
        placeholder="Crew size"
        value={crewSize}
        onChange={(e) => setCrewSize(e.target.value)}
      />

      <input
        className="input"
        type="datetime-local"
        value={scheduledDate}
        onChange={(e) => setScheduledDate(e.target.value)}
      />

      <button className="btn" onClick={handleCreateJob} disabled={loading}>
        {loading ? 'Saving...' : 'Post job'}
      </button>
    </div>
  );
}