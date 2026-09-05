import React from 'react';
import { Task, Habit } from '../types';
import { Target, Clock, Zap, CheckCircle2, Flame, Award } from 'lucide-react';
import { TODAY_STR } from '../utils/storage';

interface MetricsViewProps {
  tasks: Task[];
  habits: Habit[];
  focusMinutesToday: number;
  completedPomodorosToday: number;
  productivityScore: number;
}

export const MetricsView: React.FC<MetricsViewProps> = ({
  tasks,
  habits,
  focusMinutesToday,
  completedPomodorosToday,
  productivityScore,
}) => {
  const completedTasksCount = tasks.filter((t) => t.status === 'completada').length;
  const totalTasksCount = tasks.length;
  const tasksPercent =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const completedHabitsToday = habits.filter((h) => h.completedDates.includes(TODAY_STR)).length;
  const totalHabits = habits.length;
  const habitsPercent =
    totalHabits > 0 ? Math.round((completedHabitsToday / totalHabits) * 100) : 0;

  const focusTargetMinutes = 60; // 1 hour target
  const focusPercent = Math.min(100, Math.round((focusMinutesToday / focusTargetMinutes) * 100));

  const stats = [
    {
      title: 'Tareas Completadas',
      value: `${completedTasksCount}/${totalTasksCount}`,
      percent: tasksPercent,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      subtext: `${tasksPercent}% de avance diario`,
    },
    {
      title: 'Hábitos Hoy',
      value: `${completedHabitsToday}/${totalHabits}`,
      percent: habitsPercent,
      icon: Flame,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      subtext: `${habitsPercent}% completados`,
    },
    {
      title: 'Tiempo de Enfoque',
      value: `${focusMinutesToday} min`,
      percent: focusPercent,
      icon: Clock,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      subtext: `Meta: ${focusTargetMinutes} min diarios`,
    },
    {
      title: 'Pomodoros Ganados',
      value: `${completedPomodorosToday}`,
      percent: Math.min(100, (completedPomodorosToday / 4) * 100),
      icon: Zap,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      subtext: `${completedPomodorosToday} bloques intensos`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/20 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs font-semibold text-indigo-300 mb-2">
              <Award className="w-3.5 h-3.5" />
              <span>Índice de Eficiencia Diaria</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Puntaje de Rendimiento
            </h2>
            <p className="text-xs text-slate-300 max-w-sm mt-1 leading-relaxed">
              Calculado combinando tus tareas concluidas, hábitos realizados y tiempo de
              concentración sin distracciones.
            </p>
          </div>

          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-slate-950/80 border-4 border-indigo-500/30 flex flex-col items-center justify-center p-2 shadow-inner">
              <span className="text-3xl font-black text-white font-mono">
                {productivityScore}%
              </span>
              <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                {productivityScore >= 80
                  ? 'Sobresaliente'
                  : productivityScore >= 50
                  ? 'Buen Ritmo'
                  : 'Comenzando'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 4 key performance metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl bg-slate-900/80 border ${s.borderColor} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">{s.title}</span>
                <div className={`p-2 rounded-xl ${s.bgColor}`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <div className="mt-1">
                <div className="text-xl font-bold text-white tracking-tight">{s.value}</div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-indigo-500`}
                    style={{ width: `${s.percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>{s.subtext}</span>
                  <span className="font-semibold text-slate-300">{s.percent}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Productivity Tips banner */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 flex-shrink-0 mt-0.5">
          <Target className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-white">Consejo de Productividad de Famous</h4>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Utiliza comandos de voz con Famous Asistente para vaciar tu cabeza rápidamente cuando
            surja una idea o tarea imprevista, sin romper tu flujo de enfoque actual.
          </p>
        </div>
      </div>
    </div>
  );
};
