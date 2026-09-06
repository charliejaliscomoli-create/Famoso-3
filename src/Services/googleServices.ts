export interface EmailMessage {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  unread: boolean;
  replied?: boolean;
  replyText?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // e.g. "10:00" or "2026-09-05T10:00:00"
  endTime: string;
  date: string; // "YYYY-MM-DD"
  description?: string;
  location?: string;
}

const GMAIL_STORAGE_KEY = 'famous_asistente_emails';
const CALENDAR_STORAGE_KEY = 'famous_asistente_calendar';

const TODAY_STR = new Date().toISOString().split('T')[0];

const INITIAL_EMAILS: EmailMessage[] = [
  {
    id: 'em-101',
    sender: 'Carlos Mendoza (Director de Operaciones)',
    senderEmail: 'cmendoza@empresa.com',
    subject: 'Confirmación de reporte de inventario',
    snippet: 'Hola, necesitamos validar las cifras del cierre de mes antes de las 5 PM...',
    body: 'Hola, necesitamos validar las cifras del cierre de mes antes de las 5 PM. Quedo atento a la confirmación de los datos actualizados.',
    date: 'Hace 15 min',
    unread: true,
  },
  {
    id: 'em-102',
    sender: 'Soporte Clientes VIP',
    senderEmail: 'vip@proveedores.com',
    subject: 'Cotización de insumos aprobada',
    snippet: 'Estimado, adjunto la orden de compra aprobada para la siguiente entrega...',
    body: 'Estimado, adjunto la orden de compra aprobada para la siguiente entrega del campo. Favor confirmar la recepción.',
    date: 'Hace 1 hora',
    unread: true,
  },
  {
    id: 'em-103',
    sender: 'Laura Gómez (Finanzas)',
    senderEmail: 'lgomez@empresa.com',
    subject: 'Recordatorio de facturas pendientes',
    snippet: 'Te recuerdo enviar los comprobantes fiscalizados para procesar el pago...',
    body: 'Te recuerdo enviar los comprobantes fiscalizados para procesar el pago del trimestre. Saludos.',
    date: 'Ayer',
    unread: false,
  },
];

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'cal-201',
    title: 'Reunión Estratégica Trimestral',
    startTime: '10:00',
    endTime: '11:00',
    date: TODAY_STR,
    description: 'Revisión de KPIs y planificación de objetivos ejecutivos.',
    location: 'Sala de Juntas B / Google Meet',
  },
  {
    id: 'cal-202',
    title: 'Llamada con Proveedor de Insumos',
    startTime: '15:30',
    endTime: '16:00',
    date: TODAY_STR,
    description: 'Ajuste de tiempos de logística e inventario.',
    location: 'Llamada Telefónica',
  },
  {
    id: 'cal-203',
    title: 'Revisión de Presupuesto y Finanzas',
    startTime: '17:00',
    endTime: '18:00',
    date: TODAY_STR,
    description: 'Análisis de costos operativos con equipo contable.',
    location: 'Oficina Principal',
  },
];

export const googleServices = {
  // --- GMAIL SERVICES ---
  getEmails(): EmailMessage[] {
    try {
      const raw = localStorage.getItem(GMAIL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : INITIAL_EMAILS;
    } catch {
      return INITIAL_EMAILS;
    }
  },

  saveEmails(emails: EmailMessage[]) {
    try {
      localStorage.setItem(GMAIL_STORAGE_KEY, JSON.stringify(emails));
      window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'emails' } }));
    } catch {}
  },

  checkUnreadEmails(maxResults: number = 5): EmailMessage[] {
    const all = googleServices.getEmails();
    const unread = all.filter((e) => e.unread);
    return unread.slice(0, maxResults);
  },

  replyToEmail(emailIdOrSenderOrSubject: string, replyBody: string): EmailMessage | null {
    const emails = googleServices.getEmails();
    const search = emailIdOrSenderOrSubject.toLowerCase().trim();

    let targetIndex = emails.findIndex(
      (e) =>
        e.id.toLowerCase() === search ||
        e.sender.toLowerCase().includes(search) ||
        e.subject.toLowerCase().includes(search)
    );

    if (targetIndex === -1 && emails.length > 0) {
      // Fallback to first unread email
      targetIndex = emails.findIndex((e) => e.unread);
    }

    if (targetIndex === -1 && emails.length > 0) {
      targetIndex = 0;
    }

    if (targetIndex === -1) return null;

    const updatedEmail: EmailMessage = {
      ...emails[targetIndex],
      unread: false,
      replied: true,
      replyText: replyBody,
    };

    emails[targetIndex] = updatedEmail;
    googleServices.saveEmails(emails);
    return updatedEmail;
  },

  // --- GOOGLE CALENDAR SERVICES ---
  getEvents(): CalendarEvent[] {
    try {
      const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
      return raw ? JSON.parse(raw) : INITIAL_EVENTS;
    } catch {
      return INITIAL_EVENTS;
    }
  },

  saveEvents(events: CalendarEvent[]) {
    try {
      localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
      window.dispatchEvent(new CustomEvent('famous-storage-sync', { detail: { entity: 'calendar' } }));
    } catch {}
  },

  getTodayAgenda(dateStr: string = TODAY_STR): CalendarEvent[] {
    const events = googleServices.getEvents();
    return events
      .filter((e) => e.date === dateStr || dateStr === 'today' || !e.date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  },

  createCalendarEvent(
    title: string,
    startTime: string = '12:00',
    durationMinutes: number = 30,
    description?: string
  ): CalendarEvent {
    const events = googleServices.getEvents();

    // Calculate end time
    let endStr = startTime;
    try {
      const [hours, mins] = startTime.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(mins)) {
        const totalMins = hours * 60 + mins + durationMinutes;
        const endH = Math.floor(totalMins / 60) % 24;
        const endM = totalMins % 60;
        endStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
      }
    } catch {
      endStr = startTime;
    }

    const newEvent: CalendarEvent = {
      id: 'cal-' + Date.now(),
      title: title.trim(),
      startTime: startTime.includes(':') ? startTime : '12:00',
      endTime: endStr,
      date: TODAY_STR,
      description: description?.trim() || 'Evento agendado con Asistente de Voz',
      location: 'Google Calendar / Oficina',
    };

    const updated = [...events, newEvent];
    googleServices.saveEvents(updated);
    return newEvent;
  },
};
