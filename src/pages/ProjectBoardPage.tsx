import { useParams, Link } from 'react-router-dom';
import { KanbanBoard } from '../board/KanbanBoard';

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return null;
  }

  return (
    <div>
      <div style={{ padding: 'var(--space-4) var(--space-5) 0' }}>
        <Link to="/" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          ← All projects
        </Link>
      </div>
      <KanbanBoard projectId={projectId} />
    </div>
  );
}