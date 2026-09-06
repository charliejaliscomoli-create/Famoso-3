import { getAccessToken } from './authService';

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
  completed?: string;
  selfLink?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

const LOCAL_TASKS_KEY = 'famous_google_tasks_fallback';

const INITIAL_GOOGLE_TASKS: GoogleTaskItem[] = [
  {
    id: 'gtask-1',
    title: 'Revisar reporte financiero mensual',
    notes: 'Sincronizar con el departamento de contabilidad.',
    status: 'needsAction',
    due: new Date().toISOString(),
  },
  {
    id: 'gtask-2',
    title: 'Confirmar entrega de insumos con proveedor',
    notes: 'Verificar factura y guía de remisión.',
    status: 'needsAction',
  },
  {
    id: 'gtask-3',
    title: 'Enviar resumen de reunión ejecutiva',
    notes: 'Archivar copia en Google Drive.',
    status: 'completed',
  },
];

export const googleTasksService = {
  // Fetch real Google Tasks or fallback
  async getTasks(listId: string = '@default'): Promise<{ tasks: GoogleTaskItem[]; isRealApi: boolean }> {
    const token = await getAccessToken();

    if (token) {
      try {
        const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&showHidden=true`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          const items: GoogleTaskItem[] = (data.items || []).map((t: any) => ({
            id: t.id,
            title: t.title || '(Sin título)',
            notes: t.notes || '',
            status: t.status === 'completed' ? 'completed' : 'needsAction',
            due: t.due,
            updated: t.updated,
            completed: t.completed,
          }));
          return { tasks: items, isRealApi: true };
        }
      } catch (err) {
        console.warn('Error al obtener tareas de Google Tasks API:', err);
      }
    }

    // Fallback to local storage
    try {
      const raw = localStorage.getItem(LOCAL_TASKS_KEY);
      const items = raw ? JSON.parse(raw) : INITIAL_GOOGLE_TASKS;
      return { tasks: items, isRealApi: false };
    } catch {
      return { tasks: INITIAL_GOOGLE_TASKS, isRealApi: false };
    }
  },

  // Create a new task in Google Tasks
  async createTask(
    title: string,
    notes?: string,
    due?: string,
    listId: string = '@default'
  ): Promise<{ task: GoogleTaskItem; isRealApi: boolean }> {
    const token = await getAccessToken();

    if (token) {
      try {
        const bodyData: any = {
          title: title.trim(),
          notes: notes?.trim() || '',
        };
        if (due) {
          bodyData.due = new Date(due).toISOString();
        }

        const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyData),
        });

        if (res.ok) {
          const t = await res.json();
          const newTask: GoogleTaskItem = {
            id: t.id,
            title: t.title,
            notes: t.notes || '',
            status: t.status === 'completed' ? 'completed' : 'needsAction',
            due: t.due,
            updated: t.updated,
          };
          window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'gtasks' } }));
          return { task: newTask, isRealApi: true };
        }
      } catch (err) {
        console.warn('Error creando tarea en Google Tasks API:', err);
      }
    }

    // Local fallback creation
    const { tasks } = await googleTasksService.getTasks();
    const newTask: GoogleTaskItem = {
      id: 'gtask-' + Date.now(),
      title: title.trim(),
      notes: notes?.trim() || '',
      status: 'needsAction',
      due: due || new Date().toISOString(),
    };

    const updated = [newTask, ...tasks];
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'gtasks' } }));
    return { task: newTask, isRealApi: false };
  },

  // Toggle/Complete a task in Google Tasks
  async completeTask(
    taskIdOrTitle: string,
    listId: string = '@default'
  ): Promise<{ task: GoogleTaskItem | null; isRealApi: boolean }> {
    const token = await getAccessToken();
    const { tasks } = await googleTasksService.getTasks(listId);

    const search = taskIdOrTitle.toLowerCase().trim();
    let target = tasks.find(
      (t) => t.id.toLowerCase() === search || t.title.toLowerCase().includes(search)
    );

    if (!target && tasks.length > 0) {
      target = tasks.find((t) => t.status === 'needsAction');
    }

    if (!target) return { task: null, isRealApi: false };

    const newStatus = target.status === 'completed' ? 'needsAction' : 'completed';

    if (token && !target.id.startsWith('gtask-')) {
      try {
        const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${target.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        });

        if (res.ok) {
          const t = await res.json();
          const updatedTask: GoogleTaskItem = {
            id: t.id,
            title: t.title,
            notes: t.notes || '',
            status: t.status === 'completed' ? 'completed' : 'needsAction',
            due: t.due,
            updated: t.updated,
          };
          window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'gtasks' } }));
          return { task: updatedTask, isRealApi: true };
        }
      } catch (err) {
        console.warn('Error completando tarea en Google Tasks API:', err);
      }
    }

    // Fallback local update
    const updated = tasks.map((t) => (t.id === target!.id ? { ...t, status: newStatus } : t));
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'gtasks' } }));
    return { task: { ...target, status: newStatus }, isRealApi: false };
  },

  // Delete a task in Google Tasks (with user confirmation in UI)
  async deleteTask(
    taskId: string,
    listId: string = '@default'
  ): Promise<boolean> {
    const token = await getAccessToken();

    if (token && !taskId.startsWith('gtask-')) {
      try {
        const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok || res.status === 204) {
          window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'gtasks' } }));
          return true;
        }
      } catch (err) {
        console.warn('Error eliminando tarea en Google Tasks API:', err);
      }
    }

    // Fallback local delete
    const { tasks } = await googleTasksService.getTasks();
    const updated = tasks.filter((t) => t.id !== taskId);
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'gtasks' } }));
    return true;
  },
};
