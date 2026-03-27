import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import { formatCurrency } from '../utils/format';
import { mockAdminStats, mockPendingProofs, mockPayoutFarms, mockAllPayouts } from '../data/mockData';
import DashboardLayout from '../components/DashboardLayout';
import CurrencyInput from '../components/CurrencyInput';
import Pagination from '../components/Pagination';
import LoadingState, { Spinner } from '../components/Loader';
import Button from '../components/Button';
import Icon from '../components/Icon';

const baseAdminFarms = [
  { id:'f1', name:'Oduya Maize Farm', farmer:'Emeka Obi', crop:'Maize', total_budget:5000000, amount_raised:3800000, status:'active' },
  { id:'f2', name:'Kano Rice Farm', farmer:'Musa Ibrahim', crop:'Rice', total_budget:2500000, amount_raised:2500000, status:'funded' },
  { id:'f3', name:'Oyo Tomato Project', farmer:'Adebayo Ola', crop:'Tomato', total_budget:1200000, amount_raised:840000, status:'active' },
  { id:'f4', name:'Benue Yam Farm', farmer:'Terwase Akaa', crop:'Yam', total_budget:800000, amount_raised:0, status:'draft' },
];
const mockAdminFarms = Array.from({length: 45}).map((_, i) => ({
  ...baseAdminFarms[i % baseAdminFarms.length],
  id: `f-admin-${i}`,
  name: `${baseAdminFarms[i % baseAdminFarms.length].name} ${i+1}`
}));

const baseUsers = [
  { id: 'u1', name: 'Adaeze Okonkwo', role: 'investor', email: 'adaeze@email.com', joined: '2025-11-01', farms: 0, investments: 3 },
  { id: 'u2', name: 'Emeka Obi', role: 'farmer', email: 'emeka@farm.ng', joined: '2025-09-15', farms: 2, investments: 0 },
  { id: 'u3', name: 'Fatima Bello', role: 'investor', email: 'fatima@invest.ng', joined: '2025-12-20', farms: 0, investments: 5 },
  { id: 'u4', name: 'Chukwudi Eze', role: 'farmer', email: 'chukwudi@agro.ng', joined: '2026-01-05', farms: 1, investments: 0 },
];
const mockUsersExpanded = Array.from({length: 50}).map((_, i) => ({
  ...baseUsers[i % baseUsers.length],
  id: `u-gen-${i}`,
  name: `${baseUsers[i % baseUsers.length].name} ${i+1}`,
  email: `user${i}@example.com`
}));


