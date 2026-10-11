import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ReviewPage } from './pages/ReviewPage';
import { BillsPage } from './pages/BillsPage';
import { AttendancePage } from './pages/AttendancePage';
import { CalendarPage } from './pages/CalendarPage';
import { ServicePage } from './pages/ServicePage';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { useAuthStore } from './stores/authStore';
import { useEffect } from 'react';
import { api } from './api/client';

function App() {
  const { token, setToken, user, setUser, isLoading, setLoading } = useAuthStore();
  const location = useLocation();

  // Initialize auth on app load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const { user } = await api.me();
          setUser(user);
        } catch {
          localStorage.removeItem('auth_token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [setToken, setUser, setLoading]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', background: '#0f1419'
      }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/keuangan" element={<TransactionsPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/tagihan" element={<BillsPage />} />
        <Route path="/absensi" element={<AttendancePage />} />
        <Route path="/kalender" element={<CalendarPage />} />
        <Route path="/service" element={<ServicePage />} />
        <Route path="/catatan" element={<NotesPage />} />
        <Route element={<AdminRoute><SettingsPage /></AdminRoute>} path="/settings" />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;