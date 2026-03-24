export default function EmptyState({ title, description, action, actionLabel, illustration }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {illustration || (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <rect width="80" height="80" rx="40" fill="#F0EDE8"/>
            <path d="M25 55 Q40 30 55 55" stroke="#C8B89A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <ellipse cx="40" cy="38" rx="10" ry="14" stroke="#C8B89A" strokeWidth="2.5" fill="none"/>
            <line x1="40" y1="24" x2="40" y2="20" stroke="#C8B89A" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="34" y1="26" x2="32" y2="23" stroke="#C8B89A" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="46" y1="26" x2="48" y2="23" stroke="#C8B89A" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && (
        <button className="btn btn-solid btn-sm" onClick={action}>{actionLabel}</button>
      )}

      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 48px 24px;
          gap: 12px;
        }
        .empty-state-icon { margin-bottom: 8px; }
        .empty-state-title { font-size: 18px; font-weight: 600; color: var(--color-text-primary); }
        .empty-state-desc { font-size: 14px; color: var(--color-text-secondary); max-width: 320px; line-height: 1.6; }
      `}</style>
    </div>
  );
}