function HarvestReportCard({ report, onVerify }) {
  const [loading, setLoading] = useState(false);
  const [confirmedSales, setConfirmedSales] = useState(report.admin_confirmed_sales || report.total_sales_declared);

  const handleVerify = async () => {
    setLoading(true);
    try {
      await onVerify(report.id, confirmedSales);
    } finally {
      setLoading(false);
    }
  };

  const isVerified = report.status === 'verified';

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '20px', borderLeft: isVerified ? '4px solid var(--color-primary)' : '4px solid #f59e0b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ flex: '1 1 400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h3 style={{ fontWeight: 600, fontSize: '18px', margin: 0 }}>{report.farm_name}</h3>
            <span style={{ 
              padding: '2px 8px', 
              borderRadius: '4px', 
              fontSize: '11px', 
              fontWeight: 600, 
              textTransform: 'uppercase',
              backgroundColor: isVerified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              color: isVerified ? 'var(--color-primary)' : '#d97706'
            }}>
              {report.status}
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Submitted by <strong>{report.farmer_name}</strong> ({report.farmer_email}) on {new Date(report.harvest_date).toLocaleDateString()}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', background: 'var(--color-surface)', padding: '16px', borderRadius: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Actual Yield</div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>{report.actual_yield} units</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Expected: {report.expected_yield}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Declared Sales</div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-primary)' }}>₦{report.total_sales_declared.toLocaleString()}</div>
              {report.expected_revenue && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  Exp: ₦{report.expected_revenue.toLocaleString()}
                  <span style={{ 
                    marginLeft: '4px', 
                    color: report.total_sales_declared >= report.expected_revenue ? '#059669' : '#dc2626'
                  }}>
                    ({((report.total_sales_declared - report.expected_revenue) / report.expected_revenue * 100).toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Sale Price</div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>
                ₦{(report.total_sales_declared / (report.actual_yield || 1)).toLocaleString(undefined, {maximumFractionDigits: 0})}/unit
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Target: ₦{report.sale_price_target?.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: '0 0 250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Verification Evidence ({report.payment_evidence_urls?.length || 0})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
            {report.payment_evidence_urls?.map((url, idx) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ width: '100%', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)', display: 'block' }}>
                <img src={url} alt={`Evidence ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </a>
            ))}
          </div>
          
          {!isVerified ? (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Confirm Final Sales (₦)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ fontSize: '14px', height: '36px' }}
                  value={confirmedSales} 
                  onChange={e => setConfirmedSales(e.target.value)} 
                />
              </div>
              <button 
                className="btn btn-solid btn-sm" 
                style={{ width: '100%' }}
                onClick={handleVerify}
                disabled={loading}
              >
                {loading ? <Spinner size="sm" /> : 'Verify & Set Final ROI'}
              </button>
            </div>
          ) : (
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
               <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase' }}>Confirmed Sales</div>
               <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--color-primary)' }}>₦{report.admin_confirmed_sales?.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const navItems = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'pending-farms', label: 'Pending Farms', icon: 'explore' },
  { key: 'proofs', label: 'Pending Proofs', icon: 'reviews' },
  { key: 'harvest-reports', label: 'Harvest Reports', icon: 'harvest' },
  { key: 'payouts', label: 'Payouts', icon: 'payments' },
  { key: 'farms', label: 'All Farms', icon: 'farms' },
  { key: 'users', label: 'Users', icon: 'users' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

function PendingFarmCard({ farm, onAction }) {
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleReject = async () => {
    if (rejectionReason.length < 10) return;
    setLoading(true);
    try {
      await onAction(farm.id, 'reject', rejectionReason);
      setRejecting(false);
      setRejectionReason('');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onAction(farm.id, 'approve');
    } finally {
      setLoading(false);
    }
  };

  const tierColor = farm.farmer?.trust_tier === 'verified' ? 'var(--color-primary)' : 
                    farm.farmer?.trust_tier === 'emerging' ? '#f59e0b' : 'var(--color-text-muted)';
  
  const tierLabel = farm.farmer?.trust_tier === 'verified' ? 'Verified Farmer' : 
                    farm.farmer?.trust_tier === 'emerging' ? 'Emerging Farmer' : 'Unrated';

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--color-card-alt)' }}>
            <img src={farm.listing_display_picture_url?.[0] || '/placeholder-farm.jpg'} alt={farm.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 600, fontSize: '18px' }}>{farm.name}</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '4px 0' }}>{farm.crop_name} · {farm.state}, {farm.lga}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Farmer: <strong>{farm.farmer?.full_name}</strong></span>
              <span style={{ 
                padding: '2px 8px', 
                borderRadius: '4px', 
                fontSize: '11px', 
                fontWeight: 600, 
                backgroundColor: `${tierColor}15`, 
                color: tierColor,
                textTransform: 'uppercase'
              }}>{tierLabel}</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(farm.total_budget)}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Target Funding</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
             <Link to={`/farms/${farm.id}`} className="btn btn-ghost btn-sm">View Details</Link>
             <Button variant="solid" size="sm" onClick={handleApprove} loading={loading}>Approve</Button>
             <Button variant="ghost" size="sm" style={{ color: 'var(--color-danger)' }} onClick={() => setRejecting(true)} disabled={loading}>Reject</Button>
          </div>
        </div>
      </div>

      {rejecting && (
        <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
          <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: 'var(--color-danger)' }}>Reason for Rejection</p>
          <textarea 
            className="form-input" 
            placeholder="Min 10 characters..." 
            rows={2}
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            style={{ marginBottom: '12px' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="solid" size="sm" style={{ background: 'var(--color-danger)' }} onClick={handleReject} disabled={rejectionReason.length < 10} loading={loading}>Reject Farm</Button>
            <Button variant="ghost" size="sm" onClick={() => setRejecting(false)} disabled={loading}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProofReviewCard({ proof, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    setLoading(true);
    try {
      await onAction(proof.id, 'reject', rejectionReason.trim());
      setRejecting(false);
      setRejectionReason('');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onAction(proof.id, 'approve');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card review-card">
      <div className="review-header">
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '16px' }}>{proof.name}</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Farm: {proof.farm_name} · Farmer: {proof.farmer_name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge badge-pending">Pending Proof</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setExpanded(e => !e); setRejecting(false); }}>{expanded ? 'Collapse' : 'Review'}</button>
        </div>
      </div>

      {expanded && (
        <div className="review-body">
          <div className="review-grid2">
            <div>
              <h4 className="review-sub">Metadata</h4>
              <div className="review-rows">
                {[['Upload Date', proof.submitted_at ? new Date(proof.submitted_at).toLocaleDateString() : 'N/A'], ['Milestone Order', `#${proof.order_number}`]].map(([l, v]) => (
                  <div key={l} className="review-row-mini"><span>{l}</span><strong>{v}</strong></div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="review-sub">GPS Verification</h4>
              <div className="review-rows">
                <div className="review-row-mini"><span>Status</span><strong style={{ color: proof.gps_flag === 'pass' ? 'var(--color-primary)' : 'var(--color-danger)' }}>{proof.gps_flag?.toUpperCase() || 'N/A'}</strong></div>
                <div className="review-row-mini"><span>Variance</span><strong>{proof.gps_distance_km ? `${proof.gps_distance_km.toFixed(2)} km` : 'N/A'}</strong></div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <h4 className="review-sub">Evidence</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <img src={proof.proof_photo_url} alt="proof" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
            </div>
          </div>

          {rejecting ? (
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--color-card-alt)', borderRadius: '10px', border: '1px solid var(--color-danger-light, rgba(181,74,47,0.2))' }}>
              <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '10px', color: 'var(--color-danger)' }}>Rejection Reason</p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>The farmer will see this reason on their dashboard.</p>
              <textarea
                className="form-input form-textarea"
                rows={3}
                placeholder="e.g. Photo is blurry or does not clearly show fertilizer application."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                style={{ marginBottom: '4px' }}
              />
              <p style={{ 
                fontSize: '11px', 
                color: rejectionReason.trim().length > 0 && rejectionReason.trim().length < 10 ? 'var(--color-danger)' : 'var(--color-text-muted)',
                marginBottom: '12px',
                fontWeight: rejectionReason.trim().length > 0 && rejectionReason.trim().length < 10 ? 600 : 400
              }}>
                {rejectionReason.trim().length < 10 ? `Minimum 10 characters required (${rejectionReason.trim().length}/10)` : <span style={{display:'flex', alignItems:'center', gap:'4px'}}><Icon name="milestones" size={12} /> Length requirement met</span>}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button size="sm" style={{ background: 'var(--color-danger)', color: '#fff' }} onClick={handleReject} disabled={rejectionReason.trim().length < 10} loading={loading}>Confirm Rejection</Button>
                <Button variant="ghost" size="sm" onClick={() => { setRejecting(false); setRejectionReason(''); }} disabled={loading}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="review-actions-row">
               <Button variant="solid" size="sm" style={{ background: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleApprove} loading={loading}><Icon name="milestones" size={16} /> Approve Milestone</Button>
              <Button variant="ghost" size="sm" style={{ color: 'var(--color-danger)' }} onClick={() => setRejecting(true)} disabled={loading}>✕ Reject</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  
  const [stats, setStats] = useState(mockAdminStats);
  const [pendingFarms, setPendingFarms] = useState([]);
  const [allFarms, setAllFarms] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [harvestReports, setHarvestReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  const { addToast } = useToast();
  const { user, logout, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data.success) setStats(res.data.data);
    } catch (err) {
      console.error("Stats fetch failed:", err);
    }
  };

  const fetchPendingFarms = async () => {
    try {
      const res = await api.get('/admin/farms/pending');
      if (res.data.success) {
        setPendingFarms(res.data.data);
      }
    } catch (err) {
      console.error("Pending farms fetch failed:", err);
      // Fallback to empty list or mock if server is unreachable
      setPendingFarms([]);
    }
  };

  const fetchAllFarms = async () => {
    try {
      const res = await api.get('/admin/farms');
      if (res.data.success) setAllFarms(res.data.data);
    } catch (err) {
      console.error("All farms fetch failed:", err);
    }
  };

  const fetchPendingProofs = async () => {
    try {
      const res = await api.get('/admin/milestones/pending');
      if (res.data.success) setProofs(res.data.data);
    } catch (err) {
      console.error("Pending proofs fetch failed:", err);
    }
  };

  const fetchHarvestReports = async () => {
    try {
      const res = await api.get('/admin/harvest-reports');
      if (res.data.success) {
        setHarvestReports(res.data.data);
      }
    } catch (err) {
      console.error("Harvest reports fetch failed:", err);
      setHarvestReports([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) setUsers(res.data.data);
    } catch (err) {
      console.error('Users fetch failed:', err);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(), 
      fetchPendingFarms(), 
      fetchPendingProofs(), 
      fetchHarvestReports(),
      fetchUsers(), 
      fetchAllFarms(), 
      fetchRepayments()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
    fetchProfile();
    
    // Auto-refresh every 30 seconds (only if window is focused)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchStats();
        fetchPendingFarms();
        fetchPendingProofs();
        fetchUsers();
        fetchAllFarms();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleFarmAction = async (id, action, reason) => {
    try {
      if (action === 'approve') {
        await api.post(`/admin/farms/${id}/approve`);
        addToast("Farm Approved", "success", "The farm is now live and can receive investments.");
      } else {
        await api.post(`/admin/farms/${id}/reject`, { reason });
        addToast("Farm Rejected", "error", "The farmer will be notified of the reason.");
      }
      fetchPendingFarms();
      fetchStats();
    } catch (err) {
      let errorMsg = "Could not complete the request.";
      if (err.response?.status === 422) {
        const details = err.response.data?.detail;
        errorMsg = Array.isArray(details) ? details.map(d => d.msg).join(", ") : (details || "Validation error");
      } else {
        errorMsg = err.response?.data?.detail || errorMsg;
      }
      addToast("Action Failed", "error", errorMsg);
    }
  };

  const handleAction = async (id, action, reason) => {
    try {
      if (action === 'approve') {
        await api.post(`/admin/milestones/${id}/approve`);
        addToast("Proof Approved", "success", "Milestone funds verified successfully.");
      } else {
        await api.post(`/admin/milestones/${id}/reject`, { reason });
        addToast("Proof Rejected", "error", "Farmer notified to resubmit.");
      }
      fetchPendingProofs();
      fetchStats();
    } catch (err) {
      console.error("Milestone action error:", err);
      let errorMsg = "Could not complete the request.";
      if (err.response?.status === 422) {
        const details = err.response.data?.detail;
        errorMsg = Array.isArray(details) ? details.map(d => d.msg).join(", ") : (details || "Validation error");
      } else {
        errorMsg = err.response?.data?.detail || errorMsg;
      }
      addToast("Action Failed", "error", errorMsg);
    }
  };

  const handleTabChange = (k) => {
    setTab(k);
    setSearchParams({ tab: k });
  };

  const [searchUsers, setSearchUsers] = useState('');
  
  const handleVerifyHarvestReport = async (reportId, confirmedSales) => {
    try {
      const res = await api.post(`/admin/harvest-reports/${reportId}/verify?confirmed_sales=${confirmedSales}`);
      if (res.data.success) {
        addToast('Harvest report verified successfully', 'success');
        fetchHarvestReports();
        fetchRepayments(); // Repayment details might change or new repayment might be ready
      }
    } catch (err) {
      addToast(err.response?.data?.detail || 'Verification failed', 'error');
    }
  };

  // Payout states
  const [selectedPayoutFarm, setSelectedPayoutFarm] = useState('');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');
  const [payoutsList, setPayoutsList] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [batchDrawerOpen, setBatchDrawerOpen] = useState(false);
  
  const fetchPayouts = async (fId) => {
    if (!fId) return;
    try {
       const res = await api.get(`/admin/payouts/${fId}`);
       if (res.data.success) setPayoutsList(res.data.data);
    } catch (err) {
       console.error("Payouts fetch failed:", err);
       setPayoutsList([]);
    }
  };

  const fetchRepayments = async () => {
    try {
      const res = await api.get('/admin/repayments');
      if (res.data.success) setRepayments(res.data.data);
    } catch (err) {
      console.error('Repayments fetch failed:', err);
    }
  };

  useEffect(() => {
    if (selectedPayoutFarm) {
      fetchPayouts(selectedPayoutFarm);
    }
  }, [selectedPayoutFarm]);

  // Include farms that have completed repayments (status = completed)
  const payoutFarms = allFarms.filter(f => f.status === 'completed' || f.status === 'paid_out');

  useEffect(() => {
    if (payoutFarms.length > 0 && !selectedPayoutFarm) {
      setSelectedPayoutFarm(payoutFarms[0].id);
    }
  }, [allFarms]);
  
  // Pagination states
  const ITEMS_PER_PAGE = 8;
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [farmsPage, setFarmsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);

  const handleBatchPayout = async () => {
    if (!selectedPayoutFarm) return;
    try {
      await api.post(`/admin/farms/${selectedPayoutFarm}/initiate-payouts`);
      addToast('Batch payouts initiated successfully', 'success', 'All waiting payouts have been processed.');
      setBatchDrawerOpen(false);
      fetchPayouts(selectedPayoutFarm);
      fetchAllFarms(); // Refresh farm status to PAID_OUT
      fetchStats();
    } catch (err) {
      addToast('Failed to initiate payouts', 'error', err.response?.data?.detail || "An error occurred");
    }
  };

  const handleRetryPayout = (id) => {
    setPayoutsList(prev => prev.map(p => p.id === id ? { ...p, status: 'successful' } : p));
    addToast(`Payout ID ${id} manually retried.`, 'success');
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchUsers.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUsers.toLowerCase())
  );

  // Payouts Pagination Logic - backend already scopes payouts to the selected farm
  const filteredPayouts = payoutsList.filter(p => payoutStatusFilter === 'all' || p.status === payoutStatusFilter);
  const pbStart = (payoutsPage - 1) * ITEMS_PER_PAGE;
  const paginatedPayouts = filteredPayouts.slice(pbStart, pbStart + ITEMS_PER_PAGE);

  // Farms Pagination Logic
  const fbStart = (farmsPage - 1) * ITEMS_PER_PAGE;
  const paginatedFarms = allFarms.slice(fbStart, fbStart + ITEMS_PER_PAGE);

  // Users Pagination Logic
  const ubStart = (usersPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(ubStart, ubStart + ITEMS_PER_PAGE);

  // Proofs Pagination Logic
  const [proofsPage, setProofsPage] = useState(1);
  const rbStart = (proofsPage - 1) * ITEMS_PER_PAGE;
  const paginatedProofs = proofs.slice(rbStart, rbStart + ITEMS_PER_PAGE);

  // User profile drawer helper
  const getTierColor = (tier) => {
    if (tier === 'verified') return 'var(--color-primary)';
    if (tier === 'emerging') return '#f59e0b';
    return 'var(--color-text-muted)';
  };
  const getTierLabel = (tier) => {
    if (tier === 'verified') return 'Verified Farmer';
    if (tier === 'emerging') return 'Emerging Farmer';
    return 'Unrated';
  };

  // Reset pagination on filter change
  useEffect(() => setPayoutsPage(1), [selectedPayoutFarm, payoutStatusFilter]);
  useEffect(() => setUsersPage(1), [searchUsers]);

  const navFooter = (
    <>
      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>{user?.name} (Admin)</div>
      <button className="btn btn-ghost btn-sm btn-full" onClick={() => { logout(); navigate('/auth'); }}>Log Out</button>
    </>
  );

  if (loading) return <LoadingState message="Brewing your dashboard..." />;

  return (
    <DashboardLayout navItems={navItems} activeTab={tab} onTabChange={handleTabChange} footer={navFooter}>
        {tab === 'overview' && (
          <>
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Platform Overview</h1>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Real-time snapshot · Last updated: just now</p>
            </div>

            {/* Metric cards */}
            <div className="metric-cards" style={{ marginBottom: '32px' }}>
              {[
                { label: 'Total Farms', val: stats.total_farms || 0 },
                { label: 'Active Listings', val: stats.active_farms || 0 },
                { label: 'Pending Reviews', val: stats.pending_reviews || 0, accent: true },
                { label: 'Total Investors', val: stats.total_investors || 0 },
                { label: 'Total Farmers', val: stats.total_farmers || 0 },
                { label: 'Funds Raised', val: formatCurrency(stats.total_funds_raised), green: true },
              ].map(m => (
                <div key={m.label} className="metric-card">
                  <div className="metric-card-label">{m.label}</div>
                  <div className={`metric-card-value text-mono${m.green ? ' green' : m.accent ? ' gold' : ''}`}>{m.val}</div>
                </div>
              ))}
            </div>

            {/* Pending proofs preview */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Pending Proofs <span className="badge badge-pending" style={{ marginLeft: '8px' }}>{proofs.length}</span></h2>
              <button className="btn-link" onClick={() => handleTabChange('proofs')}>View all →</button>
            </div>
            {proofs.length === 0 ? (
              <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Icon name="milestones" size={32} />
                <span>All milestones verified.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {proofs.slice(0, 2).map(r => <ProofReviewCard key={r.id} proof={r} onAction={handleAction} />)}
              </div>
            )}

            {/* Charts placeholder */}
            <div style={{ marginTop: '36px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Funding Activity</h2>
              <div className="charts-grid">
                <div className="card" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>Funds raised by crop</div>
                  {[{ name: 'Maize', pct: 45 }, { name: 'Rice', pct: 28 }, { name: 'Tomato', pct: 15 }, { name: 'Cassava', pct: 12 }].map(c => (
                    <div key={c.name} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span>{c.name}</span><span className="text-mono">{c.pct}%</span>
                      </div>
                      <div className="progress-track" style={{ height: '6px' }}><div className="progress-fill" style={{ width: `${c.pct}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{ padding: '24px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>Farms by state</div>
                  {[{ state: 'Kano', n: 8 }, { state: 'Oyo', n: 6 }, { state: 'Kaduna', n: 5 }, { state: 'FCT', n: 3 }].map(s => (
                    <div key={s.state} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: '14px' }}>
                      <span>{s.state}</span><span className="text-mono" style={{ fontWeight: 600 }}>{s.n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'pending-farms' && (
          <>
            <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '24px', fontFamily: 'var(--font-heading)' }}>Pending Farm Reviews</h1>
            {pendingFarms.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <div style={{ marginBottom: '16px', color: 'var(--color-primary)' }}>
                  <Icon name="farms" size={40} />
                </div>
                <p>No farms currently awaiting review.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pendingFarms.map(f => (
                  <PendingFarmCard key={f.id} farm={f} onAction={handleFarmAction} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'proofs' && (
          <>
            <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '24px', fontFamily: 'var(--font-heading)' }}>Milestone Verification</h1>
            {proofs.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ color: 'var(--color-primary)' }}>
                  <Icon name="milestones" size={40} />
                </div>
                <p>All milestone proofs have been verified!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {proofs.map(r => <ProofReviewCard key={`${r.id}-${r.submitted_at}`} proof={r} onAction={handleAction} />)}
                <Pagination currentPage={proofsPage} totalPages={Math.ceil(proofs.length / ITEMS_PER_PAGE)} onPageChange={setProofsPage} />
              </div>
            )}
          </>
        )}

        {tab === 'harvest-reports' && (
          <>
            <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>Harvest Report Reviews</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '28px' }}>Confirm final yield and sales data to finalize investor returns.</p>
            
            {harvestReports.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <div style={{ marginBottom: '16px', color: 'var(--color-primary)' }}>
                  <Icon name="harvest" size={40} />
                </div>
                <p>No harvest reports awaiting review.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {harvestReports.map(r => (
                  <HarvestReportCard key={r.id} report={r} onVerify={handleVerifyHarvestReport} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'payouts' && (
          <div style={{ position: 'relative' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>Payouts</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '28px' }}>Review confirmed farmer repayments and disburse funds to investors.</p>

            {/* Confirmed Repayments Section */}
            {repayments.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Confirmed Repayments <span className="badge badge-pending" style={{ marginLeft: '8px' }}>{repayments.length}</span></h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {repayments.map(r => (
                    <div key={r.id} className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <h3 style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{r.farm_name}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Farmer: {r.farmer_name} · Repaid: {r.confirmed_at ? new Date(r.confirmed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Total Repaid</div>
                          <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--color-primary)' }}>{formatCurrency(r.amount)}</div>
                        </div>
                        <button className="btn btn-solid btn-sm" onClick={() => { setSelectedPayoutFarm(r.farm_id); }}>Disburse to Investors →</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: '1 1 300px', maxWidth: '400px' }}>
                <label className="form-label">Select Farm</label>
                <select className="form-select form-input" value={selectedPayoutFarm} onChange={e => setSelectedPayoutFarm(e.target.value)}>
                  {payoutFarms.map(f => <option key={f.id} value={f.id}>{f.name} — {f.state}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ width: '200px' }}>
                <label className="form-label">Payout Status</label>
                <select className="form-select form-input" value={payoutStatusFilter} onChange={e => setPayoutStatusFilter(e.target.value)}>
                  <option value="all">All Payouts</option>
                  <option value="waiting">Waiting</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Farm Summary Cards */}
            {(() => {
              const farm = payoutFarms.find(f => f.id === selectedPayoutFarm);
              if (!farm) return null;
              
              // We don't have these breakdown fields in the simple farm object,
              // but we can calculate or get them if we had a detailed endpoint.
              // For now, let's show what we have.
              return (
                <div className="metric-cards" style={{ marginBottom: '32px' }}>
                  <div className="metric-card">
                    <div className="metric-card-label">Total Funding</div>
                    <div className="metric-card-value">{formatCurrency(farm.total_budget)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card-label">Amount Raised</div>
                    <div className="metric-card-value green">{formatCurrency(farm.amount_raised)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card-label">Status</div>
                    <div className="metric-card-value" style={{ textTransform: 'capitalize' }}>{farm.status}</div>
                  </div>
                </div>
              );
            })()}

            {/* Batch Action Bar if waiting */}
            {payoutStatusFilter !== 'completed' && payoutsList.filter(p => p.status === 'waiting').length > 0 && (
              <div style={{ marginBottom: '24px', padding: '16px 20px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{payoutsList.filter(p => p.status === 'waiting').length}</span> payouts waiting for transfer.
                </div>
                <button className="btn btn-solid btn-sm" onClick={() => setBatchDrawerOpen(true)}>Initiate All Transfers</button>
              </div>
            )}

            {/* Investor Payout Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Investor Name</th>
                    <th>Principal</th>
                    <th>Profit</th>
                    <th>Total to Send</th>
                    <th>Bank Details</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayouts.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.investorName}</td>
                      <td className="text-mono">₦{(p.amountInvested || 0).toLocaleString()}</td>
                      {/* Determine profit: if payoutAmount looks like profit (<= principal) treat as profit; otherwise compute difference */}
                      <td className="text-mono" style={{ color: 'var(--color-primary)' }}>
                        ₦{(
                          (typeof p.profit === 'number') ? p.profit : (
                            (p.payoutAmount != null && p.amountInvested != null) ? (
                              (p.payoutAmount <= p.amountInvested) ? p.payoutAmount : (p.payoutAmount - p.amountInvested)
                            ) : (p.payoutAmount || 0)
                          )
                        ).toLocaleString()}
                      </td>
                      {/* Total to send: principal + profit (if amountInvested present), otherwise payoutAmount assumed total */}
                      <td className="text-mono" style={{ color: p.status === 'waiting' ? 'var(--color-primary)' : p.status === 'failed' ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                        ₦{(
                          (typeof p.totalToSend === 'number') ? p.totalToSend : (
                            (p.amountInvested != null) ? (
                              (p.amountInvested || 0) + ((typeof p.profit === 'number') ? p.profit : ((p.payoutAmount != null && p.amountInvested != null) ? ((p.payoutAmount <= p.amountInvested) ? p.payoutAmount : (p.payoutAmount - p.amountInvested)) : (p.payoutAmount || 0)))
                            ) : (p.payoutAmount || 0)
                          )
                        ).toLocaleString()}
                      </td>
                      <td>
                        <span style={{ fontSize: '13px' }}>{p.bankDetails || 'N/A'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {p.status === 'completed' ? <span className="badge badge-completed">Completed</span> :
                           p.status === 'failed' ? <span className="badge badge-danger">Failed</span> :
                           <span className="badge badge-pending">Waiting</span>}
                          {p.status === 'failed' && (
                            <button className="btn-link" style={{ fontSize: '12px' }} onClick={() => handleRetryPayout(p.id)}>Retry</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedPayouts.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No payouts found for this filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <Pagination currentPage={payoutsPage} totalPages={Math.ceil(filteredPayouts.length / ITEMS_PER_PAGE)} onPageChange={setPayoutsPage} />
            </div>

            {/* Confirmation Drawer (Batch) */}
            {batchDrawerOpen && (
              <div className="batch-drawer" role="dialog" aria-modal="true">
                <button className="drawer-close btn-ghost" aria-label="Close" onClick={() => setBatchDrawerOpen(false)} style={{ position: 'absolute', top: 12, right: 12, padding: '8px' }}>✕</button>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Confirm Batch Transfer</h2>
                <div className="batch-drawer-body">
                  <div style={{ fontWeight: 600, marginBottom: '12px' }}>{payoutsList.filter(p => p.status === 'waiting').length} Investors Selected</div>
                  {payoutsList.filter(p => p.status === 'waiting').map(p => {
                    const profit = (typeof p.profit === 'number') ? p.profit : ((p.payoutAmount != null && p.amountInvested != null) ? ((p.payoutAmount <= p.amountInvested) ? p.payoutAmount : (p.payoutAmount - p.amountInvested)) : (p.payoutAmount || 0));
                    const total = (typeof p.totalToSend === 'number') ? p.totalToSend : ((p.amountInvested != null) ? ((p.amountInvested || 0) + profit) : (p.payoutAmount || 0));
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: '14px' }}>
                        <span>{p.investorName}</span>
                        <strong style={{ color: 'var(--color-primary)' }}>₦{total.toLocaleString()}</strong>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 700, marginTop: '8px' }}>
                    <span>Total Transfer</span>
                    <span style={{ color: 'var(--color-primary)' }}>₦{payoutsList.filter(p => p.farmId === selectedPayoutFarm && p.status === 'waiting').reduce((s, p) => {
                      const profit = (typeof p.profit === 'number') ? p.profit : ((p.payoutAmount != null && p.amountInvested != null) ? ((p.payoutAmount <= p.amountInvested) ? p.payoutAmount : (p.payoutAmount - p.amountInvested)) : (p.payoutAmount || 0));
                      const total = (typeof p.totalToSend === 'number') ? p.totalToSend : ((p.amountInvested != null) ? ((p.amountInvested || 0) + profit) : (p.payoutAmount || 0));
                      return s + (total || 0);
                    }, 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="drawer-actions">
                  <button className="btn btn-solid" onClick={handleBatchPayout}>Confirm & Mark as Successful</button>
                  <button className="btn btn-ghost" onClick={() => setBatchDrawerOpen(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Backdrop for Drawer */}
            {batchDrawerOpen && (
              <div className="drawer-backdrop" onClick={() => setBatchDrawerOpen(false)} />
            )}
          </div>
        )}

        {tab === 'farms' && (
          <>
            <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '24px', fontFamily: 'var(--font-heading)' }}>All Farms</h1>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Farm Name</th><th>Farmer</th><th>Crop</th><th>Goal</th><th>Raised</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {paginatedFarms.map(f => (
                    <tr key={f.id} onClick={() => navigate(`/farms/${f.id}`)} style={{ cursor: 'pointer' }} className="hover-row">
                      <td style={{ fontWeight: 500 }}>{f.name}</td>
                      <td>{f.farmer?.full_name}</td>
                      <td><span className="badge badge-active">{f.crop_name}</span></td>
                      <td className="text-mono">{formatCurrency(f.total_budget)}</td>
                      <td className="text-mono">{formatCurrency(f.amount_raised)}</td>
                      <td><span className={`badge badge-${f.status === 'active' ? 'active' : f.status === 'funded' ? 'pending' : f.status === 'completed' ? 'completed' : 'draft'}`} style={{ textTransform: 'capitalize' }}>{f.status}</span></td>
                      <td><Link to={`/farms/${f.id}`} className="btn-link">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination currentPage={farmsPage} totalPages={Math.ceil(allFarms.length / ITEMS_PER_PAGE)} onPageChange={setFarmsPage} />
            </div>
          </>
        )}

        {tab === 'users' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Users</h1>
              <input className="form-input" placeholder="Search by name or email…" value={searchUsers} onChange={e => setSearchUsers(e.target.value)} style={{ maxWidth: '240px' }} />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Farms</th><th>KYC</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {paginatedUsers.map(u => (
                    <tr key={u.uid} style={{ cursor: 'pointer' }} className="hover-row" onClick={() => setSelectedUser(u)}>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                            {u.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          {u.full_name}
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                      <td><span className={`badge badge-${u.role === 'investor' ? 'active' : 'pending'}`} style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                      <td style={{ fontSize: '13px' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td className="text-mono">{u.farm_count ?? 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {u.bvn_verified && <span className="badge badge-active" style={{ fontSize: '11px' }}>BVN</span>}
                          {u.bank_verified && <span className="badge badge-active" style={{ fontSize: '11px' }}>Bank</span>}
                          {!u.bvn_verified && !u.bank_verified && <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>None</span>}
                        </div>
                      </td>
                      <td><button className="btn-link" onClick={e => { e.stopPropagation(); setSelectedUser(u); }}>View</button></td>
                    </tr>
                  ))}
                  {paginatedUsers.length === 0 && (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
              <Pagination currentPage={usersPage} totalPages={Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)} onPageChange={setUsersPage} />
            </div>

            {/* Farmer Profile Drawer */}
            {selectedUser && (
              <>
                <div className="drawer-backdrop" onClick={() => setSelectedUser(null)} />
                <div className="batch-drawer" role="dialog" aria-modal="true" style={{ maxWidth: '420px' }}>
                  <button className="drawer-close btn-ghost" aria-label="Close" onClick={() => setSelectedUser(null)} style={{ position: 'absolute', top: 12, right: 12, padding: '8px' }}>✕</button>
                  
                  {/* Avatar + Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', textAlign: 'center' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '26px', marginBottom: '12px' }}>
                      {selectedUser.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{selectedUser.full_name}</h2>
                    <span className={`badge badge-${selectedUser.role === 'investor' ? 'active' : 'pending'}`} style={{ textTransform: 'capitalize', fontSize: '12px' }}>{selectedUser.role}</span>
                    {selectedUser.role === 'farmer' && selectedUser.trust_tier && (
                      <div style={{ marginTop: '8px', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: `${getTierColor(selectedUser.trust_tier)}18`, color: getTierColor(selectedUser.trust_tier) }}>
                        ● {getTierLabel(selectedUser.trust_tier)}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[  
                      ['Email', selectedUser.email],
                      ['Member Since', selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
                      ...(selectedUser.role === 'farmer' ? [['Farms Listed', selectedUser.farm_count ?? 0]] : []),
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{label}</span>
                        <strong style={{ fontSize: '14px' }}>{value}</strong>
                      </div>
                    ))}

                    {/* KYC Status */}
                    <div style={{ padding: '14px', background: 'var(--color-card-alt)', borderRadius: '10px', marginTop: '4px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KYC Status</div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <span style={{ color: selectedUser.bvn_verified ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                            {selectedUser.bvn_verified ? '✓' : '✗'}
                          </span>
                          BVN Verified
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                          <span style={{ color: selectedUser.bank_verified ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                            {selectedUser.bank_verified ? '✓' : '✗'}
                          </span>
                          Bank Account
                        </div>
                      </div>
                      {selectedUser.account_name && (
                        <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                          Account: <strong>{selectedUser.account_name}</strong>
                        </div>
                      )}
                    </div>

                    {/* Account status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '13px', color: selectedUser.is_active ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                        {selectedUser.is_active ? '● Active Account' : '● Suspended'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'settings' && (
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '24px', fontFamily: 'var(--font-heading)' }}>Platform Settings</h1>
            <div className="card" style={{ padding: '24px', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Platform Name</label>
                <input className="form-input" defaultValue="AgriFlow" />
              </div>
              <div className="form-group">
                <label className="form-label">Support Email</label>
                <input className="form-input" defaultValue="support@agriflow.ng" />
              </div>
              <div className="form-group">
                <label className="form-label">Max Farm Goal (₦)</label>
                <CurrencyInput className="form-input text-mono" defaultValue="50000000" />
              </div>
              <div className="form-group">
                <label className="form-label">Minimum Investment (₦)</label>
                <CurrencyInput className="form-input text-mono" defaultValue="5000" />
              </div>
              <button className="btn btn-solid">Save Settings</button>
            </div>
          </div>
        )}
    </DashboardLayout>
  );
}
