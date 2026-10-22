import React, { useState, useEffect, useMemo } from 'react';
import { ProjectDiaryEntry, DiaryMood, User } from '../types';
import {
  getProjectDiaryEntries,
  saveProjectDiaryEntry,
  deleteProjectDiaryEntry,
  subscribeToProjectDiaryEntries
} from '../services/projectCreativeService';

interface ProjectDiaryViewProps {
  projectId: string;
  user: User;
  readOnly?: boolean;
}

const MOOD_CONFIG: Record<DiaryMood, {
  label: string;
  emoji: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  iconBg: string;
  description: string;
}> = {
  inspired: {
    label: 'Inspirado',
    emoji: '✨',
    badgeBg: 'bg-amber-100/90 text-amber-900 border-amber-300',
    badgeText: 'text-amber-900',
    border: 'border-amber-300/80',
    iconBg: 'bg-amber-100 text-amber-700',
    description: 'Ideias fluindo com facilidade e clareza'
  },
  excited: {
    label: 'Empolgado',
    emoji: '🔥',
    badgeBg: 'bg-orange-100/90 text-orange-900 border-orange-300',
    badgeText: 'text-orange-900',
    border: 'border-orange-300/80',
    iconBg: 'bg-orange-100 text-orange-700',
    description: 'Alta energia, entusiasmo e ritmo frenético'
  },
  reflective: {
    label: 'Reflexivo',
    emoji: '🌊',
    badgeBg: 'bg-indigo-100/90 text-indigo-900 border-indigo-300',
    badgeText: 'text-indigo-900',
    border: 'border-indigo-300/80',
    iconBg: 'bg-indigo-100 text-indigo-700',
    description: 'Contemplação profunda sobre tema ou personagens'
  },
  insecure: {
    label: 'Inseguro',
    emoji: '🌧️',
    badgeBg: 'bg-slate-100/90 text-slate-800 border-slate-300',
    badgeText: 'text-slate-800',
    border: 'border-slate-300/80',
    iconBg: 'bg-slate-100 text-slate-700',
    description: 'Dúvidas sobre o rumo, a qualidade ou a voz do texto'
  },
  stuck: {
    label: 'Travado',
    emoji: '🧩',
    badgeBg: 'bg-rose-100/90 text-rose-900 border-rose-300',
    badgeText: 'text-rose-900',
    border: 'border-rose-300/80',
    iconBg: 'bg-rose-100 text-rose-700',
    description: 'Bloqueio de enredo, cena difícil de desenrolar'
  }
};

