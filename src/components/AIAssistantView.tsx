import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, Sparkles, CheckCircle, Clock, FileText, Check } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { processUserCommand } from '../Services/aiServices';
import { storage } from '../utils/storage';
import { Task, Note, Habit } from '../types';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  actionType?: 'createTask' | 'addNote' | 'completeTask' | 'getPendingTasks' | 'info';
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
      text: '¡Hola! Soy Famous Asistente. Presiona el micrófono o escribe una orden como "Crear tarea", "Guardar nota", "Completar tarea" o "¿Cuáles son mis tareas pendientes?".',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Ejecución centralizada de la orden recibida (por voz o texto)
  const handleExecuteCommand = async (command: string) => {
    const cleanCommand = command.trim();
    if (!cleanCommand) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Agregar mensaje del usuario
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
        } else if (name === 'addNote') {
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
        } else if (name === 'completeTask') {
          actionType = 'completeTask';
          const target = String(args.taskTitleOrId || args.title || '').trim();
          const completedTask = storage.completeTask(target);

          if (completedTask) {
            replyText = `Tarea "${completedTask.title}" marcada como completada.`;
          } else {
            replyText = `No encontré ninguna tarea pendiente que coincida con "${target}".`;
          }
        } else if (name === 'getPendingTasks') {
          actionType = 'getPendingTasks';
          const filterCategory = args.category ? String(args.category).trim() : undefined;
          const pending = storage.getPendingTasks(filterCategory);

          if (pending.length === 0) {
            replyText = filterCategory
              ? `No tienes tareas pendientes en la categoría ${filterCategory}.`
              : 'No tienes tareas pendientes en este momento.';
          } else if (pending.length === 1) {
            replyText = `Tienes 1 tarea pendiente: ${pending[0].title}.`;
          } else {
            const listPreview = pending
              .slice(0, 4)
              .map((t) => `"${t.title}"`)
              .join(', ');
            const extra = pending.length > 4 ? ` y ${pending.length - 4} más.` : '.';
            replyText = `Tienes ${pending.length} tareas pendientes: ${listPreview}${extra}`;
          }
        } else {
          replyText = 'Acción procesada correctamente.';
        }

        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: replyText,
            actionType,
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

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    const text = inputText;
    setInputText('');
    handleExecuteCommand(text);
  };

  const samplePrompts = [
    'Crear tarea Revisar finanzas del mes en Finanzas',
    'Guardar nota Comprar insumos de bodega',
    '¿Cuáles son mis tareas pendientes?',
    'Completar tarea Revisión y contestación de correos',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[650px] max-w-4xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">Asistente Administrativo por Voz</h2>
            <p className="text-xs text-slate-400">Control por voz y herramientas automáticas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold animate-pulse hover:bg-indigo-500/30 transition-colors"
              title="Silenciar voz del asistente"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Hablando... (Silenciar)</span>
            </button>
          )}
          <button
            onClick={() => {
              setMessages([
                {
                  sender: 'assistant',
                  text: 'Historial reiniciado. ¿En qué te puedo ayudar?',
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

      {/* Suggestion Chips */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/40 border-b border-slate-800/60 overflow-x-auto no-scrollbar text-xs">
        <span className="text-slate-400 whitespace-nowrap font-medium text-[11px]">Prueba:</span>
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleExecuteCommand(prompt)}
            disabled={isProcessing || isListening}
            className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-indigo-600/30 hover:border-indigo-500/40 border border-slate-700/60 text-slate-300 hover:text-white whitespace-nowrap transition-colors active:scale-95 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={index}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] ${
                isUser ? 'ml-auto' : 'mr-auto'
              }`}
            >
              <div
                className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-xs'
                }`}
              >
                {/* Action Badge if a function was executed */}
                {msg.actionType && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold text-emerald-400">
                    {msg.actionType === 'createTask' && (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Tarea creada en base de datos</span>
                      </>
                    )}
                    {msg.actionType === 'addNote' && (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        <span>Nota archivada con éxito</span>
                      </>
                    )}
                    {msg.actionType === 'completeTask' && (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Estado de tarea actualizado</span>
                      </>
                    )}
                    {msg.actionType === 'getPendingTasks' && (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Consulta de pendientes</span>
                      </>
                    )}
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-800/60 text-indigo-300 text-xs font-medium w-fit border border-indigo-500/20 animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Ejecutando orden administrativa con Gemini...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Status & Error Banner */}
      {voiceError && (
        <div className="px-4 py-1.5 bg-rose-500/10 border-t border-rose-500/30 text-rose-300 text-xs text-center">
          {voiceError}
        </div>
      )}

      {!hasSupport && (
        <div className="px-4 py-1.5 bg-amber-500/10 border-t border-amber-500/30 text-amber-300 text-xs text-center">
          Reconocimiento de voz no detectado en este navegador. Puedes escribir tus órdenes abajo.
        </div>
      )}

      {/* Controls: Voice Button + Text Input */}
      <div className="p-3.5 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        {/* Voice Trigger Button */}
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-semibold text-sm transition-all shadow-lg active:scale-95 flex-shrink-0 ${
            isListening
              ? 'bg-rose-600 hover:bg-rose-500 text-white ring-4 ring-rose-500/30 animate-pulse'
              : isProcessing
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
          }`}
          title={isListening ? 'Detener micrófono' : 'Hablar al asistente'}
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5 animate-bounce" />
              <span>Escuchando... (Toca para terminar)</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>Dictar por voz</span>
            </>
          )}
        </button>

        {/* Text Input Fallback / Alternative */}
        <form onSubmit={handleSubmitText} className="flex-1 w-full flex items-center gap-2">
          <input
            type="text"
            placeholder="O escribe una orden (ej. 'Crear tarea Comprar material en Campo')..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isProcessing || isListening}
            className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing || isListening}
            className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-colors flex-shrink-0 active:scale-95"
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
