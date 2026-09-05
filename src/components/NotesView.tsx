import React, { useState } from 'react';
import { Note } from '../types';
import { Plus, Pin, Trash2, Copy, Check, Sparkles, X } from 'lucide-react';
import { sounds } from '../utils/audio';

interface NotesViewProps {
  notes: Note[];
  onAddNote: (note: Omit<Note, 'id' | 'updatedAt'>) => void;
  onTogglePin: (id: string) => void;
  onDeleteNote: (id: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  onAddNote,
  onTogglePin,
  onDeleteNote,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Ideas');
  const [color, setColor] = useState('#6366f1');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Note Assistant State
  const [activeAiNote, setActiveAiNote] = useState<Note | null>(null);
  const [aiAction, setAiAction] = useState<'summarize' | 'action_items' | 'polish'>('summarize');
  const [aiResult, setAiResult] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];

  const handleRunAiEnhance = async (
    noteContent: string,
    action: 'summarize' | 'action_items' | 'polish'
  ) => {
    sounds.playClick();
    setAiLoading(true);
    setAiResult('');
    setAiAction(action);
    try {
      const res = await fetch('/api/gemini/enhance-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent, action }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult(data.result || noteContent);
      } else {
        // Fallback local logic if server route is not in custom server mode
        if (action === 'summarize') {
          setAiResult(`• ${noteContent.slice(0, 100)}...`);
        } else if (action === 'action_items') {
          setAiResult(`1. Dar seguimiento al contenido principal.\n2. Archivar detalles.`);
        } else {
          setAiResult(noteContent.trim());
        }
      }
    } catch {
      // Local fallback
      setAiResult(`Resumen: ${noteContent.slice(0, 100)}...`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;
    onAddNote({
      title: title.trim() || 'Nota rápida',
      content: content.trim(),
      category,
      pinned: false,
      color,
    });
    sounds.playClick();
    setTitle('');
    setContent('');
    setShowAddModal(false);
  };

  const handleCopy = (note: Note) => {
    sounds.playClick();
    sounds.vibrate(30);
    const text = `${note.title}\n\n${note.content}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned === b.pinned) return 0;
    return a.pinned ? -1 : 1;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Notas Rápidas</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-indigo-500/20">
              {notes.length} guardadas
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Captura ideas, recordatorios y pensamientos inmediatos para no perder foco.
          </p>
        </div>
        <button
          id="btn-open-add-note"
          type="button"
          onClick={() => {
            sounds.playClick();
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Nota</span>
        </button>
      </div>

      {/* Notes Grid */}
      {sortedNotes.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/30 border border-dashed border-slate-800">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">No hay notas guardadas</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Utiliza el bloc de notas para vaciar tu mente o pídele al asistente de voz que guarde una
            nota.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              id={`note-card-${note.id}`}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                note.pinned
                  ? 'bg-slate-900/90 border-indigo-500/40 shadow-sm'
                  : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800/80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: note.color }}
                    />
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      {note.title}
                    </h3>
                  </div>
                  <button
                    id={`pin-note-${note.id}`}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onTogglePin(note.id);
                    }}
                    title={note.pinned ? 'Desfijar nota' : 'Fijar nota al inicio'}
                    className={`p-1 rounded-lg transition-colors ${
                      note.pinned
                        ? 'text-indigo-400 bg-indigo-500/20'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/60 text-[11px] text-slate-400">
                <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 font-medium">
                  {note.category}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    id={`ai-note-${note.id}`}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      setActiveAiNote(note);
                      handleRunAiEnhance(note.content, 'summarize');
                    }}
                    title="Analizar con IA"
                    className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id={`copy-note-${note.id}`}
                    type="button"
                    onClick={() => handleCopy(note)}
                    title="Copiar contenido"
                    className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedId === note.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    id={`delete-note-${note.id}`}
                    type="button"
                    onClick={() => {
                      sounds.playClick();
                      onDeleteNote(note.id);
                    }}
                    title="Eliminar nota"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva Nota */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Capturar Nueva Nota</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Título</label>
                <input
                  id="note-title-input"
                  type="text"
                  placeholder="Ej: Idea de proyecto o recordatorio"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contenido</label>
                <textarea
                  id="note-content-input"
                  rows={4}
                  required
                  placeholder="Escribe tus notas, apuntes o enlaces..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Categoría</label>
                  <select
                    id="note-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Ideas">Ideas</option>
                    <option value="General">General</option>
                    <option value="Finanzas">Finanzas</option>
                    <option value="Campo/Inventario">Campo/Inventario</option>
                    <option value="Estrategia">Estrategia</option>
                    <option value="Proyectos">Proyectos</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Color</label>
                  <div className="flex items-center gap-2 pt-1">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          color === c ? 'scale-120 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-new-note"
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-colors"
                >
                  Guardar Nota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Análisis con IA */}
      {activeAiNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-indigo-500/40 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Análisis con IA</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveAiNote(null);
                  setAiResult('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Nota original
              </span>
              <p className="text-xs font-medium text-slate-200">{activeAiNote.title}</p>
              <p className="text-xs text-slate-400 mt-1 line-clamp-3">{activeAiNote.content}</p>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleRunAiEnhance(activeAiNote.content, 'summarize')}
                disabled={aiLoading}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                  aiAction === 'summarize'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Resumir puntos
              </button>
              <button
                type="button"
                onClick={() => handleRunAiEnhance(activeAiNote.content, 'action_items')}
                disabled={aiLoading}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                  aiAction === 'action_items'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Acciones clave
              </button>
              <button
                type="button"
                onClick={() => handleRunAiEnhance(activeAiNote.content, 'polish')}
                disabled={aiLoading}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                  aiAction === 'polish'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Pulir redacción
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 min-h-[120px]">
              {aiLoading ? (
                <div className="flex items-center justify-center h-24 gap-2 text-xs text-slate-400">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>Procesando...</span>
                </div>
              ) : aiResult ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {aiResult}
                  </p>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        navigator.clipboard.writeText(aiResult).catch(() => {});
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playCompletionSound();
                        onAddNote({
                          title: `[IA] ${activeAiNote.title}`,
                          content: aiResult,
                          category: activeAiNote.category,
                          color: activeAiNote.color,
                          pinned: false,
                        });
                        setActiveAiNote(null);
                        setAiResult('');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Guardar nota</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">
                  Selecciona una acción para procesar esta nota.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