export const ProjectDiaryView: React.FC<ProjectDiaryViewProps> = ({
  projectId,
  user,
  readOnly = false
}) => {
  const [entries, setEntries] = useState<ProjectDiaryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<DiaryMood | 'all'>('all');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<ProjectDiaryEntry | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [formMood, setFormMood] = useState<DiaryMood>('reflective');
  const [formDate, setFormDate] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getProjectDiaryEntries(projectId, user.id).then((initialEntries) => {
      if (isMounted) {
        setEntries(initialEntries);
        setLoading(false);
      }
    });

    const unsubscribe = subscribeToProjectDiaryEntries(projectId, user.id, (updatedEntries) => {
      if (isMounted) {
        setEntries(updatedEntries);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [projectId, user.id]);

  const openNewEntryModal = () => {
    const now = new Date();
    // format as YYYY-MM-DDTHH:mm for datetime-local input
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditingEntry(null);
    setFormTitle('');
    setFormContent('');
    setFormMood('reflective');
    setFormDate(localIso);
    setIsModalOpen(true);
  };

  const openEditModal = (entry: ProjectDiaryEntry) => {
    const entryDate = entry.entryDate ? new Date(entry.entryDate) : new Date(entry.createdAt);
    const localIso = new Date(entryDate.getTime() - entryDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditingEntry(entry);
    setFormTitle(entry.title || '');
    setFormContent(entry.content || '');
    setFormMood(entry.mood || 'reflective');
    setFormDate(localIso);
    setIsModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) return;

    setSaving(true);
    try {
      const entryToSave: ProjectDiaryEntry = {
        id: editingEntry?.id || '',
        projectId,
        userId: user.id,
        title: formTitle.trim() || undefined,
        content: formContent.trim(),
        mood: formMood,
        entryDate: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
        createdAt: editingEntry?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const saved = await saveProjectDiaryEntry(entryToSave, user.id);

      setEntries((prev) => {
        const idx = prev.findIndex(item => item.id === saved.id);
        let updated: ProjectDiaryEntry[];
        if (idx >= 0) {
          updated = [...prev];
          updated[idx] = saved;
        } else {
          updated = [saved, ...prev];
        }
        return updated.sort((a, b) => new Date(b.entryDate || b.createdAt).getTime() - new Date(a.entryDate || a.createdAt).getTime());
      });

      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar página do diário:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteProjectDiaryEntry(entryId, projectId, user.id);
      setEntries(prev => prev.filter(e => e.id !== entryId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Erro ao deletar página:', err);
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchMood = selectedMoodFilter === 'all' || entry.mood === selectedMoodFilter;
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        (entry.title && entry.title.toLowerCase().includes(term)) ||
        entry.content.toLowerCase().includes(term);
      return matchMood && matchSearch;
    });
  }, [entries, selectedMoodFilter, searchTerm]);

  const formatPoeticDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      const day = d.getDate();
      const monthName = d.toLocaleDateString('pt-BR', { month: 'long' });
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      return `${capitalizedWeekday}, ${day} de ${monthName} de ${year} • ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  const getWordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <div className="space-y-6">
      {/* Diary Header & Intro Banner */}
      <div className="bg-gradient-to-br from-[#FAF6ED] via-[#F6EEDF] to-[#EFE2CB] border border-[#E3D3B4] rounded-2xl p-6 shadow-sm relative overflow-hidden">
        {/* Decorative corner bookmark ribbon */}
        <div className="absolute top-0 right-8 w-8 h-12 bg-amber-700/80 shadow-md rounded-b-md flex items-end justify-center pb-1">
          <div className="w-2 h-2 bg-amber-400 rounded-full opacity-80" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📓</span>
              <h2 className="text-xl font-bold font-serif text-amber-950 tracking-tight">
                Diário da Obra
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-semibold border border-amber-300">
                {entries.length} {entries.length === 1 ? 'página' : 'páginas'}
              </span>
            </div>
            <p className="text-sm text-amber-900/80 max-w-2xl leading-relaxed">
              O espaço íntimo e reflexivo do autor durante o processo de escrita. Registre dúvidas de enredo,
              descobertas sobre os personagens, lampejos poéticos e o seu estado emocional a cada capítulo.
            </p>
          </div>

          {!readOnly && (
            <button
              onClick={openNewEntryModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white font-medium shadow-md shadow-amber-950/15 hover:shadow-lg transition-all duration-200 active:scale-95 text-sm shrink-0 border border-amber-600/50"
            >
              <span>✍️</span>
              <span>Escrever Nova Página</span>
            </button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-6 pt-5 border-t border-amber-300/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-700/60 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nas páginas do diário..."
              className="w-full pl-9 pr-4 py-2 bg-white/90 border border-amber-200 rounded-xl text-sm text-amber-950 placeholder-amber-800/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all shadow-inner"
            />
          </div>

          {/* Mood Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedMoodFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedMoodFilter === 'all'
                  ? 'bg-amber-900 text-white shadow-sm'
                  : 'bg-white/80 text-amber-900 hover:bg-white border border-amber-200'
              }`}
            >
              Todos ({entries.length})
            </button>
            {(Object.keys(MOOD_CONFIG) as DiaryMood[]).map((m) => {
              const count = entries.filter(e => e.mood === m).length;
              const cfg = MOOD_CONFIG[m];
              const isSelected = selectedMoodFilter === m;
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMoodFilter(m)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-900 text-white shadow-sm ring-1 ring-amber-900'
                      : 'bg-white/80 text-amber-950 hover:bg-white border border-amber-200'
                  }`}
                  title={cfg.description}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                  <span className={`text-[10px] px-1 rounded-full ${isSelected ? 'bg-amber-800 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pages Container */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin text-3xl mb-3">⏳</div>
          <p className="text-sm text-amber-900/60 font-medium">Folheando o diário da obra...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-[#FAF7F0] border-2 border-dashed border-[#E3D3B4] rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-inner">
          <div className="w-16 h-16 rounded-full bg-amber-100/80 text-amber-800 flex items-center justify-center text-3xl mx-auto mb-4 border border-amber-200">
            📖
          </div>
          <h3 className="text-lg font-serif font-bold text-amber-950 mb-2">
            {searchTerm || selectedMoodFilter !== 'all'
              ? 'Nenhuma página encontrada com esses filtros'
              : 'Seu Diário de Criação está em branco'}
          </h3>
          <p className="text-sm text-amber-900/70 mb-6 leading-relaxed">
            {searchTerm || selectedMoodFilter !== 'all'
              ? 'Tente remover a busca ou selecionar outro estado emocional para ver mais páginas.'
              : 'O diário é o refúgio do escritor. Anote pensamentos livres sobre a narrativa, resolva nós górdios da trama e acompanhe como suas emoções evoluem junto com a história.'}
          </p>
          {!readOnly && (
            <button
              onClick={openNewEntryModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-medium shadow-sm transition-all"
            >
              <span>✍️</span>
              <span>Escrever Primeira Página</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredEntries.map((entry, index) => {
            const moodCfg = entry.mood ? MOOD_CONFIG[entry.mood] : MOOD_CONFIG.reflective;
            const wordCount = getWordCount(entry.content);
            const estReadMinutes = Math.max(1, Math.ceil(wordCount / 200));

            return (
              <article
                key={entry.id}
                className="group relative bg-[#FCF9F2] border border-[#E7D9BC] rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                style={{
                  backgroundImage: 'radial-gradient(#E8DAC0 0.75px, transparent 0.75px)',
                  backgroundSize: '24px 24px'
                }}
              >
                {/* Vintage Left Bookmark/Ribbon accent */}
                <div
                  className={`absolute top-0 left-6 w-1.5 h-full rounded-r transition-all ${
                    entry.mood === 'inspired' ? 'bg-amber-400' :
                    entry.mood === 'excited' ? 'bg-orange-400' :
                    entry.mood === 'reflective' ? 'bg-indigo-400' :
                    entry.mood === 'insecure' ? 'bg-slate-400' :
                    'bg-rose-400'
                  }`}
                />

                <div className="pl-4 sm:pl-6">
                  {/* Page Header (Date, Mood, Actions) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EADCC8]">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Page numbering badge */}
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold border border-amber-200">
                        Página #{filteredEntries.length - index}
                      </span>

                      {/* Poetic Date */}
                      <span className="text-xs font-serif text-amber-950/70 font-medium">
                        {formatPoeticDate(entry.entryDate || entry.createdAt)}
                      </span>

                      {/* Mood Badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium border ${moodCfg.badgeBg}`}
                        title={moodCfg.description}
                      >
                        <span>{moodCfg.emoji}</span>
                        <span>{moodCfg.label}</span>
                      </span>
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(entry)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-amber-900 hover:bg-amber-100/80 transition-all border border-amber-200/60"
                          title="Editar página"
                        >
                          ✏️ Editar
                        </button>
                        {deleteConfirmId === entry.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 p-0.5 rounded-lg border border-rose-200">
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 text-[11px] text-slate-600 hover:text-slate-900"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(entry.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition-colors"
                            title="Excluir página"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Title (if present) */}
                  {entry.title && (
                    <h3 className="text-lg sm:text-xl font-bold font-serif text-stone-900 mt-4 mb-2 tracking-tight">
                      {entry.title}
                    </h3>
                  )}

                  {/* Page Body (Literary styling) */}
                  <div className="mt-3 text-stone-800 font-serif text-sm sm:text-base leading-relaxed whitespace-pre-wrap selection:bg-amber-200">
                    {entry.content}
                  </div>

                  {/* Page Footer metadata */}
                  <div className="mt-5 pt-3 border-t border-[#EADCC8]/60 flex items-center justify-between text-[11px] text-amber-900/60">
                    <div className="flex items-center gap-3">
                      <span>📝 {wordCount} palavras</span>
                      <span>•</span>
                      <span>📖 ~{estReadMinutes} min de leitura</span>
                    </div>
                    {entry.updatedAt && entry.updatedAt !== entry.createdAt && (
                      <span className="italic">
                        Editado em {new Date(entry.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal: Write / Edit Diary Page */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#FAF7F0] border border-[#DFCBB0] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#F6EEDF] to-[#EFE2CB] border-b border-[#E3D3B4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📓</span>
                <div>
                  <h3 className="font-serif font-bold text-amber-950 text-base sm:text-lg">
                    {editingEntry ? 'Editar Página no Diário' : 'Nova Página no Diário da Obra'}
                  </h3>
                  <p className="text-xs text-amber-900/70">
                    Registro íntimo da jornada de criação desta história
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 flex items-center justify-center text-sm font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEntry} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Date & Mood row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-950 mb-1">
                    📅 Data e Hora da Página
                  </label>
                  <input
                    type="datetime-local"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-950 mb-1">
                    🎭 Estado Emocional ao Escrever
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {(Object.keys(MOOD_CONFIG) as DiaryMood[]).map((m) => {
                      const cfg = MOOD_CONFIG[m];
                      const isSelected = formMood === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFormMood(m)}
                          className={`p-1.5 rounded-lg flex flex-col items-center justify-center border text-[10px] font-medium transition-all ${
                            isSelected
                              ? 'bg-amber-900 text-white border-amber-950 shadow-sm scale-105'
                              : 'bg-white text-stone-700 border-amber-200 hover:bg-amber-50'
                          }`}
                          title={`${cfg.label}: ${cfg.description}`}
                        >
                          <span className="text-base">{cfg.emoji}</span>
                          <span className="truncate w-full text-center leading-tight">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Page Title */}
              <div>
                <label className="block text-xs font-semibold text-amber-950 mb-1">
                  🏷️ Título da Página <span className="text-amber-800/50 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: O impasse do capítulo 4, Eureka sobre o vilão, etc."
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-sm font-serif text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              {/* Content / Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-amber-950">
                    ✍️ Relato & Reflexões
                  </label>
                  <span className="text-[11px] text-amber-900/60 font-mono">
                    {getWordCount(formContent)} palavras • {formContent.length} caracteres
                  </span>
                </div>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  required
                  rows={8}
                  placeholder="Despeje aqui seus pensamentos: Como está o ritmo? O que sentiu ao escrever hoje? Quais dúvidas surgiram sobre o rumo da história? Qual vitória merece celebração?"
                  className="w-full px-4 py-3 bg-[#FCFBF7] border border-amber-200 rounded-xl text-sm font-serif leading-relaxed text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-y shadow-inner"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-amber-200/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-amber-950 hover:bg-amber-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !formContent.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs sm:text-sm font-medium shadow-md shadow-amber-900/20 transition-all flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <span className="animate-spin text-xs">⏳</span>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>{editingEntry ? 'Atualizar Página' : 'Guardar no Diário'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
