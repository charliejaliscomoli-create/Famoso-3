import { getAccessToken } from './authService';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

const LOCAL_CALENDAR_KEY = 'famous_google_calendar_fallback_v1';

const getLocalEvents = (): CalendarEvent[] => {
  try {
    const raw = localStorage.getItem(LOCAL_CALENDAR_KEY);
    return raw ? JSON.parse(raw) : [
      {
        id: 'cal-1',
        summary: 'Reunión de Estrategia Trimestral',
        description: 'Revisión de KPIs y planes operativos con el equipo directivo.',
        location: 'Sala de Juntas B / Google Meet',
        start: { dateTime: new Date(Date.now() + 3600000 * 2).toISOString() },
        end: { dateTime: new Date(Date.now() + 3600000 * 3).toISOString() },
      },
      {
        id: 'cal-2',
        summary: 'Revisión de Presupuesto y Finanzas',
        description: 'Aprobación de gastos para la nueva campaña.',
        location: 'Oficina Principal',
        start: { dateTime: new Date(Date.now() + 3600000 * 24).toISOString() },
        end: { dateTime: new Date(Date.now() + 3600000 * 25).toISOString() },
      }
    ];
  } catch {
    return [];
  }
};

const setLocalEvents = (events: CalendarEvent[]) => {
  try {
    localStorage.setItem(LOCAL_CALENDAR_KEY, JSON.stringify(events));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
};

export const googleCalendarService = {
  async getEvents(timeMin?: string, maxResults: number = 20): Promise<{ events: CalendarEvent[]; isRealApi: boolean }> {
    const token = await getAccessToken();
    if (!token) {
      return { events: getLocalEvents(), isRealApi: false };
    }

    try {
      const minDate = timeMin || new Date().toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
        minDate
      )}&maxResults=${maxResults}&orderBy=startTime&singleEvents=true`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Google Calendar API Error ${res.status}`);
      const data = await res.json();
      const items: CalendarEvent[] = (data.items || []).map((item: any) => ({
        id: item.id,
        summary: item.summary || '(Sin título)',
        description: item.description,
        location: item.location,
        start: item.start || {},
        end: item.end || {},
        htmlLink: item.htmlLink,
      }));

      setLocalEvents(items);
      return { events: items, isRealApi: true };
    } catch (err) {
      console.warn('Error fetching Google Calendar events, using fallback:', err);
      return { events: getLocalEvents(), isRealApi: false };
    }
  },

  async createEvent(eventData: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
  }): Promise<{ event: CalendarEvent; isRealApi: boolean }> {
    const token = await getAccessToken();
    const payload = {
      summary: eventData.summary,
      description: eventData.description || '',
      location: eventData.location || '',
      start: { dateTime: new Date(eventData.startDateTime).toISOString() },
      end: { dateTime: new Date(eventData.endDateTime).toISOString() },
    };

    if (token) {
      try {
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const item = await res.json();
          const newEvent: CalendarEvent = {
            id: item.id,
            summary: item.summary,
            description: item.description,
            location: item.location,
            start: item.start,
            end: item.end,
            htmlLink: item.htmlLink,
          };
          const current = getLocalEvents();
          setLocalEvents([newEvent, ...current]);
          return { event: newEvent, isRealApi: true };
        }
      } catch (err) {
        console.warn('Error creating Google Calendar event via API:', err);
      }
    }

    const fallbackEvent: CalendarEvent = {
      id: 'cal-' + Date.now(),
      summary: eventData.summary,
      description: eventData.description,
      location: eventData.location,
      start: { dateTime: new Date(eventData.startDateTime).toISOString() },
      end: { dateTime: new Date(eventData.endDateTime).toISOString() },
    };
    const current = getLocalEvents();
    setLocalEvents([fallbackEvent, ...current]);
    return { event: fallbackEvent, isRealApi: false };
  },

  async deleteEvent(eventId: string): Promise<{ success: boolean; isRealApi: boolean }> {
    const token = await getAccessToken();
    if (token) {
      try {
        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok || res.status === 204) {
          const current = getLocalEvents().filter((e) => e.id !== eventId);
          setLocalEvents(current);
          return { success: true, isRealApi: true };
        }
      } catch (err) {
        console.warn('Error deleting Google Calendar event via API:', err);
      }
    }

    const current = getLocalEvents().filter((e) => e.id !== eventId);
    setLocalEvents(current);
    return { success: true, isRealApi: false };
  },
};
