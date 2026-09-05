import React, { useState } from 'react';
import { Habit } from '../types';
import { Plus, Flame, Check, Trash2, Trophy, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';
import { TODAY_STR } from '../utils/storage';

interface HabitsViewProps {
  habits: Habit[];
  onAddHabit: (habit: Omit<Habit, 'id' | 'streak' | 'completedDates'>) => void;
  onToggleHabitDay: (habitId: string, dateStr: string) => void;
  onDeleteHabit: (id: string) => void;
  soundEnabled: boolean;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  habits,
  onAddHabit,
  onToggleHabitDay,
  onDeleteHabit,
  soundEnabled,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Salud');
  const [color, setColor] = useState('#6366f1');
  const [targetPerWeek, setTargetPerWeek] = useState(7);

  // Generate last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'narrow' }).format(d).toUpperCase();
    const dayNum = d.getDate();
    const isToday = dateStr === TODAY_STR;
    return { dateStr, dayName, dayNum, isToday };
  });

  const handleToggle = (habit: Habit, dateStr: string) => {
    const wasCompleted = habit.completedDates.includes(dateStr);
    sounds.vibrate(40);
    if (!wasCompleted) {
      if (soundEnabled) {
        sounds.playCompletionSound();
      }
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.8 },
          colors: [habit.color, '#fbbf24', '#ffffff'],
        });
      } catch {
        // Fallback
      }
    } else {
      sounds.playClick();
    }
    onToggleHabitDay(habit.id, dateStr);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddHabit({
      name: name.trim(),
      category,
      color,
      targetPerWeek,
    });
    sounds.playClick();
    setName('');
    setShowAddModal(false);
  };

  const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Rastreador de Hábitos</span>
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              Constancia
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Crea pequeñas rutinas automáticas que impulsen tus grandes metas.
          </p>
        </div>
        <button
          id="btn-open-add-habit"
          type="button"
          onClick={() => {
            sounds.playClick();
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Hábito</span>
        </button>
      </div>

      {/* Habits List */}
      {habits.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800">
          <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">No hay hábitos registrados aún</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Crea tu primer hábito como hidratarte, leer o meditar para empezar tu racha.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            return (
              <div
                key={habit.id}
                id={`habit-card-${habit.id}`}
                className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/90 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: habit.color }}
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">
                        {habit.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>{habit.category}</span>
                        <span>•</span>
                        <span>Meta: {habit.targetPerWeek} días/sem</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-semibold text-amber-400">
                      <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
                      <span>{habit.streak} d</span>
                    </div>
                    <button
                      id={`delete-habit-${habit.id}`}
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        onDeleteHabit(habit.id);
                      }}
                      title="Eliminar hábito"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 7-Day Progress Bar */}
                <div className="grid grid-cols-7 gap-1.5 pt-2 border-t border-slate-800/60">
                  {last7Days.map((day) => {
                    const done = habit.completedDates.includes(day.dateStr);
                    return (
                      <button
                        key={day.dateStr}
                        id={`habit-${habit.id}-day-${day.dateStr}`}
                        type="button"
                        onClick={() => handleToggle(habit, day.dateStr)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${
                          day.isToday ? 'ring-1 ring-indigo-500/40 bg-indigo-500/5' : ''
                        } ${
                          done
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-950/50 text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'
                        }`}
                      >
                        <span className="text-[10px] font-medium opacity-70 mb-1">
                          {day.dayName}
                        </span>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-transform ${
                            done ? 'text-white' : 'text-slate-400'
                          }`}
                          style={{
                            backgroundColor: done ? habit.color : 'transparent',
                          }}
                        >
                          {done ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : day.dayNum}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nuevo Hábito */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Nuevo Hábito Positivo</h3>
              <button
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
                  Nombre del hábito <span className="text-rose-400">*</span>
                </label>
                <input
                  id="habit-name-input"
                  type="text"
                  required
                  placeholder="Ej: Caminata de 20 min"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Categoría</label>
                  <select
                    id="habit-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Salud">Salud</option>
                    <option value="Bienestar">Bienestar</option>
                    <option value="Productividad">Productividad</option>
                    <option value="Aprendizaje">Aprendizaje</option>
                    <option value="Finanzas">Finanzas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Meta semanal
                  </label>
                  <select
                    id="habit-target-select"
                    value={targetPerWeek}
                    onChange={(e) => setTargetPerWeek(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={7}>7 días (Diario)</option>
                    <option value={5}>5 días (L-V)</option>
                    <option value={4}>4 días / semana</option>
                    <option value={3}>3 días / semana</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Color distintivo
                </label>
                <div className="flex items-center gap-2 pt-1">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        color === c
                          ? 'scale-115 ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
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
                  id="btn-save-new-habit"
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-colors"
                >
                  Guardar Hábito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
