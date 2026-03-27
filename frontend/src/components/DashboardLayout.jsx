import { useState, useEffect } from 'react';
import Icon from './Icon';

/**
 * Shared dashboard shell with:
 * - Fixed sidebar on desktop
 * - Slide-in drawer + backdrop + hamburger on mobile
 */
export default function DashboardLayout({ navItems, activeTab, onTabChange, brand = 'AgriFlow', footer, children }) {
  const [open, setOpen] = useState(false);

  // Close sidebar when screen grows past mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const handler = (e) => { if (e.matches) setOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleTabChange = (key) => {
    onTabChange(key);
    setOpen(false);
  };

  return (
    <div className="dashboard-layout">
      {/* ── Mobile top bar ─────────────────────────── */}
      <div className="dash-mobile-bar">
        <span className="dash-mobile-brand">{brand}</span>
        <button
          className="dash-hamburger"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* ── Backdrop ────────────────────────────────── */}
      {open && <div className="dash-backdrop" onClick={() => setOpen(false)} />}

      {/* ── Sidebar ─────────────────────────────────── */}
      <nav className={`dashboard-nav${open ? ' nav-open' : ''}`}>
        <div className="dashboard-nav-brand">
          {brand}
          {/* Close button (mobile only) */}
          <button className="dash-close-btn" onClick={() => setOpen(false)} aria-label="Close navigation">✕</button>
        </div>

        {navItems.map(item => (
          <div
            key={item.key}
            className={`dashboard-nav-item${activeTab === item.key ? ' active' : ''}`}
            onClick={() => handleTabChange(item.key)}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </div>
        ))}

        {footer && (
          <div style={{ marginTop: 'auto', padding: '0 20px 20px' }}>
            {footer}
          </div>
        )}
      </nav>

      {/* ── Main content ────────────────────────────── */}
      <div className="dashboard-content">
        {children}
      </div>
    </div>
  );
}
