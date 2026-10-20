import React, { useState, useEffect, useRef } from 'react';
import { StorySkeletonItem, SkeletonIdeaBox, SkeletonItemStatus, User } from '../types';
import {
  getStorySkeleton,
  subscribeToStorySkeleton,
  saveStorySkeletonItem,
  deleteStorySkeletonItem,
  reorderStorySkeleton
} from '../services/projectCreativeService';
import { ListTree, Plus, ArrowUp, ArrowDown, Trash2, CheckCircle2, Sparkles, Search, Layers, ChevronDown, ChevronUp } from 'lucide-react';

interface StorySkeletonViewProps {
  projectId: string;
  user: User;
  readOnly?: boolean;
}

const STATUS_CONFIG: Record<SkeletonItemStatus, {
  label: string;
  icon: string;
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  borderLeft: string;
  subAddBg: string;
  subAddText: string;
  subAddBorder: string;
  subAddCircle: string;
}> = {
  draft: {
    label: 'Ideia Inicial',
    icon: '💡',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-500',
    borderLeft: 'border-l-amber-500',
    subAddBg: 'bg-amber-50/60 hover:bg-amber-100/80',
    subAddText: 'text-amber-800',
    subAddBorder: 'border-amber-200 hover:border-amber-300',
    subAddCircle: 'bg-amber-200 text-amber-900 group-hover/btnadd:bg-amber-500 group-hover/btnadd:text-white'
  },
  structured: {
    label: 'Estruturado',
    icon: '📐',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
    badgeBg: 'bg-sky-500',
    borderLeft: 'border-l-sky-500',
    subAddBg: 'bg-sky-50/60 hover:bg-sky-100/80',
    subAddText: 'text-sky-800',
    subAddBorder: 'border-sky-200 hover:border-sky-300',
    subAddCircle: 'bg-sky-200 text-sky-900 group-hover/btnadd:bg-sky-500 group-hover/btnadd:text-white'
  },
  writing: {
    label: 'Escrevendo',
    icon: '✍️',
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    border: 'border-violet-200',
    badgeBg: 'bg-violet-600',
    borderLeft: 'border-l-violet-500',
    subAddBg: 'bg-violet-50/60 hover:bg-violet-100/80',
    subAddText: 'text-violet-800',
    subAddBorder: 'border-violet-200 hover:border-violet-300',
    subAddCircle: 'bg-violet-200 text-violet-900 group-hover/btnadd:bg-violet-600 group-hover/btnadd:text-white'
  },
  completed: {
    label: 'Concluído',
    icon: '✅',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-600',
    borderLeft: 'border-l-emerald-500',
    subAddBg: 'bg-emerald-50/60 hover:bg-emerald-100/80',
    subAddText: 'text-emerald-800',
    subAddBorder: 'border-emerald-200 hover:border-emerald-300',
    subAddCircle: 'bg-emerald-200 text-emerald-900 group-hover/btnadd:bg-emerald-600 group-hover/btnadd:text-white'
  }
};

/**
 * Converte dados legados (string única em content) automaticamente em lista de Caixas de Ideias
 * garantindo 100% de retrocompatibilidade com textos já existentes.
 */
export const getItemIdeas = (item: StorySkeletonItem): SkeletonIdeaBox[] => {
  if (Array.isArray(item.ideas) && item.ideas.length > 0) {
    return item.ideas;
  }
  if (item.content && item.content.trim()) {
    return [{ id: `idea_${item.id}_1`, content: item.content }];
  }
  return [{ id: `idea_${item.id}_1`, content: '' }];
};

