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

export function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function loadTasks() {
    const data = await fetchTasks();
    setTasks(data.sort((a, b) => a.position - b.position));
  }

  useEffect(() => {
    loadTasks();
  }, []);

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

    // Determine target status: either a column was dropped on directly,
    // or another card was dropped on — in which case, use that card's column.
    const overIsColumn = TASK_STATUSES.includes(over.id as TaskStatus);
    const targetStatus: TaskStatus = overIsColumn
      ? (over.id as TaskStatus)
      : tasks.find((t) => t.id === over.id)?.status ?? activeTask.status;

    const columnTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== activeTask.id)
      .sort((a, b) => a.position - b.position);

    // Figure out insertAfterTaskId based on where it was dropped among that column's cards.
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

    // Optimistic update: move the task locally immediately.
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          {TASK_STATUSES.map((status) => (
            <Column key={status} status={status} tasks={tasks.filter((t) => t.status === status)} />
          ))}
        </div>
        <DragOverlay>{activeTask ? <TaskCard task={activeTask} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}