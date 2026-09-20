import { useState, useEffect } from 'react';
import type { Task, TaskStatus, Priority } from '../api/types';
import { TASK_STATUSES } from '../api/types';
import { updateTask } from '../api/tasks';

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onSaved: (updated: Task) => void;
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: 'var(--space-1)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  fontSize: 14,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  outline: 'none',
  fontFamily: 'inherit',
  background: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
};

export function TaskDetailPanel({ task, onClose, onSaved }: TaskDetailPanelProps) {
  const [currentTask, setCurrentTask] = useState(task);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : '');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTask(task);
    setTitle(task.title);
    setDescription(task.description ?? '');
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
  }, [task]);

  async function saveField(changes: Partial<{ title: string; description: string; status: TaskStatus; priority: Priority; dueDate: string | null }>) {
    setSaveError(null);
    try {
      const saved = await updateTask({ taskId: currentTask.id, version: currentTask.version, ...changes });
      setCurrentTask(saved);
      onSaved(saved);
    } catch {
      setSaveError('Could not save — please try again.');
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        background: 'var(--color-bg)',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: '-4px 0 16px rgba(16, 24, 40, 0.06)',
        padding: 'var(--space-5)',
        overflowY: 'auto',
        zIndex: 100,
      }}
    >
      <button
        onClick={onClose}
        style={{
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginBottom: 'var(--space-4)',
        }}
      >
        ← Close
      </button>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title !== currentTask.title && saveField({ title })}
        style={{ ...inputStyle, fontSize: 16, fontWeight: 600, border: 'none', padding: '4px 0', marginBottom: 'var(--space-4)' }}
      />

      {saveError && (
        <div style={{ fontSize: 13, color: 'var(--color-danger-text)', background: 'var(--color-danger-bg)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-4)' }}>
          {saveError}
        </div>
      )}

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={fieldLabelStyle}>Status</label>
        <select
          value={status}
          onChange={(e) => {
            const next = e.target.value as TaskStatus;
            setStatus(next);
            saveField({ status: next });
          }}
          style={inputStyle}
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={fieldLabelStyle}>Priority</label>
        <select
          value={priority}
          onChange={(e) => {
            const next = e.target.value as Priority;
            setPriority(next);
            saveField({ priority: next });
          }}
          style={inputStyle}
        >
          {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={fieldLabelStyle}>Due date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          onBlur={() => saveField({ dueDate: dueDate || null })}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={fieldLabelStyle}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== (currentTask.description ?? '') && saveField({ description })}
          rows={6}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>
    </div>
  );
}