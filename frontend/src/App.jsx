import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import FarmListingsPage from './pages/FarmListingsPage';
import FarmDetailPage from './pages/FarmDetailPage';
import InvestorDashboard from './pages/InvestorDashboard';
import FarmerDashboard from './pages/FarmerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import ReceiptPage from './pages/ReceiptPage';
import InvestmentDetails from './pages/InvestmentDetails';
import { PaymentSuccessPage, PaymentFailurePage } from './pages/PaymentPages';
import HarvestReportPage from './pages/HarvestReportPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Verifying session...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'farmer') return <Navigate to="/farmer/dashboard" replace />;
    if (user.role === 'investor') return <Navigate to="/investor/dashboard" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/farms" element={<FarmListingsPage />} />
      <Route path="/farms/:id" element={<FarmDetailPage />} />

      <Route path="/investor/dashboard" element={
        <ProtectedRoute allowedRoles={['investor']}>
          <InvestorDashboard />
        </ProtectedRoute>
      } />

      <Route path="/investments/:id" element={
        <ProtectedRoute allowedRoles={['investor']}>
          <InvestmentDetails />
        </ProtectedRoute>
      } />

      <Route path="/farmer/dashboard" element={
        <ProtectedRoute allowedRoles={['farmer']}>
          <FarmerDashboard />
        </ProtectedRoute>
      } />

      <Route path="/farmer/harvest-report" element={
        <ProtectedRoute allowedRoles={['farmer']}>
          <HarvestReportPage />
        </ProtectedRoute>
      } />

      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="/payment/success" element={
        <ProtectedRoute>
          <PaymentSuccessPage />
        </ProtectedRoute>
      } />

      <Route path="/payment/failure" element={
        <ProtectedRoute>
          <PaymentFailurePage />
        </ProtectedRoute>
      } />

      <Route path="/receipts/:id" element={
        <ProtectedRoute>
          <ReceiptPage />
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
