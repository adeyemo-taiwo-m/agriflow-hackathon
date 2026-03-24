import { useParams, Link, useNavigate } from 'react-router-dom';
import { mockExpectedPayoutsExpanded } from '../data/mockData';
import Footer from '../components/Footer';

export default function InvestmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Find the investment/expected payout by ID
  const investment = mockExpectedPayoutsExpanded.find(ep => ep.id === id);

  if (!investment) {
    return (
      <div className="section" style={{ textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Investment Not Found</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>The investment details you are looking for do not exist or have been moved.</p>
        <Link to="/investor/dashboard" className="btn btn-solid">Return to Dashboard</Link>
      </div>
    );
  }

  // Derived progress percent from step (1 to 5 mapping roughly to 20% each)
  const progressPercent = Math.min((investment.statusStep / 5) * 100, 100);

  return (
    <>
      {/* NavBar is handled at App level layout, just adding spacing here */}
      <div style={{ paddingTop: '80px', paddingBottom: '80px', minHeight: '80vh', backgroundColor: 'var(--color-background)' }}>
        <div className="container">
          
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <button onClick={() => navigate(-1)} className="btn-link" style={{ fontSize: '14px', marginBottom: '16px', display: 'inline-block' }}>
              ← Go Back
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>
                  {investment.farmName} Investment
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="badge badge-active">{investment.crop}</span>
                  <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    Expected Return Date: <strong>{new Date(investment.expectedDate).toLocaleDateString()}</strong>
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Status</div>
                <div className={`badge badge-${investment.statusStep === 5 ? 'completed' : investment.dateStatus === 'overdue' ? 'danger' : 'pending'}`} style={{ fontSize: '14px', padding: '6px 12px' }}>
                  {investment.status}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* Left Column: Financials & Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Financial Summary */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Financial Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Invested Amount</div>
                    <div className="text-mono" style={{ fontSize: '24px', fontWeight: 700 }}>₦{investment.investedAmount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Expected {investment.returnType === 'cash' ? 'Return' : 'Harvest Share'}</div>
                    <div className="text-mono" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {investment.expected}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Return Type</span>
                    <strong style={{ textTransform: 'capitalize' }}>{investment.returnType}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Platform Fee</span>
                    <strong>10% (deducted from returns)</strong>
                  </div>
                </div>
              </div>

              {/* Legal Documents Placeholder */}
              <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Documents</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px' }}>📄</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '14px' }}>Investment Agreement.pdf</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Signed on Jan 12, 2026</div>
                      </div>
                    </div>
                    <button className="btn-link text-mono" style={{ fontSize: '13px' }}>Download</button>
                  </div>
                  {investment.statusStep === 5 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>🧾</span>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '14px' }}>Payout Receipt.pdf</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Generated on {new Date().toLocaleDateString()}</div>
                        </div>
                      </div>
                      <Link to={`/receipts/${investment.id}`} className="btn-link text-mono" style={{ fontSize: '13px' }}>View Online</Link>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Progress Tracking */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Investment Progress</h3>
                  <Link to={`/farms/${investment.farmId}`} className="btn-link" style={{ fontSize: '14px' }}>View Farm Updates →</Link>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="progress-track" style={{ height: '8px', marginBottom: '32px' }}>
                  <div className="progress-fill" style={{ width: `${progressPercent}%`, backgroundColor: investment.statusStep === 5 ? 'var(--color-accent)' : 'var(--color-primary)' }} />
                </div>

                {/* Timeline steps */}
                <div className="timeline-container" style={{ paddingLeft: '8px' }}>
                  {[
                    { title: 'Investment Confirmed', desc: 'Funds successfully escrowed.', step: 1 },
                    { title: 'Milestones Verified', desc: 'Farmer has completed key growing stages.', step: 2 },
                    { title: 'Harvest Collected', desc: 'Crop harvested and graded.', step: 3 },
                    { title: 'Proceeds Processing', desc: 'Off-taker payments received in escrow.', step: 4 },
                    { title: 'Payout Sent', desc: 'Returns disbursed to your bank account.', step: 5 }
                  ].map(t => {
                    const isCompleted = investment.statusStep > t.step;
                    const isCurrent = investment.statusStep === t.step;
                    return (
                      <div key={t.step} style={{ position: 'relative', paddingLeft: '32px', paddingBottom: '24px' }}>
                        {/* Timeline line */}
                        {t.step < 5 && (
                          <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: 0, width: '2px', backgroundColor: isCompleted ? 'var(--color-primary)' : 'var(--color-border)' }} />
                        )}
                        {/* Timeline dot */}
                        <div style={{ position: 'absolute', left: '0', top: '2px', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                          backgroundColor: isCompleted ? 'var(--color-primary)' : isCurrent ? 'var(--color-accent)' : 'var(--color-card-alt)',
                          // border: isCurrent ? '2px solid var(--color-primary)' : 'none',
                          color: (isCompleted || isCurrent) ? '#fff' : 'var(--color-text-secondary)'
                        }}>
                          {isCompleted ? '✓' : t.step}
                        </div>
                        
                        <div style={{ fontWeight: isCurrent ? 600 : 500, color: isCompleted || isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', marginBottom: '4px' }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                          {t.desc}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
