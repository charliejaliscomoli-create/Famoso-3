import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Mail,
  FileSpreadsheet,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
  LogIn,
  X,
  ExternalLink,
  Clock,
  UserCheck,
} from 'lucide-react';
import { googleCalendarService, CalendarEvent } from '../Services/googleCalendarService';
import { gmailService, GmailMessage } from '../Services/gmailService';
import { googleFormsService, FormItem } from '../Services/googleFormsService';
import { googleChatService, ChatSpace, ChatMessage } from '../Services/googleChatService';
import { googleSignIn, getCurrentUser, subscribeAuth } from '../Services/authService';
import { sounds } from '../utils/audio';

type WorkspaceSubTab = 'calendar' | 'gmail' | 'forms' | 'chat';

export const WorkspaceView: React.FC = () => {
  const [subTab, setSubTab] = useState<WorkspaceSubTab>('calendar');
  const [user, setUser] = useState(getCurrentUser());
  const [authLoading, setAuthLoading] = useState(false);

  // Calendar State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [deleteEventTarget, setDeleteEventTarget] = useState<CalendarEvent | null>(null);

  // Gmail State
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [confirmSendEmail, setConfirmSendEmail] = useState(false);

  // Forms State
  const [forms, setForms] = useState<FormItem[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [showAddFormModal, setShowAddFormModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');

  // Chat State
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>('spaces/general');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [confirmSendChat, setConfirmSendChat] = useState(false);

  const [isRealApi, setIsRealApi] = useState(false);

  useEffect(() => {
    const unsub = subscribeAuth((u) => {
      setUser(u);
    });
    return unsub;
  }, []);

  // Fetch data depending on active subTab
  useEffect(() => {
    loadTabData();
  }, [subTab, user]);

  const loadTabData = async () => {
    if (subTab === 'calendar') {
      setCalendarLoading(true);
      const res = await googleCalendarService.getEvents();
      setEvents(res.events);
      setIsRealApi(res.isRealApi);
      setCalendarLoading(false);
    } else if (subTab === 'gmail') {
      setGmailLoading(true);
      const res = await gmailService.getUnreadEmails();
      setEmails(res.messages);
      setIsRealApi(res.isRealApi);
      setGmailLoading(false);
    } else if (subTab === 'forms') {
      setFormsLoading(true);
      const res = await googleFormsService.getForms();
      setForms(res.forms);
      setIsRealApi(res.isRealApi);
      setFormsLoading(false);
    } else if (subTab === 'chat') {
      setChatLoading(true);
      const resSpaces = await googleChatService.getSpaces();
      setSpaces(resSpaces.spaces);
      setIsRealApi(resSpaces.isRealApi);

      const targetSpace = resSpaces.spaces[0]?.name || 'spaces/general';
      setSelectedSpace(targetSpace);
      const resMsgs = await googleChatService.getMessages(targetSpace);
      setChatMessages(resMsgs.messages);
      setChatLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    try {
      await googleSignIn();
      loadTabData();
    } catch (err) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Calendar handlers
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventStart || !eventEnd) return;
    sounds.playClick();
    const res = await googleCalendarService.createEvent({
      summary: eventTitle,
      description: eventDesc,
      startDateTime: eventStart,
      endDateTime: eventEnd,
    });
    setEvents((prev) => [res.event, ...prev]);
    setShowAddEventModal(false);
    setEventTitle('');
    setEventDesc('');
    setEventStart('');
    setEventEnd('');
  };

  const confirmDeleteEvent = async () => {
    if (!deleteEventTarget) return;
    sounds.playClick();
    await googleCalendarService.deleteEvent(deleteEventTarget.id);
    setEvents((prev) => prev.filter((e) => e.id !== deleteEventTarget.id));
    setDeleteEventTarget(null);
  };

  // Gmail handlers
  const handleSendEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo || !emailSubject || !emailBody) return;
    setConfirmSendEmail(true); // Open mandatory confirmation
  };

  const executeSendEmail = async () => {
    sounds.playClick();
    const res = await gmailService.sendEmail({
      to: emailTo,
      subject: emailSubject,
      body: emailBody,
    });
    if (res.success) {
      setConfirmSendEmail(false);
      setShowSendEmailModal(false);
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
      loadTabData();
    }
  };

  // Forms handlers
  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) return;
    sounds.playClick();
    const res = await googleFormsService.createForm(formTitle);
    setForms((prev) => [res.form, ...prev]);
    setShowAddFormModal(false);
    setFormTitle('');
  };

  // Chat handlers
  const handleSpaceSelect = async (spaceName: string) => {
    setSelectedSpace(spaceName);
    setChatLoading(true);
    const res = await googleChatService.getMessages(spaceName);
    setChatMessages(res.messages);
    setChatLoading(false);
  };

  const handleSendChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setConfirmSendChat(true); // Open mandatory confirmation
  };

  const executeSendChat = async () => {
    sounds.playClick();
    const res = await googleChatService.sendMessage(selectedSpace, chatInput);
    setChatMessages((prev) => [...prev, res.message]);
    setChatInput('');
    setConfirmSendChat(false);
  };

  return (
    <div className="space-y-4">
      {/* Workspace Hub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Google Workspace Hub</h2>
            {isRealApi ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                API Oficial
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertCircle className="w-3 h-3" />
                Modo Simulación
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Acceso directo a Google Calendar, Gmail, Google Forms y Google Chat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!user ? (
            <button
              onClick={handleGoogleAuth}
              disabled={authLoading}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-600/30 transition"
            >
              <LogIn className="w-4 h-4" />
              <span>Conectar Google Account</span>
            </button>
          ) : (
            <button
              onClick={loadTabData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Sincronizar servicio"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setSubTab('calendar')}
          className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
            subTab === 'calendar'
              ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendar</span>
        </button>

        <button
          onClick={() => setSubTab('gmail')}
          className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
            subTab === 'gmail'
              ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Gmail</span>
        </button>

        <button
          onClick={() => setSubTab('forms')}
          className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
            subTab === 'forms'
              ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/30'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Forms</span>
        </button>

        <button
          onClick={() => setSubTab('chat')}
          className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
            subTab === 'chat'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </button>
      </div>

      {/* SUBTAB 1: CALENDAR */}
      {subTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Próximos Compromisos</h3>
            <button
              onClick={() => setShowAddEventModal(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Evento</span>
            </button>
          </div>

          {calendarLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
              Obteniendo agenda de Google Calendar...
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
              No hay eventos próximos agendados.
            </div>
          ) : (
            <div className="space-y-2.5">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-3 hover:border-blue-500/30 transition"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">{evt.summary}</h4>
                    {evt.description && <p className="text-xs text-slate-400">{evt.description}</p>}
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-blue-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {evt.start.dateTime ? new Date(evt.start.dateTime).toLocaleString() : 'Todo el día'}
                      </span>
                      {evt.location && <span>📍 {evt.location}</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => setDeleteEventTarget(evt)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Eliminar de Google Calendar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: GMAIL */}
      {subTab === 'gmail' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Bandeja de Entrada</h3>
            <button
              onClick={() => setShowSendEmailModal(true)}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-red-600/20"
            >
              <Send className="w-4 h-4" />
              <span>Redactar Correo</span>
            </button>
          </div>

          {gmailLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-400" />
              Consultando Gmail...
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
              No tienes correos pendientes no leídos.
            </div>
          ) : (
            <div className="space-y-2.5">
              {emails.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1.5 hover:border-red-500/30 transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{msg.from}</span>
                    <span className="text-slate-500 text-[11px]">{msg.date}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{msg.subject}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{msg.snippet}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: FORMS */}
      {subTab === 'forms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Formularios y Encuestas</h3>
            <button
              onClick={() => setShowAddFormModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-purple-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Formulario</span>
            </button>
          </div>

          {formsLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
              Obteniendo formularios de Google Forms...
            </div>
          ) : forms.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
              No hay formularios creados aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {forms.map((f) => (
                <div key={f.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">{f.title}</h4>
                    <p className="text-xs text-purple-400">
                      {f.responsesCount || 0} respuestas recibidas
                    </p>
                  </div>
                  {f.responderUri && (
                    <a
                      href={f.responderUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                    >
                      <span>Ver Formulario</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: CHAT */}
      {subTab === 'chat' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Spaces List */}
            <div className="w-full sm:w-1/3 bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Espacios Chat</h4>
              <div className="space-y-1">
                {spaces.map((sp) => (
                  <button
                    key={sp.name}
                    onClick={() => handleSpaceSelect(sp.name)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition ${
                      selectedSpace === sp.name
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    #{sp.displayName}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Thread */}
            <div className="w-full sm:w-2/3 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[380px]">
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {chatLoading ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    Cargando conversación...
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">Sin mensajes en este canal.</div>
                ) : (
                  chatMessages.map((m) => (
                    <div key={m.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-emerald-400">{m.senderName}</span>
                        <span className="text-slate-500">{m.createTime}</span>
                      </div>
                      <p className="text-xs text-slate-200">{m.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendChatSubmit} className="pt-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe un mensaje para Google Chat..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODALS WITH MANDATORY WORKSPACE CONFIRMATION */}

      {/* Create Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Nuevo Evento de Google Calendar</h3>
              <button onClick={() => setShowAddEventModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Título del Evento *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Ej. Reunión de Estrategia"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Descripción</label>
                <textarea
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Detalles de la sesión..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Inicio *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fin *</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl">
                  Agendar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      {deleteEventTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">¿Eliminar evento "{deleteEventTarget.summary}"?</h3>
            <p className="text-xs text-slate-400">Esta acción eliminará la reunión de Google Calendar permanentemente.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteEventTarget(null)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl">
                Cancelar
              </button>
              <button onClick={confirmDeleteEvent} className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl">
                Sí, Eliminar Evento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal & Confirmation */}
      {showSendEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Redactar Correo con Gmail</h3>
              <button onClick={() => setShowSendEmailModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {!confirmSendEmail ? (
              <form onSubmit={handleSendEmailSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Para (Email) *</label>
                  <input
                    type="email"
                    required
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="destinatario@ejemplo.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Asunto *</label>
                  <input
                    type="text"
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Asunto del mensaje..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Cuerpo del Correo *</label>
                  <textarea
                    required
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Mensaje..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowSendEmailModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl">
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl">
                    Continuar a Envío
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
                  <p className="font-bold mb-1">Confirmar envío de correo:</p>
                  <p><strong>Para:</strong> {emailTo}</p>
                  <p><strong>Asunto:</strong> {emailSubject}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setConfirmSendEmail(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl">
                    Editar
                  </button>
                  <button onClick={executeSendEmail} className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-600/30">
                    Sí, Enviar Correo Oficial
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showAddFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Nuevo Formulario de Google Forms</h3>
              <button onClick={() => setShowAddFormModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateForm} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Título del Formulario *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej. Encuesta de Evaluación"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddFormModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl">
                  Crear Formulario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Send Chat Message Modal */}
      {confirmSendChat && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">¿Enviar mensaje a Google Chat?</h3>
            <p className="text-xs text-slate-400">Mensaje: "{chatInput}"</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirmSendChat(false)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl">
                Cancelar
              </button>
              <button onClick={executeSendChat} className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl">
                Sí, Publicar Mensaje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
