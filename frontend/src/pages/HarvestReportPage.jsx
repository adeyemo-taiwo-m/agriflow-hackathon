import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDropzone } from 'react-dropzone';
import DashboardLayout from '../components/DashboardLayout';
import CurrencyInput from '../components/CurrencyInput';
import { mockFarmerFarms } from '../data/mockData';
import { useNavigate } from 'react-router-dom';

const navItems = [
  { key: 'farms', label: 'My Farms', icon: 'farms' },
  { key: 'add', label: 'Add Farm', icon: 'add' },
  { key: 'milestones', label: 'Milestones', icon: 'milestones' },
  { key: 'harvest', label: 'Harvest Reports', icon: 'harvest' },
  { key: 'explore', label: 'Explore Farms', icon: 'explore' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

export default function HarvestReportPage() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [ay, setAy] = useState('');
  const [evidence, setEvidence] = useState(null);
  const [selectedFarm, setSelectedFarm] = useState('');
  
  const farms = user?.isNewUser ? [] : mockFarmerFarms;
  const expected = 4.2;
  const v = ay ? (((parseFloat(ay) - expected) / expected) * 100).toFixed(1) : null;
  const { getRootProps, getInputProps } = useDropzone({ maxFiles: 1, onDrop: files => setEvidence(files[0]) });

  const handleTabChange = (k) => {
    navigate(`/farmer/dashboard?tab=${k}`);
  };

  const navFooter = (
    <>
      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>{user?.name}</div>
      <button className="btn btn-ghost btn-sm btn-full" onClick={() => { logout(); navigate('/auth'); }}>Log Out</button>
    </>
  );

  return (
    <DashboardLayout navItems={navItems} activeTab="harvest" onTabChange={handleTabChange} footer={navFooter}>
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '24px', fontFamily: 'var(--font-heading)' }}>Harvest Report</h1>
        <div className="card" style={{ padding: '28px', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label className="form-label">Select Farm to Report On</label>
            <select className="form-input form-select" value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)}>
              <option value="">Select a farm...</option>
              {farms.length === 0 ? (
                <option value="" disabled>No farms available</option>
              ) : (
                farms.map(f => <option key={f.id} value={f.id}>{f.name} - {f.crop}</option>)
              )}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">
                Actual Yield ({farms.find(f => f.id === selectedFarm)?.crop === 'Poultry' ? 'birds' : 'tons'})
              </label>
              <input className="form-input" type="number" value={ay} onChange={e => setAy(e.target.value)} placeholder="e.g. 3.8" disabled={!selectedFarm} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-input form-select" disabled={!selectedFarm}>
                <option>tons</option>
                <option>kg</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Total Sales (₦)</label>
            <CurrencyInput className="form-input text-mono" placeholder="e.g. 950,000" disabled={!selectedFarm} />
          </div>

          <div className="form-group">
            <label className="form-label">Harvest Date</label>
            <input className="form-input" type="date" disabled={!selectedFarm} />
          </div>

          <div className="form-group">
            <label className="form-label">Buyer (optional)</label>
            <input className="form-input" placeholder="e.g. Dangote Foods" disabled={!selectedFarm} />
          </div>
          
          <div className="form-group">
            <label className="form-label">Payment Evidence <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <div 
              {...getRootProps()} 
              style={{
                border: '2px dashed var(--color-border)', 
                padding: '20px', 
                borderRadius: '8px', 
                textAlign: 'center', 
                cursor: selectedFarm ? 'pointer' : 'not-allowed', 
                background: evidence ? 'var(--color-primary-light)' : 'transparent', 
                borderColor: evidence ? 'var(--color-primary)' : 'var(--color-border)',
                opacity: selectedFarm ? 1 : 0.6
              }}
            >
              <input {...getInputProps()} disabled={!selectedFarm} />
              {evidence ? (
                <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>✓ {evidence.name} attached</span>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>📎 Upload bank alert or receipt photo</span>
              )}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>Required to verify harvest proceeds before investor payout.</p>
          </div>

          {v !== null && selectedFarm && (
            <div style={{ padding: '12px 16px', background: 'var(--color-card-alt)', borderRadius: '8px', fontSize: '13px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <span>Expected: <strong>{expected} tons</strong></span>
              <span>Reported: <strong>{ay} tons</strong></span>
              <span>Variance: <strong style={{ color: parseFloat(v) > -10 ? 'var(--color-accent)' : 'var(--color-danger)' }}>{v > 0 ? '+' : ''}{v}%</strong></span>
            </div>
          )}

          <button className="btn btn-solid" disabled={!selectedFarm || !ay || !evidence} onClick={() => addToast('Harvest report submitted!', 'success', 'Option A Verification step initiated.')}>
            Submit Report & Evidence
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
