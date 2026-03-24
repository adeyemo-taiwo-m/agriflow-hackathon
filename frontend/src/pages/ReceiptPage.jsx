import { useParams, Link, useNavigate } from 'react-router-dom';
import { mockAllPayouts } from '../data/mockData';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ReceiptPage() {
  const { id } = useParams();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // In a real app, this would fetch the receipt by reference ID from an API.
  // Here we just mock it using our history data, or provide a default if not found
  const defaultReceipt = {
    reference: id || 'AGF-2026-00142',
    farmName: 'Adewale Rice Farm',
    crop: 'Rice',
    investmentDate: '2026-01-12',
    payoutDate: '2026-03-14',
    amountInvested: 25000,
    amountReturned: 6120,
    totalReceived: 31120,
    returnRate: 24.48,
    returnType: 'cash',
    account: 'GTBank — ···6789',
    verifiedBy: 'AgriFlow Admin'
  };

  const receipt = defaultReceipt;

  const handleShare = () => {
    const text = `AgriFlow Payout Receipt\nReference: ${receipt.reference}\nFarm: ${receipt.farmName}\nPayout Amount: ₦${receipt.amountReturned.toLocaleString()}`;
    navigator.clipboard.writeText(text);
    addToast('Receipt summary copied to clipboard!', 'success');
  };

  const handleDownload = () => {
    addToast('Downloading PDF...', 'success');
    // In production, triggers a PDF generation
  };

  return (
    <>
    <Navbar />
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', padding: 'var(--space-8)', paddingTop: '100px' }}>
      <div className="container-sm" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <div style={{ width: '100%', maxWidth: '540px', display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button onClick={() => navigate(-1)} className="btn-link">← Go Back</button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-ghost btn-sm" onClick={handleShare}>Share</button>
            <button className="btn btn-solid btn-sm" onClick={handleDownload} style={{ backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' }}>Download PDF</button>
          </div>
        </div>

        <div className="card" style={{ width: '100%', maxWidth: '540px', padding: '40px', backgroundColor: '#fff', border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>AgriFlow Payout Receipt</h1>
            <p className="text-mono" style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>Ref: {receipt.reference}</p>
          </div>

          <div style={{ borderTop: '2px dashed var(--color-border)', borderBottom: '2px dashed var(--color-border)', padding: '24px 0', marginBottom: '24px', fontFamily: 'var(--font-mono)', fontSize: '14px', lineHeight: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Farm:</span>
              <strong style={{ textAlign: 'right' }}>{receipt.farmName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Crop:</span>
              <strong style={{ textAlign: 'right' }}>{receipt.crop}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Investment Date:</span>
              <strong style={{ textAlign: 'right' }}>{new Date(receipt.investmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Payout Date:</span>
              <strong style={{ textAlign: 'right' }}>{new Date(receipt.payoutDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
            </div>

            <div style={{ margin: '16px 0', borderTop: '1px solid var(--color-border)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Amount Invested:</span>
              <strong style={{ textAlign: 'right' }}>₦{receipt.amountInvested.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Profit Earned:</span>
              <strong style={{ color: 'var(--color-primary)', textAlign: 'right' }}>₦{receipt.amountReturned.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', marginTop: '12px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Total Payout:</span>
              <strong style={{ textAlign: 'right' }}>₦{receipt.totalReceived.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Return Rate:</span>
              <strong style={{ textAlign: 'right', color: 'var(--color-accent)' }}>{receipt.returnRate}%</strong>
            </div>

            <div style={{ margin: '16px 0', borderTop: '1px solid var(--color-border)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Return Type:</span>
              <strong style={{ textAlign: 'right', textTransform: 'capitalize' }}>{receipt.returnType}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Account Paid To:</span>
              <strong style={{ textAlign: 'right' }}>{receipt.account}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Verified by:</span>
              <strong style={{ textAlign: 'right' }}>{receipt.verifiedBy} ✓</strong>
            </div>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
            <p>This receipt is automatically generated and serves as official confirmation of payout.</p>
            <p style={{ marginTop: '8px' }}>support@agriflow.ng</p>
          </div>
        </div>
        
      </div>
    </div>
    <Footer />
    </>
  );
}