export const StorySkeletonView: React.FC<StorySkeletonViewProps> = ({
  projectId,
  user,
  readOnly = false
}) => {
  const [items, setItems] = useState<StorySkeletonItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | SkeletonItemStatus>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [activeIdeaFocusId, setActiveIdeaFocusId] = useState<string | null>(null);

  // Debounce timers for auto-saving content
  const contentDebounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Initial load & real-time sync
  useEffect(() => {
    let isMounted = true;
    getStorySkeleton(projectId, user.id).then(cached => {
      if (isMounted && cached.length > 0) {
        setItems(cached);
      }
    });

    const unsubscribe = subscribeToStorySkeleton(projectId, user.id, (fresh) => {
      if (isMounted) {
        setItems(fresh);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      contentDebounceTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, [projectId, user.id]);

  const showFeedback = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Direct edit of fields with auto-save
  const handleUpdateItem = async (itemId: string, patch: Partial<StorySkeletonItem>, debounce: boolean = false) => {
    if (readOnly) return;
    const current = items.find(i => i.id === itemId);
    if (!current) return;

    const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
    setItems(prev => prev.map(i => i.id === itemId ? updated : i));

    if (debounce) {
      setSavingId(itemId);
      if (contentDebounceTimers.current.has(itemId)) {
        clearTimeout(contentDebounceTimers.current.get(itemId)!);
      }
      const timer = setTimeout(async () => {
        await saveStorySkeletonItem(updated, user.id);
        setSavingId(null);
        contentDebounceTimers.current.delete(itemId);
      }, 700);
      contentDebounceTimers.current.set(itemId, timer);
    } else {
      setSavingId(itemId);
      await saveStorySkeletonItem(updated, user.id);
      setSavingId(null);
    }
  };

  // Add a new chapter at a specific position (index) or at the end
  const handleAddBox = async (insertIndex?: number) => {
    if (readOnly) return;
    const order = (typeof insertIndex === 'number' && insertIndex >= 0) ? insertIndex + 1 : items.length + 1;
    const defaultTitle = `Capítulo ${order}`;
    const initialIdeaId = `idea_skel_${Date.now()}_1`;

    const newItem: StorySkeletonItem = {
      id: `skel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      userId: user.id,
      order,
      title: defaultTitle,
      status: 'draft',
      content: '',
      ideas: [{ id: initialIdeaId, content: '' }],
      createdAt: new Date().toISOString()
    };

    let updatedList: StorySkeletonItem[];
    if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex < items.length) {
      updatedList = [
        ...items.slice(0, insertIndex),
        newItem,
        ...items.slice(insertIndex)
      ];
    } else {
      updatedList = [...items, newItem];
    }

    updatedList = updatedList.map((it, idx) => ({ ...it, order: idx + 1 }));
    setItems(updatedList);
    setActiveIdeaFocusId(initialIdeaId);

    try {
      await saveStorySkeletonItem(newItem, user.id);
      if (updatedList.length > 1) {
        await reorderStorySkeleton(projectId, user.id, updatedList);
      }
      showFeedback('Novo capítulo adicionado ao esqueleto!');
    } catch (err) {
      console.error('Erro ao adicionar capítulo ao esqueleto:', err);
    }
  };

  // Add an idea sub-box to a chapter
  const handleAddIdeaToChapter = (itemId: string) => {
    if (readOnly) return;
    const currentItem = items.find(i => i.id === itemId);
    if (!currentItem) return;

    const currentIdeas = getItemIdeas(currentItem);
    const newIdeaId = `idea_${itemId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newIdeaBox: SkeletonIdeaBox = {
      id: newIdeaId,
      content: '',
      createdAt: new Date().toISOString()
    };

    const updatedIdeas = [...currentIdeas, newIdeaBox];
    setActiveIdeaFocusId(newIdeaId);

    // Make sure chapter is open
    setCollapsedIds(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });

    const synthesizedContent = updatedIdeas.map(i => i.content).filter(Boolean).join('\n\n');
    handleUpdateItem(itemId, { ideas: updatedIdeas, content: synthesizedContent }, false);
    showFeedback('Nova caixa de ideia adicionada ao capítulo!');
  };

  // Update content of an idea inside a chapter
  const handleUpdateIdeaContent = (itemId: string, ideaId: string, newContent: string) => {
    if (readOnly) return;
    const currentItem = items.find(i => i.id === itemId);
    if (!currentItem) return;

    const currentIdeas = getItemIdeas(currentItem);
    const updatedIdeas = currentIdeas.map(idBox => idBox.id === ideaId ? { ...idBox, content: newContent } : idBox);
    const synthesizedContent = updatedIdeas.map(i => i.content).filter(Boolean).join('\n\n');

    handleUpdateItem(itemId, { ideas: updatedIdeas, content: synthesizedContent }, true);
  };

  // Move an idea up or down inside a chapter
  const handleMoveIdea = (itemId: string, ideaIndex: number, direction: 'up' | 'down') => {
    if (readOnly) return;
    const currentItem = items.find(i => i.id === itemId);
    if (!currentItem) return;

    const currentIdeas = [...getItemIdeas(currentItem)];
    const targetIndex = direction === 'up' ? ideaIndex - 1 : ideaIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentIdeas.length) return;

    const [moved] = currentIdeas.splice(ideaIndex, 1);
    currentIdeas.splice(targetIndex, 0, moved);

    const synthesizedContent = currentIdeas.map(i => i.content).filter(Boolean).join('\n\n');
    handleUpdateItem(itemId, { ideas: currentIdeas, content: synthesizedContent }, false);
  };

  // Delete an idea inside a chapter
  const handleDeleteIdea = (itemId: string, ideaId: string) => {
    if (readOnly) return;
    const currentItem = items.find(i => i.id === itemId);
    if (!currentItem) return;

    const currentIdeas = getItemIdeas(currentItem);
    if (currentIdeas.length <= 1) {
      const cleared = [{ id: `idea_${itemId}_${Date.now()}`, content: '' }];
      handleUpdateItem(itemId, { ideas: cleared, content: '' }, false);
      showFeedback('Caixa de ideia esvaziada.');
      return;
    }

    const filtered = currentIdeas.filter(i => i.id !== ideaId);
    const synthesizedContent = filtered.map(i => i.content).filter(Boolean).join('\n\n');
    handleUpdateItem(itemId, { ideas: filtered, content: synthesizedContent }, false);
    showFeedback('Caixa de ideia removida do capítulo.');
  };

  // Pre-load templates
  const handleLoadTemplate = async (templateType: 'threeActs' | 'chapters') => {
    if (readOnly || items.length > 0) return;

    let templateBeats: { title: string; content: string; status: SkeletonItemStatus }[] = [];

    if (templateType === 'threeActs') {
      templateBeats = [
        { title: 'Ato I: Status Quo & Incidente Incitante', content: 'Apresentação do protagonista em seu mundo ordinário e o evento disruptivo que quebra sua rotina.', status: 'structured' },
        { title: 'Ato I: Primeiro Ponto de Virada (Travessia do Limiar)', content: 'O protagonista toma a decisão irreversível de entrar no mundo extraordinário da trama.', status: 'structured' },
        { title: 'Ato II: Testes, Aliados e Inimigos', content: 'Desenvolvimento do conflito, primeiras vitórias e novos obstáculos emergindo.', status: 'draft' },
        { title: 'Ato II: Ponto Central (Midpoint & Crise)', content: 'Uma grande revelação ou falsa vitória eleva as apostas ao extremo. A hora mais escura.', status: 'draft' },
        { title: 'Ato III: Clímax & Transformação', content: 'O confronto decisivo onde o protagonista aplica o que aprendeu e resolve o arco principal.', status: 'draft' },
        { title: 'Ato III: Nova Realidade & Desfecho', content: 'As consequências finais do clímax e o estabelecimento de uma nova ordem no universo da história.', status: 'draft' }
      ];
    } else {
      templateBeats = [
        { title: 'Capítulo 1: O Começo', content: 'Abertura impactante que fisga o leitor e apresenta a atmosfera da história.', status: 'structured' },
        { title: 'Capítulo 2: A Ruptura', content: 'O conflito começa a se manifestar e forças opostas entram em colisão.', status: 'draft' },
        { title: 'Capítulo 3: O Primeiro Confronto', content: 'As decisões dos personagens geram consequências inesperadas.', status: 'draft' }
      ];
    }

    const createdItems: StorySkeletonItem[] = templateBeats.map((beat, idx) => ({
      id: `skel_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
      projectId,
      userId: user.id,
      order: idx + 1,
      title: beat.title,
      status: beat.status,
      content: beat.content,
      ideas: [{ id: `idea_${idx}_1`, content: beat.content }],
      createdAt: new Date().toISOString()
    }));

    setItems(createdItems);
    for (const it of createdItems) {
      await saveStorySkeletonItem(it, user.id);
    }
    showFeedback('Modelo aplicado com sucesso ao esqueleto!');
  };

  // Move a chapter up or down
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (readOnly) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const copy = [...items];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    const reordered = copy.map((it, idx) => ({ ...it, order: idx + 1 }));
    setItems(reordered);
    await reorderStorySkeleton(projectId, user.id, reordered);
  };

  // Delete an entire chapter
  const handleDelete = async (itemId: string) => {
    if (readOnly) return;
    if (!window.confirm('Tem certeza de que deseja remover este capítulo inteiro do esqueleto da obra?')) return;

    const filtered = items.filter(i => i.id !== itemId).map((it, idx) => ({ ...it, order: idx + 1 }));
    setItems(filtered);
    await deleteStorySkeletonItem(itemId, projectId);
    if (filtered.length > 0) {
      await reorderStorySkeleton(projectId, user.id, filtered);
    }
    showFeedback('Capítulo removido do esqueleto.');
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered items
  const filteredItems = items.filter(item => {
    if (selectedStatusFilter !== 'all' && (item.status || 'draft') !== selectedStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchContent = (item.content || '').toLowerCase().includes(q);
      const matchIdeas = (item.ideas || []).some(idBox => (idBox.content || '').toLowerCase().includes(q));
      return matchTitle || matchContent || matchIdeas;
    }
    return true;
  });

  // Status counts
  const draftCount = items.filter(i => !i.status || i.status === 'draft').length;
  const structuredCount = items.filter(i => i.status === 'structured').length;
  const writingCount = items.filter(i => i.status === 'writing').length;
  const completedCount = items.filter(i => i.status === 'completed').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/90 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700/80 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-7 shadow-xl border border-violet-500/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-400/30 text-xs font-bold uppercase tracking-wider">
              <ListTree className="w-3.5 h-3.5 text-violet-400" />
              <span>Espinha Dorsal Criativa</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>🦴 Esqueleto da Obra</span>
              <span className="text-sm font-extrabold px-3 py-0.5 rounded-full bg-violet-900/80 text-violet-200 border border-violet-700/60">
                {items.length} {items.length === 1 ? 'capítulo' : 'capítulos estruturados'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Estruture a narrativa capítulo a capítulo. Abra cada gaveta e empilhe caixas de ideias e cenas independentes para compor o enredo com clareza visual.
            </p>

            {/* Quick Status Badges */}
            <div className="flex items-center gap-2 pt-2 flex-wrap text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  selectedStatusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-md font-black'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                Todos ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('draft')}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  selectedStatusFilter === 'draft'
                    ? 'bg-amber-400 text-amber-950 shadow-md font-black'
                    : 'bg-amber-900/40 text-amber-300 border border-amber-500/30 hover:bg-amber-900/60'
                }`}
              >
                💡 Ideia Inicial ({draftCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('structured')}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  selectedStatusFilter === 'structured'
                    ? 'bg-sky-400 text-sky-950 shadow-md font-black'
                    : 'bg-sky-900/40 text-sky-300 border border-sky-500/30 hover:bg-sky-900/60'
                }`}
              >
                📐 Estruturado ({structuredCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('writing')}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  selectedStatusFilter === 'writing'
                    ? 'bg-violet-400 text-violet-950 shadow-md font-black'
                    : 'bg-violet-900/40 text-violet-300 border border-violet-500/30 hover:bg-violet-900/60'
                }`}
              >
                ✍️ Escrevendo ({writingCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  selectedStatusFilter === 'completed'
                    ? 'bg-emerald-400 text-emerald-950 shadow-md font-black'
                    : 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
                }`}
              >
                ✅ Concluído ({completedCount})
              </button>
            </div>
          </div>

          {/* Action Button & Search */}
          <div className="flex flex-col sm:flex-row md:flex-col items-end gap-3 flex-shrink-0">
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleAddBox()}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-violet-300/30"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>+ Adicionar Capítulo</span>
              </button>
            )}

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar no esqueleto..."
                className="w-full pl-9 pr-3 py-2 bg-white/10 hover:bg-white/15 focus:bg-white text-slate-100 focus:text-slate-900 placeholder:text-slate-400 text-xs rounded-xl border border-white/15 focus:border-violet-400 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Spine & Chapters Content */}
      {items.length === 0 ? (
        /* Empty State with Template Starters */
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border-2 border-dashed border-violet-200/90 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 bg-violet-100 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-inner text-violet-600">
            🦴
          </div>
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Seu Esqueleto Narrativo está Vazio
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              O esqueleto ajuda você a enxergar toda a espinha dorsal do seu livro antes ou durante a escrita, organizando ideias em sequência fluida.
            </p>
          </div>

          {!readOnly && (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleAddBox()}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Começar com o Capítulo 1</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadTemplate('threeActs')}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Modelo: Jornada em 3 Atos</span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadTemplate('chapters')}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Modelo: Capítulo a Capítulo</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Vertical Sequence Spine */
        <div className="relative pl-6 sm:pl-10 space-y-5">
          {/* Central Vertical Dotted Spine Line */}
          <div className="absolute top-6 bottom-6 left-3 sm:left-5 w-0.5 border-l-2 border-dashed border-violet-300 pointer-events-none" />

          {filteredItems.map((item, index) => {
            const statusInfo = STATUS_CONFIG[item.status || 'draft'];
            const isCollapsed = collapsedIds.has(item.id);
            const isSaving = savingId === item.id;
            const ideas = getItemIdeas(item);

            return (
              <React.Fragment key={item.id}>
                {/* Chapter Card Container */}
                <div className="relative group">
                  {/* Spine Milestone Node Badge (EXATAMENTE COMO ESTÁ HOJE) */}
                  <div
                    className={`absolute -left-6 sm:-left-10 top-5 w-6 h-6 sm:w-8 sm:h-8 rounded-full ${statusInfo.badgeBg} text-white font-black text-[10px] sm:text-xs flex items-center justify-center shadow-md ring-4 ring-white z-10`}
                    title={`Capítulo #${item.order}`}
                  >
                    #{item.order}
                  </div>

                  <div
                    className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm hover:shadow-md border transition-all duration-200 ${statusInfo.border}`}
                  >
                    {/* Header Row: Title, Status Pill, Move, Collapse & Delete Controls (EXATAMENTE COMO ESTÁ HOJE) */}
                    <div
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 cursor-pointer select-none`}
                      onClick={() => toggleCollapse(item.id)}
                    >
                      {/* Left: Icon + Chapter Title + Ideas Counter Badge */}
                      <div className="flex-1 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <span className="text-lg flex-shrink-0">{statusInfo.icon}</span>
                        {readOnly ? (
                          <span className="font-extrabold text-base text-slate-800">{item.title}</span>
                        ) : (
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateItem(item.id, { title: e.target.value }, true)}
                            placeholder="Título do Capítulo (ex: Incidente Incitante, Capítulo 1)..."
                            className="text-sm sm:text-base font-extrabold text-slate-800 placeholder:text-slate-300 bg-transparent hover:bg-slate-50 focus:bg-slate-50/80 px-2 py-1 rounded-xl outline-none focus:ring-1 focus:ring-violet-400 transition-all flex-1 min-w-[180px]"
                          />
                        )}
                        {/* Contador de caixas de ideias existentes lá dentro */}
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 whitespace-nowrap shadow-2xs"
                          title={`${ideas.length} caixa(s) de ideia(s) neste capítulo`}
                        >
                          <span>{ideas.length}</span>
                          <span>{ideas.length === 1 ? 'ideia' : 'ideias'}</span>
                        </span>
                        {isSaving && (
                          <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 animate-pulse">
                            Salvando...
                          </span>
                        )}
                      </div>

                      {/* Right: Status Selector, Move Up/Down, Collapse Button & Trash */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {/* Status Dropdown/Pill */}
                        {!readOnly ? (
                          <div className="relative inline-block">
                            <select
                              value={item.status || 'draft'}
                              onChange={(e) => handleUpdateItem(item.id, { status: e.target.value as SkeletonItemStatus })}
                              className={`appearance-none text-xs font-extrabold px-3 py-1.5 pr-7 rounded-xl border cursor-pointer outline-none transition-all ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                            >
                              <option value="draft">💡 Ideia Inicial</option>
                              <option value="structured">📐 Estruturado</option>
                              <option value="writing">✍️ Escrevendo</option>
                              <option value="completed">✅ Concluído</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                          </div>
                        ) : (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${statusInfo.bg} ${statusInfo.text} border ${statusInfo.border}`}>
                            {statusInfo.icon} {statusInfo.label}
                          </span>
                        )}

                        {/* Move Up Button */}
                        {!readOnly && (
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMove(index, 'up')}
                            className="p-1.5 text-slate-400 hover:text-violet-700 hover:bg-violet-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title="Mover para cima"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                        )}

                        {/* Move Down Button */}
                        {!readOnly && (
                          <button
                            type="button"
                            disabled={index === items.length - 1}
                            onClick={() => handleMove(index, 'down')}
                            className="p-1.5 text-slate-400 hover:text-violet-700 hover:bg-violet-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title="Mover para baixo"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        )}

                        {/* Collapse/Expand Toggle (⌃ / ⌄) */}
                        <button
                          type="button"
                          onClick={() => toggleCollapse(item.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title={isCollapsed ? 'Expandir capítulo' : 'Recolher capítulo'}
                        >
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>

                        {/* Delete Button (🗑️) */}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
                            title="Excluir capítulo do esqueleto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Gaveta Deslizante para Baixo (Slide-Down / Accordion Suave) */}
                    <div
                      className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[8000px] opacity-100 pt-4'
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Caixas de Ideias Empilhadas */}
                        {ideas.map((idea, ideaIdx) => (
                          <div
                            key={idea.id}
                            className={`bg-white border-l-4 ${statusInfo.borderLeft} rounded-2xl shadow-sm hover:shadow-md p-4 sm:p-5 transition-all duration-200 border border-slate-200/80 group/ideabox`}
                          >
                            {/* Header da Caixa de Ideia: Marcador Numerado + Controles Mover/Excluir */}
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs text-slate-500">
                              <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${statusInfo.badgeBg}`} />
                                <span>Cena / Ideia {item.order}.{ideaIdx + 1}</span>
                              </span>

                              {!readOnly && (
                                <div className="flex items-center gap-1 opacity-70 group-hover/ideabox:opacity-100 transition-opacity">
                                  {/* Mover Ideia para Cima */}
                                  <button
                                    type="button"
                                    disabled={ideaIdx === 0}
                                    onClick={() => handleMoveIdea(item.id, ideaIdx, 'up')}
                                    className="p-1 text-slate-400 hover:text-violet-700 hover:bg-violet-50 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                    title="Mover ideia para cima dentro deste capítulo"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Mover Ideia para Baixo */}
                                  <button
                                    type="button"
                                    disabled={ideaIdx === ideas.length - 1}
                                    onClick={() => handleMoveIdea(item.id, ideaIdx, 'down')}
                                    className="p-1 text-slate-400 hover:text-violet-700 hover:bg-violet-50 rounded-lg disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                    title="Mover ideia para baixo dentro deste capítulo"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Excluir esta Caixa de Ideia */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteIdea(item.id, idea.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
                                    title="Excluir esta caixa de ideia"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Tipografia Viva e Legível: Auto-Resize sem barra de rolagem */}
                            {readOnly ? (
                              <p className="text-slate-800 text-base leading-relaxed font-medium whitespace-pre-wrap py-1">
                                {idea.content || <span className="italic text-slate-400 font-normal">Nenhum detalhe descrito.</span>}
                              </p>
                            ) : (
                              <textarea
                                ref={(el) => {
                                  if (el) {
                                    el.style.height = 'auto';
                                    el.style.height = `${Math.max(el.scrollHeight, 56)}px`;
                                  }
                                }}
                                value={idea.content}
                                autoFocus={activeIdeaFocusId === idea.id}
                                onFocus={() => {
                                  if (activeIdeaFocusId === idea.id) setActiveIdeaFocusId(null);
                                }}
                                onChange={(e) => {
                                  e.target.style.height = 'auto';
                                  e.target.style.height = `${Math.max(e.target.scrollHeight, 56)}px`;
                                  handleUpdateIdeaContent(item.id, idea.id, e.target.value);
                                }}
                                placeholder="Descreva o que acontece nesta parte da história: ações, revelações, emoções dos personagens ou conflito..."
                                className="w-full text-slate-800 text-base leading-relaxed font-medium placeholder:text-slate-300 placeholder:font-normal bg-transparent outline-none resize-none overflow-hidden transition-all"
                                rows={2}
                              />
                            )}
                          </div>
                        ))}

                        {/* Botão Convidativo: + Adicionar caixa de ideia ao capítulo */}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleAddIdeaToChapter(item.id)}
                            className={`w-full py-3 px-4 rounded-2xl ${statusInfo.subAddBg} ${statusInfo.subAddText} border-2 border-dashed ${statusInfo.subAddBorder} font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-sm group/btnadd`}
                          >
                            <div className={`w-5 h-5 rounded-full ${statusInfo.subAddCircle} flex items-center justify-center transition-colors`}>
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span>+ Adicionar caixa de ideia ao capítulo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Insert (+) Pill between chapters */}
                {!readOnly && index < items.length - 1 && (
                  <div className="relative flex justify-center py-1 group/insert">
                    <button
                      type="button"
                      onClick={() => handleAddBox(index + 1)}
                      className="opacity-0 group-hover/insert:opacity-100 focus:opacity-100 transition-opacity duration-200 bg-white hover:bg-violet-600 text-slate-400 hover:text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-sm border border-slate-200 hover:border-violet-600 flex items-center gap-1 cursor-pointer transform hover:scale-105 active:scale-95"
                      title="Inserir capítulo aqui na sequência"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Inserir capítulo entre #{item.order} e #{item.order + 1}</span>
                    </button>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Bottom Add Next Chapter Button (MANTIDO INTACTO) */}
          {!readOnly && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleAddBox()}
                className="w-full py-4 rounded-3xl border-2 border-dashed border-violet-200 hover:border-violet-500 bg-violet-50/40 hover:bg-violet-50 text-violet-700 font-extrabold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-2xs hover:shadow-md cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-full bg-violet-200 group-hover:bg-violet-600 text-violet-700 group-hover:text-white flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span>+ Adicionar Próximo Capítulo ao Esqueleto (#{items.length + 1})</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
