import React, { useState, useEffect, useMemo } from 'react';
import { ProjectComment, PostItColor, User } from '../types';
import { getProjectComments, saveProjectComment, deleteProjectComment } from '../services/projectCreativeService';

interface ProjectCommentsProps {
  projectId: string;
  user: User;
  readOnly?: boolean;
}

const POST_IT_THEMES: Record<PostItColor, {
  bg: string;
  border: string;
  shadow: string;
  text: string;
  title: string;
  tape: string;
  label: string;
  chipBg: string;
  badgeBg: string;
  badgeText: string;
}> = {
  yellow: {
    bg: 'bg-amber-100/95',
    border: 'border-amber-300/90',
    shadow: 'hover:shadow-amber-200/60',
    text: 'text-amber-950',
    title: 'text-amber-900',
    tape: 'bg-amber-200/70 border-amber-300/50',
    label: 'Amarelo Clássico',
    chipBg: 'bg-amber-300',
    badgeBg: 'bg-amber-200/80',
    badgeText: 'text-amber-900'
  },
  pink: {
    bg: 'bg-rose-100/95',
    border: 'border-rose-300/90',
    shadow: 'hover:shadow-rose-200/60',
    text: 'text-rose-950',
    title: 'text-rose-900',
    tape: 'bg-rose-200/70 border-rose-300/50',
    label: 'Rosa Suave',
    chipBg: 'bg-rose-300',
    badgeBg: 'bg-rose-200/80',
    badgeText: 'text-rose-900'
  },
  blue: {
    bg: 'bg-sky-100/95',
    border: 'border-sky-300/90',
    shadow: 'hover:shadow-sky-200/60',
    text: 'text-sky-950',
    title: 'text-sky-900',
    tape: 'bg-sky-200/70 border-sky-300/50',
    label: 'Azul Céu',
    chipBg: 'bg-sky-300',
    badgeBg: 'bg-sky-200/80',
    badgeText: 'text-sky-900'
  },
  green: {
    bg: 'bg-emerald-100/95',
    border: 'border-emerald-300/90',
    shadow: 'hover:shadow-emerald-200/60',
    text: 'text-emerald-950',
    title: 'text-emerald-900',
    tape: 'bg-emerald-200/70 border-emerald-300/50',
    label: 'Verde Menta',
    chipBg: 'bg-emerald-300',
    badgeBg: 'bg-emerald-200/80',
    badgeText: 'text-emerald-900'
  },
  purple: {
    bg: 'bg-purple-100/95',
    border: 'border-purple-300/90',
    shadow: 'hover:shadow-purple-200/60',
    text: 'text-purple-950',
    title: 'text-purple-900',
    tape: 'bg-purple-200/70 border-purple-300/50',
    label: 'Lilás / Lavanda',
    chipBg: 'bg-purple-300',
    badgeBg: 'bg-purple-200/80',
    badgeText: 'text-purple-900'
  },
  orange: {
    bg: 'bg-orange-100/95',
    border: 'border-orange-300/90',
    shadow: 'hover:shadow-orange-200/60',
    text: 'text-orange-950',
    title: 'text-orange-900',
    tape: 'bg-orange-200/70 border-orange-300/50',
    label: 'Pêssego / Laranja',
    chipBg: 'bg-orange-300',
    badgeBg: 'bg-orange-200/80',
    badgeText: 'text-orange-900'
  }
};

const SUGGESTED_AUTHORS = [
  'Meu Pensamento',
  'Leitor Beta',
  'Editor',
  'Feedback Crítico',
  'Ideia Espontânea',
  'Observação de Revisão'
];

