import { useLocation, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export function PaymentSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { farm, amount, divType } = location.state || { farm: 'Oduya Maize Farm', amount: '50000', divType: 'cash' };
  const ref = `AGF-${Date.now().toString().slice(-8).toUpperCase()}`;

  return (
    <>
    <Navbar />
    <div className="payment-page">
      <div className="payment-card card">
        <div className="payment-icon success">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 className="payment-title">Investment confirmed</h1>
        <p className="payment-sub">Your investment has been received and is pending farm verification.</p>

        <div className="payment-summary card">
          <div className="payment-row">
            <span>Farm</span>
            <strong>{farm}</strong>
          </div>
          <div className="payment-row">
            <span>Amount</span>
            <strong className="text-mono">₦{parseInt(amount).toLocaleString()}</strong>
          </div>
          <div className="payment-row">
            <span>Return type</span>
            <strong style={{ textTransform: 'capitalize' }}>{divType === 'cash' ? 'Cash Return' : 'Harvest Share'}</strong>
          </div>
          <div className="payment-row">
            <span>Reference</span>
            <strong className="text-mono">{ref}</strong>
          </div>
        </div>

        <div className="payment-actions">
          <button className="btn btn-solid" onClick={() => navigate('/investor/dashboard')}>View My Portfolio</button>
          <Link to="/farms" className="btn btn-ghost">Browse More Farms</Link>
        </div>
      </div>

      <PaymentStyles success={true} />
    </div>
    <Footer />
    </>
  );
}

export function PaymentFailurePage() {
  const navigate = useNavigate();
  return (
    <>
    <Navbar />
    <div className="payment-page">
      <div className="payment-card card">
        <div className="payment-icon error">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </div>
        <h1 className="payment-title">Payment unsuccessful</h1>
        <p className="payment-sub">Your payment could not be completed. No funds were charged. Please try again.</p>
        <div className="payment-actions">
          <button className="btn btn-solid" onClick={() => navigate(-1)}>Try Again</button>
          <Link to="/farms" className="btn btn-ghost">Browse Farms</Link>
        </div>
      </div>
      <PaymentStyles success={false} />
    </div>
    <Footer />
    </>
  );
}

function PaymentStyles({ success }) {
  return (
    <style>{`
      .payment-page {
        min-height: 100vh;
        background: var(--color-surface);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 16px;
      }
      .payment-card {
        max-width: 480px;
        width: 100%;
        padding: 48px 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 20px;
      }
      .payment-icon {
        width: 80px; height: 80px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: ${success ? 'var(--color-primary-light)' : 'var(--color-danger-light)'};
        color: ${success ? 'var(--color-primary)' : 'var(--color-danger)'};
      }
      .payment-title { font-size: 28px; font-weight: 700; font-family: var(--font-heading); }
      .payment-sub { font-size: 15px; color: var(--color-text-secondary); line-height: 1.6; max-width: 320px; }
      .payment-summary {
        width: 100%;
        padding: 20px 24px;
        background: var(--color-surface);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .payment-row {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: var(--color-text-secondary);
      }
      .payment-row strong { color: var(--color-text-primary); }
      .payment-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
    `}</style>
  );
}
