import { api } from './client';
import type { Task, TaskStatus, Priority, Project } from './types';

export async function fetchTasks(projectId?: string): Promise<Task[]> {
  const res = await api.get<Task[]>('/tasks', { params: projectId ? { projectId } : {} });
  return res.data;
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await api.get<Project[]>('/projects');
  return res.data;
}

export async function createTask(projectId: string, title: string): Promise<Task> {
  const res = await api.post<Task>('/tasks', { projectId, title });
  return res.data;
}

interface MoveTaskParams {
  taskId: string;
  version: number;
  status?: TaskStatus;
  insertAfterTaskId: string | null;
}

export async function moveTask({ taskId, version, status, insertAfterTaskId }: MoveTaskParams): Promise<Task> {
  const res = await api.patch<Task>(`/tasks/${taskId}`, {
    version,
    ...(status ? { status } : {}),
    insertAfterTaskId,
  });
  return res.data;
}

interface UpdateTaskParams {
  taskId: string;
  version: number;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
}

export async function updateTask({ taskId, ...changes }: UpdateTaskParams): Promise<Task> {
  const res = await api.patch<Task>(`/tasks/${taskId}`, changes);
  return res.data;
}