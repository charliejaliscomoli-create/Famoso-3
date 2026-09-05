import React, { useState, useEffect, useRef } from 'react';
import { FocusMode } from '../types';
import { Play, Pause, RotateCcw, Coffee, Zap, Moon, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';

interface FocusViewProps {
  onSessionCompleted: (minutes: number) => void;
  completedPomodorosToday: number;
  soundEnabled: boolean;
}

const MODES_CONFIG: Record<
  FocusMode,
  { label: string; duration: number; icon: React.ComponentType<{ className?: string }> }
> = {
  pomodoro: { label: 'Enfoque Profundo', duration: 25 * 60, icon: Zap },
  short_break: { label: 'Pausa Corta', duration: 5 * 60, icon: Coffee },
  long_break: { label: 'Pausa Larga', duration: 15 * 60, icon: Moon },
};

export const FocusView: React.FC<FocusViewProps> = ({
  onSessionCompleted,
  completedPomodorosToday,
  soundEnabled,
}) => {
  const [mode, setMode] = useState<FocusMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState<number>(MODES_CONFIG.pomodoro.duration);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  const currentDuration = MODES_CONFIG[mode].duration;
  const progressPercent = ((currentDuration - timeLeft) / currentDuration) * 100;

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            handleFinish();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  const handleFinish = () => {
    if (soundEnabled) {
      sounds.playTimerBell();
    }
    sounds.vibrate([100, 50, 100, 50, 200]);
    if (mode === 'pomodoro') {
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
      onSessionCompleted(Math.round(MODES_CONFIG.pomodoro.duration / 60));
      setMode('short_break');
      setTimeLeft(MODES_CONFIG.short_break.duration);
    } else {
      setMode('pomodoro');
      setTimeLeft(MODES_CONFIG.pomodoro.duration);
    }
  };

  const handleModeChange = (newMode: FocusMode) => {
    sounds.playClick();
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODES_CONFIG[newMode].duration);
  };

  const toggleRunning = () => {
    sounds.playClick();
    sounds.vibrate(30);
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    sounds.playClick();
    setIsRunning(false);
    setTimeLeft(MODES_CONFIG[mode].duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Temporizador de Enfoque</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              Técnica Pomodoro
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Bloques de concentración pura sin distracciones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sesiones hoy:</span>
            <span className="font-bold text-white">{completedPomodorosToday}</span>
          </div>
        </div>
      </div>

      {/* Main Focus Card */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/80 mb-6">
          {(['pomodoro', 'short_break', 'long_break'] as FocusMode[]).map((m) => {
            const config = MODES_CONFIG[m];
            const Icon = config.icon;
            const active = mode === m;
            return (
              <button
                key={m}
                id={`focus-tab-${m}`}
                type="button"
                onClick={() => handleModeChange(m)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Circular Progress Display */}
        <div className="relative w-64 h-64 flex items-center justify-center my-2">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 260 260">
            <circle
              cx="130"
              cy="130"
              r={radius}
              className="text-slate-800 stroke-current"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="130"
              cy="130"
              r={radius}
              className="text-indigo-500 stroke-current transition-all duration-500 ease-linear"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-extrabold tracking-tight text-white font-mono">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs font-medium text-slate-400 mt-2 uppercase tracking-wider">
              {isRunning ? 'En progreso' : 'En pausa'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-6">
          <button
            id="focus-reset-btn"
            type="button"
            onClick={handleReset}
            className="p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors active:scale-95"
            title="Reiniciar temporizador"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            id="focus-toggle-btn"
            type="button"
            onClick={toggleRunning}
            className={`px-8 py-4 rounded-2xl font-bold text-base flex items-center gap-2 text-white shadow-xl transition-all active:scale-95 ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/40'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current ml-0.5" />
                <span>Comenzar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
