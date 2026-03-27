import { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/auth-context';
import Icon from './Icon';

export default function KYCModal({ isOpen, onClose, role }) {
  const MAGIC_BVN = '10000000000';

  const [view, setView] = useState('bvn_input'); // 'bvn_input' | 'bvn_score' | 'bank_input' | 'complete'
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { user, setUser, fetchProfile } = useAuth();

  // BVN States
  const [bvn, setBvn] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualAccount, setManualAccount] = useState('');
  const [manualBankCode, setManualBankCode] = useState('');
  const [bvnScoreData, setBvnScoreData] = useState(null);

  // Bank States
  const [banks, setBanks] = useState([]);
  const [bankQuery, setBankQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState(null); // { code, name }
  const [accountNum, setAccountNum] = useState('');
  const [showBanksList, setShowBanksList] = useState(false);
  const [finalScoreData, setFinalScoreData] = useState(null);
  const isHackathonTestMode = bvn === MAGIC_BVN;

  // Fetch Banks List
  useEffect(() => {
    const shouldFetchBanks = view === 'bank_input' || (view === 'bvn_input' && isHackathonTestMode);

    if (shouldFetchBanks && banks.length === 0) {
      api.get('/banks')
        .then(({ data }) => setBanks(data.data || []))
        .catch(() => addToast("Failed to lock available banks list", "error"));
    }
  }, [view, isHackathonTestMode, banks.length, addToast]);

  // Handle BVN Action
  const handleBvnVerify = async (e) => {
    e.preventDefault();
    const isValidNormalBvn = bvn.length === 11 && /^\d+$/.test(bvn);
    const isValidMagicBvn = bvn === MAGIC_BVN;

    if (!isValidNormalBvn && !isValidMagicBvn) {
      return addToast('BVN must be 11 digits (or use 10000000000 for test mode)', 'error');
    }

    if (isHackathonTestMode) {
      if (!manualName.trim() || manualAccount.length !== 10 || !manualBankCode) {
        return addToast('Test mode requires full name, 10-digit account number, and bank selection', 'error');
      }
    }
    
    setLoading(true);
    try {
      const endpoint = role === 'farmer' ? '/farmers/verify-bvn' : '/investors/verify-bvn';
      const requestPayload = { bvn };

      if (isHackathonTestMode) {
        requestPayload.manual_name = manualName.trim();
        requestPayload.manual_account = manualAccount;
        requestPayload.manual_bank_code = manualBankCode;
      }

      const { data } = await api.post(endpoint, requestPayload);
      await fetchProfile(); // refresh layout flags
      
      const responsePayload = data.data || data;
      setBvnScoreData({
        trust_score: responsePayload.trust_score || 65,
        trust_tier: responsePayload.trust_tier || 'Emerging Farmer'
      });

      if (responsePayload.bank_verified) {
        setFinalScoreData(responsePayload);
        setUser(prev => ({
          ...prev,
          bvn_verified: true,
          bank_verified: true,
          account_name: responsePayload.account_name || prev?.account_name,
          account_number: manualAccount || prev?.account_number,
          bank_code: manualBankCode || prev?.bank_code,
          trust_score: responsePayload.trust_score ?? prev?.trust_score,
          trust_tier: responsePayload.trust_tier ?? prev?.trust_tier
        }));
        addToast('Test mode verification simulated successfully', 'success');
        setView('complete');
        return;
      }

      if (role === 'farmer') {
        setView('bvn_score');
      } else {
        addToast("BVN Verified", "success");
        setView('bank_input');
      }
    } catch (err) {
      addToast(err.response?.data?.detail || err.response?.data?.message || "BVN Verification failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle Bank Submit
  const handleBankSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBank) return addToast("Please select a bank", "error");
    if (accountNum.length !== 10) return addToast("Account must be 10 digits", "error");

    setLoading(true);
    try {
      const endpoint = role === 'farmer' ? '/farmers/bank-account' : '/investors/bank-account';
      const { data } = await api.post(endpoint, { 
        bank_code: selectedBank.code, 
        account_num: accountNum 
      });

      const payload = data.data || data;
      
      // Update global context immediately so scorecard mounts values instantly!
      setUser(prev => ({
        ...prev,
        bank_verified: true,
        trust_score: payload.trust_score ?? prev.trust_score,
        trust_tier: payload.trust_tier ?? prev.trust_tier
      }));

      await fetchProfile(); // Ensure all bank fields are updated from backend
      setFinalScoreData(payload);
      setView('complete');
    } catch (err) {
      addToast(err.response?.data?.detail || err.response?.data?.message || "Unable to save bank details", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredBanks = banks.filter(b => b.name?.toLowerCase().includes(bankQuery.toLowerCase()));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={
      view === 'bvn_input' ? "Verify identity via BVN" :
      view === 'bvn_score' ? "BVN Verified" :
      view === 'bank_input' ? "Add Payout Mode (Bank Account)" : "Verification Complete"
    } width={480}>

      {/* STEP 1: BVN Input */}
      {view === 'bvn_input' && (
        <form onSubmit={handleBvnVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#92400e', lineHeight: 1.5 }}>
            🧪 Hackathon Test Mode: To test the KYC functionality without a real BVN, please enter 10000000000. This will unlock manual profile creation.
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>11-Digit BVN</label>
            <input type="text" value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="Enter 11 digit numbers..." className="form-input" style={{ width: '100%' }} />
          </div>

          {isHackathonTestMode && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Full Name</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Enter full name..."
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Account Number</label>
                <input
                  type="text"
                  value={manualAccount}
                  onChange={(e) => setManualAccount(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter 10 digit number..."
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Select Bank</label>
                <select
                  value={manualBankCode}
                  onChange={(e) => setManualBankCode(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                >
                  <option value="">Select a bank</option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                        {bank.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-solid"
            disabled={loading || (!isHackathonTestMode && bvn.length !== 11) || (isHackathonTestMode && (!manualName.trim() || manualAccount.length !== 10 || !manualBankCode))}
            style={{ width: '100%', background: 'var(--color-primary)' }}
          >
            {loading ? "Verifying..." : isHackathonTestMode ? 'Simulate Verification' : 'Verify BVN'}
          </button>
        </form>
      )}

      {/* STEP 2: BVN Score Visuals (Farmer only) */}
      {view === 'bvn_score' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0.01) 100%)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Your Trust Score</p>
            <div style={{ fontSize: '42px', fontWeight: 800, color: '#D97706', marginBottom: '8px' }}>
              {bvnScoreData?.trust_score} <span style={{ fontSize: '20px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>/ 100</span>
            </div>
            <div style={{ background: '#FEF3C7', color: '#D97706', padding: '6px 14px', borderRadius: '20px', display: 'inline-block', fontSize: '12px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '0 auto 16px' }}>
              <Icon name="star" size={18} /> {bvnScoreData?.trust_tier}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Add your bank account to boost your score and unlock full access.
            </div>
          </div>
          <button className="btn btn-solid" style={{ width: '100%', background: 'var(--color-primary)' }} onClick={() => setView('bank_input')}>Continue</button>
        </div>
      )}

      {/* STEP 3: Bank Account Input */}
      {view === 'bank_input' && (
        <form onSubmit={handleBankSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Search Bank Name</label>
            <input 
              type="text" 
              value={bankQuery} 
              onChange={e => { setBankQuery(e.target.value); setShowBanksList(true); }} 
              onFocus={() => setShowBanksList(true)}
              placeholder="e.g., Guaranty Trust..." 
              className="form-input" 
              style={{ width: '100%' }} 
            />
            {showBanksList && filteredBanks.length > 0 && (
              <ul style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'var(--color-card)', border: '1px solid var(--color-border)',
                borderRadius: '8px', boxShadow: 'var(--shadow-md)', zIndex: 10,
                maxHeight: '180px', overflowY: 'auto', marginTop: '4px', padding: '4px'
              }}>
                {filteredBanks.map(b => (
                  <li 
                    key={b.code} 
                    onClick={() => { setSelectedBank(b); setBankQuery(b.name); setShowBanksList(false); }}
                    style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-primary)' }}
                    className="dropdown-item"
                  >
                    {b.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Account Number</label>
            <input type="text" value={accountNum} onChange={e => setAccountNum(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Enter 10 digit number..." className="form-input" style={{ width: '100%' }} />
          </div>
          <button type="submit" className="btn btn-solid" disabled={loading || accountNum.length !== 10 || !selectedBank} style={{ width: '100%', background: 'var(--color-primary)' }}>
            {loading ? "Adding Details..." : "Confirm Account"}
          </button>
        </form>
      )}

      {/* STEP 4: Completion Screen */}
      {view === 'complete' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.01) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#10b981' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h4 style={{ color: 'var(--color-text-primary)', fontWeight: 600, margin: '12px 0 4px' }}>Bank Account Added</h4>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>We confirmed this account belongs to:</p>
            <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-primary)', margin: '4px 0 16px' }}>{finalScoreData?.account_name}</p>

            {role === 'farmer' && (
              <>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Your Updated Trust Score</p>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#10B981', marginBottom: '4px' }}>
                  {finalScoreData?.trust_score} <span style={{ fontSize: '18px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>/ 100</span>
                </div>
                <div style={{ background: '#D1FAE5', color: '#059669', padding: '6px 14px', borderRadius: '20px', display: 'inline-block', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '0 auto' }}>
                  <Icon name="star" size={18} /> {finalScoreData?.trust_tier}
                </div>
              </>
            )}
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '20px', lineHeight: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Icon name="milestones" size={20} /> Verification fully complete for access!
            </p>
          </div>
          <button className="btn btn-solid" style={{ width: '100%', background: 'var(--color-primary)' }} onClick={onClose}>Go to Dashboard</button>
        </div>
      )}

      <style>{`
        .dropdown-item:hover { background: var(--color-card-alt); }
      `}</style>

    </Modal>
  );
}
