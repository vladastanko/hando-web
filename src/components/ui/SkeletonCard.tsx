export function SkeletonCard() {
  return (
    <article className="jcard" aria-hidden="true" aria-label="Loading">
      <div className="jcard-hdr">
        <div className="jcard-bdgs" style={{ gap: 6 }}>
          <div className="skel" style={{ width: 52, height: 20 }} />
          <div className="skel" style={{ width: 80, height: 20 }} />
        </div>
      </div>
      <div className="skel" style={{ width: '80%', height: 18 }} />
      <div className="skel" style={{ width: '55%', height: 14, marginTop: 2 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skel" style={{ width: 56, height: 14 }} />
        <div className="skel" style={{ width: 64, height: 14 }} />
      </div>
      <div className="jcard-foot">
        <div className="skel" style={{ width: 88, height: 28 }} />
        <div className="skel" style={{ width: 96, height: 14 }} />
      </div>
    </article>
  );
}
