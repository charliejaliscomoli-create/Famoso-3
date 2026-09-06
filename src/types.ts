export type TaskPriority = 'alta' | 'media' | 'baja';

export type TaskCategory =
  | 'Trabajo'
  | 'Estudio'
  | 'Personal'
  | 'Salud'
  | 'Proyectos'
  | 'General'
  | 'Finanzas'
  | 'Campo/Inventario'
  | string;

export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  completed?: boolean;
}

export interface Habit {
  id: string;
  name: string;
  category: string;
  streak: number;
  completedDates: string[];
  color: string;
  targetPerWeek: number;
}

export type FocusMode = 'pomodoro' | 'short_break' | 'long_break';

export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  category: string;
  updatedAt: string;
  createdAt?: string;
  color: string;
}

export type NavTab = 'tareas' | 'habitos' | 'enfoque' | 'notas' | 'asistente' | 'contactos' | 'metricas';
