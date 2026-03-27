import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      const fetchedUser = data.data;
      if (fetchedUser && fetchedUser.first_name) {
        fetchedUser.name = `${fetchedUser.first_name} ${fetchedUser.last_name || ''}`.trim();
      }
      setUser(fetchedUser);
    } catch (err) {
      const status = err?.response?.status;

      // Keep current session on transient failures (timeouts/network/5xx).
      if (status === 401 || status === 403) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const loginAction = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    if (data?.data) setUser(data.data);
    await fetchProfile(); // fetch updated profile
    return data;
  }, [fetchProfile]);

  const adminLoginAction = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/admin/login', credentials);
    if (data?.data) setUser(data.data);
    await fetchProfile(); // fetch updated profile
    return data;
  }, [fetchProfile]);

  const signupAction = useCallback(async (userData) => {
    const { data } = await api.post('/auth/signup', userData);
    await fetchProfile(); // fetch updated profile
    return data;
  }, [fetchProfile]);

  const logoutAction = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setUser(null);
    }
  }, []);

  const demoLogin = useCallback((role, userData = {}, isNew = false) => {
    const mockUser = {
      uid: 'demo-' + Date.now(),
      first_name: userData.first_name || (role === 'farmer' ? 'Chukwuemeka' : role === 'investor' ? 'Amara' : 'Admin'),
      last_name: userData.last_name || (role === 'farmer' ? 'Oduya' : role === 'investor' ? 'Obi' : 'User'),
      name: userData.name || (role === 'farmer' ? 'Chukwuemeka Oduya' : role === 'investor' ? 'Amara Obi' : 'Admin User'),
      email: userData.email || `${role}@agriflow.ng`,
      role,
      bvn_verified: !isNew,
      bank_verified: !isNew,
      isNewUser: isNew, // Special flag to identify new sign-ups vs existing demo users
      ...userData,
    };
    setUser(mockUser);
    return mockUser;
  }, []);

  const value = useMemo(() => ({
    user,
    setUser,
    loading,
    login: loginAction,
    adminLogin: adminLoginAction,
    signup: signupAction,
    logout: logoutAction,
    demoLogin,
    fetchProfile,
    isLoggedIn: !!user
  }), [user, loading, loginAction, adminLoginAction, signupAction, logoutAction, demoLogin, fetchProfile]);

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--color-bg, #fdfbfa)' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--color-border, #e5e0d8)', borderTop: '4px solid var(--color-primary, #2A3B24)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '16px', color: 'var(--color-text-secondary, #6b665b)', fontSize: '14px', fontWeight: 500 }}>Connecting to server...</p>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
