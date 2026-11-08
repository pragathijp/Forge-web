import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '../api/types';
import { STATUS_LABELS } from '../api/types';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  grabbedTaskId: string | null;
  placeholderIndex: number | null;
  onCardKeyDown: (event: KeyboardEvent<HTMLDivElement>, task: Task) => void;
  onCardBlur: () => void;
}

export function Column({
  status,
  tasks,
  onTaskClick,
  grabbedTaskId,
  placeholderIndex,
  onCardKeyDown,
  onCardBlur,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    placeholderRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [placeholderIndex]);

  // The placeholder index counts the cards in this column without the carried one.
  const others = tasks.filter((t) => t.id !== grabbedTaskId);
  const showPlaceholder = placeholderIndex !== null;
  const placeholderBeforeId =
    showPlaceholder && placeholderIndex < others.length ? others[placeholderIndex].id : null;
  const placeholderAtEnd = showPlaceholder && placeholderIndex >= others.length;

  const placeholder = (
    <div
      key="placeholder"
      ref={placeholderRef}
      aria-hidden="true"
      style={{
        height: 44,
        border: '1.5px dashed var(--color-accent)',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-bg-subtle)',
      }}
    />
  );

  const taskLabel = tasks.length === 1 ? 'task' : 'tasks';

  return (
    <div
      role="group"
      aria-label={`${STATUS_LABELS[status]}, ${tasks.length} ${taskLabel}`}
      style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
    >
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
        <span style={{ whiteSpace: 'nowrap' }}>{STATUS_LABELS[status]}</span>
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
            <div key={task.id} style={{ display: 'contents' }}>
              {task.id === placeholderBeforeId && placeholder}
              <TaskCard
                task={task}
                onClick={() => onTaskClick(task)}
                isGrabbed={task.id === grabbedTaskId}
                onKeyDown={(event) => onCardKeyDown(event, task)}
                onBlur={onCardBlur}
              />
            </div>
          ))}
          {placeholderAtEnd && placeholder}
        </SortableContext>
      </div>
    </div>
  );
}