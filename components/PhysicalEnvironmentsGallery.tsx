import React, { useState, useEffect } from 'react';
import { StoryEnvironment, EnvironmentCategory, User } from '../types';
import {
  getStoryEnvironments,
  subscribeToStoryEnvironments,
  saveStoryEnvironment,
  deleteStoryEnvironment
} from '../services/projectCreativeService';
import { resizeImageToBase64 } from '../utils/imageProcessor';
import {
  Compass,
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Volume2,
  Wind,
  Users,
  Eye,
  X
} from 'lucide-react';

interface PhysicalEnvironmentsGalleryProps {
  projectId: string;
  user: User;
  readOnly?: boolean;
}

const CATEGORY_CONFIG: Record<EnvironmentCategory, { label: string; icon: string; bg: string; text: string; border: string }> = {
  interior: {
    label: 'Interior',
    icon: '🏠',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200'
  },
  exterior: {
    label: 'Exterior / Natureza',
    icon: '🌲',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200'
  },
  city: {
    label: 'Cidade / Região',
    icon: '🏙️',
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200'
  },
  shelter: {
    label: 'Refúgio / Porto Seguro',
    icon: '🛡️',
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200'
  },
  conflict: {
    label: 'Local de Conflito',
    icon: '⚡',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200'
  },
  other: {
    label: 'Outro Cenário',
    icon: '📍',
    bg: 'bg-slate-50',
    text: 'text-slate-800',
    border: 'border-slate-200'
  }
};

