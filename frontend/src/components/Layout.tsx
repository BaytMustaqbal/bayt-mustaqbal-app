import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';

const menuItems = [
  { path: '/', icon: '📊', label: 'Dashboard', roles: ['admin', 'user'] },
  { path: '/keuangan', icon: '💰', label: 'Keuangan', roles: ['admin', 'user'] },
  { path: '/review', icon: '📈', label: 'Review', roles: ['admin', 'user'] },
  { path: '/tagihan', icon: '📄', label: 'Tagihan', roles: ['admin', 'user'] },
  { path: '/absensi', icon: '📅', label: 'Absensi', roles: ['admin', 'user'] },
  { path: '/kalender', icon: '📆', label: 'Kalender', roles: ['admin', 'user'] },
  { path: '/service', icon: '🔧', label: 'Service', roles: ['admin', 'user'] },
  { path: '/catatan', icon: '📝', label: 'Catatan', roles: ['admin', 'user'] },
  { path: '/settings', icon: '⚙️', label: 'Settings', roles: ['admin'] }
];

export function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [familyName, setFamilyName] = useState('Keluarga');

  // Load family name from settings
  // In real app, fetch from settings API

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role || ''));

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    localStorage.removeItem('auth_token');
    useAuthStore.getState().logout();
    window.location.href = '/login';
  };

  return (
    <div className="main-layout">
      {/* Top Bar */}
      <header className="top-bar" role="banner">
        <div className="top-bar-left">
          <button
            id="menu-toggle"
            className="icon-btn"
            aria-label={sidebarOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h1 className="app-title">Bayt Mustaqbal</h1>
        </div>
        <div className="top-bar-right">
          <div className="user-info">
            <span className="user-name">{user?.nama}</span>
            <span className={`user-role ${user?.role}`}>{user?.role === 'admin' ? 'Admin' : 'User'}</span>
          </div>
          <button className="icon-btn" onClick={handleLogout} aria-label="Keluar" title="Keluar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      <div id="sidebar-overlay" className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} aria-hidden="true"></div>

      {/* Sidebar */}
      <aside id="sidebar" className={`sidebar ${sidebarOpen ? 'open' : ''}`} role="navigation" aria-label="Menu utama">
        <div className="sidebar-header">
          <div className="family-name">{familyName}</div>
        </div>
        <nav className="sidebar-nav" aria-label="Menu navigasi">
          {filteredMenu.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
              end={item.path === '/'}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-secondary btn-block" onClick={handleLogout}>Keluar</button>
        </div>
      </aside>

      {/* Main Content */}
      <main id="main-content" className="main-content" role="main">
        <Outlet />
      </main>
    </>
  );
}

export default Layout;