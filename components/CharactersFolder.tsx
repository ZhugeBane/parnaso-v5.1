import React, { useState, useEffect, useMemo } from 'react';
import {
  Character,
  CharacterRelationshipItem,
  CustomCharacterField,
  TraitItem,
  User
} from '../types';
import {
  getCharacters,
  saveCharacter,
  deleteCharacter
} from '../services/projectCreativeService';
import { ImagePicker } from './ui/ImagePicker';
import {
  Sparkles,
  Edit3,
  Save,
  X,
  Trash2,
  Plus,
  Users,
  Compass,
  Zap,
  Target,
  Heart,
  Shield,
  Layers,
  ChevronRight,
  Flame,
  ArrowRight,
  Quote,
  Eye,
  Activity,
  Sliders,
  Check
} from 'lucide-react';

interface CharactersFolderProps {
  projectId: string;
  user: User;
  readOnly?: boolean;
}

const ROLES = [
  'Protagonista',
  'Antagonista',
  'Deuteragonista',
  'Tritagonista',
  'Mentor',
  'Coadjuvante',
  'Alívio Cômico',
  'Interesse Amoroso',
  'Guardião',
  'Vilão Secundário',
  'Outro'
];

const ROLE_COLORS: Record<string, string> = {
  Protagonista: 'bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:text-emerald-300',
  Antagonista: 'bg-rose-500/15 text-rose-700 border-rose-300 dark:text-rose-300',
  Deuteragonista: 'bg-blue-500/15 text-blue-700 border-blue-300 dark:text-blue-300',
  Mentor: 'bg-purple-500/15 text-purple-700 border-purple-300 dark:text-purple-300',
  Coadjuvante: 'bg-slate-500/15 text-slate-700 border-slate-300 dark:text-slate-300',
  'Interesse Amoroso': 'bg-pink-500/15 text-pink-700 border-pink-300 dark:text-pink-300',
  'Alívio Cômico': 'bg-amber-500/15 text-amber-700 border-amber-300 dark:text-amber-300',
  Guardião: 'bg-cyan-500/15 text-cyan-700 border-cyan-300 dark:text-cyan-300',
  'Vilão Secundário': 'bg-red-500/15 text-red-700 border-red-300 dark:text-red-300',
  Outro: 'bg-indigo-500/15 text-indigo-700 border-indigo-300 dark:text-indigo-300'
};

const AURA_COLORS = [
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Ciano Místico', hex: '#06b6d4' },
  { name: 'Safira Estelar', hex: '#3b82f6' },
  { name: 'Índigo Profundo', hex: '#6366f1' },
  { name: 'Ametista Arcana', hex: '#a855f7' },
  { name: 'Rosa Carmesim', hex: '#ec4899' },
  { name: 'Rubi Flamejante', hex: '#f43f5e' },
  { name: 'Âmbar Solar', hex: '#f59e0b' },
  { name: 'Ouro Real', hex: '#eab308' },
  { name: 'Cinza Ébano', hex: '#475569' }
];

const RELATION_TYPES = [
  'Aliado 🤝',
  'Rival ⚔️',
  'Interesse Amoroso 💖',
  'Mentor 🧙‍♂️',
  'Inimigo Jurado 💀',
  'Familiar 🏡',
  'Cúmplice 🕵️',
  'Protegido 🛡️',
  'Desafeto ⚡',
  'Outro ✨'
];

// Fallback dicebear avatar generator
const getDiceBearAvatar = (name: string) => {
  const seed = encodeURIComponent(name?.trim() || 'Hero');
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
};

// Polarity Label Helpers
const getReasonEmotionInfo = (val: number) => {
  if (val <= 20) return { title: 'Lógica Pura / Frio', desc: 'Guia-se apenas por cálculo e evidências.', icon: '🧊', color: 'text-cyan-600' };
  if (val <= 40) return { title: 'Predominantemente Racional', desc: 'O raciocínio analítico supera sentimentos.', icon: '📐', color: 'text-blue-600' };
  if (val <= 60) return { title: 'Equilibrado (Razão & Emoção)', desc: 'Pondera lógica e empatia na mesma medida.', icon: '⚖️', color: 'text-purple-600' };
  if (val <= 80) return { title: 'Impulsionado pela Emoção', desc: 'O coração dita os rumos antes da cabeça.', icon: '🔥', color: 'text-amber-600' };
  return { title: 'Pura Paixão / Instintivo', desc: 'Age no calor do momento sem freios.', icon: '💥', color: 'text-rose-600' };
};

const getCautionImpulseInfo = (val: number) => {
  if (val <= 20) return { title: 'Máxima Cautela / Metódico', desc: 'Antecipa cada perigo e nunca se precipita.', icon: '🛡️', color: 'text-emerald-600' };
  if (val <= 40) return { title: 'Prudente & Estratégico', desc: 'Prefere segurança e passos firmes.', icon: '🔍', color: 'text-teal-600' };
  if (val <= 60) return { title: 'Moderado & Adaptável', desc: 'Sabe a hora de recuar e a hora de arriscar.', icon: '⚖️', color: 'text-indigo-600' };
  if (val <= 80) return { title: 'Ousado & Destemido', desc: 'Assume riscos elevados sem hesitar.', icon: '⚡', color: 'text-orange-600' };
  return { title: 'Puro Impulso / Temerário', desc: 'Pula no abismo antes de olhar o fundo.', icon: '🚀', color: 'text-red-600' };
};

