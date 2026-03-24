import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const icons = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    </svg>
  ),
};

const colors = {
  success: 'var(--color-primary)',
  error: 'var(--color-danger)',
  warning: 'var(--color-accent)',
};

export default function Toast({ message, type = 'success', description, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    gsap.fromTo(ref.current, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
  }, []);

  return (
    <div ref={ref} className="toast" style={{ borderLeftColor: colors[type] }}>
      <div className="toast-icon" style={{ color: colors[type] }}>{icons[type]}</div>
      <div className="toast-content">
        <div className="toast-message">{message}</div>
        {description && <div className="toast-description">{description}</div>}
      </div>
      <button className="toast-close" onClick={onClose}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      <style>{`
        .toast {
          background: var(--color-card);
          width: 320px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--color-border);
          border-left: 4px solid;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
        }
        .toast-icon { flex-shrink: 0; margin-top: 1px; }
        .toast-content { flex: 1; }
        .toast-message { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
        .toast-description { font-size: 13px; color: var(--color-text-secondary); margin-top: 2px; }
        .toast-close {
          flex-shrink: 0;
          color: var(--color-text-tertiary);
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 4px;
        }
        .toast-close:hover { color: var(--color-text-secondary); }
      `}</style>
    </div>
  );
}
