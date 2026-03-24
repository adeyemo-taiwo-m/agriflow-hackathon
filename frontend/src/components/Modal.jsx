import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Modal({ isOpen, onClose, title, children, width = 540 }) {
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
      gsap.fromTo(modalRef.current, { scale: 0.94, opacity: 0, y: 16 }, { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div ref={overlayRef} className="modal-overlay" onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div ref={modalRef} className="modal-box" style={{ maxWidth: width }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.3);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .modal-box {
          background: var(--color-card);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px 0;
        }
        .modal-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .modal-close {
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px; height: 32px;
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .modal-close:hover {
          background: var(--color-card-alt);
          color: var(--color-text-primary);
        }
        .modal-body { padding: 20px 28px 28px; }
      `}</style>
    </div>
  );
}