export const PhysicalEnvironmentsGallery: React.FC<PhysicalEnvironmentsGalleryProps> = ({
  projectId,
  user,
  readOnly = false
}) => {
  const [environments, setEnvironments] = useState<StoryEnvironment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | EnvironmentCategory>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<StoryEnvironment | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<EnvironmentCategory>('interior');
  const [formVisual, setFormVisual] = useState('');
  const [formSensory, setFormSensory] = useState('');
  const [formScenes, setFormScenes] = useState('');
  const [formImageBase64, setFormImageBase64] = useState<string>('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    getStoryEnvironments(projectId, user.id).then(cached => {
      if (isMounted && cached.length > 0) {
        setEnvironments(cached);
      }
    });

    const unsubscribe = subscribeToStoryEnvironments(projectId, user.id, (fresh) => {
      if (isMounted) {
        setEnvironments(fresh);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [projectId, user.id]);

  const showFeedback = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleOpenCreateModal = () => {
    setEditingEnv(null);
    setFormName('');
    setFormCategory('interior');
    setFormVisual('');
    setFormSensory('');
    setFormScenes('');
    setFormImageBase64('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (env: StoryEnvironment) => {
    setEditingEnv(env);
    setFormName(env.name);
    setFormCategory(env.category || 'interior');
    setFormVisual(env.visualDescription || '');
    setFormSensory(env.sensoryAtmosphere || '');
    setFormScenes(env.associatedScenesOrCharacters || '');
    setFormImageBase64(env.imageBase64 || env.imageUrl || '');
    setIsModalOpen(true);
  };

  // Image upload with Canvas compression (<= 35KB)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      // 400x260 JPEG quality 0.7 gives ~15-25KB Base64
      const base64 = await resizeImageToBase64(file, 400, 260, 0.7);
      setFormImageBase64(base64);
      showFeedback('Imagem de referência otimizada!');
    } catch (err) {
      console.error('Erro ao comprimir imagem:', err);
      alert('Não foi possível processar a imagem. Tente outro arquivo.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || readOnly) return;

    const envPayload: StoryEnvironment = {
      id: editingEnv?.id || `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      userId: user.id,
      name: formName.trim(),
      category: formCategory,
      visualDescription: formVisual.trim(),
      sensoryAtmosphere: formSensory.trim(),
      associatedScenesOrCharacters: formScenes.trim(),
      imageBase64: formImageBase64 || undefined,
      createdAt: editingEnv?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Optimistic UI update
    setEnvironments(prev => {
      const idx = prev.findIndex(e => e.id === envPayload.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = envPayload;
        return copy;
      }
      return [...prev, envPayload];
    });

    setIsModalOpen(false);

    try {
      await saveStoryEnvironment(envPayload, user.id);
      showFeedback(editingEnv ? 'Ambiente físico atualizado!' : 'Novo ambiente cadastrado!');
    } catch (err) {
      console.error('Erro ao salvar ambiente:', err);
      alert('Erro ao salvar no Firestore. Verifique sua conexão.');
    }
  };

  const handleDelete = async (envId: string) => {
    if (readOnly) return;
    if (!window.confirm('Tem certeza de que deseja remover este ambiente físico?')) return;

    setEnvironments(prev => prev.filter(e => e.id !== envId));
    try {
      await deleteStoryEnvironment(envId, projectId);
      showFeedback('Ambiente removido.');
    } catch (err) {
      console.error('Erro ao excluir ambiente:', err);
    }
  };

  // Filtered list
  const filteredEnvironments = environments.filter(env => {
    if (categoryFilter !== 'all' && (env.category || 'interior') !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (env.name || '').toLowerCase().includes(q);
      const matchVisual = (env.visualDescription || '').toLowerCase().includes(q);
      const matchSensory = (env.sensoryAtmosphere || '').toLowerCase().includes(q);
      const matchScenes = (env.associatedScenesOrCharacters || '').toLowerCase().includes(q);
      return matchName || matchVisual || matchSensory || matchScenes;
    }
    return true;
  });

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950 via-slate-900 to-emerald-950 text-white p-5 sm:p-7 shadow-xl border border-teal-500/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-bold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-teal-400" />
              <span>Worldbuilding & Cenografia</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>🏛️ Ambientes Físicos</span>
              <span className="text-sm font-extrabold px-3 py-0.5 rounded-full bg-teal-900/80 text-teal-200 border border-teal-700/60">
                {environments.length} {environments.length === 1 ? 'cenário' : 'cenários catalogados'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Mapeie os locais e atmosferas onde sua narrativa ganha vida. Registre detalhes visuais, texturas sensoriais, sons e clima para manter uma imersão consistente.
            </p>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 pt-2 flex-wrap text-xs font-bold">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-md font-black'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                Todos ({environments.length})
              </button>
              {(Object.keys(CATEGORY_CONFIG) as EnvironmentCategory[]).map(cat => {
                const conf = CATEGORY_CONFIG[cat];
                const count = environments.filter(e => (e.category || 'interior') === cat).length;
                const isSelected = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-400 text-emerald-950 shadow-md font-black'
                        : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
                    }`}
                  >
                    <span>{conf.icon}</span>
                    <span>{conf.label}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button & Search */}
          <div className="flex flex-col sm:flex-row md:flex-col items-end gap-3 flex-shrink-0">
            {!readOnly && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-teal-600/30 hover:shadow-teal-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-teal-300/30"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>+ Adicionar Ambiente Físico</span>
              </button>
            )}

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cenários ou detalhes..."
                className="w-full pl-9 pr-3 py-2 bg-white/10 hover:bg-white/15 focus:bg-white text-slate-100 focus:text-slate-900 placeholder:text-slate-400 text-xs rounded-xl border border-white/15 focus:border-teal-400 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid: Environments Cards */}
      {environments.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border-2 border-dashed border-teal-200/90 shadow-sm max-w-2xl mx-auto space-y-5">
          <div className="w-16 h-16 bg-teal-100 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-inner text-teal-600">
            🏛️
          </div>
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Nenhum Ambiente Físico Cadastrado
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Dê corpo e textura ao mundo da sua história catalogando seus cenários com detalhes visuais, sensoriais e imagens de inspiração.
            </p>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Cenário</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEnvironments.map(env => {
            const conf = CATEGORY_CONFIG[env.category || 'interior'];
            const hasImage = Boolean(env.imageBase64 || env.imageUrl);

            return (
              <div
                key={env.id}
                className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-lg border border-slate-200/80 transition-all duration-300 flex flex-col justify-between group overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Optional Moodboard Image Banner */}
                  {hasImage && (
                    <div className="relative h-44 -mx-5 -mt-5 sm:-mx-6 sm:-mt-6 mb-4 overflow-hidden rounded-t-3xl bg-slate-900">
                      <img
                        src={env.imageBase64 || env.imageUrl}
                        alt={env.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-3 left-4">
                        <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md ${conf.bg} ${conf.text} border ${conf.border}`}>
                          {conf.icon} {conf.label}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      {!hasImage && (
                        <span className={`inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${conf.bg} ${conf.text} border ${conf.border} mb-1`}>
                          {conf.icon} {conf.label}
                        </span>
                      )}
                      <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight group-hover:text-teal-700 transition-colors">
                        {env.name}
                      </h3>
                    </div>

                    {/* Actions */}
                    {!readOnly && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(env)}
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors cursor-pointer"
                          title="Editar ambiente"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(env.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Excluir ambiente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Visual & Architecture Section */}
                  {env.visualDescription && (
                    <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <Eye className="w-3.5 h-3.5 text-teal-600" />
                        <span>Espaço Físico & Arquitetura</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {env.visualDescription}
                      </p>
                    </div>
                  )}

                  {/* Atmosphere & Sensory Details (Sounds, Smells, Climate) */}
                  {env.sensoryAtmosphere && (
                    <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 text-xs text-emerald-950 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                        <Wind className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Atmosfera Sensorial (Sons, Cheiros, Clima)</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {env.sensoryAtmosphere}
                      </p>
                    </div>
                  )}

                  {/* Associated Scenes / Characters */}
                  {env.associatedScenesOrCharacters && (
                    <div className="flex items-start gap-2 pt-1 text-xs text-slate-600">
                      <Users className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-700">Cenas / Frequência: </span>
                        <span>{env.associatedScenesOrCharacters}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Timestamp */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Atualizado recentemente</span>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(env)}
                    className="text-teal-600 hover:text-teal-800 font-bold hover:underline cursor-pointer"
                  >
                    Ver detalhes / Editar →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Physical Environment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏛️</span>
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    {editingEnv ? 'Editar Ambiente Físico' : 'Novo Ambiente Físico'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Descreva o cenário para enriquecer o apelo sensorial da sua história.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Row 1: Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nome do Ambiente / Local *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Vagão do Meio, Cafeteria Central..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tipo / Categoria
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as EnvironmentCategory)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all cursor-pointer bg-white"
                  >
                    <option value="interior">🏠 Interior</option>
                    <option value="exterior">🌲 Exterior / Natureza</option>
                    <option value="city">🏙️ Cidade / Região</option>
                    <option value="shelter">🛡️ Refúgio / Porto Seguro</option>
                    <option value="conflict">⚡ Local de Conflito</option>
                    <option value="other">📍 Outro Cenário</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Visual Description & Architecture */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-teal-600" />
                  <span>Descrição Visual e Arquitetura</span>
                </label>
                <textarea
                  rows={3}
                  value={formVisual}
                  onChange={(e) => setFormVisual(e.target.value)}
                  placeholder="Como é a iluminação, dimensões, disposição dos móveis, materiais, cores e objetos marcantes?"
                  className="w-full p-3 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all resize-y"
                />
              </div>

              {/* Row 3: Atmosphere & Sensory Details (Sounds, Smells, Climate) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Atmosfera & Detalhes Sensoriais (Sons, Cheiros, Clima)</span>
                </label>
                <textarea
                  rows={2}
                  value={formSensory}
                  onChange={(e) => setFormSensory(e.target.value)}
                  placeholder="Que barulho ecoa ao fundo? Há cheiro de chuva, café ou mofo? Como é a temperatura?"
                  className="w-full p-3 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all resize-y"
                />
              </div>

              {/* Row 4: Associated Scenes & Characters */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cenas / Personagens Associados (Nota rápida)</span>
                </label>
                <input
                  type="text"
                  value={formScenes}
                  onChange={(e) => setFormScenes(e.target.value)}
                  placeholder="Quem frequenta este lugar? Qual evento marcante da trama acontece aqui?"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                />
              </div>

              {/* Row 5: Reference Image / Moodboard (Compressed Base64) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                    <span>Imagem de Referência / Moodboard (Opcional)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Comprimido para até 35KB
                  </span>
                </label>

                <div className="flex items-center gap-4">
                  {formImageBase64 ? (
                    <div className="relative w-28 h-20 rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0 group">
                      <img src={formImageBase64} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormImageBase64('')}
                        className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs flex-shrink-0">
                      Sem imagem
                    </div>
                  )}

                  <div className="space-y-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                      id="env-image-input"
                    />
                    <label
                      htmlFor="env-image-input"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>{isUploadingImage ? 'Otimizando...' : (formImageBase64 ? 'Alterar Imagem' : 'Escolher Imagem')}</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Formatos aceitos: JPG, PNG, WebP. Compressão instantânea no navegador.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-md shadow-teal-500/20 transition-all cursor-pointer"
                >
                  {editingEnv ? 'Salvar Alterações' : 'Cadastrar Cenário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
