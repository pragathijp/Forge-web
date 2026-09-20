import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          height: 52,
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-5)',
          flexShrink: 0,
        }}
      >
        <div
          onClick={() => navigate('/')}
          style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', cursor: 'pointer' }}
        >
          Forge
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{user?.name}</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
    </div>
  );
}