import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'signup' ? 'signup' : 'login');
  const [role, setRole] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, signup, demoLogin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, reset, setError } = useForm();

  useEffect(() => {
    reset();
    setRole('');
  }, [tab, reset]);

  const [isDemo, setIsDemo] = useState(false); // Changed to false because backend is now active

  const onSubmit = async (data) => {
    if (!role) {
      addToast('Please select your role', 'error');
      return;
    }
    setLoading(true);
    const selectedRole = role;
    
    // DEMO MODE: Completely bypass backend for presentation navigation
    if (isDemo) {
      if (tab === 'signup') {
        demoLogin(selectedRole, { first_name: data.first_name, last_name: data.last_name, email: data.email }, true);
        addToast('Created demo account successfully!', 'success');
      } else {
        demoLogin(selectedRole, { email: data.email }, false);
        addToast('Logged in to demo account successfully!', 'success');
      }
      setLoading(false);
      if (selectedRole === 'farmer') navigate('/farmer/dashboard');
      else navigate('/investor/dashboard');
      return;
    }

    try {
      let response;
      if (tab === 'signup') {
        response = await signup({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          password: data.password,
          role: selectedRole,
          business_name: data.business_name || undefined
        });
      } else {
        response = await login({
          email: data.email,
          password: data.password,
          role: selectedRole
        });
      }
      
      const userRole = response?.data?.role || selectedRole;
      addToast('Welcome to AgriFlow!', 'success');
      if (userRole === 'farmer') navigate('/farmer/dashboard');
      else navigate('/investor/dashboard');
    } catch (err) {
      if (err.response) {
        if (err.response.status === 409) {
          addToast('An account with these details already exists', 'error');
        } else if (err.response.status === 400) {
          addToast('Invalid Credentials', 'error');
        } else if (err.response.status === 422) {
          // Field-level validation errors mapping
          const errorsArray = err.response.data?.errors;
          if (errorsArray && Array.isArray(errorsArray)) {
            errorsArray.forEach(({ field, message }) => {
              // React-Hook-Form setError
              const formField = field === 'last_name' || field === 'first_name' ? field : field;
              setError(formField, { type: 'server', message });
            });
            addToast('Validation Error. Please check your inputs.', 'error');
          } else {
            addToast('Validation Error. Please check your inputs.', 'error');
          }
        } else {
          addToast('An error occurred. Please try again.', 'error');
        }
      } else {
        addToast('Network error. Please try again later.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Link to="/" className="auth-logo">AgriFlow</Link>

      <div className="auth-card card">
        {/* Tab Toggle */}
        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => setTab('login')}>Log In</button>
          <button className={`auth-tab${tab === 'signup' ? ' active' : ''}`} onClick={() => setTab('signup')}>Sign Up</button>
          <div className="auth-tab-indicator" style={{ left: tab === 'login' ? '4px' : 'calc(50% + 0px)' }} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          {tab === 'signup' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className={`form-input${errors.first_name ? ' error' : ''}`} placeholder="First Name"
                  {...register('first_name', { required: 'First name is required' })} />
                {errors.first_name && <span className="form-error">{errors.first_name.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className={`form-input${errors.last_name ? ' error' : ''}`} placeholder="Last Name"
                  {...register('last_name', { required: 'Last name is required' })} />
                {errors.last_name && <span className="form-error">{errors.last_name.message}</span>}
              </div>
            </div>
          )}
          {tab === 'signup' && role === 'farmer' && (
            <div className="form-group">
              <label className="form-label">Business Name (Optional)</label>
              <input className="form-input" placeholder="e.g. Olusola Farms"
                {...register('business_name')} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className={`form-input${errors.email ? ' error' : ''}`} type="email" placeholder="you@example.com"
              {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })} />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pw-wrap">
              <input className={`form-input${errors.password ? ' error' : ''}`} type={showPw ? 'text' : 'password'} placeholder="••••••••"
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } })} />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          {tab === 'login' && (
            <div style={{ textAlign: 'right', marginTop: '-8px' }}>
              <button type="button" className="btn-link" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Forgot password?</button>
            </div>
          )}

          <div className="role-select">
              <p className="form-label" style={{ marginBottom: '12px' }}>I am a…</p>
              <div className="role-cards">
                <div className={`role-card${role === 'farmer' ? ' selected' : ''}`} onClick={() => setRole('farmer')}>
                  <div className="role-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 2a10 10 0 0 1 10 10c-1.5 3-4 5.5-7 6.5"/>
                      <path d="M2 12C2 6.48 6.48 2 12 2"/>
                      <path d="M7 20.5C4 18.5 2 15.5 2 12"/>
                      <path d="M12 22c-1.5 0-3-.3-4.3-.8"/>
                      <path d="M12 12v10"/>
                      <path d="M12 12l4-4"/>
                      <path d="M12 12l-3-3"/>
                    </svg>
                  </div>
                  <span className="role-label">I'm a Farmer</span>
                </div>
                <div className={`role-card${role === 'investor' ? ' selected' : ''}`} onClick={() => setRole('investor')}>
                  <div className="role-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                      <polyline points="16 7 22 7 22 13"/>
                    </svg>
                  </div>
                  <span className="role-label">I'm an Investor</span>
                </div>
              </div>
            </div>

          <button type="submit" className="btn btn-solid btn-full" style={{ marginTop: '8px' }} disabled={loading}>
            {loading ? 'Processing...' : (tab === 'login' ? 'Log In' : 'Create Account')}
          </button>

          {tab === 'signup' && (
            <Link to="/admin/login" className="auth-note" style={{ display: 'block' }}>Admin access is granted separately.</Link>
          )}

          {/* Demo shortcuts */}
          <div className="auth-demo">
            <p className="auth-demo-label">Quick demo access:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px', textAlign: 'center' }}>Demo New Signups</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { demoLogin('farmer', {}, true); addToast('Demo generic new farmer', 'success'); navigate('/farmer/dashboard'); }}>New Farmer</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { demoLogin('investor', {}, true); addToast('Demo generic new investor', 'success'); navigate('/investor/dashboard'); }}>New Investor</button>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px', textAlign: 'center' }}>Demo Existing Logins</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { demoLogin('farmer', {}, false); addToast('Demo returning farmer', 'success'); navigate('/farmer/dashboard'); }}>Returning Farmer</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { demoLogin('investor', {}, false); addToast('Demo returning investor', 'success'); navigate('/investor/dashboard'); }}>Returning Investor</button>
                </div>
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: '16px', color: 'var(--color-primary)', background: 'var(--color-primary-light)' }} onClick={() => { demoLogin('admin'); addToast('Logged in as Admin', 'success'); navigate('/admin/dashboard'); }}>Admin View</button>
          </div>
        </form>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          background: var(--color-surface);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
          background-image: radial-gradient(ellipse at center, rgba(26,107,60,0.04) 0%, transparent 70%);
        }
        .auth-logo {
          font-size: 26px;
          font-weight: 700;
          color: var(--color-primary);
          font-family: var(--font-heading);
          margin-bottom: 28px;
          letter-spacing: -0.5px;
        }
        .auth-card {
          width: 100%;
          max-width: 480px;
          padding: 32px;
        }
        .auth-tabs {
          display: flex;
          position: relative;
          background: var(--color-card-alt);
          border-radius: var(--radius-sm);
          padding: 4px;
          margin-bottom: 28px;
        }
        .auth-tab {
          flex: 1;
          padding: 10px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 6px;
          color: var(--color-text-secondary);
          transition: color var(--transition-base);
          position: relative;
          z-index: 1;
        }
        .auth-tab.active { color: var(--color-text-primary); }
        .auth-tab-indicator {
          position: absolute;
          top: 4px; bottom: 4px;
          width: calc(50% - 4px);
          background: var(--color-card);
          border-radius: 6px;
          box-shadow: var(--shadow-sm);
          transition: left var(--transition-base);
        }
        .auth-form { display: flex; flex-direction: column; gap: 20px; }
        .pw-wrap { position: relative; }
        .pw-toggle {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          font-size: 12px; font-weight: 600; color: var(--color-text-secondary);
        }
        .pw-toggle:hover { color: var(--color-text-primary); }
        .role-select {}
        .role-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .role-card {
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all var(--transition-base);
          background: var(--color-card);
        }
        .role-card:hover { border-color: var(--color-primary); background: var(--color-primary-light); }
        .role-card.selected { border-color: var(--color-primary); background: var(--color-primary-light); }
        .role-icon { color: var(--color-primary); }
        .role-label { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
        .auth-note { font-size: 12px; color: var(--color-text-tertiary); text-align: center; margin-top: -8px; }
        .auth-demo { margin-top: 16px; padding-top: 20px; border-top: 1px solid var(--color-border); }
        .auth-demo-label { font-size: 12px; color: var(--color-text-tertiary); margin-bottom: 10px; text-align: center; }
        .auth-demo-btns { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
      `}</style>
    </div>
  );
}
