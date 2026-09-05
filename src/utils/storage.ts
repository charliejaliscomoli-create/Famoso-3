import { Task, Habit, Note, TaskPriority, TaskStatus } from '../types';

export const TODAY_STR = new Date().toISOString().split('T')[0];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't-1',
    title: 'Definir objetivos de la semana',
    description: 'Priorizar proyectos clave y establecer hitos de productividad.',
    priority: 'alta',
    status: 'en_progreso',
    category: 'Trabajo',
    dueDate: TODAY_STR,
    createdAt: TODAY_STR,
    completed: false,
  },
  {
    id: 't-2',
    title: 'Sesión de enfoque Pomodoro (50 min)',
    description: 'Avanzar en el entregable principal sin interrupciones ni redes.',
    priority: 'alta',
    status: 'pendiente',
    category: 'Estudio',
    dueDate: TODAY_STR,
    createdAt: TODAY_STR,
    completed: false,
  },
  {
    id: 't-3',
    title: 'Revisión y contestación de correos',
    description: 'Procesar bandeja de entrada a Inbox Cero.',
    priority: 'media',
    status: 'pendiente',
    category: 'Trabajo',
    dueDate: TODAY_STR,
    createdAt: TODAY_STR,
    completed: false,
  },
  {
    id: 't-4',
    title: '30 minutos de lectura o ejercicio',
    description: 'Caminar al aire libre o avanzar 1 capítulo del libro.',
    priority: 'baja',
    status: 'completada',
    category: 'Salud',
    dueDate: TODAY_STR,
    createdAt: TODAY_STR,
    completedAt: TODAY_STR,
    completed: true,
  },
];

export const INITIAL_HABITS: Habit[] = [
  {
    id: 'h-1',
    name: 'Beber 2L de agua',
    category: 'Salud',
    streak: 5,
    completedDates: [TODAY_STR],
    color: '#06b6d4',
    targetPerWeek: 7,
  },
  {
    id: 'h-2',
    name: 'Meditación matutina (10 min)',
    category: 'Bienestar',
    streak: 3,
    completedDates: [],
    color: '#8b5cf6',
    targetPerWeek: 5,
  },
  {
    id: 'h-3',
    name: 'Planificación diaria nocturna',
    category: 'Productividad',
    streak: 12,
    completedDates: [TODAY_STR],
    color: '#10b981',
    targetPerWeek: 7,
  },
  {
    id: 'h-4',
    name: 'Lectura de 20 páginas',
    category: 'Aprendizaje',
    streak: 4,
    completedDates: [],
    color: '#f59e0b',
    targetPerWeek: 6,
  },
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 'n-1',
    title: 'Regla 80/20 (Principio de Pareto)',
    content:
      'El 80% de tus resultados provienen del 20% de tus esfuerzos enfocados. Identifica tus tareas de alto impacto temprano en el día.',
    pinned: true,
    category: 'Estrategia',
    updatedAt: TODAY_STR,
    color: '#6366f1',
  },
  {
    id: 'n-2',
    title: 'Ideas para proyectos del trimestre',
    content:
      '1. Automatización de reportes semanales\n2. Optimización del flujo de trabajo diario\n3. Implementación de bloques de descanso activo',
    pinned: false,
    category: 'Proyectos',
    updatedAt: TODAY_STR,
    color: '#0ea5e9',
  },
];

// Claves maestras para el localStorage
export const TASKS_KEY = 'famous_asistente_tasks';
export const NOTES_KEY = 'famous_asistente_notes';
export const HABITS_KEY = 'famous_asistente_habits';

export function getStoredData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setStoredData<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota might be exceeded
  }
}

function notifyStorageChange(entityType: 'tasks' | 'notes' | 'habits') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('famous-storage-sync', { detail: { entity: entityType } })
    );
  }
}

