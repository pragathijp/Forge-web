import { Routes, Route, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { RequireAuth } from './auth/RequireAuth';
import { useAuth } from './auth/AuthContext';
import { KanbanBoard } from './board/KanbanBoard';

function DashboardPlaceholder() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
        Logged in as {user?.name}
      </div>
      <button
        onClick={handleLogout}
        style={{
          padding: '7px 12px',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          marginBottom: 'var(--space-4)',
        }}
      >
        Log out
      </button>
      <KanbanBoard />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPlaceholder />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;