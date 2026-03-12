type JobItem = {
  id: string;
  title: string;
  description: string;
  city: string;
  address: string;
  pay_per_worker: number;
  crew_size: number;
  accepted_workers: number;
  status: string;
  scheduled_date: string;
};

type Props = {
  jobs: JobItem[];
  loading: boolean;
  onRefresh: () => void;
};

export default function HomeScreen({ jobs, loading, onRefresh }: Props) {
  return (
    <div className="panel">
      <h2>Open jobs nearby</h2>
      <div className="panel-muted">
        See current tasks, refresh results, and test the marketplace like a real product.
      </div>

      <button className="btn" onClick={onRefresh} disabled={loading} style={{ marginBottom: 18 }}>
        {loading ? 'Refreshing...' : 'Refresh jobs'}
      </button>

      {loading ? (
        <div className="empty-state">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">No open jobs yet.</div>
      ) : (
        <div className="job-list">
          {jobs.map((job) => (
            <div className="job-card" key={job.id}>
              <div className="badge-row">
                <span className="badge badge-open">OPEN</span>
                <span className="badge">{job.city}</span>
              </div>

              <h3>{job.title}</h3>
              <div>{job.description}</div>

              <div className="job-meta">
                <div><strong>Address:</strong> {job.address}</div>
                <div><strong>Pay:</strong> {job.pay_per_worker} RSD per worker</div>
                <div><strong>Crew:</strong> {job.accepted_workers}/{job.crew_size}</div>
                <div><strong>Date:</strong> {new Date(job.scheduled_date).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}