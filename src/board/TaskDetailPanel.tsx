import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { isAxiosError } from 'axios';
import type { Task, TaskStatus, Priority } from '../api/types';
import { PRIORITY_COLORS, STATUS_LABELS, TASK_STATUSES } from '../api/types';
import { updateTask } from '../api/tasks';

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onSaved: (updated: Task) => void;
}

interface Draft {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
}

type Changes = Partial<{
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
}>;

function toDraft(task: Task): Draft {
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
  };
}

function formatDueDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const panelStyle: React.CSSProperties = {
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
};

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
  fontFamily: 'inherit',
  background: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '7px 12px',
  fontSize: 13,
  fontWeight: 500,
  color: '#FFFFFF',
  background: 'var(--color-accent)',
  border: '1px solid var(--color-accent)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '7px 12px',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text-primary)',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
};

function ReadOnlyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <dt style={fieldLabelStyle}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 14, color: 'var(--color-text-primary)' }}>{children}</dd>
    </div>
  );
}

export function TaskDetailPanel({ task, onClose, onSaved }: TaskDetailPanelProps) {
  const idBase = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const [currentTask, setCurrentTask] = useState(task);
  const [draft, setDraft] = useState<Draft>(toDraft(task));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // When the board hands us a different task, reset. If it is the same task updated
  // elsewhere (for example moved on the board), keep any edits in progress.
  const [prevTask, setPrevTask] = useState(task);
  if (task !== prevTask) {
    setPrevTask(task);
    setCurrentTask(task);
    if (task.id !== prevTask.id) {
      setDraft(toDraft(task));
      setIsEditing(false);
      setSaveError(null);
    } else if (!isEditing) {
      setDraft(toDraft(task));
    }
  }

  // Focus: the Edit button when the panel opens or returns to view mode,
  // the title field when editing starts.
  useEffect(() => {
    if (isEditing) {
      titleRef.current?.focus();
    } else {
      editButtonRef.current?.focus();
    }
  }, [isEditing, task.id]);

  function close() {
    const taskId = currentTask.id;
    onClose();
    // Give focus back to the card that opened the panel.
    document.querySelector<HTMLElement>(`[data-task-id="${taskId}"]`)?.focus();
  }

  function startEditing() {
    setSaveError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraft(toDraft(currentTask));
    setSaveError(null);
    setIsEditing(false);
  }

  // Escape: cancel the edit if editing, otherwise close the panel. Works wherever
  // focus is, and steps aside when something else (like a card being moved) used the key.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || isSaving) return;
      if (isEditing) {
        cancelEditing();
      } else {
        close();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  async function saveChanges() {
    const title = draft.title.trim();
    if (!title) {
      setSaveError('A task needs a title.');
      titleRef.current?.focus();
      return;
    }

    const changes: Changes = {};
    if (title !== currentTask.title) changes.title = title;
    if (draft.description !== (currentTask.description ?? '')) changes.description = draft.description;
    if (draft.status !== currentTask.status) changes.status = draft.status;
    if (draft.priority !== currentTask.priority) changes.priority = draft.priority;
    const currentDue = currentTask.dueDate ? currentTask.dueDate.slice(0, 10) : '';
    if (draft.dueDate !== currentDue) changes.dueDate = draft.dueDate || null;

    if (Object.keys(changes).length === 0) {
      setIsEditing(false);
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    try {
      const saved = await updateTask({ taskId: currentTask.id, version: currentTask.version, ...changes });
      setCurrentTask(saved);
      onSaved(saved);
      setIsEditing(false);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setSaveError('This task was changed elsewhere. Close the panel and open it again to see the latest version.');
      } else {
        setSaveError('Could not save — please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveChanges();
  }

  if (!isEditing) {
    const priorityColor = PRIORITY_COLORS[currentTask.priority];
    return (
      <div role="dialog" aria-label={`Details for ${currentTask.title}`} style={panelStyle}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
          <button ref={editButtonRef} type="button" onClick={startEditing} style={primaryButtonStyle}>
            Edit task
          </button>
          <button type="button" onClick={close} style={secondaryButtonStyle}>
            Close
          </button>
        </div>

        <h2 style={{ margin: '0 0 var(--space-4)', fontSize: 16, fontWeight: 600, wordBreak: 'break-word' }}>
          {currentTask.title}
        </h2>

        <dl style={{ margin: 0 }}>
          <ReadOnlyField label="Status">{STATUS_LABELS[currentTask.status]}</ReadOnlyField>
          <ReadOnlyField label="Priority">
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
              {currentTask.priority}
            </span>
          </ReadOnlyField>
          <ReadOnlyField label="Due date">
            {currentTask.dueDate ? (
              formatDueDate(currentTask.dueDate)
            ) : (
              <span style={{ color: 'var(--color-text-secondary)' }}>No due date</span>
            )}
          </ReadOnlyField>
          <ReadOnlyField label="Description">
            {currentTask.description ? (
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{currentTask.description}</span>
            ) : (
              <span style={{ color: 'var(--color-text-secondary)' }}>No description</span>
            )}
          </ReadOnlyField>
        </dl>
      </div>
    );
  }

  return (
    <div role="dialog" aria-label={`Editing ${currentTask.title}`} style={panelStyle}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
          <button type="submit" disabled={isSaving} style={{ ...primaryButtonStyle, opacity: isSaving ? 0.6 : 1 }}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" onClick={cancelEditing} disabled={isSaving} style={secondaryButtonStyle}>
            Cancel
          </button>
        </div>

        {saveError && (
          <div
            role="alert"
            style={{
              fontSize: 13,
              color: 'var(--color-danger-text)',
              background: 'var(--color-danger-bg)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 'var(--space-4)',
            }}
          >
            {saveError}
          </div>
        )}

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label htmlFor={`${idBase}-title`} style={fieldLabelStyle}>Title</label>
          <input
            id={`${idBase}-title`}
            ref={titleRef}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label htmlFor={`${idBase}-status`} style={fieldLabelStyle}>Status</label>
          <select
            id={`${idBase}-status`}
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}
            style={inputStyle}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label htmlFor={`${idBase}-priority`} style={fieldLabelStyle}>Priority</label>
          <select
            id={`${idBase}-priority`}
            value={draft.priority}
            onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
            style={inputStyle}
          >
            {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as Priority[]).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label htmlFor={`${idBase}-due`} style={fieldLabelStyle}>Due date</label>
          <input
            id={`${idBase}-due`}
            type="date"
            value={draft.dueDate}
            onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor={`${idBase}-description`} style={fieldLabelStyle}>Description</label>
          <textarea
            id={`${idBase}-description`}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={6}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </form>
    </div>
  );
}