export const storage = {
  // --- GESTIÓN DE TAREAS ---
  getTasks: (): Task[] => {
    return getStoredData<Task[]>(TASKS_KEY, INITIAL_TASKS);
  },

  getPendingTasks: (category?: string): Task[] => {
    const tasks = storage.getTasks();
    return tasks.filter((t) => {
      const isPending = t.status !== 'completada' && !t.completed;
      if (!isPending) return false;
      if (category && category.trim() !== '' && category.toLowerCase() !== 'todas') {
        return t.category.toLowerCase().includes(category.toLowerCase().trim());
      }
      return true;
    });
  },

  addTask: (taskData: {
    title: string;
    category?: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
  }): Task => {
    const tasks = storage.getTasks();
    const newTask: Task = {
      id: 't-' + Date.now(),
      title: taskData.title.trim(),
      description: taskData.description?.trim() || undefined,
      priority: taskData.priority || 'media',
      status: 'pendiente',
      completed: false,
      category: taskData.category ? taskData.category.trim() : 'General',
      dueDate: taskData.dueDate || TODAY_STR,
      createdAt: TODAY_STR,
    };
    const updated = [newTask, ...tasks];
    setStoredData(TASKS_KEY, updated);
    notifyStorageChange('tasks');
    return newTask;
  },

  completeTask: (taskTitleOrId: string): Task | null => {
    const tasks = storage.getTasks();
    const search = taskTitleOrId.trim().toLowerCase();

    // 1. Buscar por id exacto
    let targetIndex = tasks.findIndex(
      (t) => t.id.toLowerCase() === search && t.status !== 'completada'
    );

    // 2. Si no se encuentra, buscar por título exacto (no completada)
    if (targetIndex === -1) {
      targetIndex = tasks.findIndex(
        (t) => t.title.toLowerCase() === search && t.status !== 'completada'
      );
    }

    // 3. Si no, buscar por coincidencia parcial de título (no completada)
    if (targetIndex === -1) {
      targetIndex = tasks.findIndex(
        (t) => t.title.toLowerCase().includes(search) && t.status !== 'completada'
      );
    }

    // 4. Fallback si el usuario no especificó si ya estaba completada
    if (targetIndex === -1) {
      targetIndex = tasks.findIndex((t) => t.title.toLowerCase().includes(search));
    }

    if (targetIndex === -1) {
      return null;
    }

    const updatedTask: Task = {
      ...tasks[targetIndex],
      status: 'completada',
      completed: true,
      completedAt: TODAY_STR,
    };

    tasks[targetIndex] = updatedTask;
    setStoredData(TASKS_KEY, tasks);
    notifyStorageChange('tasks');
    return updatedTask;
  },

  toggleTask: (id: string): Task[] => {
    const tasks = storage.getTasks().map((task): Task => {
      if (task.id === id) {
        const nextStatus: TaskStatus = task.status === 'completada' ? 'pendiente' : 'completada';
        return {
          ...task,
          status: nextStatus,
          completed: nextStatus === 'completada',
          completedAt: nextStatus === 'completada' ? TODAY_STR : undefined,
        };
      }
      return task;
    });
    setStoredData(TASKS_KEY, tasks);
    notifyStorageChange('tasks');
    return tasks;
  },

  deleteTask: (id: string): Task[] => {
    const tasks = storage.getTasks().filter((task) => task.id !== id);
    setStoredData(TASKS_KEY, tasks);
    notifyStorageChange('tasks');
    return tasks;
  },

  // --- GESTIÓN DE NOTAS ---
  getNotes: (): Note[] => {
    return getStoredData<Note[]>(NOTES_KEY, INITIAL_NOTES);
  },

  addNote: (noteData: {
    content: string;
    title?: string;
    category?: string;
    color?: string;
  }): Note => {
    const notes = storage.getNotes();
    const contentTrimmed = noteData.content.trim();
    // Generar un título automático conciso si no viene provisto
    const autoTitle =
      noteData.title?.trim() ||
      (contentTrimmed.length > 28
        ? contentTrimmed.substring(0, 28) + '...'
        : contentTrimmed) ||
      'Nota rápida';

    const newNote: Note = {
      id: 'n-' + Date.now(),
      title: autoTitle,
      content: contentTrimmed,
      pinned: false,
      category: noteData.category?.trim() || 'General',
      updatedAt: TODAY_STR,
      createdAt: TODAY_STR,
      color: noteData.color || '#6366f1',
    };
    const updated = [newNote, ...notes];
    setStoredData(NOTES_KEY, updated);
    notifyStorageChange('notes');
    return newNote;
  },

  deleteNote: (id: string): Note[] => {
    const notes = storage.getNotes().filter((note) => note.id !== id);
    setStoredData(NOTES_KEY, notes);
    notifyStorageChange('notes');
    return notes;
  },

  // --- GESTIÓN DE HÁBITOS ---
  getHabits: (): Habit[] => {
    return getStoredData<Habit[]>(HABITS_KEY, INITIAL_HABITS);
  },
};
