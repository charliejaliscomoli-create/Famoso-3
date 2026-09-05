import React from 'react';
import { Sparkles, Download, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { sounds } from '../utils/audio';

interface HeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
  isPwaInstalled: boolean;
  productivityScore: number;
}

export const Header: React.FC<HeaderProps> = ({
  soundEnabled,
  onToggleSound,
  canInstallPwa,
  onInstallPwa,
  isPwaInstalled,
  productivityScore,
}) => {
  const todayFormatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const capitalizedDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Brand info */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-amber-500 p-0.5 shadow-md shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-white leading-none">
                Famous Asistente
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{capitalizedDate}</p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Daily Productivity pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/60 text-xs text-slate-300">
            <span className="text-slate-400">Rendimiento:</span>
            <span className="font-semibold text-emerald-400">{productivityScore}%</span>
          </div>

          {/* Sound toggle */}
          <button
            id="header-toggle-sound-btn"
            type="button"
            onClick={() => {
              sounds.playClick();
              onToggleSound();
            }}
            title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:text-white transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* PWA Install Button */}
          {canInstallPwa && !isPwaInstalled && (
            <button
              id="header-install-pwa-btn"
              type="button"
              onClick={onInstallPwa}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Instalar App</span>
            </button>
          )}

          {isPwaInstalled && (
            <div className="hidden md:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Instalada</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
