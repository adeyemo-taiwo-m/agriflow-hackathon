import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (navRef.current) {
      gsap.fromTo(navRef.current, { y: -60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
    }
  }, []);

  const isLanding = location.pathname === '/';

  const handleDashboard = () => {
    setMenuOpen(false);
    if (user?.role === 'investor') navigate('/investor/dashboard');
    else if (user?.role === 'farmer') navigate('/farmer/dashboard');
    else if (user?.role === 'admin') navigate('/agriflow-controls-5592/dashboard');
  };

  return (
    <nav ref={navRef} className={`navbar${scrolled ? ' navbar-scrolled' : ''}`}>
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand">AgriFlow</Link>

        <div className={`navbar-links${menuOpen ? ' open' : ''}`}>
          <Link to="/farms" className="navbar-link" onClick={() => setMenuOpen(false)}>Browse Farms</Link>
          <Link to="/#how-it-works" className="navbar-link" onClick={() => setMenuOpen(false)}>How It Works</Link>

          {user ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleDashboard}>Dashboard</button>
              <button className="btn btn-solid btn-sm" onClick={() => { logout(); navigate('/auth'); setMenuOpen(false); }}>Log Out</button>
            </>
          ) : (
            <>
              <Link to="/auth" className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(false)}>Log In</Link>
              <Link to="/auth?tab=signup" className="btn btn-solid btn-sm" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </>
          )}
        </div>

        <button className="navbar-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span className={menuOpen ? 'open' : ''} />
          <span className={menuOpen ? 'open' : ''} />
          <span className={menuOpen ? 'open' : ''} />
        </button>
      </div>

      <style>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 500;
          background: var(--color-surface);
          border-bottom: 1px solid transparent;
          transition: border-color var(--transition-base), box-shadow var(--transition-base);
        }
        .navbar-scrolled {
          border-bottom-color: var(--color-border);
          box-shadow: var(--shadow-sm);
        }
        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          padding-bottom: 16px;
          gap: 24px;
        }
        .navbar-brand {
          font-size: 22px;
          font-weight: 700;
          color: var(--color-primary);
          font-family: var(--font-heading);
          letter-spacing: -0.5px;
          flex-shrink: 0;
        }
        .navbar-links {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .navbar-link {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-secondary);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          transition: color var(--transition-fast);
        }
        .navbar-link:hover { color: var(--color-text-primary); }
        .navbar-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          padding: 4px;
        }
        .navbar-hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          background: var(--color-text-primary);
          border-radius: 2px;
          transition: all var(--transition-base);
        }
        @media (max-width: 768px) {
          .navbar-hamburger { display: flex; }
          .navbar-links {
            display: none;
            position: absolute;
            top: 100%;
            left: 0; right: 0;
            background: var(--color-card);
            flex-direction: column;
            align-items: stretch;
            padding: 16px 24px;
            border-bottom: 1px solid var(--color-border);
            box-shadow: var(--shadow-md);
            gap: 8px;
            z-index: 1000;
          }
          .navbar-links.open { display: flex; }
          .navbar-link { display: block; padding: 10px 0; }
          .btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </nav>
  );
}
