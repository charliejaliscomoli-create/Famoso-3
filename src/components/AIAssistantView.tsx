import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Send,
  VolumeX,
  Sparkles,
  CheckCircle,
  Clock,
  FileText,
  Check,
  Mail,
  Calendar,
  BellRing,
  Reply,
  PlusCircle,
} from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { processUserCommand } from '../Services/aiServices';
import { storage } from '../utils/storage';
import { googleServices, EmailMessage, CalendarEvent } from '../Services/googleServices';
import { notificationService, ScheduledTimer } from '../utils/notificationService';
import { Task, Note, Habit } from '../types';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  actionType?:
    | 'createTask'
    | 'addNote'
    | 'completeTask'
    | 'getPendingTasks'
    | 'setNativeTimer'
    | 'checkUnreadEmails'
    | 'replyToEmail'
    | 'getTodayAgenda'
    | 'createCalendarEvent'
    | 'info';
  cardData?: {
    emails?: EmailMessage[];
    events?: CalendarEvent[];
    timer?: ScheduledTimer;
    tasks?: Task[];
  };
  timestamp: string;
}

interface AIAssistantViewProps {
  tasks?: Task[];
  habits?: Habit[];
  notes?: Note[];
  focusMinutesToday?: number;
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onAddHabit?: (habit: Omit<Habit, 'id' | 'streak' | 'completedDates'>) => void;
  onAddNote?: (note: Omit<Note, 'id' | 'updatedAt'>) => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  onAddTask,
  onAddNote,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: '¡Hola! Soy Famous Asistente, tu mano derecha administrativa. Puedes darme órdenes por voz como "Revisar correos no leídos", "Consultar agenda de hoy", "Poner temporizador de 10 segundos", "Crear tarea" o "Agendar reunión".',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopListeningRef = useRef<() => void>(() => {});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Sync listener for storage changes
  useEffect(() => {
    const handleSync = () => {
      // triggers re-render if needed
    };
    window.addEventListener('famous-storage-sync', handleSync);
    return () => window.removeEventListener('famous-storage-sync', handleSync);
  }, []);

