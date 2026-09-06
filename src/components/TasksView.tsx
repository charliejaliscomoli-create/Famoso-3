import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskPriority, TaskCategory } from '../types';
import { Plus, Check, Trash2, Calendar, Sparkles, X, RefreshCw, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';
import { TODAY_STR } from '../utils/storage';
import { googleTasksService, GoogleTaskItem } from '../Services/googleTasksService';
import { subscribeAuth, googleSignIn, logoutGoogle, getCurrentUser } from '../Services/authService';

interface TasksViewProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onToggleStatus: (id: string) => void;
  onDeleteTask: (id: string) => void;
  soundEnabled: boolean;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onAddTask,
  onToggleStatus,
  onDeleteTask,
  soundEnabled,
}) => {
  const [taskMode, setTaskMode] = useState<'app' | 'google'>('app');
  const [googleTasks, setGoogleTasks] = useState<GoogleTaskItem[]>([]);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [isRealGoogleApi, setIsRealGoogleApi] = useState<boolean>(false);
  const [user, setUser] = useState(getCurrentUser());
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiPlanModal, setShowAiPlanModal] = useState(false);
  const [aiGoal, setAiGoal] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<
    Array<{
      title: string;
      description?: string;
      priority: TaskPriority;
      category: TaskCategory;
    }>
  >([]);
  const [addedAiIndices, setAddedAiIndices] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('media');
  const [category, setCategory] = useState<TaskCategory>('Trabajo');
  const [dueDate, setDueDate] = useState<string>(TODAY_STR);

  // Delete confirmation for Google Task
  const [deleteTargetGTask, setDeleteTargetGTask] = useState<GoogleTaskItem | null>(null);

  useEffect(() => {
    return subscribeAuth((u) => setUser(u));
  }, []);

  const fetchGoogleTasks = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const res = await googleTasksService.getTasks();
      setGoogleTasks(res.tasks);
      setIsRealGoogleApi(res.isRealApi);
    } catch (err) {
      console.error('Error cargando Google Tasks:', err);
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleTasks();
    const handleSync = () => fetchGoogleTasks();
    window.addEventListener('famous-storage-sync', handleSync);
    return () => window.removeEventListener('famous-storage-sync', handleSync);
  }, [fetchGoogleTasks, user]);

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    try {
      await googleSignIn();
      await fetchGoogleTasks();
    } catch (err) {
      console.error('Error al conectar con Google:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const categories: (TaskCategory | 'todas')[] = [
    'todas',
    'Trabajo',
    'Finanzas',
    'Campo/Inventario',
    'General',
    'Estudio',
    'Personal',
    'Salud',
    'Proyectos',
  ];

  const handleToggle = (task: Task) => {
    sounds.vibrate(50);
    if (task.status !== 'completada') {
      if (soundEnabled) {
        sounds.playCompletionSound();
      }
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#6366f1', '#10b981', '#fbbf24'],
        });
      } catch {
        // Confetti fallback
      }
    } else {
      sounds.playClick();
    }
    onToggleStatus(task.id);
  };

  const handleToggleGoogleTask = async (gTask: GoogleTaskItem) => {
    sounds.vibrate(50);
    if (gTask.status !== 'completed' && soundEnabled) {
      sounds.playCompletionSound();
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#3b82f6', '#10b981', '#6366f1'],
        });
      } catch {}
    } else {
      sounds.playClick();
    }
    await googleTasksService.completeTask(gTask.id);
    await fetchGoogleTasks();
  };

  const confirmDeleteGoogleTask = async () => {
    if (!deleteTargetGTask) return;
    sounds.playClick();
    await googleTasksService.deleteTask(deleteTargetGTask.id);
    setDeleteTargetGTask(null);
    await fetchGoogleTasks();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (taskMode === 'google') {
      await googleTasksService.createTask(title.trim(), description.trim() || undefined, dueDate);
      await fetchGoogleTasks();
    } else {
      onAddTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        dueDate: dueDate || TODAY_STR,
        status: 'pendiente',
      });
    }

    sounds.playClick();
    setTitle('');
    setDescription('');
    setShowAddModal(false);
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesCategory = selectedCategory === 'todas' || task.category === selectedCategory;
    const matchesStatus =
      selectedStatus === 'todas' ||
      (selectedStatus === 'pendientes' && task.status !== 'completada') ||
      (selectedStatus === 'completadas' && task.status === 'completada');
    const matchesQuery =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesStatus && matchesQuery;
  });

  const priorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'alta':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Alta
          </span>
        );
      case 'media':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Media
          </span>
        );
      case 'baja':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Baja
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Switcher Header: App Tareas vs Google Tasks */}
      <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            onClick={() => setTaskMode('app')}
            className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              taskMode === 'app'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>Mis Tareas del Sistema</span>
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-950/80 text-indigo-200 text-[10px]">
              {tasks.filter((t) => t.status !== 'completada').length}
            </span>
          </button>

          <button
            onClick={() => setTaskMode('google')}
            className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              taskMode === 'google'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>Google Tasks</span>
              {isRealGoogleApi ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              )}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-blue-950/80 text-blue-200 text-[10px]">
              {googleTasks.filter((gt) => gt.status !== 'completed').length}
            </span>
          </button>
        </div>

        {taskMode === 'google' && (
          <div className="flex items-center gap-1 shrink-0 pr-1">
            {!user ? (
              <button
                onClick={handleGoogleAuth}
                disabled={authLoading}
                className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Conectar Google</span>
              </button>
            ) : (
              <button
                onClick={() => fetchGoogleTasks()}
                disabled={googleLoading}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 border border-slate-700"
                title="Sincronizar Google Tasks"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${googleLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>{taskMode === 'app' ? 'Tareas del Día' : 'Sincronización con Google Tasks'}</span>
            {taskMode === 'google' && isRealGoogleApi && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Google Tasks API
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {taskMode === 'app'
              ? 'Organiza tus prioridades diarias y mantén el ritmo de ejecución.'
              : 'Tus pendientes sincronizados directamente con la cuenta oficial de Google Tasks.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {taskMode === 'app' && (
            <button
              id="btn-open-ai-planner"
              type="button"
              onClick={() => {
                sounds.playClick();
                setShowAiPlanModal(true);
              }}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-indigo-500/30 text-indigo-300 hover:text-white text-sm font-semibold transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Desglosar con IA</span>
              <span className="sm:hidden">IA</span>
            </button>
          )}
          <button
            id="btn-open-add-task"
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowAddModal(true);
            }}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md active:scale-98 transition-all ${
              taskMode === 'google'
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{taskMode === 'google' ? 'Nueva Tarea Google' : 'Nueva Tarea'}</span>
          </button>
        </div>
      </div>

      {/* Render Google Tasks if mode === 'google' */}
      {taskMode === 'google' && (
        <div className="space-y-3">
          {googleLoading && googleTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
              Obteniendo pendientes desde Google Tasks...
            </div>
          ) : googleTasks.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-blue-500/60 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No hay tareas en Google Tasks</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Crea una nueva tarea o pídele al asistente de voz "Agrega una tarea en Google Tasks".
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {googleTasks.map((gt) => {
                const isCompleted = gt.status === 'completed';
                return (
                  <div
                    key={gt.id}
                    className={`group flex items-start justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                      isCompleted
                        ? 'bg-slate-900/30 border-slate-800/50 opacity-70'
                        : 'bg-slate-900/90 hover:bg-slate-900 border-blue-500/20 shadow-sm'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleGoogleTask(gt)}
                      className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border transition-all active:scale-90 flex-shrink-0 ${
                        isCompleted
                          ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-600/30'
                          : 'border-slate-700 bg-slate-950/60 hover:border-blue-500 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-sm font-medium leading-snug transition-all ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {gt.title}
                      </h3>
                      {gt.notes && (
                        <p
                          className={`text-xs mt-1 leading-relaxed ${
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-300'
                          }`}
                        >
                          {gt.notes}
                        </p>
                      )}
                      {gt.due && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 mt-1.5">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(gt.due).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetGTask(gt)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar de Google Tasks"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal for Google Task (MANDATORY per Workspace rules) */}
      {deleteTargetGTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-100">
                ¿Eliminar "{deleteTargetGTask.title}" de Google Tasks?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Esta acción eliminará la tarea de tu cuenta oficial de Google Tasks permanentemente.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTargetGTask(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteGoogleTask}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-red-600/20"
              >
                Sí, Eliminar de Google Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render App Tasks if mode === 'app' */}
      {taskMode === 'app' && (
        <>

      {/* Filter and search bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            id="task-search-input"
            type="text"
            placeholder="Buscar tareas por título o nota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-900/70 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <select
            id="task-status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="todas">Todas</option>
            <option value="pendientes">Pendientes</option>
            <option value="completadas">Completadas</option>
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              id={`cat-filter-${cat}`}
              type="button"
              onClick={() => {
                sounds.playClick();
                setSelectedCategory(cat);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-900/50 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {cat === 'todas' ? 'Todas las categorías' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">No hay tareas que coincidan</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {searchQuery
              ? 'Prueba modificando los filtros de búsqueda.'
              : 'Agrega una nueva tarea o dile al Asistente de Voz que la cree por ti.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completada';
            return (
              <div
                key={task.id}
                id={`task-item-${task.id}`}
                className={`group flex items-start justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-slate-900/30 border-slate-800/50 opacity-70'
                    : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800/90 shadow-sm'
                }`}
              >
                {/* Checkbox */}
                <button
                  id={`toggle-task-${task.id}`}
                  type="button"
                  onClick={() => handleToggle(task)}
                  className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border transition-all active:scale-90 flex-shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm shadow-emerald-600/30'
                      : 'border-slate-700 bg-slate-950/60 hover:border-indigo-500 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3
                      className={`text-sm font-medium leading-snug transition-all ${
                        isCompleted ? 'line-through text-slate-400' : 'text-slate-100'
                      }`}
                    >
                      {task.title}
                    </h3>
                  </div>
                  {task.description && (
                    <p
                      className={`text-xs mb-2 leading-relaxed ${
                        isCompleted ? 'line-through text-slate-400' : 'text-slate-300'
                      }`}
                    >
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                    {priorityBadge(task.priority)}
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[11px]">
                      {task.category}
                    </span>
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{task.dueDate}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  <button
                    id={`delete-task-${task.id}`}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onDeleteTask(task.id);
                    }}
                    title="Eliminar tarea"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Desglose con IA */}
      {showAiPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-indigo-500/40 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Desglosar Proyecto con IA</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiPlanModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Ingresa una meta o proyecto y se generarán las tareas clave para ejecutarlo paso a paso.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!aiGoal.trim() || aiLoading) return;
                sounds.playClick();
                setAiLoading(true);
                setAiGeneratedTasks([]);
                setAddedAiIndices([]);
                try {
                  // Generación local rápida o llamada
                  const suggested = [
                    {
                      title: `Definir alcance de ${aiGoal.trim()}`,
                      description: 'Listar requerimientos y primeros pasos clave.',
                      priority: 'alta' as TaskPriority,
                      category: 'General' as TaskCategory,
                    },
                    {
                      title: `Organizar recursos para ${aiGoal.trim()}`,
                      description: 'Reunir herramientas, contactos e insumos necesarios.',
                      priority: 'media' as TaskPriority,
                      category: 'Finanzas' as TaskCategory,
                    },
                    {
                      title: `Ejecutar fase 1 de ${aiGoal.trim()}`,
                      description: 'Completar el primer hito accionable.',
                      priority: 'alta' as TaskPriority,
                      category: 'Trabajo' as TaskCategory,
                    },
                  ];
                  setAiGeneratedTasks(suggested);
                } finally {
                  setAiLoading(false);
                }
              }}
              className="space-y-3"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: Preparar presentación trimestral, Organizar inventario..."
                  value={aiGoal}
                  onChange={(e) => setAiGoal(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiGoal.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiLoading ? 'Generando...' : 'Generar'}</span>
                </button>
              </div>
            </form>

            {aiGeneratedTasks.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                  <span>Tareas sugeridas ({aiGeneratedTasks.length}):</span>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playCompletionSound();
                      aiGeneratedTasks.forEach((t, i) => {
                        if (!addedAiIndices.includes(i)) {
                          onAddTask({
                            title: t.title,
                            description: t.description,
                            priority: t.priority,
                            category: t.category,
                            dueDate: TODAY_STR,
                            status: 'pendiente',
                          });
                        }
                      });
                      setAddedAiIndices(aiGeneratedTasks.map((_, i) => i));
                    }}
                    disabled={addedAiIndices.length === aiGeneratedTasks.length}
                    className="text-indigo-400 hover:text-indigo-300 disabled:opacity-50 font-semibold"
                  >
                    + Agregar todas
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {aiGeneratedTasks.map((t, idx) => {
                    const isAdded = addedAiIndices.includes(idx);
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-2 ${
                          isAdded
                            ? 'bg-slate-950/40 border-slate-800 opacity-60'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                t.priority === 'alta'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : t.priority === 'media'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {t.priority}
                            </span>
                            <span className="text-[10px] text-slate-400">{t.category}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-200">{t.title}</p>
                          {t.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{t.description}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            sounds.vibrate(30);
                            onAddTask({
                              title: t.title,
                              description: t.description,
                              priority: t.priority,
                              category: t.category,
                              dueDate: TODAY_STR,
                              status: 'pendiente',
                            });
                            setAddedAiIndices((prev) => [...prev, idx]);
                          }}
                          disabled={isAdded}
                          className={`p-1.5 rounded-lg text-xs transition-colors shrink-0 ${
                            isAdded
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300'
                          }`}
                        >
                          {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nueva Tarea */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Nueva Tarea</h3>
              <button
                id="btn-close-add-modal"
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Título de la tarea <span className="text-rose-400">*</span>
                </label>
                <input
                  id="task-title-input"
                  type="text"
                  required
                  placeholder="Ej: Preparar presentación trimestral"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descripción o notas breves
                </label>
                <textarea
                  id="task-desc-input"
                  rows={2}
                  placeholder="Detalles, enlaces o subtareas..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Prioridad</label>
                  <select
                    id="task-priority-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="alta">🔴 Alta</option>
                    <option value="media">🟡 Media</option>
                    <option value="baja">🟢 Baja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Categoría</label>
                  <select
                    id="task-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="General">General</option>
                    <option value="Finanzas">Finanzas</option>
                    <option value="Campo/Inventario">Campo/Inventario</option>
                    <option value="Trabajo">Trabajo</option>
                    <option value="Estudio">Estudio</option>
                    <option value="Personal">Personal</option>
                    <option value="Salud">Salud</option>
                    <option value="Proyectos">Proyectos</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Fecha límite</label>
                <input
                  id="task-duedate-input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-new-task"
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-colors"
                >
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
