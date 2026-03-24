import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { mockAdminStats, mockPendingProofs, mockPayoutFarms, mockAllPayouts } from '../data/mockData';
import DashboardLayout from '../components/DashboardLayout';
import CurrencyInput from '../components/CurrencyInput';
import Pagination from '../components/Pagination';

const baseAdminFarms = [
  { id:'f1', name:'Oduya Maize Farm', farmer:'Emeka Obi', crop:'Maize', goal:5000000, raised:3800000, status:'active' },
  { id:'f2', name:'Kano Rice Farm', farmer:'Musa Ibrahim', crop:'Rice', goal:2500000, raised:2500000, status:'funded' },
  { id:'f3', name:'Oyo Tomato Project', farmer:'Adebayo Ola', crop:'Tomato', goal:1200000, raised:840000, status:'active' },
  { id:'f4', name:'Benue Yam Farm', farmer:'Terwase Akaa', crop:'Yam', goal:800000, raised:0, status:'draft' },
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


const navItems = [
  { key: 'overview', label: 'Overview', icon: 'overview' },
  { key: 'proofs', label: 'Pending Proofs', icon: 'reviews' },
  { key: 'payouts', label: 'Payouts', icon: 'payments' },
  { key: 'farms', label: 'All Farms', icon: 'farms' },
  { key: 'users', label: 'Users', icon: 'users' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

function ProofReviewCard({ proof, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleReject = () => {
    if (!rejectionReason.trim()) return;
    onAction(proof.id, 'reject', rejectionReason.trim());
    setRejecting(false);
    setRejectionReason('');
  };

  return (
    <div className="card review-card">
      <div className="review-header">
        <div>
          <h3 style={{ fontWeight: 600, fontSize: '16px' }}>{proof.milestoneName}</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Farm: {proof.farmName} · Farmer: {proof.farmer}
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
                {[['Upload Date', proof.uploadDate], ['File Type', proof.fileType]].map(([l, v]) => (
                  <div key={l} className="review-row-mini"><span>{l}</span><strong>{v}</strong></div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="review-sub">GPS Verification</h4>
              <div className="review-rows">
                <div className="review-row-mini"><span>Status</span><strong style={{ color: 'var(--color-primary)' }}>Matches Farm Anchor</strong></div>
                <div className="review-row-mini"><span>Variance</span><strong>12 meters</strong></div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <h4 className="review-sub">Evidence</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <img src={proof.fileUrl} alt="proof" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
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
                style={{ marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-sm" style={{ background: 'var(--color-danger)', color: '#fff' }} onClick={handleReject} disabled={!rejectionReason.trim()}>Confirm Rejection</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setRejecting(false); setRejectionReason(''); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="review-actions-row">
              <button className="btn btn-solid btn-sm" style={{ background: 'var(--color-primary)' }} onClick={() => onAction(proof.id, 'approve')}>✓ Approve Milestone</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => setRejecting(true)}>✕ Reject</button>
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
  
  useEffect(() => {
    const currentTab = searchParams.get('tab') || 'overview';
    if (tab !== currentTab) setTab(currentTab);
  }, [searchParams]);

  const handleTabChange = (k) => {
    setTab(k);
    setSearchParams({ tab: k });
  };

  const [proofs, setProofs] = useState(mockPendingProofs);
  const [searchUsers, setSearchUsers] = useState('');
  
  // Payout states
  const [selectedPayoutFarm, setSelectedPayoutFarm] = useState(mockPayoutFarms[0]?.id || '');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');
  const [payoutsList, setPayoutsList] = useState(mockAllPayouts);
  const [batchDrawerOpen, setBatchDrawerOpen] = useState(false);
  
  // Pagination states
  const ITEMS_PER_PAGE = 8;
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [farmsPage, setFarmsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);

  const { user, logout, fetchProfile } = useAuth();
  
  useEffect(() => {
    fetchProfile();
  }, []);

  const { addToast } = useToast();
  const navigate = useNavigate();

  const stats = mockAdminStats;

  const handleAction = (id, action, reason) => {
    setProofs(r => r.filter(rv => rv.id !== id));
    if (action === 'approve') addToast('Proof approved!', 'success', 'Milestone funds will be verified.');
    if (action === 'reject') addToast('Proof rejected.', 'error', reason ? `Reason: ${reason}` : 'Farmer will be notified to resubmit.');
  };

  

  const handleBatchPayout = () => {
    setPayoutsList(prev => prev.map(p => (p.farmId === selectedPayoutFarm && p.status === 'waiting') ? { ...p, status: 'successful' } : p));
    addToast('Batch payouts initiated successfully', 'success');
    setBatchDrawerOpen(false);
  };

  const handleRetryPayout = (id) => {
    setPayoutsList(prev => prev.map(p => p.id === id ? { ...p, status: 'successful' } : p));
    addToast(`Payout ID ${id} manually retried.`, 'success');
  };

  const filteredUsers = mockUsersExpanded.filter(u => u.name.toLowerCase().includes(searchUsers.toLowerCase()) || u.email.toLowerCase().includes(searchUsers.toLowerCase()));

  // Payouts Pagination Logic
  const filteredPayouts = payoutsList.filter(p => p.farmId === selectedPayoutFarm && (payoutStatusFilter === 'all' || p.status === payoutStatusFilter));
  const pbStart = (payoutsPage - 1) * ITEMS_PER_PAGE;
  const paginatedPayouts = filteredPayouts.slice(pbStart, pbStart + ITEMS_PER_PAGE);

  // Farms Pagination Logic
  const fbStart = (farmsPage - 1) * ITEMS_PER_PAGE;
  const paginatedFarms = mockAdminFarms.slice(fbStart, fbStart + ITEMS_PER_PAGE);

  // Users Pagination Logic
  const ubStart = (usersPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(ubStart, ubStart + ITEMS_PER_PAGE);

  // Proofs Pagination Logic
  const [proofsPage, setProofsPage] = useState(1);
  const rbStart = (proofsPage - 1) * ITEMS_PER_PAGE;
  const paginatedProofs = proofs.slice(rbStart, rbStart + ITEMS_PER_PAGE);

  // Reset pagination on filter change
  useEffect(() => setPayoutsPage(1), [selectedPayoutFarm, payoutStatusFilter]);
  useEffect(() => setUsersPage(1), [searchUsers]);

  const navFooter = (
    <>
      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>{user?.name} (Admin)</div>
      <button className="btn btn-ghost btn-sm btn-full" onClick={() => { logout(); navigate('/auth'); }}>Log Out</button>
    </>
  );

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
                { label: 'Total Farms', val: stats.totalFarms },
                { label: 'Active Listings', val: stats.activeFarms },
                { label: 'Pending Reviews', val: proofs.length, accent: true },
                { label: 'Total Investors', val: stats.totalInvestors },
                { label: 'Total Farmers', val: stats.totalFarmers },
                { label: 'Funds Raised', val: `₦${(stats.totalFundsRaised / 1000000).toFixed(1)}M`, green: true },
              ].map(m => (
                <div key={m.label} className="metric-card">
                  <div className="metric-card-label">{m.label}</div>
                  <div className={`metric-card-value text-mono${m.green ? ' green' : m.accent ? ' gold' : ''}`}>{m.val}</div>
                </div>
              ))}
            </div>

            {/* Pending proofs preview */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Pending Proofs <span className="badge badge-pending" style={{ marginLeft: '8px' }}>{stats.pendingProofs}</span></h2>
              <button className="btn-link" onClick={() => handleTabChange('proofs')}>View all →</button>
            </div>
            {proofs.length === 0 ? (
              <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>🎉 All milestones verified.</div>
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

        {tab === 'proofs' && (
          <>
            <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '24px', fontFamily: 'var(--font-heading)' }}>Milestone Verification</h1>
            {proofs.length === 0 ? (
              <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-secondary)' }}><div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div><p>All milestone proofs have been verified!</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {paginatedProofs.map(r => <ProofReviewCard key={r.id} proof={r} onAction={handleAction} />)}
                <Pagination currentPage={proofsPage} totalPages={Math.ceil(proofs.length / ITEMS_PER_PAGE)} onPageChange={setProofsPage} />
              </div>
            )}
          </>
        )}

        {tab === 'payouts' && (
          <div style={{ position: 'relative' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '24px', fontFamily: 'var(--font-heading)' }}>Payouts</h1>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: '1 1 300px', maxWidth: '400px' }}>
                <label className="form-label">Select Farm</label>
                <select className="form-select form-input" value={selectedPayoutFarm} onChange={e => setSelectedPayoutFarm(e.target.value)}>
                  {mockPayoutFarms.map(f => <option key={f.id} value={f.id}>{f.name} — {f.state}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ width: '200px' }}>
                <label className="form-label">Payout Status</label>
                <select className="form-select form-input" value={payoutStatusFilter} onChange={e => setPayoutStatusFilter(e.target.value)}>
                  <option value="all">All Payouts</option>
                  <option value="waiting">Waiting</option>
                  <option value="successful">Successful</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            {/* Farm Summary Cards */}
            {(() => {
              const farm = mockPayoutFarms.find(f => f.id === selectedPayoutFarm);
              if (!farm) return null;
              return (
                <div className="metric-cards" style={{ marginBottom: '32px' }}>
                  <div className="metric-card">
                    <div className="metric-card-label">Total Proceeds</div>
                    <div className="metric-card-value">₦{farm.totalProceeds.toLocaleString()}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card-label">Investor Pool</div>
                    <div className="metric-card-value green">₦{farm.investorPool.toLocaleString()}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card-label">Farmer Payout</div>
                    <div className="metric-card-value">₦{farm.farmerPayout.toLocaleString()}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card-label">Platform Fee</div>
                    <div className="metric-card-value">₦{farm.platformFee.toLocaleString()}</div>
                  </div>
                </div>
              );
            })()}

            {/* Batch Action Bar if waiting */}
            {payoutStatusFilter !== 'successful' && payoutsList.filter(p => p.farmId === selectedPayoutFarm && p.status === 'waiting').length > 0 && (
              <div style={{ marginBottom: '24px', padding: '16px 20px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{payoutsList.filter(p => p.farmId === selectedPayoutFarm && p.status === 'waiting').length}</span> payouts waiting for transfer.
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
                          {p.status === 'successful' ? <span className="badge badge-completed">Successful</span> :
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
                  <div style={{ fontWeight: 600, marginBottom: '12px' }}>{payoutsList.filter(p => p.farmId === selectedPayoutFarm && p.status === 'waiting').length} Investors Selected</div>
                  {payoutsList.filter(p => p.farmId === selectedPayoutFarm && p.status === 'waiting').map(p => {
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
                      <td>{f.farmer}</td>
                      <td><span className="badge badge-active">{f.crop}</span></td>
                      <td className="text-mono">₦{(f.goal/1000).toFixed(0)}k</td>
                      <td className="text-mono">₦{(f.raised/1000).toFixed(0)}k</td>
                      <td><span className={`badge badge-${f.status === 'active' ? 'active' : f.status === 'funded' ? 'pending' : 'draft'}`} style={{ textTransform: 'capitalize' }}>{f.status}</span></td>
                      <td><Link to={`/farms/${f.id}`} className="btn-link">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination currentPage={farmsPage} totalPages={Math.ceil(mockAdminFarms.length / ITEMS_PER_PAGE)} onPageChange={setFarmsPage} />
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
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Farms</th><th>Investments</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {paginatedUsers.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.name}</td>
                      <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                      <td><span className={`badge badge-${u.role === 'investor' ? 'active' : 'pending'}`} style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                      <td style={{ fontSize: '13px' }}>{new Date(u.joined).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="text-mono">{u.farms}</td>
                      <td className="text-mono">{u.investments}</td>
                      <td><button className="btn-link" style={{ color: 'var(--color-danger)' }}>Suspend</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination currentPage={usersPage} totalPages={Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)} onPageChange={setUsersPage} />
            </div>
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
