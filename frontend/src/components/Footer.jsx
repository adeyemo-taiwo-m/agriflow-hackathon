import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-col">
            <div className="footer-brand">AgriFlow</div>
            <p className="footer-tagline">Fund a farm. Track every milestone. Earn your returns.</p>
          </div>
          <div className="footer-col">
            <div className="footer-heading">Product</div>
            <Link to="/farms" className="footer-link">Browse Farms</Link>
            <Link to="/#how-it-works" className="footer-link">How It Works</Link>
            <Link to="/auth?tab=signup" className="footer-link">Get Started</Link>
            <Link to="/auth" className="footer-link">Log In</Link>
          </div>
          <div className="footer-col">
            <div className="footer-heading">Platform</div>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="mailto:hello@agriflow.ng" className="footer-link">Contact Us</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 AgriFlow. All rights reserved.</span>
          <span>Built in Nigeria 🇳🇬</span>
        </div>
      </div>

      <style>{`
        .footer {
          background: var(--color-text-primary);
          color: rgba(255,255,255,0.85);
          padding: 56px 0 32px;
          margin-top: auto;
        }
        .footer-inner {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 48px;
          padding-bottom: 40px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 28px;
        }
        .footer-brand {
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          font-family: var(--font-heading);
          margin-bottom: 10px;
        }
        .footer-tagline {
          font-size: 14px;
          color: rgba(255,255,255,0.55);
          line-height: 1.6;
          max-width: 280px;
        }
        .footer-heading {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 16px;
        }
        .footer-link {
          display: block;
          font-size: 14px;
          color: rgba(255,255,255,0.7);
          margin-bottom: 10px;
          transition: color var(--transition-fast);
        }
        .footer-link:hover { color: #fff; }
        .footer-bottom {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: rgba(255,255,255,0.4);
        }
        @media (max-width: 768px) {
          .footer-inner { grid-template-columns: 1fr 1fr; }
          .footer-col:first-child { grid-column: 1 / -1; }
          .footer-bottom { flex-direction: column; gap: 8px; }
        }
        @media (max-width: 480px) {
          .footer-inner { grid-template-columns: 1fr; }
        }
      `}</style>
    </footer>
  );
}
