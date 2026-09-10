import React from 'react';
import { CheckSquare, Flame, Timer, StickyNote, BarChart3, Bot, Users, Globe } from 'lucide-react';
import { sounds } from '../utils/audio';
import { NavTab } from '../types';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingTasksCount: number;
  habitsDueTodayCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  pendingTasksCount,
  habitsDueTodayCount,
}) => {
  const tabs = [
    {
      id: 'asistente' as NavTab,
      label: 'Asistente IA',
      icon: Bot,
      badge: null,
    },
    {
      id: 'tareas' as NavTab,
      label: 'Tareas',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : null,
    },
    {
      id: 'workspace' as NavTab,
      label: 'Workspace',
      icon: Globe,
      badge: null,
    },
    {
      id: 'contactos' as NavTab,
      label: 'Contactos',
      icon: Users,
      badge: null,
    },
    {
      id: 'habitos' as NavTab,
      label: 'Hábitos',
      icon: Flame,
      badge: habitsDueTodayCount > 0 ? habitsDueTodayCount : null,
    },
    {
      id: 'enfoque' as NavTab,
      label: 'Enfoque',
      icon: Timer,
      badge: null,
    },
    {
      id: 'notas' as NavTab,
      label: 'Notas',
      icon: StickyNote,
      badge: null,
    },
    {
      id: 'metricas' as NavTab,
      label: 'Métricas',
      icon: BarChart3,
      badge: null,
    },
  ];

  const handleSelect = (tab: NavTab) => {
    sounds.playClick();
    sounds.vibrate(30);
    onTabChange(tab);
  };

  return (
    <>
      {/* Desktop Navigation Tabs */}
      <nav className="hidden md:block max-w-5xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`desktop-nav-${tab.id}`}
                type="button"
                onClick={() => handleSelect(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span
                    className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Android / Mobile Bottom Bar (Sticky with safe padding) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 pb-[env(safe-area-inset-bottom)] px-2 pt-1.5">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`mobile-nav-${tab.id}`}
                type="button"
                onClick={() => handleSelect(tab.id)}
                className="relative flex flex-col items-center justify-center py-2 px-3 min-w-[56px] min-h-[48px] rounded-xl transition-transform active:scale-95"
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-indigo-400 stroke-[2.4]' : 'text-slate-400'
                    }`}
                  />
                  {tab.badge !== null && (
                    <span className="absolute -top-1 -right-2 bg-indigo-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-slate-950">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 tracking-tight font-medium ${
                    isActive ? 'text-indigo-300' : 'text-slate-400'
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
