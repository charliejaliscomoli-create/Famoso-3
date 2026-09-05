import React, { useState } from 'react';
import { Task, TaskPriority, TaskCategory } from '../types';
import { Plus, Check, Trash2, Calendar, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';
import { TODAY_STR } from '../utils/storage';

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      category,
      dueDate: dueDate || TODAY_STR,
      status: 'pendiente',
    });
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
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Tareas del Día</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-indigo-500/20">
              {tasks.filter((t) => t.status !== 'completada').length} pendientes
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organiza tus prioridades diarias y mantén el ritmo de ejecución.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            id="btn-open-add-task"
            type="button"
            onClick={() => {
              sounds.playClick();
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

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
    </div>
  );
};
