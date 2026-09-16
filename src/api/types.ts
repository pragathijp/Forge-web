export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  position: number;
  version: number;
  dueDate: string | null;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  REVIEW: 'Review',
  DONE: 'Done',
};

export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string }> = {
  LOW: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
  MEDIUM: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)' },
  HIGH: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)' },
  URGENT: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
};