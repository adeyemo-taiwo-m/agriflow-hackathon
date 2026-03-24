export default function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-photo" />
      <div className="skeleton-body">
        <div className="skeleton skeleton-tag" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-meta" />
        <div className="skeleton skeleton-bar" />
        <div className="skeleton skeleton-stats" />
      </div>

      <style>{`
        .skeleton-card {
          background: var(--color-card);
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--color-border);
        }
        .skeleton-photo { height: 200px; border-radius: 0; }
        .skeleton-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .skeleton-tag { height: 22px; width: 70px; }
        .skeleton-title { height: 22px; width: 80%; }
        .skeleton-meta { height: 14px; width: 50%; }
        .skeleton-bar { height: 6px; }
        .skeleton-stats { height: 14px; width: 65%; }
      `}</style>
    </div>
  );
}
