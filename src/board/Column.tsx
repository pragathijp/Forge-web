import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '../api/types';
import { STATUS_LABELS } from '../api/types';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
}

export function Column({ status, tasks }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
          padding: '0 var(--space-1) var(--space-1)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{STATUS_LABELS[status]}</span>
        <span>{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          minHeight: 40,
          borderRadius: 'var(--radius-sm)',
          outline: isOver ? '2px solid var(--color-accent)' : 'none',
          outlineOffset: 2,
          padding: 2,
        }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}