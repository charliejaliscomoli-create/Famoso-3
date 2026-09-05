import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface PWAInstallBannerProps {
  canInstall: boolean;
  onInstall: () => void;
  isInstalled: boolean;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  canInstall,
  onInstall,
  isInstalled,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border-b border-indigo-500/20 px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
              <span>Instala Famous Asistente en tu Android o PC</span>
              <span className="hidden sm:inline text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                Offline PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Acceso rápido desde pantalla de inicio, sin barra de navegación y funciona offline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canInstall ? (
            <button
              id="banner-install-btn"
              type="button"
              onClick={onInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 hidden md:inline">
              (Añadir a pantalla de inicio desde menú)
            </span>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
            title="Cerrar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
