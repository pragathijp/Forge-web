import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../api/types';
import { PRIORITY_COLORS } from '../api/types';

export function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--space-3)',
    cursor: 'grab',
    userSelect: 'none',
  };

  const priorityColor = PRIORITY_COLORS[task.priority];

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 'var(--space-2)' }}>
        {task.title}
      </div>
      <span
        style={{
          display: 'inline-block',
          fontSize: 11,
          fontWeight: 500,
          color: priorityColor.text,
          background: priorityColor.bg,
          borderRadius: 4,
          padding: '2px 6px',
        }}
      >
        {task.priority}
      </span>
    </div>
  );
}