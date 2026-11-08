import type { KeyboardEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../api/types';
import { PRIORITY_COLORS } from '../api/types';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isGrabbed?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: () => void;
}

export function TaskCard({ task, onClick, isGrabbed = false, onKeyDown, onBlur }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isGrabbed ? 0.5 : 1,
    background: 'var(--color-bg)',
    border: isGrabbed ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--space-3)',
    cursor: 'grab',
    userSelect: 'none',
  };

  const priorityColor = PRIORITY_COLORS[task.priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-task-id={task.id}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onFocus={(event) => {
        // Keep a keyboard-focused card in view, clear of the detail panel.
        if (event.currentTarget.matches(':focus-visible')) {
          event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }}
    >
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