import { Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProjectListPage } from './pages/ProjectListPage';
import { ProjectBoardPage } from './pages/ProjectBoardPage';
import { RequireAuth } from './auth/RequireAuth';
import { AppShell } from './layout/AppShell';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell>
              <ProjectListPage />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <RequireAuth>
            <AppShell>
              <ProjectBoardPage />
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

export default App;