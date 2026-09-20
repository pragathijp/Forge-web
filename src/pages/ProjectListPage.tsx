import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProjects } from '../api/tasks';
import type { Project } from '../api/types';

export function ProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function load() {
    setIsLoading(true);
    setError(null);
    fetchProjects()
      .then(setProjects)
      .catch(() => setError('Could not load your projects. Please try again.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (isLoading) {
    return <div style={{ padding: 'var(--space-6)', color: 'var(--color-text-secondary)', fontSize: 13 }}>Loading projects…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 'var(--space-6)' }}>
        <div style={{ fontSize: 13, color: 'var(--color-danger-text)', background: 'var(--color-danger-bg)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-sm)', maxWidth: 400, marginBottom: 'var(--space-3)' }}>
          {error}
        </div>
        <button
          onClick={load}
          style={{
            padding: '7px 12px',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>
        No projects yet.
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 640 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
        Projects
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => navigate(`/projects/${project.id}`)}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: 14,
              color: 'var(--color-text-primary)',
              transition: 'border-color 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          >
            {project.name}
          </div>
        ))}
      </div>
    </div>
  );
}