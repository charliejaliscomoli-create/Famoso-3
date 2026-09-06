import { LocalNotifications } from '@capacitor/local-notifications';
import { sounds } from './audio';

export interface ScheduledTimer {
  id: number;
  title: string;
  seconds: number;
  scheduledTime: number; // timestamp
  fireTime: number; // timestamp
  status: 'active' | 'fired' | 'cancelled';
}

const TIMER_STORAGE_KEY = 'famous_asistente_timers';

export const notificationService = {
  getTimers(): ScheduledTimer[] {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async scheduleTimer(title: string, seconds: number): Promise<ScheduledTimer> {
    const id = Math.floor(Math.random() * 100000);
    const now = Date.now();
    const fireTime = now + seconds * 1000;

    const timerObj: ScheduledTimer = {
      id,
      title: title.trim() || 'Temporizador',
      seconds,
      scheduledTime: now,
      fireTime,
      status: 'active',
    };

    // Save timer to localStorage
    const activeTimers = notificationService.getTimers();
    activeTimers.unshift(timerObj);
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(activeTimers));

    // Try Capacitor Local Notifications first
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: '⏰ Alarma Famous Asistente',
            body: title,
            schedule: { at: new Date(fireTime) },
            sound: 'beep.wav',
            actionTypeId: '',
            extra: null,
          },
        ],
      });
    } catch (e) {
      console.warn('Capacitor Local Notifications fallback web:', e);
    }

    // Web Notification permission request
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
      try {
        Notification.requestPermission();
      } catch {}
    }

    // JS Timer Fallback for immediate browser notification and sound
    setTimeout(() => {
      sounds.playTimerBell();
      sounds.vibrate([200, 100, 200, 100, 300]);

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('⏰ Famous Asistente: ' + title, {
          body: `¡El temporizador de ${seconds} segundos ha finalizado!`,
          icon: '/favicon.ico',
        });
      }

      // Update status
      const current = notificationService.getTimers();
      const updated = current.map((t) => (t.id === id ? { ...t, status: 'fired' as const } : t));
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'timers' } }));
    }, seconds * 1000);

    window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'timers' } }));
    return timerObj;
  },
};
