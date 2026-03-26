import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { mockFarms, mockInvestorPortfolio } from '../data/mockData';
import api from '../utils/api';

gsap.registerPlugin(ScrollTrigger);

// ─── PHOTO CAROUSEL ───────────────────────────────────────────
function PhotoCarousel({ photos }) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(null);

  return (
    <div className="carousel">
      <div className="carousel-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {photos.map((src, i) => (
          <img key={i} src={src} alt={`Photo ${i + 1}`} className="carousel-img" onClick={() => setLightbox(i)} />
        ))}
      </div>
      <div className="carousel-dots">
        {photos.map((_, i) => (
          <button key={i} className={`carousel-dot${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)} />
        ))}
      </div>

      {lightbox !== null && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close">✕</button>
          <img src={photos[lightbox]} alt="Enlarged" className="lightbox-img" onClick={e => e.stopPropagation()} />
          {photos.length > 1 && (
            <>
              <button className="lightbox-arrow left" onClick={e => { e.stopPropagation(); setLightbox(l => (l - 1 + photos.length) % photos.length); }}>‹</button>
              <button className="lightbox-arrow right" onClick={e => { e.stopPropagation(); setLightbox(l => (l + 1) % photos.length); }}>›</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MILESTONE TIMELINE ────────────────────────────────────────
function MilestoneTimeline({ milestones }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const statusMap = {
    locked: { color: 'var(--color-text-muted)', label: 'Locked', dot: '#ccc' },
    pending_proof: { color: 'var(--color-accent)', label: 'Awaiting Proof', dot: 'var(--color-accent)' },
    under_review: { color: '#f59e0b', label: 'Under Review', dot: '#f59e0b' },
    verified: { color: 'var(--color-primary)', label: 'Verified', dot: 'var(--color-primary)' },
    disbursed: { color: 'var(--color-primary-dark)', label: 'Funded', dot: 'var(--color-primary-dark)' },
    rejected: { color: 'var(--color-danger)', label: 'Rejected', dot: 'var(--color-danger)' }
  };

  return (
    <div className="timeline">
      {milestones.map((m, i) => {
        const stage = statusMap[m.status] || { color: '#ccc', label: m.status, dot: '#ccc' };
        return (
          <div key={m.id} className="timeline-item">
            <div className="timeline-left">
              <div className="timeline-dot" style={{ 
                background: m.status === 'locked' ? '#fff' : stage.dot, 
                borderColor: stage.dot, 
                boxShadow: m.status === 'under_review' ? `0 0 0 4px rgba(245, 158, 11, 0.15)` : 'none' 
              }} />
              {i < milestones.length - 1 && <div className="timeline-line" style={{ background: ['verified', 'disbursed'].includes(m.status) ? 'var(--color-primary)' : 'var(--color-border)' }} />}
            </div>
            <div className="timeline-card card">
              <div className="timeline-card-top">
                <div>
                  <h4 className="timeline-name">{m.name}</h4>
                  <span className="timeline-date">Stage {m.order_number || i + 1} · Week {m.expected_week}</span>
                </div>
                <span className={`badge`} style={{ 
                  background: m.status === 'locked' ? 'var(--color-card-alt)' : stage.color, 
                  color: m.status === 'locked' ? 'var(--color-text-secondary)' : '#fff',
                  textTransform: 'capitalize'
                }}>
                  {stage.label}
                </span>
              </div>
              <div className="timeline-amounts">
                <span>Budget Allocation: <strong className="text-mono">₦{(m.amount || 0).toLocaleString()}</strong></span>
                {m.status === 'disbursed' && <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>✓ Disbursed</span>}
              </div>

              {m.proofs && m.proofs.length > 0 && (
                <div className="proof-section">
                  <button className="proof-toggle" onClick={() => toggle(m.id)}>
                    {m.proofs.length} verification proof{m.proofs.length > 1 ? 's' : ''} — {expanded[m.id] ? 'collapse ▲' : 'tap to view ▼'}
                  </button>
                  {expanded[m.id] && (
                    <div className="proof-list">
                      {m.proofs.map(p => (
                        <div key={p.id} className="proof-item">
                          <img src={p.photo_url || p.url} alt="Proof" className="proof-thumb" />
                          <div className="proof-meta">
                            <span className="proof-submitted">Submitted · {new Date(p.submitted_at || p.uploadDate).toLocaleDateString()}</span>
                            <div className={`proof-status ${p.status}`}>
                               {p.status === 'verified' ? '✓ Verified by Admin' : 'Awaiting Review'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── BUDGET CHART ────────────────────────────────────────────
function BudgetChart({ stages, total }) {
  const colors = ['#1A6B3C', '#2D7A4F', '#4A9B6F', '#6DB88E', '#94CDA7', '#BCE0CA'];
  return (
    <div className="budget-section">
      <div className="budget-bar">
        {stages.map((s, i) => (
          <div key={s.name} className="budget-segment" style={{ width: `${s.percent}%`, background: colors[i] }} title={`${s.name}: ${s.percent}%`} />
        ))}
      </div>
      <div style={{ overflowX: 'auto', marginTop: '20px' }}>
        <table className="data-table budget-table" style={{ width: '100%', minWidth: '400px' }}>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Amount</th>
              <th>% of Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s, i) => (
              <tr key={s.name}>
                <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: colors[i], display: 'inline-block', flexShrink: 0 }} />{s.name}</span></td>
                <td className="text-mono">₦{s.amount.toLocaleString()}</td>
                <td className="text-mono">{s.percent}%</td>
                <td><span className={`badge badge-${s.status === 'verified' ? 'active' : s.status === 'in_progress' ? 'pending' : 'draft'}`}>{s.status === 'verified' ? 'Released' : s.status === 'in_progress' ? 'In Progress' : 'Pending'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── INVESTMENT MODAL ────────────────────────────────────────
function InvestmentModal({ farm, isOpen, onClose }) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState(1);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const numericAmount = amount ? parseFloat(amount) : 0;
  const minInvestment = farm?.min_investment || 5000;
  const returnRate = farm?.return_rate ? (farm.return_rate * 100).toFixed(0) : '—';
  const totalReturn = numericAmount ? (numericAmount * (1 + (farm.return_rate || 0))) : 0;
  const profitEstimate = totalReturn - numericAmount;
  const canProceed = numericAmount && numericAmount >= minInvestment;

  const handleProceed = async () => {
    try {
      setError(null);
      setStep(2); // Connecting to gateway state
      
      const res = await api.post('/investments/initiate', {
        farm_id: farm.id,
        amount: numericAmount
      });
      
      if (res.data.success) {
        const { txn_ref, amount_kobo, merchant_code, payment_item_id, customer_email, customer_name } = res.data.data;
        
        const params = {
          merchant_code,
          pay_item_id: payment_item_id,
          txn_ref,
          amount: amount_kobo,
          currency: 566,
          cust_name: customer_name,
          cust_email: customer_email,
          mode: 'TEST',
          site_redirect_url: window.location.origin,
          onComplete: (onCompleteResponse) => {
            handleVerify(txn_ref);
          }
        };

        if (window.webpayCheckout) {
          window.webpayCheckout(params);
        } else {
          setError("Payment gateway library failed to load. Please refresh the page.");
          setStep(1);
          addToast("WebPay library not found", "error");
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Failed to initiate payment");
      setStep(1);
      addToast("Failed to initiate investment", "error");
    }
  };

  const handleVerify = async (txn_ref) => {
    setVerifying(true);
    setStep(3); // Verifying status
    try {
      const res = await api.post('/investments/verify', { txn_ref });
      const { status, failure_reason } = res.data.data;
      
      if (status === 'confirmed') {
        addToast("Investment successful!", "success");
        onClose();
        navigate('/investor/dashboard?tab=investments');
      } else if (status === 'failed') {
        setError(failure_reason || "Payment failed at Interswitch");
        setStep(1);
      } else {
        // Still pending
        setError("Payment is still processing. Check your dashboard in a few minutes.");
        setStep(1);
      }
    } catch (err) {
       setError("Verification timed out. We will confirm your payment soon.");
       setStep(1);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Invest in ${farm?.name}`} width={520} persistent={step > 1}>
      {step === 1 && (
        <div className="invest-form">
          {error && <div style={{ padding:'12px', background:'rgba(181,74,47,0.06)', borderLeft:'3px solid var(--color-danger)', borderRadius:'4px', color:'var(--color-danger)', fontSize:'13px', marginBottom:'10px' }}>{error}</div>}
          <div className="invest-amount-wrap">
            <span className="invest-currency">₦</span>
            <CurrencyInput
              className="invest-amount-input"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <p className="invest-min">Minimum Investment: ₦{(farm?.min_investment || 5000).toLocaleString()}</p>

          <div className="invest-div-cards" style={{ gridTemplateColumns: '1fr' }}>
            <div className="invest-div-card selected" style={{ cursor: 'default', borderColor: 'var(--color-primary)' }}>
              <div className="invest-div-icon">💵</div>
              <span className="invest-div-label">Cash Return</span>
              {numericAmount >= minInvestment && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span className="invest-estimate text-mono">Estimated Return: ₦{Math.round(totalReturn).toLocaleString()} (+{returnRate}% ROI)</span>
                  <span className="invest-estimate text-mono" style={{ color: 'var(--color-primary)' }}>Expected Profit: ₦{Math.round(profitEstimate).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          <button className="btn btn-solid btn-full btn-lg" disabled={!canProceed} onClick={handleProceed} style={{ marginTop: '8px' }}>
            Proceed to Payment
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="invest-loading">
          <div className="invest-spinner" />
          <p>Connecting to payment gateway…</p>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Please complete the payment in the pop-up window.</span>
        </div>
      )}

      {step === 3 && (
        <div className="invest-loading">
          <div className="invest-spinner" />
          <h3 style={{ marginBottom: '8px' }}>Verifying Payment</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>Talking to Interswitch nodes to confirm and secure your investment…</p>
        </div>
      )}

      <style>{`
        .invest-form { display: flex; flex-direction: column; gap: 16px; }
        .invest-amount-wrap { display: flex; align-items: center; border: 2px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; transition: border-color var(--transition-fast); }
        .invest-amount-wrap:focus-within { border-color: var(--color-primary); }
        .invest-currency { font-family: var(--font-mono); font-size: 28px; font-weight: 700; padding: 12px 16px; background: var(--color-surface); color: var(--color-text-secondary); }
        .invest-amount-input { flex: 1; border: none; outline: none; font-family: var(--font-mono); font-size: 40px; font-weight: 700; padding: 8px 16px; color: var(--color-text-primary); }
        .invest-min { font-size: 13px; color: var(--color-text-secondary); margin-top: -8px; }
        .invest-div-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .invest-div-card { border: 2px solid var(--color-border); border-radius: var(--radius-md); padding: 20px 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: all var(--transition-base); text-align: center; }
        .invest-div-card:hover { border-color: var(--color-primary); background: var(--color-primary-light); }
        .invest-div-card.selected { border-color: var(--color-primary); background: var(--color-primary-light); }
        .invest-div-icon { font-size: 28px; }
        .invest-div-label { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
        .invest-estimate { font-size: 12px; color: var(--color-primary); }
        .invest-loading { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 40px; text-align: center; }
        .invest-spinner { width: 40px; height: 40px; border: 3px solid var(--color-border); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </Modal>
  );
}

const adminNavItems = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'reviews', label: 'Pending Reviews', icon: 'reviews' },
  { key: 'payouts', label: 'Payouts', icon: 'payments' },
  { key: 'farms', label: 'All Farms', icon: 'farms' },
  { key: 'users', label: 'Users', icon: 'users' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];
const investorNavItems = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'investments', label: 'My Investments', icon: 'investments' },
  { key: 'payouts', label: 'Expected Payouts', icon: 'payments' },
  { key: 'returns', label: 'Returns', icon: 'returns' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];
const farmerNavItems = [
  { key: 'farms', label: 'My Farms', icon: 'farms' },
  { key: 'add', label: 'Add Farm', icon: 'add' },
  { key: 'milestones', label: 'Milestones', icon: 'milestones' },
  { key: 'harvest', label: 'Harvest Reports', icon: 'harvest' },
  { key: 'explore', label: 'Explore Farms', icon: 'explore' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

// ─── MAIN FARM DETAIL PAGE ────────────────────────────────────
export default function FarmDetailPage() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [farmData, setFarmData] = useState(null);
  const [investOpen, setInvestOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { addToast } = useToast();

  const normalizeFarm = (raw) => {
    if (!raw) return null;
    const f = { ...raw };
    
    f.amount_raised = f.amount_raised_kobo ? f.amount_raised_kobo / 100 : (f.amount_raised ?? f.raised ?? 0);
    f.total_budget = f.total_budget_kobo ? f.total_budget_kobo / 100 : (f.total_budget ?? f.goal ?? 1000000);
    f.name = f.name || 'Unnamed Farm';
    f.cropTag = f.crop_name || f.crop || 'Crop';
    f.status = f.farm_status || f.status || 'active';
    
    f.expectedYield = f.expected_yield || 0;
    f.yieldUnit = f.yield_unit || 'tons';

    if (f.farmer) {
      f.farmer = {
        ...(raw.farmer || {}),
        name: (raw.farmer?.full_name) || (raw.farmer?.name) || 'Anonymous Farmer',
        memberSince: raw.farmer?.created_at ? new Date(raw.farmer.created_at).getFullYear() : '2024',
        totalFarms: raw.farmer?.farm_count || 1,
        bio: raw.farmer?.bio || 'AgriFlow Partner passionate about sustainable agriculture.',
        state: raw.farmer?.state || raw.state || 'Ondo',
        trustScore: raw.farmer?.trust_score ?? 0,
        trustTier: raw.farmer?.trust_tier || 'unrated'
      };
    } else {
      f.farmer = { name: 'Anonymous Farmer', state: f.state || 'Ondo', memberSince: '2024', totalFarms: 1, bio: 'AgriFlow Partner', trustScore: 0, trustTier: 'unrated' };
    }

    f.location = f.location || { state: f.state || 'N/A', lga: f.lga || 'N/A' };
    
    // Prioritize full_display_picture_url for the gallery
    const backendPhotos = (f.full_display_picture_url && f.full_display_picture_url.length > 0) ? f.full_display_picture_url : f.listing_display_picture_url;
    f.photos = (backendPhotos && backendPhotos.length > 0) ? backendPhotos : (f.photos || ['/placeholder-farm.jpg']);
    
    f.transparencyScore = f.transparencyScore || { budgetDisclosed: true, proofsUploaded: !!(f.milestones?.some(m => m.proofs?.length)), adminVerified: f.farm_status === 'active' || f.farm_status === 'funded', yieldReported: false };
    
    if (!f.budget) {
      f.budget = {
        total: f.total_budget,
        stages: f.milestones ? f.milestones.map(m => ({
          name: m.name,
          amount: m.amount || (m.budgetAllocated ?? 0),
          percent: f.total_budget > 0 ? Math.round(((m.amount || m.budgetAllocated || 0) / f.total_budget) * 100) : 0,
          status: m.status === 'verified' ? 'verified' : m.status === 'under_review' ? 'in_progress' : 'pending'
        })) : []
      };
    }

    if (f.milestones) {
      const startDate = f.start_date ? new Date(f.start_date) : new Date();
      f.milestones = f.milestones.map(m => ({
        ...m,
        dueDate: m.dueDate || new Date(startDate.getTime() + (m.expected_week || 0) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        budgetAllocated: m.budgetAllocated || m.amount || 0,
        released: m.released || (m.status === 'verified' || m.status === 'disbursed' ? (m.amount || m.budgetAllocated) : null),
        proofs: m.proofs || []
      }));
    } else {
      f.milestones = [];
    }

    f.daysLeft = f.daysLeft ?? (f.harvest_date ? Math.max(0, Math.ceil((new Date(f.harvest_date) - new Date()) / (1000 * 60 * 60 * 24))) : 0);
    f.investors = f.investors ?? 0;
    return f;
  };

  const handleApprove = async () => {
    try {
      await api.post(`/admin/farms/${id}/approve`);
      addToast('Farm approved successfully', 'success');
      fetchFarm();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to approve farm', 'error');
    }
  };

  const handleReject = async () => {
    if (rejectionReason.length < 10) return;
    try {
      await api.post(`/admin/farms/${id}/reject`, { reason: rejectionReason });
      addToast('Farm rejected', 'info');
      setRejecting(false);
      fetchFarm();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to reject farm', 'error');
    }
  };

  const fetchFarm = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/farms/${id}`);
      if (res.data.success) {
        setFarmData(normalizeFarm(res.data.data));
      }
    } catch (err) {
      console.error("Farm fetch failed:", err);
      setFarmData(normalizeFarm(mockFarms.find(f => f.id === id) || mockFarms[0]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarm();
  }, [id]);

  useEffect(() => {
    if (loading || !farmData) return;
    window.scrollTo(0, 0);
    const ctx = gsap.context(() => {
      gsap.fromTo('.detail-hero-section', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' });
      gsap.fromTo('.timeline-item', { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out', scrollTrigger: { trigger: '.timeline', start: 'top 85%' } });
    });
    return () => ctx.revert();
  }, [id, loading, farmData]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="invest-spinner" style={{ width: '60px', height: '60px' }} />
    </div>
  );

  const farm = farmData;
  if (!farm) return null;

  const isFarmer = user?.role === 'farmer';
  const isAdmin = user?.role === 'admin';
  const isInvestor = user?.role === 'investor';
  const kycComplete = user?.bvn_verified && user?.bank_verified;
  
  const amountRaised = farm.amount_raised;
  const totalBudget = farm.total_budget;
  const progress = Math.min((amountRaised / totalBudget) * 100, 100);
  
  const investment = isInvestor ? mockInvestorPortfolio.find(i => i.farmId === id || (i.farmName === farm.name)) || mockInvestorPortfolio[0] : null;
  const isInvested = isInvestor && investment;

  const grossProceeds = farm.status === 'funded' || farm.status === 'completed' ? farm.total_budget * 1.5 : 0; // mocked
  const farmerShare = grossProceeds * 0.40;
  const investorPool = grossProceeds * 0.40;
  const platformFee = grossProceeds * 0.20;

  const getTrustBadge = (tier) => {
    const t = (tier || 'unrated').toLowerCase();
    if (t === 'verified') return { label: 'Verified Farmer', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    if (t === 'emerging') return { label: 'Emerging Farmer', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    return { label: 'Unrated', color: 'var(--color-text-secondary)', bg: 'var(--color-card-alt)' };
  };
  const tb = getTrustBadge(farm.farmer.trustTier || 'unrated');
  const trustBadgeEl = (
    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', color: tb.color, background: tb.bg, letterSpacing: '0.2px', display: 'flex', alignItems: 'center' }}>
      {tb.label}
    </span>
  );

  const navItems = user?.role === 'admin' ? adminNavItems : 
                   user?.role === 'investor' ? investorNavItems :
                   user?.role === 'farmer' ? farmerNavItems : [];

  const navFooter = user ? (
    <>
      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
        {user.name} {user.role === 'admin' && <span>(Admin)</span>}
      </div>
      <button className="btn btn-ghost btn-sm btn-full" onClick={() => { logout(); navigate('/auth'); }}>Log Out</button>
    </>
  ) : null;

  const pageContent = (
    <>
      <div className="container-sm" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
        <div className="detail-layout">
          {/* Main column */}
          <div className="detail-main">
            <button onClick={() => navigate(-1)} className="btn-link" style={{ fontSize: '14px', marginBottom: '24px', display: 'inline-block' }}>
              ← Go Back
            </button>
            {/* Hero */}
            <div className="detail-hero-section">
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
                <span className="badge badge-active">{farm.cropTag}</span>
                <span className="badge badge-draft">{farm.location.state}, {farm.location.lga}</span>
                {trustBadgeEl}
              </div>
              <h1 style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '20px', fontFamily: 'var(--font-heading)' }}>{farm.name}</h1>
              <PhotoCarousel photos={farm.photos} />

              {/* Funding status strip */}
              <div className="funding-strip">
                <div className="funding-strip-bar">
                  <div className="progress-track" style={{ height: '8px' }}>
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="funding-stats">
                  <div className="funding-stat">
                    <span className="funding-stat-val text-mono">₦{(amountRaised / 1000000).toFixed(2)}M</span>
                    <span className="funding-stat-label">Raised</span>
                  </div>
                  <div className="funding-stat">
                    <span className="funding-stat-val text-mono">₦{(totalBudget / 1000000).toFixed(2)}M</span>
                    <span className="funding-stat-label">Goal</span>
                  </div>
                  <div className="funding-stat">
                    <span className="funding-stat-val text-mono">{farm.investors}</span>
                    <span className="funding-stat-label">Investors</span>
                  </div>
                  <div className="funding-stat">
                    <span className="funding-stat-val text-mono">{farm.daysLeft > 0 ? `${farm.daysLeft}d` : '—'}</span>
                    <span className="funding-stat-label">Days Left</span>
                  </div>
                </div>
              </div>

              {/* Farmer Payout Visibility */}
              {isFarmer && grossProceeds > 0 && (
                <div className="card" style={{ padding: '24px', marginBottom: '24px', backgroundColor: '#fdfbfa', border: '1px solid var(--color-accent)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text-primary)' }}>Harvest Proceeds Breakdown</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Gross Sales Declared</span>
                      <strong className="text-mono">₦{grossProceeds.toLocaleString()}</strong>
                    </div>
                    <div style={{ borderTop: '1px dashed var(--color-border)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Platform Fee (5%)</span>
                      <strong className="text-mono" style={{ color: 'var(--color-danger)' }}>-₦{(grossProceeds * 0.05).toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Investor Returns (Principal + Profit)</span>
                      <strong className="text-mono" style={{ color: 'var(--color-danger)' }}>-₦{(farm.total_budget * (1 + farm.return_rate)).toLocaleString()}</strong>
                    </div>
                    <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight:600 }}>Your Net Profit</span>
                      <strong className="text-mono" style={{ color: 'var(--color-primary)' }}>₦{(grossProceeds * 0.95 - (farm.total_budget * (1 + farm.return_rate))).toLocaleString()}</strong>
                    </div>
                  </div>
                  <div style={{ marginTop: '20px', padding: '12px', background: 'var(--color-card)', borderRadius: '8px', fontSize: '13px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '16px' }}>ℹ️</span>
                    <div>
                      <strong style={{ display: 'block', marginBottom: '4px' }}>Payout Status: Processing</strong>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Payment evidence is under admin review. Your net profit will be disbursed to your saved bank account via Interswitch.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Transparency Score */}
              <div className="transparency-strip">
                {[
                  ['Budget Disclosed', farm.transparencyScore.budgetDisclosed],
                  ['Proofs Uploaded', farm.transparencyScore.proofsUploaded],
                  ['Admin Verified', farm.transparencyScore.adminVerified],
                  ['Yield Reported', farm.transparencyScore.yieldReported],
                ].map(([label, done]) => (
                  <div key={label} className="transparency-item">
                    <span className="transparency-dot" style={{ background: done ? 'var(--color-primary)' : '#ccc' }} />
                    <span className="transparency-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* About */}
            <div className="detail-section">
              <h2 className="detail-section-title">About this Farm</h2>
              <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', lineHeight: 1.75 }}>{farm.description}</p>
            </div>

            {/* Budget */}
            <div className="detail-section">
              <h2 className="detail-section-title">Budget Breakdown</h2>
              <BudgetChart stages={farm.budget.stages} total={farm.budget.total} />
            </div>

            {/* Milestones */}
            <div className="detail-section">
              <h2 className="detail-section-title">Milestones</h2>
              <MilestoneTimeline milestones={farm.milestones} />
            </div>

            {/* Farmer Profile */}
            <div className="detail-section">
              <h2 className="detail-section-title">Farmer Profile</h2>
              <div className="farmer-profile card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div className="farmer-avatar">{farm.farmer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <h3 style={{ fontWeight: 600 }}>{farm.farmer.name}</h3>
                    {trustBadgeEl}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>{farm.farmer.state} · Member since {farm.farmer.memberSince} · {farm.farmer.totalFarms} farm{farm.farmer.totalFarms > 1 ? 's' : ''}</p>
                  
                  <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--color-card-alt)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Farmer Trust Score</span>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>{farm.farmer.trustScore || 0}/100</span>
                     </div>
                     <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                        "AgriFlow's trust score combines BVN identity verification, credit history, and bank account verification. A higher score means a stronger financial track record. All farmers on AgriFlow are BVN-verified."
                     </p>
                  </div>

                  <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{farm.farmer.bio}</p>
                </div>
              </div>
            </div>

            {/* Data-Backed ROI Breakdown (Investor Trust Feature) */}
            <div className="detail-section">
              <h2 className="detail-section-title">Data-Backed ROI Breakdown</h2>
              <div className="card" style={{ padding: '24px', background: '#fdfbfa', border: '1px solid var(--color-primary)' }}>
                <p style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🌱</span> How returns are calculated (based on AgriFlow crop reference data)
                </p>
                <div className="roi-grid" style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Farm size</span><span style={{ fontWeight: 500 }}>{farm.location.lga === 'Abeokuta South' ? '3' : '2'} hectares</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Expected yield</span><span style={{ fontWeight: 500 }}>{farm.expectedYield || 0} – {(farm.expectedYield || 0) * 1.5} {farm.yieldUnit}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Est. gross revenue</span><span style={{ fontWeight: 500 }}>₦{(farm.total_budget * 1.2).toLocaleString()} – ₦{(farm.total_budget * 2.5).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Production cost</span><span className="text-mono" style={{ fontWeight: 500 }}>₦{farm.total_budget.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)', gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Net Investor Pool</span><span className="text-mono" style={{ fontWeight: 500 }}>₦{(farm.total_budget * (1 + farm.return_rate)).toLocaleString()} Maximum</span>
                  </div>
                </div>

                <div style={{ background: 'var(--color-card)', padding: '20px', borderRadius: '12px' }}>
                  {isInvested ? (
                    <div style={{ marginBottom: '16px', display:'flex', alignItems:'center', gap:'10px' }}>
                      <span className="badge badge-active" style={{ fontSize:'14px', padding:'6px 12px' }}>✓ You are an investor</span>
                    </div>
                  ) : null}
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {isInvested ? `Based on your investment of ₦${(investment.amount || 0).toLocaleString()}` : 'If you invest ₦50,000'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {(() => {
                      const calcAmount = isInvested ? (investment.amount || 50000) : 50000;
                      const expectedReturn = calcAmount * (1 + farm.return_rate);
                      const consReturn = calcAmount * (1 + (Math.max(farm.return_rate * 100 - 5, 5))/100);
                      const optReturn = calcAmount * (1 + (farm.return_rate * 100 + Math.min(6, (farm.return_rate * 100)/2))/100);
                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Conservative</span>
                            <div style={{ textAlign: 'right' }}>
                              <span className="text-mono" style={{ fontSize: '16px', fontWeight: 700, display: 'block' }}>₦{Math.round(consReturn).toLocaleString()}</span>
                              <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>+{((consReturn/calcAmount - 1)*100).toFixed(1)}%</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-primary-light)', padding: '12px', borderRadius: '8px', margin: '4px -12px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Expected <span style={{ fontSize: '12px', fontWeight: 400 }}>(Target)</span></span>
                            <div style={{ textAlign: 'right' }}>
                              <span className="text-mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)', display: 'block' }}>₦{Math.round(expectedReturn).toLocaleString()}</span>
                              <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>+{(farm.return_rate * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Optimistic</span>
                            <div style={{ textAlign: 'right' }}>
                              <span className="text-mono" style={{ fontSize: '16px', fontWeight: 700, display: 'block' }}>₦{Math.round(optReturn).toLocaleString()}</span>
                              <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>+{((optReturn/calcAmount - 1)*100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '20px', fontStyle: 'italic', lineHeight: 1.5 }}>
                  * Return estimate is based on AgriFlow’s crop reference data. Actual returns depend on harvest yield and market prices at time of sale. Returns cap out at optimistic scenario; farm profit above this goes to the farmer.
                </p>
              </div>
            </div>

            {/* Farm Investment Action / Admin Review Block */}
            <div className="card" style={{ padding: '32px', marginTop: '24px', background: 'var(--color-card)', border: '2px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>{isAdmin && farm.status === 'pending' ? 'Admin Review' : 'Funding Status'}</h3>
              
              <div className="progress-track" style={{ marginBottom: '16px', height: '12px' }}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              
              <div className="detail-sidebar-stats" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <strong className="text-mono" style={{ fontSize: '24px' }}>₦{(amountRaised / 1000000).toFixed(2)}M</strong>
                  <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', display: 'block' }}>of ₦{(totalBudget / 1000000).toFixed(2)}M goal</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong className="text-mono" style={{ color: 'var(--color-primary)', fontSize: '24px' }}>{progress.toFixed(0)}%</strong>
                  <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', display: 'block' }}>Funded</span>
                </div>
              </div>

              {isAdmin ? (
                farm.status === 'pending' ? (
                  <div className="admin-actions">
                    {!rejecting ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button className="btn btn-solid btn-lg" onClick={handleApprove} style={{ background: 'var(--color-primary)' }}>Approve Farm</button>
                        <button className="btn btn-ghost btn-lg" onClick={() => setRejecting(true)} style={{ color: 'var(--color-danger)' }}>Reject Farm</button>
                      </div>
                    ) : (
                      <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '12px', color: 'var(--color-danger)' }}>Reason for Rejection</p>
                        <textarea 
                          className="form-input" 
                          placeholder="Please provide details (min 10 chars)..." 
                          rows={3}
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                          style={{ marginBottom: '16px', padding: '12px' }}
                        />
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button className="btn btn-solid btn-sm" style={{ background: 'var(--color-danger)' }} onClick={handleReject} disabled={rejectionReason.length < 10}>Confirm Rejection</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setRejecting(false)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="admin-status-note" style={{ padding: '16px', background: 'var(--color-card-alt)', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                      This farm is <strong>{farm.status.toUpperCase()}</strong>. No further administrative action required.
                    </p>
                  </div>
                )
              ) : isFarmer ? (
                <div className="farmer-readonly">
                  <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                    You're viewing this as the farmer. Only investors can fund farms.
                  </p>
                  <Link to="/farmer/dashboard" className="btn-solid btn" style={{ width: '100%', textAlign: 'center' }}>Go to Dashboard</Link>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
                    {!user ? (
                      <button className="btn btn-solid btn-lg" onClick={() => navigate('/auth?tab=login', { state: { from: `/farms/${id}` } })}>
                        Invest Now
                      </button>
                    ) : (isInvestor && !kycComplete) ? (
                      <button className="btn btn-solid btn-lg" 
                        onClick={() => navigate('/investor/dashboard?tab=settings')} 
                        style={{ background: '#f59e0b', border: 'none' }}
                      >
                        Complete your KYC to invest
                      </button>
                    ) : (
                      <button className="btn btn-solid btn-lg" onClick={() => setInvestOpen(true)} disabled={farm.status === 'funded' || farm.daysLeft === 0}>
                        {farm.status === 'funded' ? 'Fully Funded' : isInvested ? 'Invest More' : 'Invest Now'}
                      </button>
                    )}
                    <button className="btn btn-ghost btn-lg">Save Farm</button>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '16px', textAlign: 'center' }}>
                    Funds are held in escrow and released in stages after verification.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {!user && <Footer />}
      <InvestmentModal farm={farm} isOpen={investOpen} onClose={() => setInvestOpen(false)} />
    </>
  );

  return (
    <div className="farm-detail-page">
      {!user && <Navbar />}

      {user ? (
        <DashboardLayout 
          navItems={navItems} 
          activeTab={user.role === 'admin' ? 'farms' : user.role === 'farmer' ? 'explore' : 'investments'} 
          onTabChange={(k) => navigate(`/${user.role}/dashboard?tab=${k}`)} 
          footer={navFooter}
        >
          {pageContent}
        </DashboardLayout>
      ) : (
        pageContent
      )}

      <style>{`
        .farm-detail-page { display: flex; flex-direction: column; min-height: 100vh; overflow-x: hidden; }
        .detail-layout { display: flex; flex-direction: column; max-width: 800px; margin: 0 auto; width: 100%; align-items: stretch; }
        .detail-main { min-width: 0; width: 100%; }
        .roi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; }
        .detail-section { margin-bottom: 48px; }
        .detail-section-title { font-size: 22px; font-weight: 700; margin-bottom: 20px; font-family: var(--font-heading); }

        /* Carousel */
        .carousel { border-radius: var(--radius-lg); overflow: hidden; position: relative; margin-bottom: 28px; }
        .carousel-track { display: flex; transition: transform var(--transition-slow); }
        .carousel-img { min-width: 100%; height: 340px; object-fit: cover; cursor: zoom-in; }
        .carousel-dots { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; }
        .carousel-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.5); border: none; cursor: pointer; transition: background var(--transition-fast); }
        .carousel-dot.active { background: #fff; }
        .lightbox-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .lightbox-close { position: absolute; top: 20px; right: 24px; color: #fff; font-size: 24px; background: none; border: none; cursor: pointer; }
        .lightbox-img { max-width: 90vw; max-height: 85vh; border-radius: var(--radius-md); object-fit: contain; }
        .lightbox-arrow { position: absolute; top: 50%; transform: translateY(-50%); color: #fff; font-size: 48px; background: none; border: none; cursor: pointer; padding: 0 20px; }
        .lightbox-arrow.left { left: 0; }
        .lightbox-arrow.right { right: 0; }

        /* Funding */
        .funding-strip { background: var(--color-card-alt); border-radius: var(--radius-md); padding: 20px; margin-bottom: 16px; }
        .funding-strip-bar { margin-bottom: 16px; }
        .funding-stats { display: flex; justify-content: space-between; }
        .funding-stat { text-align: center; }
        .funding-stat-val { font-size: 18px; font-weight: 700; color: var(--color-text-primary); display: block; }
        .funding-stat-label { font-size: 12px; color: var(--color-text-secondary); }

        /* Transparency */
        .transparency-strip { display: flex; gap: 20px; flex-wrap: wrap; padding: 12px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); margin-bottom: 8px; }
        .transparency-item { display: flex; align-items: center; gap: 6px; }
        .transparency-dot { width: 8px; height: 8px; border-radius: 50%; }
        .transparency-label { font-size: 12px; color: var(--color-text-secondary); }

        /* Budget */
        .budget-bar { display: flex; height: 20px; border-radius: var(--radius-full); overflow: hidden; }
        .budget-segment { height: 100%; transition: width var(--transition-slow); }

        /* Timeline */
        .timeline { display: flex; flex-direction: column; }
        .timeline-item { display: flex; gap: 16px; padding-bottom: 0; }
        .timeline-left { display: flex; flex-direction: column; align-items: center; }
        .timeline-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid; flex-shrink: 0; margin-top: 4px; }
        .timeline-line { width: 2px; flex: 1; min-height: 20px; margin: 4px 0; }
        .timeline-card { flex: 1; padding: 16px 20px; margin-bottom: 16px; }
        .timeline-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
        .timeline-name { font-weight: 600; font-size: 15px; }
        .timeline-date { font-size: 12px; color: var(--color-text-secondary); }
        .timeline-amounts { display: flex; gap: 20px; font-size: 13px; color: var(--color-text-secondary); margin-bottom: 10px; }

        /* Proof */
        .proof-section { border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px; }
        .proof-toggle { background: none; border: none; color: var(--color-primary); font-size: 13px; font-weight: 500; cursor: pointer; }
        .proof-list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
        .proof-item { display: flex; gap: 12px; background: var(--color-surface); border-radius: var(--radius-sm); padding: 10px; }
        .proof-thumb { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
        .proof-meta { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .proof-submitted { font-size: 12px; color: var(--color-text-secondary); }
        .proof-status { font-size: 12px; font-weight: 500; }
        .proof-status.approved { color: var(--color-primary); }
        .proof-status.rejected { color: var(--color-danger); }
        .proof-admin-note { font-size: 12px; color: var(--color-text-secondary); background: var(--color-card-alt); padding: 6px 8px; border-radius: 4px; margin-top: 4px; }

        /* Farmer */
        .farmer-avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; flex-shrink: 0; }

        /* Terms */
        .terms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        @media (max-width: 900px) {
          .terms-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .roi-grid { grid-template-columns: 1fr; }
          .roi-grid > div { border-bottom: 1px dashed var(--color-border) !important; padding-bottom: 8px; }
          .funding-stats { flex-wrap: wrap; justify-content: flex-start; gap: 20px; }
          .funding-stat { text-align: left; }
          .transparency-strip { gap: 12px; align-items: stretch; }
          .transparency-item { font-size: 13px; }
          .carousel-img { height: 220px; }
          .farmer-profile { flex-direction: column; align-items: flex-start !important; }
        }
        @media (max-width: 480px) {
          .detail-section { margin-bottom: 32px; }
          .detail-section-title { font-size: 18px; margin-bottom: 16px; }
          .timeline-amounts { flex-direction: column; gap: 8px; }
        }
      `}</style>
    </div>
  );
}
