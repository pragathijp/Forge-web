import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { fetchTasks, moveTask } from '../api/tasks';
import { TASK_STATUSES } from '../api/types';
import type { Task, TaskStatus } from '../api/types';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { TaskDetailPanel } from './TaskDetailPanel';

export function KanbanBoard({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    loadTasks();
  }, [projectId]);

  function handleDragStart(event: DragStartEvent) {
    if (isSaving) return;
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overIsColumn = TASK_STATUSES.includes(over.id as TaskStatus);
    const targetStatus: TaskStatus = overIsColumn
      ? (over.id as TaskStatus)
      : tasks.find((t) => t.id === over.id)?.status ?? activeTask.status;

    const columnTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== activeTask.id)
      .sort((a, b) => a.position - b.position);

    let insertAfterTaskId: string | null = null;
    if (!overIsColumn) {
      const overIndex = columnTasks.findIndex((t) => t.id === over.id);
      insertAfterTaskId = overIndex > 0 ? columnTasks[overIndex - 1].id : null;
      if (columnTasks[overIndex]?.id === over.id && overIndex === -1) {
        insertAfterTaskId = columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].id : null;
      }
    } else if (columnTasks.length > 0) {
      insertAfterTaskId = columnTasks[columnTasks.length - 1].id;
    }

    const previousTasks = tasks;
    const updatedTask = { ...activeTask, status: targetStatus };
    const withoutActive = tasks.filter((t) => t.id !== activeTask.id);
    const insertIndex = insertAfterTaskId
      ? withoutActive.findIndex((t) => t.id === insertAfterTaskId) + 1
      : withoutActive.filter((t) => t.status === targetStatus).length > 0
        ? withoutActive.findIndex((t) => t.status === targetStatus)
        : withoutActive.length;
    const optimisticTasks = [...withoutActive];
    optimisticTasks.splice(insertIndex, 0, updatedTask);
    setTasks(optimisticTasks);

    setIsSaving(true);
    try {
      const saved = await moveTask({
        taskId: activeTask.id,
        version: activeTask.version,
        status: targetStatus !== activeTask.status ? targetStatus : undefined,
        insertAfterTaskId,
      });
      setTasks((current) => current.map((t) => (t.id === saved.id ? saved : t)));
    } catch (err: any) {
      if (err?.response?.status === 409) {
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

  function handleTaskSaved(updated: Task) {
    setTasks((current) => current.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
  }

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)' }}>
        {TASK_STATUSES.map((status) => (
          <div key={status} style={{ width: 260 }}>
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
      {conflictMessage && (
        <div
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
      >
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          {TASK_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasks.filter((t) => t.status === status)}
              onTaskClick={setSelectedTask}
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