import { isAxiosError } from 'axios';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import type { Announcements, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { fetchTasks, moveTask } from '../api/tasks';
import { STATUS_LABELS, TASK_STATUSES } from '../api/types';
import type { Task, TaskStatus } from '../api/types';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { TaskDetailPanel } from './TaskDetailPanel';

interface GrabState {
  taskId: string;
  status: TaskStatus;
  // Slot among the column's cards, not counting the carried card.
  index: number;
}

function describeSlot(status: TaskStatus, index: number, total: number) {
  return `${STATUS_LABELS[status]}, position ${index + 1} of ${total}`;
}

export function KanbanBoard({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [grab, setGrab] = useState<GrabState | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const pendingFocusRef = useRef<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function loadTasks() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchTasks(projectId);
      setTasks(data.sort((a, b) => a.position - b.position));
    } catch {
      setLoadError('Could not load this board. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchTasks(projectId)
      .then((data) => {
        if (!cancelled) setTasks([...data].sort((a, b) => a.position - b.position));
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load this board. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // A card that moves to another column is re-created, which drops keyboard focus.
  // After the move, put focus back on it.
  useEffect(() => {
    const id = pendingFocusRef.current;
    if (!id) return;
    pendingFocusRef.current = null;
    document.querySelector<HTMLElement>(`[data-task-id="${id}"]`)?.focus();
  }, [tasks]);

  function titleOf(id: string | number) {
    return tasks.find((t) => t.id === id)?.title ?? 'task';
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: () => undefined,
    onDragEnd: ({ active }) => `Dropped ${titleOf(active.id)}.`,
    onDragCancel: ({ active }) => `Move of ${titleOf(active.id)} cancelled.`,
  };

  function handleDragStart(event: DragStartEvent) {
    if (isSaving) return;
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function moveTaskTo(movedTask: Task, targetStatus: TaskStatus, insertAfterTaskId: string | null) {
    const previousTasks = tasks;
    const updatedTask = { ...movedTask, status: targetStatus };
    const withoutMoved = tasks.filter((t) => t.id !== movedTask.id);
    const insertIndex = insertAfterTaskId
      ? withoutMoved.findIndex((t) => t.id === insertAfterTaskId) + 1
      : withoutMoved.filter((t) => t.status === targetStatus).length > 0
        ? withoutMoved.findIndex((t) => t.status === targetStatus)
        : withoutMoved.length;
    const optimisticTasks = [...withoutMoved];
    optimisticTasks.splice(insertIndex, 0, updatedTask);
    setTasks(optimisticTasks);

    setIsSaving(true);
    try {
      const saved = await moveTask({
        taskId: movedTask.id,
        version: movedTask.version,
        status: targetStatus !== movedTask.status ? targetStatus : undefined,
        insertAfterTaskId,
      });
      setTasks((current) => current.map((t) => (t.id === saved.id ? saved : t)));
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setConflictMessage('This task was updated elsewhere — refreshing…');
        await loadTasks();
        setTimeout(() => setConflictMessage(null), 3000);
      } else {
        setTasks(previousTasks);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    // Dropped back on itself: nothing moved, so nothing to save.
    if (over.id === active.id) return;

    const movedTask = tasks.find((t) => t.id === active.id);
    if (!movedTask) return;

    const overIsColumn = TASK_STATUSES.includes(over.id as TaskStatus);
    const targetStatus: TaskStatus = overIsColumn
      ? (over.id as TaskStatus)
      : (tasks.find((t) => t.id === over.id)?.status ?? movedTask.status);

    // The target column in order, including the moved task if it is already in it.
    const fullColumn = tasks
      .filter((t) => t.status === targetStatus)
      .sort((a, b) => a.position - b.position);
    // The same column without the moved task: the neighbours it can sit between.
    const columnTasks = fullColumn.filter((t) => t.id !== movedTask.id);

    let insertAfterTaskId: string | null;
    if (overIsColumn) {
      // Dropped on the column itself: put it at the end.
      insertAfterTaskId = columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].id : null;
    } else {
      const overIndex = columnTasks.findIndex((t) => t.id === over.id);
      const sameColumn = targetStatus === movedTask.status;

      let placeAfterOver: boolean;
      if (sameColumn) {
        // Same column: moving down lands after the target, moving up lands before it.
        placeAfterOver =
          fullColumn.findIndex((t) => t.id === movedTask.id) <
          fullColumn.findIndex((t) => t.id === over.id);
      } else {
        // Another column: after the target if the dragged card is now below its middle.
        const dragged = active.rect.current.translated;
        placeAfterOver =
          !!dragged &&
          dragged.top + dragged.height / 2 > over.rect.top + over.rect.height / 2;
      }

      if (placeAfterOver) {
        insertAfterTaskId = over.id as string;
      } else {
        insertAfterTaskId = overIndex > 0 ? columnTasks[overIndex - 1].id : null;
      }
    }

    // If it would end up exactly where it already is, there is nothing to save.
    if (targetStatus === movedTask.status) {
      const currentIndex = fullColumn.findIndex((t) => t.id === movedTask.id);
      const currentPredecessorId = currentIndex > 0 ? fullColumn[currentIndex - 1].id : null;
      if (insertAfterTaskId === currentPredecessorId) return;
    }

    await moveTaskTo(movedTask, targetStatus, insertAfterTaskId);
  }

  function cardsInColumnWithout(status: TaskStatus, taskId: string) {
    return tasks.filter((t) => t.status === status && t.id !== taskId);
  }

  function updateGrab(task: Task, status: TaskStatus, index: number) {
    const total = cardsInColumnWithout(status, task.id).length + 1;
    setGrab({ taskId: task.id, status, index });
    setAnnouncement(describeSlot(status, index, total));
  }

  function dropGrabbed(task: Task, target: GrabState) {
    const column = tasks.filter((t) => t.status === target.status);
    const others = column.filter((t) => t.id !== task.id);
    const unchanged =
      target.status === task.status && target.index === column.findIndex((t) => t.id === task.id);

    setGrab(null);
    if (unchanged) {
      setAnnouncement(`Dropped ${task.title} in the same place.`);
      return;
    }
    const insertAfterTaskId = target.index > 0 ? others[target.index - 1].id : null;
    setAnnouncement(
      `Dropped ${task.title}. ${describeSlot(target.status, target.index, others.length + 1)}.`,
    );
    pendingFocusRef.current = task.id;
    void moveTaskTo(task, target.status, insertAfterTaskId);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>, task: Task) {
    if (event.target !== event.currentTarget) return;
    const isSpace = event.code === 'Space' || event.key === ' ';

    if (!grab) {
      if (isSpace) {
        event.preventDefault();
        if (isSaving) return;
        const column = tasks.filter((t) => t.status === task.status);
        const index = column.findIndex((t) => t.id === task.id);
        setGrab({ taskId: task.id, status: task.status, index });
        setAnnouncement(
          `Picked up ${task.title}. ${describeSlot(task.status, index, column.length)}. ` +
            'Use the arrow keys to move, Space to drop, Escape to cancel.',
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        setSelectedTask(task);
      }
      return;
    }

    if (grab.taskId !== task.id) return;

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const count = cardsInColumnWithout(grab.status, task.id).length;
      const index =
        event.key === 'ArrowUp' ? Math.max(0, grab.index - 1) : Math.min(count, grab.index + 1);
      updateGrab(task, grab.status, index);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const nextStatus = TASK_STATUSES[TASK_STATUSES.indexOf(grab.status) + step];
      if (!nextStatus) {
        setAnnouncement(`${STATUS_LABELS[grab.status]} is the ${step === 1 ? 'last' : 'first'} column.`);
        return;
      }
      const count = cardsInColumnWithout(nextStatus, task.id).length;
      updateGrab(task, nextStatus, Math.min(grab.index, count));
    } else if (isSpace || event.key === 'Enter') {
      event.preventDefault();
      dropGrabbed(task, grab);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setGrab(null);
      setAnnouncement(`Move of ${task.title} cancelled.`);
    }
  }

  function handleCardBlur() {
    if (!grab) return;
    setGrab(null);
    setAnnouncement('Move cancelled.');
  }

  function handleTaskSaved(updated: Task) {
    setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
  }

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)' }}>
        {TASK_STATUSES.map((status) => (
          <div key={status} style={{ width: 260, flexShrink: 0 }}>
            <div style={{ height: 16, width: 80, background: 'var(--color-bg-subtle)', borderRadius: 4, marginBottom: 'var(--space-3)' }} />
            <div style={{ height: 64, background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)' }} />
            <div style={{ height: 64, background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }} />
          </div>
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: 'var(--space-5)' }}>
        <div style={{ fontSize: 13, color: 'var(--color-danger-text)', background: 'var(--color-danger-bg)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-sm)', maxWidth: 400, marginBottom: 'var(--space-3)' }}>
          {loadError}
        </div>
        <button
          onClick={loadTasks}
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

  return (
    <div style={{ padding: 'var(--space-5)' }}>
      <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {announcement}
      </div>
      {conflictMessage && (
        <div
          role="status"
          style={{
            marginBottom: 'var(--space-4)',
            fontSize: 13,
            color: 'var(--color-warning-text)',
            background: 'var(--color-warning-bg)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            maxWidth: 400,
          }}
        >
          {conflictMessage}
        </div>
      )}
      {tasks.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          No tasks yet in this project.
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'Press Space to pick up this task. Use the arrow keys to choose a new position, ' +
              'then press Space to drop it, or Escape to cancel. Press Enter to open its details.',
          },
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            overflowX: 'auto',
            paddingBottom: 'var(--space-2)',
            // Leave room so cards can scroll clear of the detail panel.
            paddingRight: selectedTask ? 400 : 0,
            scrollPaddingRight: selectedTask ? 400 : 0,
          }}
        >
          {TASK_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasks.filter((t) => t.status === status)}
              onTaskClick={setSelectedTask}
              grabbedTaskId={grab?.taskId ?? null}
              placeholderIndex={grab && grab.status === status ? grab.index : null}
              onCardKeyDown={handleCardKeyDown}
              onCardBlur={handleCardBlur}
            />
          ))}
        </div>
        <DragOverlay>{activeTask ? <TaskCard task={activeTask} onClick={() => {}} /> : null}</DragOverlay>
      </DndContext>
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSaved={handleTaskSaved}
        />
      )}
    </div>
  );
}