export const ProjectComments: React.FC<ProjectCommentsProps> = ({
  projectId,
  user,
  readOnly = false
}) => {
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColorFilter, setSelectedColorFilter] = useState<'all' | PostItColor>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComment, setEditingComment] = useState<ProjectComment | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [color, setColor] = useState<PostItColor>('yellow');
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [commentToDelete, setCommentToDelete] = useState<ProjectComment | null>(null);

  useEffect(() => {
    loadComments();
  }, [projectId, user.id]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await getProjectComments(projectId, user.id);
      setComments(data);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewModal = () => {
    setEditingComment(null);
    setTitle('');
    setContent('');
    setAuthor('');
    // Alternate default color based on existing count
    const colorsList: PostItColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];
    setColor(colorsList[comments.length % colorsList.length]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: ProjectComment) => {
    setEditingComment(c);
    setTitle(c.title);
    setContent(c.content);
    setAuthor(c.author || '');
    setColor(c.color || 'yellow');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setSaving(true);
      const commentPayload: ProjectComment = {
        id: editingComment ? editingComment.id : '',
        projectId,
        userId: user.id,
        title: title.trim(),
        content: content.trim(),
        author: author.trim() || undefined,
        color,
        createdAt: editingComment ? editingComment.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const saved = await saveProjectComment(commentPayload, user.id);

      setComments(prev => {
        const index = prev.findIndex(item => item.id === saved.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = saved;
          return next;
        }
        return [saved, ...prev];
      });

      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar comentário:', error);
      alert('Erro ao salvar comentário. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (comment: ProjectComment) => {
    try {
      await deleteProjectComment(comment.id, projectId);
      setComments(prev => prev.filter(c => c.id !== comment.id));
      setCommentToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir comentário:', error);
      alert('Erro ao excluir comentário.');
    }
  };

  const filteredComments = useMemo(() => {
    return comments.filter(c => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.author && c.author.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesColor = selectedColorFilter === 'all' || (c.color || 'yellow') === selectedColorFilter;

      return matchesSearch && matchesColor;
    });
  }, [comments, searchTerm, selectedColorFilter]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Actions */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💬</span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
              Mural de Comentários & Notas Soltas
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Guarde aqui comentários espontâneos, ideias soltas que não se encaixam em capítulos específicos ou feedbacks e impressões que leitores beta fizeram sobre a obra.
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 rounded-2xl shadow-md shadow-teal-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>+ Adicionar Comentário</span>
          </button>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por título, texto ou autor..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 absolute left-3 top-2.5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Color Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex-shrink-0">Filtrar:</span>
          <button
            type="button"
            onClick={() => setSelectedColorFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex-shrink-0 ${
              selectedColorFilter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({comments.length})
          </button>
          {(Object.keys(POST_IT_THEMES) as PostItColor[]).map(cKey => {
            const count = comments.filter(c => (c.color || 'yellow') === cKey).length;
            if (count === 0 && selectedColorFilter !== cKey) return null;
            return (
              <button
                key={cKey}
                type="button"
                onClick={() => setSelectedColorFilter(cKey)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0 border ${
                  selectedColorFilter === cKey
                    ? 'border-slate-800 ring-2 ring-slate-800/20'
                    : 'border-transparent bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${POST_IT_THEMES[cKey].chipBg} border border-black/10`} />
                <span>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Post-Its Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
        </div>
      ) : filteredComments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
          <div className="w-16 h-16 mx-auto mb-3 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl shadow-sm rotate-3">
            📌
          </div>
          <h4 className="text-lg font-bold text-slate-800 mb-1">
            {searchTerm || selectedColorFilter !== 'all' ? 'Nenhum post-it encontrado com esse filtro' : 'Nenhum comentário adicionado ainda'}
          </h4>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-5">
            {searchTerm || selectedColorFilter !== 'all'
              ? 'Tente remover a busca ou selecionar outro filtro para ver seus comentários.'
              : 'Clique no botão abaixo para colar seu primeiro post-it com pensamentos, feedbacks de leitores ou observações gerais!'}
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenNewModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-teal-500/20 transition-all cursor-pointer"
            >
              + Adicionar Novo Post-it
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-3">
          {filteredComments.map((c, index) => {
            const theme = POST_IT_THEMES[c.color || 'yellow'] || POST_IT_THEMES.yellow;
            // Subtle alternating rotation for realistic sticky notes vibe
            const rotationClass =
              index % 4 === 0
                ? '-rotate-1 hover:rotate-0'
                : index % 4 === 1
                ? 'rotate-1 hover:rotate-0'
                : index % 4 === 2
                ? '-rotate-0.5 hover:rotate-0'
                : 'rotate-0.5 hover:rotate-0';

            return (
              <div
                key={c.id}
                className={`${theme.bg} ${theme.border} border rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative group ${rotationClass}`}
              >
                {/* Visual Frosted Tape Element at the top */}
                <div
                  className={`w-14 h-3.5 mx-auto -mt-7 mb-2 rounded-xs shadow-2xs border backdrop-blur-xs ${theme.tape}`}
                />

                {/* Card Top: Title & Quick Actions */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h4 className={`text-base sm:text-lg font-extrabold ${theme.title} leading-snug tracking-tight break-words flex-1`}>
                    {c.title}
                  </h4>

                  {!readOnly && (
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0 -mr-1 -mt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(c)}
                        title="Editar post-it"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-black/5 transition-colors cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommentToDelete(c)}
                        title="Excluir post-it"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-700 hover:bg-black/5 transition-colors cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Body: Content text */}
                <div className={`text-xs sm:text-sm ${theme.text} leading-relaxed whitespace-pre-wrap font-normal break-words py-1 flex-1 font-sans`}>
                  {c.content}
                </div>

                {/* Card Bottom: Author Badge & Date */}
                <div className="pt-4 mt-3 border-t border-black/10 flex items-center justify-between text-[11px] font-semibold">
                  {c.author ? (
                    <span className={`px-2.5 py-0.5 rounded-full ${theme.badgeBg} ${theme.badgeText} truncate max-w-[170px]`}>
                      👤 {c.author}
                    </span>
                  ) : (
                    <span className="text-black/40">💬 Nota geral</span>
                  )}
                  <span className="text-black/50 ml-auto">{formatDate(c.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Criar / Editar Post-it */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !saving && setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📝</span>
                <h3 className="text-xl font-bold text-slate-800">
                  {editingComment ? 'Editar Post-it' : 'Novo Post-it de Comentário'}
                </h3>
              </div>
              {!saving && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título do Comentário / Observação *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Feedback do Leitor Beta sobre o final, Dúvida de coerência, Ideia..."
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-semibold text-slate-800"
                />
              </div>

              {/* Corpo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Corpo do Comentário *
                </label>
                <textarea
                  required
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva aqui detalhadamente a ideia, o comentário feito por outra pessoa ou a anotação que deseja lembrar..."
                  className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800 leading-relaxed"
                />
              </div>

              {/* Autor / Origem (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  De quem é o comentário / Origem (Opcional)
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ex: Leitor Beta (Mariana), Minha Ideia, Editor, etc."
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800"
                />

                {/* Suggestions pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUGGESTED_AUTHORS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setAuthor(sug)}
                      className="px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cor do Post-It */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Cor do Post-it
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(Object.keys(POST_IT_THEMES) as PostItColor[]).map((cKey) => {
                    const theme = POST_IT_THEMES[cKey];
                    const isSelected = color === cKey;
                    return (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() => setColor(cKey)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${theme.bg} ${
                          isSelected
                            ? 'border-slate-800 ring-2 ring-slate-800/30 shadow-sm scale-105'
                            : 'border-slate-200/80 hover:scale-102 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full ${theme.chipBg} shadow-2xs flex items-center justify-center text-[10px] text-slate-900`}>
                          {isSelected ? '✓' : ''}
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 line-clamp-1 text-center">
                          {theme.label.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim() || !content.trim()}
                  className="px-5 py-2 text-sm font-bold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 rounded-xl shadow-md shadow-teal-500/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingComment ? 'Salvar Alterações' : 'Colar Post-it'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Excluir Post-it */}
      {commentToDelete && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setCommentToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-red-100 space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800">Excluir Post-it?</h4>
                <p className="text-xs text-slate-500">Esta anotação será removida.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              "<strong className="text-slate-800">{commentToDelete.title}</strong>"
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCommentToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(commentToDelete)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
