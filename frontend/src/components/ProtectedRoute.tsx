import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', background: 'var(--bg)'
      }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', background: 'var(--bg)'
      }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="empty-state" style="padding: 60px 20px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style="width:64px;height:64px;color:var(--danger)">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3 style="margin: 16px 0 8px">Akses Ditolak</h3>
        <p>Hanya admin yang bisa mengakses halaman ini</p>
      </div>
    );
  }

  return <>{children}</>;
}