  // Centralized command processor
  const handleExecuteCommand = async (command: string) => {
    const cleanCommand = command.trim();
    if (!cleanCommand) return;

    try {
      stopListeningRef.current();
    } catch {
      // ignore
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text: cleanCommand,
        timestamp: timeStr,
      },
    ]);

    setIsProcessing(true);

    try {
      const response = await processUserCommand(cleanCommand);

      if (response?.toolCall) {
        const { name, args } = response.toolCall;
        let replyText = '';
        let actionType: Message['actionType'] = 'info';
        let cardData: Message['cardData'] = undefined;

        // 1. TAREAS: createTask
        if (name === 'createTask') {
          actionType = 'createTask';
          const title = String(args.title || 'Nueva tarea').trim();
          const category = args.category ? String(args.category).trim() : 'General';

          const newTask = storage.addTask({
            title,
            category,
          });

          if (onAddTask) {
            onAddTask({
              title: newTask.title,
              category: newTask.category,
              priority: newTask.priority,
              status: newTask.status,
              dueDate: newTask.dueDate,
            });
          }

          replyText = `Tarea "${title}" agregada en ${category}.`;
        }
        // 2. NOTAS: addNote
        else if (name === 'addNote') {
          actionType = 'addNote';
          const content = String(args.content || '').trim();
          const title = args.title ? String(args.title).trim() : undefined;

          const newNote = storage.addNote({
            content,
            title,
          });

          if (onAddNote) {
            onAddNote({
              title: newNote.title,
              content: newNote.content,
              category: newNote.category,
              pinned: newNote.pinned,
              color: newNote.color,
            });
          }

          replyText = `Nota guardada: "${newNote.title}".`;
        }
        // 3. TAREAS: completeTask
        else if (name === 'completeTask') {
          actionType = 'completeTask';
          const target = String(args.taskTitleOrId || args.title || '').trim();
          const completedTask = storage.completeTask(target);

          if (completedTask) {
            replyText = `Tarea "${completedTask.title}" marcada como completada.`;
          } else {
            replyText = `No encontré tareas pendientes que coincidan con "${target}".`;
          }
        }
        // 4. TAREAS: getPendingTasks
        else if (name === 'getPendingTasks') {
          actionType = 'getPendingTasks';
          const filterCategory = args.category ? String(args.category).trim() : undefined;
          const pending = storage.getPendingTasks(filterCategory);

          cardData = { tasks: pending };

          if (pending.length === 0) {
            replyText = filterCategory
              ? `No tienes tareas pendientes en ${filterCategory}.`
              : 'No tienes tareas pendientes en este momento.';
          } else if (pending.length === 1) {
            replyText = `Tienes 1 tarea pendiente: ${pending[0].title}.`;
          } else {
            const preview = pending
              .slice(0, 3)
              .map((t) => t.title)
              .join(', ');
            replyText = `Tienes ${pending.length} tareas pendientes: ${preview}.`;
          }
        }
        // 5. TEMPORIZADOR NATIVO: setNativeTimer (Capacitor)
        else if (name === 'setNativeTimer') {
          actionType = 'setNativeTimer';
          const title = String(args.title || 'Temporizador').trim();
          let seconds = Number(args.seconds) || 0;
          if (!seconds && args.minutes) {
            seconds = Number(args.minutes) * 60;
          }
          if (seconds <= 0) seconds = 10; // default 10 seconds for test

          const scheduledTimer = await notificationService.scheduleTimer(title, seconds);
          cardData = { timer: scheduledTimer };

          const timeLabel = seconds >= 60 ? `${Math.round(seconds / 60)} minuto(s)` : `${seconds} segundos`;
          replyText = `Temporizador de ${timeLabel} para "${title}" activado en tu dispositivo.`;
        }
        // 6. GMAIL: checkUnreadEmails
        else if (name === 'checkUnreadEmails') {
          actionType = 'checkUnreadEmails';
          const max = Number(args.maxResults) || 5;
          const unreadList = googleServices.checkUnreadEmails(max);
          cardData = { emails: unreadList };

          if (unreadList.length === 0) {
            replyText = 'Bandeja al día. No tienes correos no leídos en Gmail.';
          } else if (unreadList.length === 1) {
            replyText = `Tienes 1 correo no leído de ${unreadList[0].sender}: "${unreadList[0].subject}".`;
          } else {
            replyText = `Tienes ${unreadList.length} correos no leídos en Gmail. El más reciente es de ${unreadList[0].sender}.`;
          }
        }
        // 7. GMAIL: replyToEmail
        else if (name === 'replyToEmail') {
          actionType = 'replyToEmail';
          const target = String(args.emailIdOrSenderOrSubject || '').trim();
          const replyTextContent = String(args.replyBody || args.content || '').trim();

          const repliedEmail = googleServices.replyToEmail(target, replyTextContent);

          if (repliedEmail) {
            cardData = { emails: [repliedEmail] };
            replyText = `Respuesta enviada a ${repliedEmail.sender}: "${replyTextContent}".`;
          } else {
            replyText = `No se encontró el correo especificado para responder.`;
          }
        }
        // 8. GOOGLE CALENDAR: getTodayAgenda
        else if (name === 'getTodayAgenda') {
          actionType = 'getTodayAgenda';
          const date = String(args.date || 'today');
          const todayEvents = googleServices.getTodayAgenda(date);
          cardData = { events: todayEvents };

          if (todayEvents.length === 0) {
            replyText = 'No tienes compromisos agendados para hoy en Google Calendar.';
          } else {
            const nextEvent = todayEvents[0];
            replyText = `Tienes ${todayEvents.length} eventos hoy. El próximo es "${nextEvent.title}" a las ${nextEvent.startTime}.`;
          }
        }
        // 9. GOOGLE CALENDAR: createCalendarEvent
        else if (name === 'createCalendarEvent') {
          actionType = 'createCalendarEvent';
          const title = String(args.title || 'Reunión').trim();
          const startTime = String(args.startTime || '15:00').trim();
          const durationMinutes = Number(args.durationMinutes) || 30;
          const description = args.description ? String(args.description) : undefined;

          const createdEvent = googleServices.createCalendarEvent(
            title,
            startTime,
            durationMinutes,
            description
          );
          cardData = { events: [createdEvent] };

          replyText = `Reunión "${title}" agendada a las ${startTime} en Google Calendar.`;
        } else {
          replyText = 'Orden procesada correctamente.';
        }

        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: replyText,
            actionType,
            cardData,
            timestamp: replyTime,
          },
        ]);
        speak(replyText);
      } else if (response?.text) {
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: response.text || '',
            timestamp: replyTime,
          },
        ]);
        speak(response.text);
      }
    } catch (error: any) {
      console.error('Error al procesar orden:', error);
      const errReply = `Error al procesar orden: ${error?.message || 'Inténtalo de nuevo.'}`;
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: errReply,
          timestamp: replyTime,
        },
      ]);
      speak('Ocurrió un error al procesar la orden.');
    } finally {
      setIsProcessing(false);
    }
  };

  const {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    hasSupport,
    error: voiceError,
  } = useVoice((transcript) => {
    if (transcript) {
      handleExecuteCommand(transcript);
    }
  });

  useEffect(() => {
    stopListeningRef.current = stopListening;
  }, [stopListening]);

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    const text = inputText;
    setInputText('');
    handleExecuteCommand(text);
  };

  const samplePrompts = [
    { label: '📩 Revisar correos', text: 'Revisar correos no leídos en Gmail' },
    { label: '📅 Consultar agenda', text: 'Consultar mi agenda de hoy' },
    { label: '⏰ Probar temporizador (10s)', text: 'Poner temporizador de 10 segundos para probar alarma' },
    { label: '➕ Agendar evento', text: 'Agendar reunión con cliente a las 15:30' },
    { label: '✍️ Guardar nota', text: 'Guardar nota Comprar insumos de bodega' },
    { label: '✅ Tareas pendientes', text: '¿Cuáles son mis tareas pendientes?' },
  ];

  return (
    <div id="ai-assistant-view" className="flex flex-col h-[calc(100vh-12rem)] md:h-[680px] max-w-4xl mx-auto rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl overflow-hidden">
      {/* Top Executive Header */}
      <div id="assistant-header" className="flex items-center justify-between px-5 py-3.5 bg-slate-950/90 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
              <span>Famous Asistente Ejecutivo</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                Voz e IA
              </span>
            </h2>
            <p className="text-xs text-slate-400">Mano derecha administrativa: Gmail, Agenda, Notificaciones y Tareas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <button
              id="btn-stop-speaking"
              onClick={stopSpeaking}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold animate-pulse hover:bg-indigo-500/30 transition-colors"
              title="Silenciar síntesis de voz"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Hablando... (Silenciar)</span>
            </button>
          )}
          <button
            id="btn-clear-chat"
            onClick={() => {
              setMessages([
                {
                  sender: 'assistant',
                  text: 'Historial reiniciado. ¿En qué puedo colaborar contigo?',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ]);
            }}
            className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Limpiar chat
          </button>
        </div>
      </div>

      {/* Interactive Quick Voice Action Chips */}
      <div id="quick-action-chips" className="flex items-center gap-2 px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto no-scrollbar text-xs">
        <span className="text-slate-400 whitespace-nowrap font-medium text-[11px] flex items-center gap-1">
          <Mic className="w-3.5 h-3.5 text-indigo-400" /> Atajos:
        </span>
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            id={`chip-prompt-${idx}`}
            onClick={() => handleExecuteCommand(prompt.text)}
            disabled={isProcessing || isListening}
            className="px-3 py-1 rounded-xl bg-slate-800/90 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-slate-700/60 text-slate-200 hover:text-white whitespace-nowrap transition-all active:scale-95 disabled:opacity-50 text-xs font-medium"
          >
            {prompt.label}
          </button>
        ))}
      </div>

      {/* Main Conversation Stream */}
      <div id="messages-container" className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={index}
              id={`msg-${index}`}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[90%] sm:max-w-[85%] ${
                isUser ? 'ml-auto' : 'mr-auto'
              }`}
            >
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-slate-800/95 text-slate-100 border border-slate-700/80 rounded-bl-xs'
                }`}
              >
                {/* Visual Action Indicator Badge */}
                {msg.actionType && (
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit">
                    {msg.actionType === 'createTask' && (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Tarea registrada en la lista</span>
                      </>
                    )}
                    {msg.actionType === 'addNote' && (
                      <>
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-cyan-400">Nota guardada en almacenamiento</span>
                      </>
                    )}
                    {msg.actionType === 'completeTask' && (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tarea marcada como completada</span>
                      </>
                    )}
                    {msg.actionType === 'getPendingTasks' && (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-400">Consulta de pendientes</span>
                      </>
                    )}
                    {msg.actionType === 'setNativeTimer' && (
                      <>
                        <BellRing className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                        <span className="text-rose-400">Temporizador Capacitor Activo</span>
                      </>
                    )}
                    {msg.actionType === 'checkUnreadEmails' && (
                      <>
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-blue-400">Bandeja Gmail revisada</span>
                      </>
                    )}
                    {msg.actionType === 'replyToEmail' && (
                      <>
                        <Reply className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-purple-400">Respuesta enviada vía Gmail</span>
                      </>
                    )}
                    {msg.actionType === 'getTodayAgenda' && (
                      <>
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-indigo-400">Agenda Google Calendar</span>
                      </>
                    )}
                    {msg.actionType === 'createCalendarEvent' && (
                      <>
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Reunión agendada en Calendar</span>
                      </>
                    )}
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Embedded Cards for Rich Data Displays */}
                {msg.cardData?.emails && msg.cardData.emails.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-700/80 pt-2.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Correos de la bandeja:
                    </p>
                    {msg.cardData.emails.map((email) => (
                      <div
                        key={email.id}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/70 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-indigo-300 font-semibold">
                          <span>{email.sender}</span>
                          <span className="text-[10px] text-slate-500">{email.date}</span>
                        </div>
                        <p className="text-slate-200 font-medium">{email.subject}</p>
                        <p className="text-slate-400 text-[11px] line-clamp-2">{email.body}</p>
                        <button
                          onClick={() =>
                            handleExecuteCommand(
                              `Responder al correo de ${email.sender} diciendo que procesaré la solicitud.`
                            )
                          }
                          className="mt-1 flex items-center gap-1 px-2 py-1 rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] hover:bg-indigo-600/50 transition-colors"
                        >
                          <Reply className="w-3 h-3" /> Responder por voz
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {msg.cardData?.events && msg.cardData.events.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-700/80 pt-2.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Compromisos agendados hoy:
                    </p>
                    {msg.cardData.events.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-emerald-400 font-bold">
                          <span>⏰ {evt.startTime} - {evt.endTime}</span>
                          <span className="text-[10px] text-slate-400">{evt.location}</span>
                        </div>
                        <p className="text-white font-semibold">{evt.title}</p>
                        {evt.description && (
                          <p className="text-slate-400 text-[11px]">{evt.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {msg.cardData?.timer && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-rose-400 animate-bounce" />
                      <div>
                        <p className="text-white font-bold">{msg.cardData.timer.title}</p>
                        <p className="text-rose-300 text-[10px]">
                          Activado por {msg.cardData.timer.seconds}s con Capacitor Local Notifications
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-slate-800/80 text-indigo-300 text-xs font-medium w-fit border border-indigo-500/30 animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Ejecutando orden administrativa con Gemini 3.6 Flash...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Status & Support Notifications */}
      {voiceError && (
        <div id="voice-error-banner" className="px-4 py-1.5 bg-rose-500/10 border-t border-rose-500/30 text-rose-300 text-xs text-center">
          {voiceError}
        </div>
      )}

      {!hasSupport && (
        <div id="voice-support-banner" className="px-4 py-1.5 bg-amber-500/10 border-t border-amber-500/30 text-amber-300 text-xs text-center">
          Micrófono web no detectado. Puedes escribir tus órdenes directamente en el campo inferior.
        </div>
      )}

      {/* Executive Voice & Input Bar */}
      <div id="input-controls-bar" className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        {/* Main Microphone Action Trigger */}
        <button
          id="btn-voice-trigger"
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-xl active:scale-95 flex-shrink-0 ${
            isListening
              ? 'bg-rose-600 hover:bg-rose-500 text-white ring-4 ring-rose-500/40 animate-pulse'
              : isProcessing
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/30'
          }`}
          title={isListening ? 'Detener dictado' : 'Activar asistente de voz'}
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5 animate-bounce" />
              <span>Escuchando orden... (Toca para enviar)</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>Hablar al Asistente</span>
            </>
          )}
        </button>

        {/* Text Field Fallback */}
        <form onSubmit={handleSubmitText} className="flex-1 w-full flex items-center gap-2">
          <input
            id="input-command-text"
            type="text"
            placeholder="Escribe una orden (ej. 'Revisar correos', 'Agendar reunión a las 10:00')..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isProcessing || isListening}
            className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
          />
          <button
            id="btn-send-command"
            type="submit"
            disabled={!inputText.trim() || isProcessing || isListening}
            className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors flex-shrink-0 active:scale-95"
            title="Enviar orden"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistantView;
