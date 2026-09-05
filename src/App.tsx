import React, { useState, useEffect } from 'react';
import { Task, Habit, Note, NavTab } from './types';
import {
  INITIAL_TASKS,
  INITIAL_HABITS,
  INITIAL_NOTES,
  TODAY_STR,
  TASKS_KEY,
  HABITS_KEY,
  NOTES_KEY,
  getStoredData,
  setStoredData,
} from './utils/storage';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { TasksView } from './components/TasksView';
import { HabitsView } from './components/HabitsView';
import { FocusView } from './components/FocusView';
import { NotesView } from './components/NotesView';
import { AIAssistantView } from './components/AIAssistantView';
import { MetricsView } from './components/MetricsView';
import { PWAInstallBanner } from './components/PWAInstallBanner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('asistente'); // Default to AI Assistant or tareas
  const [tasks, setTasks] = useState<Task[]>(() =>
    getStoredData<Task[]>(TASKS_KEY, INITIAL_TASKS)
  );
  const [habits, setHabits] = useState<Habit[]>(() =>
    getStoredData<Habit[]>(HABITS_KEY, INITIAL_HABITS)
  );
  const [notes, setNotes] = useState<Note[]>(() =>
    getStoredData<Note[]>(NOTES_KEY, INITIAL_NOTES)
  );
  const [focusMinutesToday, setFocusMinutesToday] = useState<number>(() =>
    getStoredData<number>('famous_asistente_focus_mins_' + TODAY_STR, 50)
  );
  const [completedPomodorosToday, setCompletedPomodorosToday] = useState<number>(() =>
    getStoredData<number>('famous_asistente_pomodoros_' + TODAY_STR, 2)
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    getStoredData<boolean>('famous_asistente_sound', true)
  );

  // Escuchar sincronización de eventos de storage disparados por el asistente de voz
  useEffect(() => {
    const handleSync = () => {
      setTasks(getStoredData<Task[]>(TASKS_KEY, INITIAL_TASKS));
      setNotes(getStoredData<Note[]>(NOTES_KEY, INITIAL_NOTES));
      setHabits(getStoredData<Habit[]>(HABITS_KEY, INITIAL_HABITS));
    };

    window.addEventListener('famous-storage-sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('famous-storage-sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // PWA install prompt handling
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone
    ) {
      setIsPwaInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstallPwa(true);
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setCanInstallPwa(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsPwaInstalled(true);
      }
      setDeferredPrompt(null);
      setCanInstallPwa(false);
    } catch {
      // User cancelled or browser rejected
    }
  };

  // Sync to local storage
  useEffect(() => {
    setStoredData(TASKS_KEY, tasks);
  }, [tasks]);

  useEffect(() => {
    setStoredData(HABITS_KEY, habits);
  }, [habits]);

  useEffect(() => {
    setStoredData(NOTES_KEY, notes);
  }, [notes]);

  useEffect(() => {
    setStoredData('famous_asistente_focus_mins_' + TODAY_STR, focusMinutesToday);
  }, [focusMinutesToday]);

  useEffect(() => {
    setStoredData('famous_asistente_pomodoros_' + TODAY_STR, completedPomodorosToday);
  }, [completedPomodorosToday]);

  useEffect(() => {
    setStoredData('famous_asistente_sound', soundEnabled);
  }, [soundEnabled]);

  // Tasks actions
  const handleAddTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: 't-' + Date.now(),
      createdAt: TODAY_STR,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleToggleTaskStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextStatus = t.status === 'completada' ? 'pendiente' : 'completada';
          return {
            ...t,
            status: nextStatus,
            completed: nextStatus === 'completada',
            completedAt: nextStatus === 'completada' ? TODAY_STR : undefined,
          };
        }
        return t;
      })
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Habits actions
  const handleAddHabit = (habitData: Omit<Habit, 'id' | 'streak' | 'completedDates'>) => {
    const newHabit: Habit = {
      ...habitData,
      id: 'h-' + Date.now(),
      streak: 0,
      completedDates: [],
    };
    setHabits((prev) => [...prev, newHabit]);
  };

  const handleToggleHabitDay = (habitId: string, dateStr: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === habitId) {
          const already = h.completedDates.includes(dateStr);
          const newDates = already
            ? h.completedDates.filter((d) => d !== dateStr)
            : [...h.completedDates, dateStr];

          let streak = 0;
          const checkDate = new Date();
          while (true) {
            const str = checkDate.toISOString().split('T')[0];
            if (newDates.includes(str)) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
          return {
            ...h,
            completedDates: newDates,
            streak,
          };
        }
        return h;
      })
    );
  };

  const handleDeleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  // Focus actions
  const handleFocusSessionCompleted = (minutes: number) => {
    setFocusMinutesToday((prev) => prev + minutes);
    if (minutes >= 20) {
      setCompletedPomodorosToday((prev) => prev + 1);
    }
  };

  // Notes actions
  const handleAddNote = (noteData: Omit<Note, 'id' | 'updatedAt'>) => {
    const newNote: Note = {
      ...noteData,
      id: 'n-' + Date.now(),
      updatedAt: TODAY_STR,
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleToggleNotePin = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Productivity Score Calculation
  const completedTasks = tasks.filter((t) => t.status === 'completada').length;
  const taskRate = tasks.length > 0 ? (completedTasks / tasks.length) * 40 : 20;
  const habitsDoneToday = habits.filter((h) => h.completedDates.includes(TODAY_STR)).length;
  const habitRate = habits.length > 0 ? (habitsDoneToday / habits.length) * 40 : 20;
  const focusTarget = 60;
  const focusRate = Math.min(20, (focusMinutesToday / focusTarget) * 20);
  const productivityScore = Math.min(100, Math.round(taskRate + habitRate + focusRate));

  const pendingTasksCount = tasks.filter((t) => t.status !== 'completada').length;
  const habitsDueTodayCount = habits.filter((h) => !h.completedDates.includes(TODAY_STR)).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-600 selection:text-white">
      {/* PWA Install Banner */}
      <PWAInstallBanner
        canInstall={canInstallPwa}
        onInstall={handleInstallPwa}
        isInstalled={isPwaInstalled}
      />

      {/* Main App Header */}
      <Header
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        canInstallPwa={canInstallPwa}
        onInstallPwa={handleInstallPwa}
        isPwaInstalled={isPwaInstalled}
        productivityScore={productivityScore}
      />

      {/* Main Responsive Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-12">
        {activeTab === 'asistente' && (
          <AIAssistantView
            tasks={tasks}
            habits={habits}
            notes={notes}
            focusMinutesToday={focusMinutesToday}
            onAddTask={handleAddTask}
            onAddHabit={handleAddHabit}
            onAddNote={handleAddNote}
          />
        )}
        {activeTab === 'tareas' && (
          <TasksView
            tasks={tasks}
            onAddTask={handleAddTask}
            onToggleStatus={handleToggleTaskStatus}
            onDeleteTask={handleDeleteTask}
            soundEnabled={soundEnabled}
          />
        )}
        {activeTab === 'habitos' && (
          <HabitsView
            habits={habits}
            onAddHabit={handleAddHabit}
            onToggleHabitDay={handleToggleHabitDay}
            onDeleteHabit={handleDeleteHabit}
            soundEnabled={soundEnabled}
          />
        )}
        {activeTab === 'enfoque' && (
          <FocusView
            onSessionCompleted={handleFocusSessionCompleted}
            completedPomodorosToday={completedPomodorosToday}
            soundEnabled={soundEnabled}
          />
        )}
        {activeTab === 'notas' && (
          <NotesView
            notes={notes}
            onAddNote={handleAddNote}
            onTogglePin={handleToggleNotePin}
            onDeleteNote={handleDeleteNote}
          />
        )}
        {activeTab === 'metricas' && (
          <MetricsView
            tasks={tasks}
            habits={habits}
            focusMinutesToday={focusMinutesToday}
            completedPomodorosToday={completedPomodorosToday}
            productivityScore={productivityScore}
          />
        )}
      </main>

      {/* Bottom Floating Navigation (Mobile & Desktop Accessible) */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        pendingTasksCount={pendingTasksCount}
        habitsDueTodayCount={habitsDueTodayCount}
      />
    </div>
  );
}
