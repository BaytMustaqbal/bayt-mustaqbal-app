import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { setToken, setUser, setLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const data = await api.login(email, password);
      if (data.token && data.user) {
        useAuthStore.getState().setToken(data.token);
        useAuthStore.getState().setUser(data.user);
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Login gagal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'linear-gradient(135deg, #0f1419 0%, #1a1d23 100%)'
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '40px 32px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 64px; margin-bottom: 16px;">🏠</div>
          <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: var(--text);">
            Bayt Mustaqbal
          </h1>
          <p style="color: var(--text-secondary); margin: 0;">
            Masuk untuk melanjutkan
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-light)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="kakang@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={submitting}
            style={{ marginTop: '8px' }}
          >
            {submitting ? (
              <>
                <svg className="loading-spinner" style="width:16px;height:16px" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 60" strokeLinecap="round"></circle>
                </svg>
                Masuk...
              </>
            ) : 'Masuk'}
          </button>
        </form>

        <div style="margin-top: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
          Bayt Mustaqbal — Aplikasi Keluarga
        </div>
      </div>
    );
  };
}

export default LoginPage;