const getAltruismSelfishnessInfo = (val: number) => {
  if (val <= 20) return { title: 'Abnegado / Sacrifício', desc: 'Daria a própria vida pelo bem alheio.', icon: '🕊️', color: 'text-sky-600' };
  if (val <= 40) return { title: 'Generoso & Empático', desc: 'Coloca o bem coletivo no topo das decisões.', icon: '🤝', color: 'text-teal-600' };
  if (val <= 60) return { title: 'Equilibrado & Justo', desc: 'Ajuda o próximo sem se anular por completo.', icon: '⚖️', color: 'text-purple-600' };
  if (val <= 80) return { title: 'Pragmático / Auto-interesse', desc: 'Protege a si mesmo e aos seus primeiro.', icon: '💼', color: 'text-amber-600' };
  return { title: 'Individualista / Sobrevivência', desc: 'Prioridade absoluta para si a qualquer custo.', icon: '👑', color: 'text-rose-600' };
};

export const CharactersFolder: React.FC<CharactersFolderProps> = ({
  projectId,
  user,
  readOnly = false
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Modal Dossier state: Character, Mode (view vs edit), Active Tab
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Character>>({});
  const [activeDossierTab, setActiveDossierTab] = useState<'essence' | 'psychology' | 'arc' | 'extra'>('essence');
  const [activeArcPhase, setActiveArcPhase] = useState<'beginning' | 'middle' | 'climax'>('beginning');

  // New relationship input inside edit mode
  const [newRelTarget, setNewRelTarget] = useState('');
  const [newRelType, setNewRelType] = useState('Aliado 🤝');
  const [newRelDesc, setNewRelDesc] = useState('');

  useEffect(() => {
    loadCharacters();
  }, [projectId]);

  const loadCharacters = async () => {
    setIsLoading(true);
    try {
      const data = await getCharacters(projectId, user.id);
      setCharacters(data);
    } catch (e) {
      console.error('Erro ao buscar personagens:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCharacters = useMemo(() => {
    return characters.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.occupation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.signatureQuote?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRoleFilter === 'all' || c.role === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [characters, searchTerm, selectedRoleFilter]);

  // Open modal in View Mode (RPG Card / Bento Grid)
  const handleOpenView = (char: Character) => {
    setViewingCharacter(char);
    setIsEditing(false);
    setActiveDossierTab('essence');
    setActiveArcPhase('beginning');
  };

  // Open modal in Edit Mode for existing character
  const handleOpenEdit = (char: Character) => {
    setViewingCharacter(char);
    setEditForm({
      ...char,
      color: char.color || '#10b981',
      signatureQuote: char.signatureQuote || '',
      consciousDesire: char.consciousDesire || char.motivation || '',
      unconsciousNeed: char.unconsciousNeed || '',
      theMask: char.theMask || '',
      greatestFear: char.greatestFear || '',
      polarityReasonEmotion: char.polarityReasonEmotion ?? 50,
      polarityCautionImpulse: char.polarityCautionImpulse ?? 50,
      polarityAltruismSelfishness: char.polarityAltruismSelfishness ?? 50,
      arcBeginning: char.arcBeginning || '',
      arcMiddle: char.arcMiddle || '',
      arcClimax: char.arcClimax || '',
      relationships: char.relationships ? [...char.relationships] : [],
      identityItems: char.identityItems ? [...char.identityItems] : [],
      physicalItems: char.physicalItems ? [...char.physicalItems] : [],
      psychologicalItems: char.psychologicalItems ? [...char.psychologicalItems] : [],
      storyItems: char.storyItems ? [...char.storyItems] : [],
      customFields: char.customFields ? [...char.customFields] : []
    });
    setIsEditing(true);
    setActiveDossierTab('essence');
  };

  // Open modal to create a new character
  const handleOpenNewCharacter = () => {
    const randomAura = AURA_COLORS[Math.floor(Math.random() * AURA_COLORS.length)].hex;
    const newChar: Partial<Character> = {
      name: '',
      role: 'Protagonista',
      age: '',
      birthDate: '',
      occupation: '',
      avatarBase64: '',
      avatarUrl: '',
      color: randomAura,
      signatureQuote: '',
      consciousDesire: '',
      unconsciousNeed: '',
      theMask: '',
      greatestFear: '',
      polarityReasonEmotion: 50,
      polarityCautionImpulse: 50,
      polarityAltruismSelfishness: 50,
      arcBeginning: '',
      arcMiddle: '',
      arcClimax: '',
      relationships: [],
      physicalTraits: '',
      psychologicalTraits: '',
      motivation: '',
      background: '',
      relations: '',
      identityItems: [],
      physicalItems: [],
      psychologicalItems: [],
      storyItems: [],
      customFields: []
    };
    setViewingCharacter(null);
    setEditForm(newChar);
    setIsEditing(true);
    setActiveDossierTab('essence');
  };

  // Save character changes
  const handleSaveCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name?.trim()) {
      alert('Por favor, informe o nome do personagem.');
      return;
    }

    const charToSave: Character = {
      id: editForm.id || '',
      projectId,
      userId: user.id,
      name: editForm.name.trim(),
      role: editForm.role || 'Coadjuvante',
      age: editForm.age?.trim() || undefined,
      birthDate: editForm.birthDate?.trim() || undefined,
      occupation: editForm.occupation?.trim() || undefined,
      avatarBase64: editForm.avatarBase64 || undefined,
      avatarUrl: editForm.avatarBase64 || editForm.avatarUrl?.trim() || undefined,
      color: editForm.color || '#10b981',

      // Hero Voice
      signatureQuote: editForm.signatureQuote?.trim() || undefined,

      // Dramatic Core (Bento)
      consciousDesire: editForm.consciousDesire?.trim() || undefined,
      unconsciousNeed: editForm.unconsciousNeed?.trim() || undefined,
      theMask: editForm.theMask?.trim() || undefined,
      greatestFear: editForm.greatestFear?.trim() || undefined,

      // Polarities
      polarityReasonEmotion: editForm.polarityReasonEmotion ?? 50,
      polarityCautionImpulse: editForm.polarityCautionImpulse ?? 50,
      polarityAltruismSelfishness: editForm.polarityAltruismSelfishness ?? 50,

      // Character Arc
      arcBeginning: editForm.arcBeginning?.trim() || undefined,
      arcMiddle: editForm.arcMiddle?.trim() || undefined,
      arcClimax: editForm.arcClimax?.trim() || undefined,

      // Structured relationships
      relationships: editForm.relationships || [],

      // Backward compatible mappings
      motivation: editForm.consciousDesire?.trim() || editForm.motivation || undefined,
      physicalTraits: editForm.physicalTraits?.trim() || undefined,
      psychologicalTraits: editForm.psychologicalTraits?.trim() || undefined,
      background: editForm.background?.trim() || undefined,
      relations: editForm.relations?.trim() || undefined,

      // Trait items and custom fields
      identityItems: editForm.identityItems || [],
      physicalItems: editForm.physicalItems || [],
      psychologicalItems: editForm.psychologicalItems || [],
      storyItems: editForm.storyItems || [],
      customFields: editForm.customFields || [],

      createdAt: editForm.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setIsSaving(true);
    try {
      const saved = await saveCharacter(charToSave, user.id);
      setCharacters(prev => {
        const index = prev.findIndex(c => c.id === saved.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = saved;
          return updated;
        }
        return [...prev, saved];
      });
      setViewingCharacter(saved);
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao salvar personagem:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete character
  const handleDelete = async (charId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este personagem da sua pasta?')) return;
    try {
      await deleteCharacter(charId, projectId);
      setCharacters(prev => prev.filter(c => c.id !== charId));
      if (viewingCharacter?.id === charId) {
        setViewingCharacter(null);
      }
      setIsEditing(false);
    } catch (e) {
      console.error('Erro ao excluir personagem:', e);
    }
  };

  // Add a structured relationship
  const handleAddRelationship = () => {
    if (!newRelTarget.trim()) return;
    const newBond: CharacterRelationshipItem = {
      id: 'rel_' + Date.now(),
      targetCharacterName: newRelTarget.trim(),
      relationType: newRelType,
      description: newRelDesc.trim() || undefined
    };
    setEditForm(prev => ({
      ...prev,
      relationships: [...(prev.relationships || []), newBond]
    }));
    setNewRelTarget('');
    setNewRelDesc('');
  };

  const handleRemoveRelationship = (id: string) => {
    setEditForm(prev => ({
      ...prev,
      relationships: (prev.relationships || []).filter(r => r.id !== id)
    }));
  };

  // Add custom text box
  const handleAddCustomField = () => {
    const newField: CustomCharacterField = {
      id: 'field_' + Date.now(),
      title: 'Nova Informação Extra',
      content: ''
    };
    setEditForm(prev => ({
      ...prev,
      customFields: [...(prev.customFields || []), newField]
    }));
  };

  const handleRemoveCustomField = (fieldId: string) => {
    setEditForm(prev => ({
      ...prev,
      customFields: (prev.customFields || []).filter(f => f.id !== fieldId)
    }));
  };

  const activeChar = isEditing ? editForm : viewingCharacter;
  const auraColor = activeChar?.color || '#10b981';

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome, papel, ocupação ou frase..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
          >
            <option value="all">Todos os Papéis ({characters.length})</option>
            {ROLES.map(r => (
              <option key={r} value={r}>
                {r} ({characters.filter(c => c.role === r).length})
              </option>
            ))}
          </select>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleOpenNewCharacter}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Personagem</span>
          </button>
        )}
      </div>

      {/* Characters Gallery (RPG Cards Grid) */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-sm animate-pulse flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500 animate-spin" />
          <span>Carregando fichas de personagens...</span>
        </div>
      ) : characters.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-purple-200 rounded-3xl p-12 text-center max-w-xl mx-auto my-8 shadow-xs">
          <div className="w-16 h-16 mx-auto bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 text-3xl shadow-inner">
            👥
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Sua pasta de personagens está vazia</h3>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Crie seus heróis, vilões, mentores e coadjuvantes com estética de Card de RPG, bússola de temperamento e arco dramático!
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenNewCharacter}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-2xl text-sm shadow-lg shadow-purple-500/25 transition-all cursor-pointer hover:scale-[1.02]"
            >
              + Criar Primeiro Personagem
            </button>
          )}
        </div>
      ) : filteredCharacters.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm bg-white rounded-3xl border border-dashed border-slate-200">
          Nenhum personagem corresponde aos filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCharacters.map(char => {
            const charAura = char.color || '#10b981';
            const roleStyle = ROLE_COLORS[char.role || ''] || 'bg-slate-100 text-slate-700 border-slate-200';
            const avatarSrc = char.avatarBase64 || char.avatarUrl || getDiceBearAvatar(char.name);

            return (
              <div
                key={char.id}
                onClick={() => handleOpenView(char)}
                style={{
                  borderColor: `${charAura}50`,
                  boxShadow: `0 4px 20px -5px ${charAura}20`
                }}
                className="group relative bg-white rounded-3xl p-5 border hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:-translate-y-1"
              >
                {/* Aura Top Gradient & Border glow */}
                <div
                  className="absolute top-0 left-0 right-0 h-28 pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity"
                  style={{
                    background: `linear-gradient(to bottom, ${charAura}40 0%, transparent 100%)`
                  }}
                />

                <div className="relative z-10">
                  {/* Header Row: Avatar, Name & Role Badge */}
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={avatarSrc}
                        alt={char.name}
                        className="w-16 h-16 rounded-2xl object-cover bg-slate-100 border-2 border-white shadow-md group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          // Fallback to dicebear if image link broke
                          (e.currentTarget as HTMLImageElement).src = getDiceBearAvatar(char.name);
                        }}
                      />
                      <span
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-xs"
                        style={{ backgroundColor: charAura }}
                        title="Aura do Personagem"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-extrabold text-slate-800 text-lg group-hover:text-purple-900 transition-colors leading-tight truncate">
                          {char.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${roleStyle}`}>
                          {char.role || 'Coadjuvante'}
                        </span>
                        {char.occupation && (
                          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                            • {char.occupation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Frase Assinatura (Italic Quote) */}
                  {char.signatureQuote ? (
                    <div className="mb-3 px-3 py-1.5 bg-slate-50/90 border-l-2 rounded-r-xl text-xs italic text-slate-600 line-clamp-2"
                      style={{ borderLeftColor: charAura }}>
                      "{char.signatureQuote}"
                    </div>
                  ) : null}

                  {/* Dramatic Core preview pills */}
                  <div className="space-y-1.5 mb-3 text-xs">
                    {(char.consciousDesire || char.motivation) && (
                      <div className="flex items-start gap-1.5 text-slate-600">
                        <span className="text-sm leading-none">🎯</span>
                        <span className="line-clamp-1 font-medium">
                          <strong className="text-slate-700">Meta:</strong> {char.consciousDesire || char.motivation}
                        </span>
                      </div>
                    )}
                    {char.greatestFear && (
                      <div className="flex items-start gap-1.5 text-slate-600">
                        <span className="text-sm leading-none">⚡</span>
                        <span className="line-clamp-1 font-medium">
                          <strong className="text-slate-700">Medo:</strong> {char.greatestFear}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Strip */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-2 relative z-10">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <span>👥</span>
                    <span>{(char.relationships?.length || 0)} vínculos</span>
                  </span>

                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {!readOnly && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(char)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                          title="Editar Ficha"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(char.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Excluir Personagem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenView(char)}
                      className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver Ficha</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DOSSIER MODAL: RPG CARD & BENTO GRID (VIEW OR EDIT MODE) */}
      {(viewingCharacter || isEditing) && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fade-in">
          <div
            style={{
              borderColor: `${auraColor}70`,
              boxShadow: `0 25px 70px -15px ${auraColor}35, 0 0 25px ${auraColor}20`
            }}
            className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border-2 transition-all duration-300"
          >
            {/* TOP BAR: Controls & Mode Switcher */}
            <div className="px-5 py-3.5 border-b border-slate-100 bg-white/95 flex items-center justify-between flex-shrink-0 z-20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: auraColor }} />
                  <span>Ficha de Personagem • {isEditing ? 'Modo Edição' : 'Modo Visualização RPG'}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!isEditing && !readOnly && viewingCharacter && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(viewingCharacter)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm shadow-purple-500/20 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Ficha</span>
                  </button>
                )}

                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      if (viewingCharacter) {
                        setIsEditing(false);
                      } else {
                        setViewingCharacter(null);
                        setIsEditing(false);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setViewingCharacter(null);
                    setIsEditing(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* DYNAMIC HERO HEADER */}
            <div
              className="relative p-6 sm:p-8 flex-shrink-0 border-b border-slate-100 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${auraColor}22 0%, ${auraColor}06 60%, #ffffff 100%)`
              }}
            >
              {/* Radial Aura Glow effect */}
              <div
                className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-40"
                style={{ backgroundColor: auraColor }}
              />

              <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Character Photo in Highlight */}
                <div className="relative flex-shrink-0">
                  <div
                    className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-white shadow-xl"
                    style={{
                      boxShadow: `0 10px 30px -5px ${auraColor}40`
                    }}
                  >
                    <img
                      src={
                        (isEditing ? (editForm.avatarBase64 || editForm.avatarUrl) : (viewingCharacter?.avatarBase64 || viewingCharacter?.avatarUrl)) ||
                        getDiceBearAvatar(activeChar?.name || 'Hero')
                      }
                      alt={activeChar?.name || 'Avatar'}
                      className="w-full h-full object-cover rounded-2xl bg-slate-100"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getDiceBearAvatar(activeChar?.name || 'Hero');
                      }}
                    />
                    <span
                      className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-md border-2 border-white"
                      style={{ backgroundColor: auraColor }}
                    >
                      Aura
                    </span>
                  </div>

                  {/* Image upload button in edit mode */}
                  {isEditing && (
                    <div className="mt-3">
                      <ImagePicker
                        currentImage={editForm.avatarBase64 || editForm.avatarUrl}
                        onImageSelected={(base64) => setEditForm(prev => ({ ...prev, avatarBase64: base64, avatarUrl: base64 }))}
                        onImageRemoved={() => setEditForm(prev => ({ ...prev, avatarBase64: '', avatarUrl: '' }))}
                        shape="rounded"
                        size="sm"
                        label="Alterar Foto (200x200)"
                      />
                    </div>
                  )}
                </div>

                {/* Hero Information */}
                <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Nome do Personagem *
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Arthur Pendelton"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-2xl font-black text-xl text-slate-800 outline-none focus:ring-2 focus:ring-purple-400 shadow-xs"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Papel Narrativo
                          </label>
                          <select
                            value={editForm.role || 'Protagonista'}
                            onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Ocupação / Arquétipo
                          </label>
                          <input
                            type="text"
                            value={editForm.occupation || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, occupation: e.target.value }))}
                            placeholder="Ex: Detetive Ocultista"
                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                      </div>

                      {/* Aura Color Selector */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Cor Tema / Aura do Personagem
                        </label>
                        <div className="flex items-center gap-2 flex-wrap">
                          {AURA_COLORS.map(c => (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setEditForm(prev => ({ ...prev, color: c.hex }))}
                              style={{ backgroundColor: c.hex }}
                              className={`w-7 h-7 rounded-xl transition-all cursor-pointer ${
                                editForm.color === c.hex
                                  ? 'scale-125 ring-3 ring-slate-800 ring-offset-2 shadow-md'
                                  : 'hover:scale-110 opacity-80 hover:opacity-100'
                              }`}
                              title={c.name}
                            />
                          ))}
                          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-300">
                            <input
                              type="color"
                              value={editForm.color || '#10b981'}
                              onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                              className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                              title="Cor Personalizada"
                            />
                            <span className="text-[11px] text-slate-400 font-mono">
                              {editForm.color || '#10b981'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Signature Quote Input */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Frase Assinatura (Citação que resume a voz)
                        </label>
                        <div className="relative">
                          <Quote className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={editForm.signatureQuote || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, signatureQuote: e.target.value }))}
                            placeholder="Ex: Não busco a glória, apenas a verdade que todos tentam esconder."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs italic text-slate-700 outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* VIEW MODE HERO */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          {viewingCharacter?.name}
                        </h2>

                        <span
                          className={`text-xs font-black px-3 py-1 rounded-full border shadow-2xs ${
                            ROLE_COLORS[viewingCharacter?.role || ''] || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {viewingCharacter?.role || 'Coadjuvante'}
                        </span>
                      </div>

                      {/* Badges strip: Occupation, Age, BirthDate */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                        {viewingCharacter?.occupation && (
                          <span className="px-3 py-1 rounded-xl bg-white/80 border border-slate-200/80 font-bold text-slate-700 shadow-2xs">
                            💼 {viewingCharacter.occupation}
                          </span>
                        )}
                        {viewingCharacter?.age && (
                          <span className="px-3 py-1 rounded-xl bg-white/80 border border-slate-200/80 font-semibold text-slate-600 shadow-2xs">
                            ⏳ {viewingCharacter.age} {viewingCharacter.age.includes('ano') ? '' : 'anos'}
                          </span>
                        )}
                        {viewingCharacter?.birthDate && (
                          <span className="px-3 py-1 rounded-xl bg-white/80 border border-slate-200/80 font-semibold text-slate-600 shadow-2xs">
                            🎂 {viewingCharacter.birthDate}
                          </span>
                        )}
                      </div>

                      {/* Frase Assinatura (Highlighted Quote) */}
                      <div
                        className="p-3.5 rounded-2xl bg-white/90 border shadow-sm relative text-xs italic text-slate-700 max-w-2xl"
                        style={{ borderLeft: `4px solid ${auraColor}` }}
                      >
                        <Quote className="w-4 h-4 inline-block -mt-1 mr-1 text-slate-400 opacity-60" />
                        <span className="font-serif text-sm">
                          {viewingCharacter?.signatureQuote || '« O silêncio também é uma resposta. »'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* DYNAMIC TABS NAVIGATION */}
            <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6 overflow-x-auto text-xs font-extrabold flex-shrink-0 no-scrollbar">
              {[
                { id: 'essence', label: 'Essência & Motor Dramático', icon: '🎯' },
                { id: 'psychology', label: 'Psicologia & Traços', icon: '🧠' },
                { id: 'arc', label: 'Arco & Relações', icon: '⚡' },
                { id: 'extra', label: `Dados & Caixas Extras (${(activeChar?.customFields?.length || 0) + (activeChar?.identityItems?.length || 0)})`, icon: '📝' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDossierTab(tab.id as any)}
                  className={`py-3.5 px-4 transition-all border-b-2 whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                    activeDossierTab === tab.id
                      ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl font-black'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* TAB CONTENT AREA */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: ESSÊNCIA & MOTOR DRAMÁTICO (4 BENTO CARDS) */}
              {activeDossierTab === 'essence' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Desejo Consciente (Meta) */}
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border border-amber-200/80 shadow-xs space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center text-lg font-bold">
                          🎯
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm">
                            Desejo Consciente (Meta)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            O objetivo tangível que o personagem persegue abertamente
                          </p>
                        </div>
                      </div>

                      {isEditing ? (
                        <textarea
                          rows={3}
                          value={editForm.consciousDesire || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, consciousDesire: e.target.value }))}
                          placeholder="Ex: Encontrar o assassino de seu irmão e provar a inocência de sua família..."
                          className="w-full px-3.5 py-2 bg-white border border-amber-300/80 rounded-2xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-400 leading-relaxed"
                        />
                      ) : (
                        <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/70 p-3 rounded-2xl border border-amber-100 whitespace-pre-wrap">
                          {viewingCharacter?.consciousDesire || viewingCharacter?.motivation || (
                            <span className="text-slate-400 italic">Nenhum desejo consciente cadastrado.</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Card 2: Necessidade Inconsciente (Ferida) */}
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-white border border-rose-200/80 shadow-xs space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-rose-500/20 text-rose-700 flex items-center justify-center text-lg font-bold">
                          💔
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm">
                            Necessidade Inconsciente (Ferida)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            A cura interna que ele precisa aprender para evoluir como pessoa
                          </p>
                        </div>
                      </div>

                      {isEditing ? (
                        <textarea
                          rows={3}
                          value={editForm.unconsciousNeed || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, unconsciousNeed: e.target.value }))}
                          placeholder="Ex: Aprender a confiar nos outros e aceitar que o luto não é fraqueza..."
                          className="w-full px-3.5 py-2 bg-white border border-rose-300/80 rounded-2xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-rose-400 leading-relaxed"
                        />
                      ) : (
                        <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/70 p-3 rounded-2xl border border-rose-100 whitespace-pre-wrap">
                          {viewingCharacter?.unconsciousNeed || (
                            <span className="text-slate-400 italic">Nenhuma ferida interna cadastrada.</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Card 3: A Máscara (Como age) */}
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-white border border-indigo-200/80 shadow-xs space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 text-indigo-700 flex items-center justify-center text-lg font-bold">
                          🎭
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm">
                            A Máscara (Como age socialmente)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            A persona externa que projeta para se proteger do mundo
                          </p>
                        </div>
                      </div>

                      {isEditing ? (
                        <textarea
                          rows={3}
                          value={editForm.theMask || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, theMask: e.target.value }))}
                          placeholder="Ex: Finge ser cínico, desapegado e sarcástico para ninguém notar sua vulnerabilidade..."
                          className="w-full px-3.5 py-2 bg-white border border-indigo-300/80 rounded-2xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed"
                        />
                      ) : (
                        <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/70 p-3 rounded-2xl border border-indigo-100 whitespace-pre-wrap">
                          {viewingCharacter?.theMask || (
                            <span className="text-slate-400 italic">Nenhuma máscara social definida.</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Card 4: Maior Medo */}
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-white border border-purple-200/80 shadow-xs space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-purple-500/20 text-purple-700 flex items-center justify-center text-lg font-bold">
                          ⚡
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm">
                            Maior Medo
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            O pavor primordial que paralisa ou dita suas piores escolhas
                          </p>
                        </div>
                      </div>

                      {isEditing ? (
                        <textarea
                          rows={3}
                          value={editForm.greatestFear || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, greatestFear: e.target.value }))}
                          placeholder="Ex: Ser abandonado na escuridão, ser visto como fraco ou trair seus próprios princípios..."
                          className="w-full px-3.5 py-2 bg-white border border-purple-300/80 rounded-2xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-400 leading-relaxed"
                        />
                      ) : (
                        <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/70 p-3 rounded-2xl border border-purple-100 whitespace-pre-wrap">
                          {viewingCharacter?.greatestFear || (
                            <span className="text-slate-400 italic">Nenhum medo cadastrado.</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Summary Callout */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
                    <span className="text-xl">💡</span>
                    <span>
                      <strong>Dica de Roteiro:</strong> Personagens fascinantes surgem quando o <em>Desejo Consciente</em> colide diretamente com a <em>Necessidade Inconsciente</em>, forçando a queda de sua <em>Máscara</em>.
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: PSICOLOGIA & TRAÇOS (3 SLIDERS DE POLARIDADE) */}
              {activeDossierTab === 'psychology' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-6">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="font-black text-slate-800 text-base flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-purple-600" />
                        <span>Bússola de Temperamento (Polaridades)</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Arraste os indicadores para mapear onde o personagem se situa nas grandes polaridades psicológicas.
                      </p>
                    </div>

                    {/* SLIDER 1: Razão <-> Emoção */}
                    {(() => {
                      const val = isEditing ? (editForm.polarityReasonEmotion ?? 50) : (viewingCharacter?.polarityReasonEmotion ?? 50);
                      const info = getReasonEmotionInfo(val);
                      return (
                        <div className="space-y-2 p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-cyan-700 flex items-center gap-1">
                              <span>🧊</span> Razão (Lógica, Frieza)
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs font-extrabold ${info.color}`}>
                              {info.icon} {info.title} ({val}%)
                            </span>
                            <span className="text-rose-700 flex items-center gap-1">
                              Emoção (Paixão, Instinto) <span>🔥</span>
                            </span>
                          </div>

                          <div className="relative pt-1 pb-1">
                            {isEditing ? (
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={val}
                                onChange={(e) => setEditForm(prev => ({ ...prev, polarityReasonEmotion: parseInt(e.target.value) }))}
                                className="w-full h-2.5 bg-gradient-to-r from-cyan-400 via-purple-400 to-rose-400 rounded-lg appearance-none cursor-pointer accent-purple-600"
                              />
                            ) : (
                              <div className="w-full h-2.5 bg-gradient-to-r from-cyan-400 via-purple-400 to-rose-400 rounded-lg relative overflow-hidden">
                                <div
                                  className="absolute top-0 bottom-0 w-3 bg-white border-2 border-slate-800 rounded-full shadow-md -translate-x-1/2 transition-all duration-300"
                                  style={{ left: `${val}%` }}
                                />
                              </div>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 text-center font-medium">
                            {info.desc}
                          </p>
                        </div>
                      );
                    })()}

                    {/* SLIDER 2: Cautela <-> Impulso */}
                    {(() => {
                      const val = isEditing ? (editForm.polarityCautionImpulse ?? 50) : (viewingCharacter?.polarityCautionImpulse ?? 50);
                      const info = getCautionImpulseInfo(val);
                      return (
                        <div className="space-y-2 p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-emerald-700 flex items-center gap-1">
                              <span>🛡️</span> Cautela (Prudência, Paciência)
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs font-extrabold ${info.color}`}>
                              {info.icon} {info.title} ({val}%)
                            </span>
                            <span className="text-orange-700 flex items-center gap-1">
                              Impulso (Ação, Risco) <span>⚡</span>
                            </span>
                          </div>

                          <div className="relative pt-1 pb-1">
                            {isEditing ? (
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={val}
                                onChange={(e) => setEditForm(prev => ({ ...prev, polarityCautionImpulse: parseInt(e.target.value) }))}
                                className="w-full h-2.5 bg-gradient-to-r from-emerald-400 via-indigo-400 to-orange-400 rounded-lg appearance-none cursor-pointer accent-purple-600"
                              />
                            ) : (
                              <div className="w-full h-2.5 bg-gradient-to-r from-emerald-400 via-indigo-400 to-orange-400 rounded-lg relative overflow-hidden">
                                <div
                                  className="absolute top-0 bottom-0 w-3 bg-white border-2 border-slate-800 rounded-full shadow-md -translate-x-1/2 transition-all duration-300"
                                  style={{ left: `${val}%` }}
                                />
                              </div>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 text-center font-medium">
                            {info.desc}
                          </p>
                        </div>
                      );
                    })()}

                    {/* SLIDER 3: Altruísmo <-> Egoísmo */}
                    {(() => {
                      const val = isEditing ? (editForm.polarityAltruismSelfishness ?? 50) : (viewingCharacter?.polarityAltruismSelfishness ?? 50);
                      const info = getAltruismSelfishnessInfo(val);
                      return (
                        <div className="space-y-2 p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-sky-700 flex items-center gap-1">
                              <span>🕊️</span> Altruísmo (Empatia, Sacrifício)
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs font-extrabold ${info.color}`}>
                              {info.icon} {info.title} ({val}%)
                            </span>
                            <span className="text-rose-700 flex items-center gap-1">
                              Egoísmo (Auto-interesse) <span>👑</span>
                            </span>
                          </div>

                          <div className="relative pt-1 pb-1">
                            {isEditing ? (
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={val}
                                onChange={(e) => setEditForm(prev => ({ ...prev, polarityAltruismSelfishness: parseInt(e.target.value) }))}
                                className="w-full h-2.5 bg-gradient-to-r from-sky-400 via-purple-400 to-rose-400 rounded-lg appearance-none cursor-pointer accent-purple-600"
                              />
                            ) : (
                              <div className="w-full h-2.5 bg-gradient-to-r from-sky-400 via-purple-400 to-rose-400 rounded-lg relative overflow-hidden">
                                <div
                                  className="absolute top-0 bottom-0 w-3 bg-white border-2 border-slate-800 rounded-full shadow-md -translate-x-1/2 transition-all duration-300"
                                  style={{ left: `${val}%` }}
                                />
                              </div>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 text-center font-medium">
                            {info.desc}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Physical & Psychological descriptions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-2">
                      <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span>👤</span>
                        <span>Traços Físicos & Aparência</span>
                      </span>
                      {isEditing ? (
                        <textarea
                          rows={3}
                          value={editForm.physicalTraits || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, physicalTraits: e.target.value }))}
                          placeholder="Ex: Altura, porte, cor dos olhos, cabelo, cicatrizes ou maneirismos..."
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                        />
                      ) : (
                        <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                          {viewingCharacter?.physicalTraits || <span className="text-slate-400 italic">Sem descrição física.</span>}
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-2">
                      <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🧠</span>
                        <span>Traços Psicológicos & Hábitos</span>
                      </span>
                      {isEditing ? (
                        <textarea
                          rows={3}
                          value={editForm.psychologicalTraits || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, psychologicalTraits: e.target.value }))}
                          placeholder="Ex: Peculiaridades, hábitos, manias, filosofia de vida..."
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                        />
                      ) : (
                        <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                          {viewingCharacter?.psychologicalTraits || <span className="text-slate-400 italic">Sem descrição psicológica extra.</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ARCO & RELAÇÕES (FASES DO ARCO + VÍNCULOS VISUAIS) */}
              {activeDossierTab === 'arc' && (
                <div className="space-y-6 animate-fade-in">
                  {/* SEÇÃO 1: FASES DO ARCO DRAMÁTICO */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-black text-slate-800 text-base flex items-center gap-2">
                          <Compass className="w-4 h-4 text-purple-600" />
                          <span>Arco de Transformação (Início • Meio • Clímax)</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Acompanhe a evolução do personagem ao longo da jornada narrativa.
                        </p>
                      </div>

                      {/* Phase Switcher Pills */}
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
                        {[
                          { id: 'beginning', label: '1. Início', icon: '🏁' },
                          { id: 'middle', label: '2. Meio', icon: '💥' },
                          { id: 'climax', label: '3. Clímax', icon: '🏆' }
                        ].map(phase => (
                          <button
                            key={phase.id}
                            type="button"
                            onClick={() => setActiveArcPhase(phase.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              activeArcPhase === phase.id
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>{phase.icon}</span>
                            <span>{phase.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Phase Display Card */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
                      {activeArcPhase === 'beginning' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-extrabold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span>🏁</span> Início (Status Quo & Crença Falsa)
                            </span>
                            <span className="text-[11px] text-slate-400">Ponto de partida na história</span>
                          </div>
                          {isEditing ? (
                            <textarea
                              rows={3}
                              value={editForm.arcBeginning || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, arcBeginning: e.target.value }))}
                              placeholder="Como o personagem começa? Em que mentira ou ilusão ele acredita? Qual o seu estado inicial?"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-400 leading-relaxed"
                            />
                          ) : (
                            <p className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/80 font-medium whitespace-pre-wrap">
                              {viewingCharacter?.arcBeginning || (
                                <span className="text-slate-400 italic">Início do arco ainda não definido.</span>
                              )}
                            </p>
                          )}
                        </div>
                      )}

                      {activeArcPhase === 'middle' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span>💥</span> Meio (Ponto de Virada, Teste & Crise)
                            </span>
                            <span className="text-[11px] text-slate-400">O grande conflito</span>
                          </div>
                          {isEditing ? (
                            <textarea
                              rows={3}
                              value={editForm.arcMiddle || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, arcMiddle: e.target.value }))}
                              placeholder="Como ele entra em crise? Qual o teste de fogo que destrói suas certezas e o força a agir?"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-400 leading-relaxed"
                            />
                          ) : (
                            <p className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/80 font-medium whitespace-pre-wrap">
                              {viewingCharacter?.arcMiddle || (
                                <span className="text-slate-400 italic">Meio do arco ainda não definido.</span>
                              )}
                            </p>
                          )}
                        </div>
                      )}

                      {activeArcPhase === 'climax' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span>🏆</span> Clímax & Resolução (Transformação)
                            </span>
                            <span className="text-[11px] text-slate-400">O desfecho da trajetória</span>
                          </div>
                          {isEditing ? (
                            <textarea
                              rows={3}
                              value={editForm.arcClimax || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, arcClimax: e.target.value }))}
                              placeholder="Como ele termina? Ele superou a ferida e mudou, ou sucumbiu à sua própria falha fatal?"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-400 leading-relaxed"
                            />
                          ) : (
                            <p className="text-xs text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/80 font-medium whitespace-pre-wrap">
                              {viewingCharacter?.arcClimax || (
                                <span className="text-slate-400 italic">Clímax do arco ainda não definido.</span>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SEÇÃO 2: LISTA VISUAL DE VÍNCULOS COM OUTROS PERSONAGENS */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-black text-slate-800 text-base flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span>Vínculos & Relações Narrativas</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Laços, rivalidades e dinâmicas com outros personagens da obra.
                        </p>
                      </div>
                    </div>

                    {/* In Edit Mode: Add Bond Box */}
                    {isEditing && (
                      <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-3">
                        <span className="text-xs font-bold text-purple-900 block">
                          + Adicionar Novo Vínculo
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Pick from other characters or type */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              Com quem tem vínculo?
                            </label>
                            <input
                              type="text"
                              value={newRelTarget}
                              onChange={(e) => setNewRelTarget(e.target.value)}
                              placeholder="Nome do outro personagem..."
                              list="project-characters-list"
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                            />
                            <datalist id="project-characters-list">
                              {characters.filter(c => c.name !== editForm.name).map(c => (
                                <option key={c.id} value={c.name} />
                              ))}
                            </datalist>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              Tipo de Relação
                            </label>
                            <select
                              value={newRelType}
                              onChange={(e) => setNewRelType(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                            >
                              {RELATION_TYPES.map(rel => (
                                <option key={rel} value={rel}>{rel}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={newRelDesc}
                            onChange={(e) => setNewRelDesc(e.target.value)}
                            placeholder="Descreva a dinâmica (ex: Antigos amigos de infância separados por uma traição...)"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleAddRelationship}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Adicionar Vínculo
                        </button>
                      </div>
                    )}

                    {/* Bonds Cards Grid */}
                    {((isEditing ? editForm.relationships : viewingCharacter?.relationships) || []).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {((isEditing ? editForm.relationships : viewingCharacter?.relationships) || []).map((rel) => {
                          const linkedChar = characters.find(c => c.name.toLowerCase() === rel.targetCharacterName.toLowerCase());
                          return (
                            <div
                              key={rel.id}
                              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 shadow-2xs hover:bg-white transition-colors"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 border border-slate-300">
                                  <img
                                    src={linkedChar?.avatarBase64 || linkedChar?.avatarUrl || getDiceBearAvatar(rel.targetCharacterName)}
                                    alt={rel.targetCharacterName}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-slate-800 text-xs">
                                      {rel.targetCharacterName}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                      {rel.relationType}
                                    </span>
                                  </div>
                                  {rel.description && (
                                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                      {rel.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {isEditing && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRelationship(rel.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                  title="Remover vínculo"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        Nenhum vínculo estruturado cadastrado ainda.
                      </div>
                    )}

                    {/* Fallback to general relations text if present */}
                    {(activeChar?.relations || isEditing) && (
                      <div className="pt-3 border-t border-slate-100 space-y-1.5">
                        <span className="text-xs font-bold text-slate-600 block">
                          Anotações Gerais de Relacionamentos:
                        </span>
                        {isEditing ? (
                          <textarea
                            rows={2}
                            value={editForm.relations || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, relations: e.target.value }))}
                            placeholder="Anotações gerais sobre a rede de contatos ou família..."
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        ) : (
                          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                            {viewingCharacter?.relations}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: DADOS & CAIXAS EXTRAS (CUSTOM FIELDS & TRAIT ITEMS) */}
              {activeDossierTab === 'extra' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Custom Text Boxes */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-black text-slate-800 text-base flex items-center gap-2">
                          <Layers className="w-4 h-4 text-purple-600" />
                          <span>Caixas Livres de Informação ({activeChar?.customFields?.length || 0})</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Crie blocos personalizados para notas de magia, inventário, segredos ou memórias.
                        </p>
                      </div>

                      {isEditing && (
                        <button
                          type="button"
                          onClick={handleAddCustomField}
                          className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Nova Caixa</span>
                        </button>
                      )}
                    </div>

                    {((isEditing ? editForm.customFields : viewingCharacter?.customFields) || []).length > 0 ? (
                      <div className="space-y-3">
                        {((isEditing ? editForm.customFields : viewingCharacter?.customFields) || []).map((field) => (
                          <div
                            key={field.id}
                            className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={field.title}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditForm(prev => ({
                                      ...prev,
                                      customFields: (prev.customFields || []).map(f => f.id === field.id ? { ...f, title: val } : f)
                                    }));
                                  }}
                                  className="font-bold text-xs text-purple-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300"
                                />
                              ) : (
                                <span className="font-bold text-xs text-purple-900 uppercase tracking-wider">
                                  {field.title}
                                </span>
                              )}

                              {isEditing && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomField(field.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                  title="Excluir caixa"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {isEditing ? (
                              <textarea
                                rows={3}
                                value={field.content}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditForm(prev => ({
                                    ...prev,
                                    customFields: (prev.customFields || []).map(f => f.id === field.id ? { ...f, content: val } : f)
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                              />
                            ) : (
                              <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                                {field.content || <span className="text-slate-400 italic">Vazio</span>}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        Nenhuma caixa personalizada adicionada.
                      </div>
                    )}
                  </div>

                  {/* Backstory / Background field */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      📖 Biografia & Passado (Backstory)
                    </span>
                    {isEditing ? (
                      <textarea
                        rows={3}
                        value={editForm.background || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, background: e.target.value }))}
                        placeholder="Origem, infância, eventos cruciais que moldaram sua história antes do livro..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    ) : (
                      <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                        {viewingCharacter?.background || <span className="text-slate-400 italic">Sem biografia detalhada.</span>}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER: ACTION BUTTONS */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0 z-20">
              <div className="flex items-center gap-2">
                {!readOnly && viewingCharacter && !isEditing && (
                  <button
                    type="button"
                    onClick={() => handleDelete(viewingCharacter.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Excluir Personagem</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (viewingCharacter) {
                          setIsEditing(false);
                        } else {
                          setViewingCharacter(null);
                          setIsEditing(false);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveCharacter}
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-500/20 transition-all cursor-pointer hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Salvando...' : 'Salvar Ficha'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setViewingCharacter(null);
                      setIsEditing(false);
                    }}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    Fechar Ficha
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
