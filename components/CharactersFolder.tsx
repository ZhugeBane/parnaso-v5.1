import React, { useState, useEffect, useMemo } from 'react';
import { Character, CustomCharacterField, TraitItem, User } from '../types';
import {
  getCharacters,
  saveCharacter,
  deleteCharacter
} from '../services/projectCreativeService';

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
  Protagonista: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Antagonista: 'bg-rose-50 text-rose-700 border-rose-200',
  Deuteragonista: 'bg-blue-50 text-blue-700 border-blue-200',
  Mentor: 'bg-purple-50 text-purple-700 border-purple-200',
  Coadjuvante: 'bg-slate-100 text-slate-700 border-slate-200',
  'Interesse Amoroso': 'bg-pink-50 text-pink-700 border-pink-200',
  'Alívio Cômico': 'bg-amber-50 text-amber-700 border-amber-200',
};

const DEFAULT_THEME_COLORS = ['#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

const IDENTITY_PRESET_TAGS = [
  'Espécie / Raça',
  'Local de Origem',
  'Alinhamento',
  'Status (Vivo/Morto)',
  'Pronomes / Gênero',
  'Línguas Faladas'
];

const PHYSICAL_PRESET_TAGS = [
  'Cabelo',
  'Olhos',
  'Altura & Porte',
  'Cicatrizes / Marcas',
  'Tatuagens',
  'Voz & Sotaque',
  'Estilo de Roupa',
  'Maneirismos'
];

const PSYCHOLOGICAL_PRESET_TAGS = [
  'Virtude',
  'Defeito / Falha',
  'Medo / Fobia',
  'Hábito',
  'Temperamento',
  'Peculiaridade',
  'Filosofia de Vida'
];

const STORY_PRESET_TAGS = [
  'Trauma Marcante',
  'Marco / Conquista',
  'Aliado Principal',
  'Rival / Inimigo',
  'Família',
  'Mentor',
  'Segredo',
  'Objeto de Valor'
];

interface SectionTraitEditorProps {
  title: string;
  subtitle: string;
  buttonLabel: string;
  presetTags: string[];
  items?: TraitItem[];
  onAdd: (defaultLabel?: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: 'label' | 'value', text: string) => void;
  icon?: string;
}

const SectionTraitEditor: React.FC<SectionTraitEditorProps> = ({
  title,
  subtitle,
  buttonLabel,
  presetTags,
  items = [],
  onAdd,
  onRemove,
  onUpdate,
  icon = '✨'
}) => {
  return (
    <div className="space-y-3 pt-3 border-t border-slate-200/90">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>{icon}</span>
            <span>{title}</span>
          </h5>
          <p className="text-[11px] text-slate-500">
            {subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAdd('')}
          className="self-start sm:self-auto px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>{buttonLabel}</span>
        </button>
      </div>

      {/* Preset Tags Pills */}
      {presetTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Sugestões rápidas:</span>
          {presetTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => onAdd(tag)}
              className="text-[11px] px-2.5 py-0.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 border border-transparent rounded-lg text-slate-600 font-medium transition-all cursor-pointer"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}

      {/* Dynamic Item Cards */}
      {items.length > 0 && (
        <div className="space-y-2 mt-2">
          {items.map((item, index) => (
            <div
              key={item.id || index}
              className="bg-slate-50 hover:bg-slate-50/90 p-3 rounded-xl border border-slate-200 space-y-2 group transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="Nome do campo / Rótulo (ex: Olhos, Cicatriz...)"
                  value={item.label || ''}
                  onChange={(e) => onUpdate(item.id, 'label', e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-teal-700 outline-none focus:ring-2 focus:ring-teal-400 min-w-[140px] max-w-[240px]"
                />
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remover informação"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <textarea
                rows={2}
                placeholder="Descreva a informação detalhadamente..."
                value={item.value || ''}
                onChange={(e) => onUpdate(item.id, 'value', e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-400 leading-relaxed"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface SectionTraitViewerProps {
  title?: string;
  items?: TraitItem[];
}

const SectionTraitViewer: React.FC<SectionTraitViewerProps> = ({ title = 'Informações Adicionais', items = [] }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3 pt-3 border-t border-slate-200/80">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{title}</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, index) => (
          <div key={item.id || index} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
            {item.label && (
              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                {item.label}
              </span>
            )}
            <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CharactersFolder: React.FC<CharactersFolderProps> = ({ projectId, user, readOnly = false }) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Selected character for viewing dossier or editing
  const [viewingCharacter, setViewingCharacter] = useState<Character | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Character>>({});
  const [activeDossierTab, setActiveDossierTab] = useState<'identity' | 'physical' | 'psychological' | 'story' | 'custom'>('identity');

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
        c.occupation?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRoleFilter === 'all' || c.role === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [characters, searchTerm, selectedRoleFilter]);

  // Open modal to create a new character
  const handleOpenNewCharacter = () => {
    const newChar: Partial<Character> = {
      name: '',
      role: 'Protagonista',
      age: '',
      birthDate: '',
      occupation: '',
      color: DEFAULT_THEME_COLORS[Math.floor(Math.random() * DEFAULT_THEME_COLORS.length)],
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
    setEditForm(newChar);
    setIsEditing(true);
    setViewingCharacter(null);
    setActiveDossierTab('identity');
  };

  // Open modal to edit existing character
  const handleOpenEdit = (char: Character) => {
    setEditForm({
      ...char,
      identityItems: char.identityItems ? [...char.identityItems] : [],
      physicalItems: char.physicalItems ? [...char.physicalItems] : [],
      psychologicalItems: char.psychologicalItems ? [...char.psychologicalItems] : [],
      storyItems: char.storyItems ? [...char.storyItems] : [],
      customFields: char.customFields ? [...char.customFields] : []
    });
    setIsEditing(true);
    setViewingCharacter(char);
    setActiveDossierTab('identity');
  };

  // Open view dossier modal
  const handleOpenView = (char: Character) => {
    setViewingCharacter(char);
    setIsEditing(false);
    setActiveDossierTab('identity');
  };

  // Save character
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
      avatarUrl: editForm.avatarUrl?.trim() || undefined,
      color: editForm.color || '#14b8a6',
      physicalTraits: editForm.physicalTraits?.trim() || undefined,
      psychologicalTraits: editForm.psychologicalTraits?.trim() || undefined,
      motivation: editForm.motivation?.trim() || undefined,
      background: editForm.background?.trim() || undefined,
      relations: editForm.relations?.trim() || undefined,
      identityItems: (editForm.identityItems || []).filter(item => item.value?.trim() || item.label?.trim()),
      physicalItems: (editForm.physicalItems || []).filter(item => item.value?.trim() || item.label?.trim()),
      psychologicalItems: (editForm.psychologicalItems || []).filter(item => item.value?.trim() || item.label?.trim()),
      storyItems: (editForm.storyItems || []).filter(item => item.value?.trim() || item.label?.trim()),
      customFields: editForm.customFields || [],
      createdAt: editForm.createdAt || new Date().toISOString()
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
      setIsEditing(false);
      setViewingCharacter(saved);
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

  // Dynamic Trait Item Handlers
  type TraitSectionKey = 'identityItems' | 'physicalItems' | 'psychologicalItems' | 'storyItems';

  const handleAddTraitItem = (section: TraitSectionKey, defaultLabel: string = '') => {
    const newItem: TraitItem = {
      id: 'trait_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      label: defaultLabel,
      value: ''
    };
    setEditForm(prev => ({
      ...prev,
      [section]: [...(prev[section] || []), newItem]
    }));
  };

  const handleRemoveTraitItem = (section: TraitSectionKey, itemId: string) => {
    setEditForm(prev => ({
      ...prev,
      [section]: (prev[section] || []).filter(item => item.id !== itemId)
    }));
  };

  const handleUpdateTraitItem = (section: TraitSectionKey, itemId: string, field: 'label' | 'value', text: string) => {
    setEditForm(prev => ({
      ...prev,
      [section]: (prev[section] || []).map(item => item.id === itemId ? { ...item, [field]: text } : item)
    }));
  };

  // Add custom text box
  const handleAddCustomField = () => {
    const newField: CustomCharacterField = {
      id: 'field_' + Date.now(),
      title: 'Nova Caixa de Informação',
      content: ''
    };
    setEditForm(prev => ({
      ...prev,
      customFields: [...(prev.customFields || []), newField]
    }));
  };

  // Remove custom text box
  const handleRemoveCustomField = (fieldId: string) => {
    setEditForm(prev => ({
      ...prev,
      customFields: (prev.customFields || []).filter(f => f.id !== fieldId)
    }));
  };

  // Update custom text box
  const handleUpdateCustomField = (fieldId: string, title: string, content: string) => {
    setEditForm(prev => ({
      ...prev,
      customFields: (prev.customFields || []).map(f => f.id === fieldId ? { ...f, title, content } : f)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome, papel ou ocupação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {/* Role Filter Dropdown */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="all">Todos os Papéis ({characters.length})</option>
            {ROLES.map(r => (
              <option key={r} value={r}>
                {r} ({characters.filter(c => c.role === r).length})
              </option>
            ))}
          </select>
        </div>

        {/* Action Button */}
        {!readOnly && (
          <button
            type="button"
            onClick={handleOpenNewCharacter}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/20 transition-all cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>Novo Personagem</span>
          </button>
        )}
      </div>

      {/* Characters Gallery / List */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-sm animate-pulse">
          Carregando fichas de personagens...
        </div>
      ) : characters.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center max-w-xl mx-auto my-8">
          <div className="w-16 h-16 mx-auto bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-4 text-3xl">
            👥
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Sua pasta de personagens está vazia</h3>
          <p className="text-sm text-slate-500 mb-6">
            Adicione seus protagonistas, antagonistas e personagens secundários para documentar idade, aparência, psicologia e anotações livres.
          </p>
          {!readOnly && (
            <button
              type="button"
              onClick={handleOpenNewCharacter}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-md shadow-teal-200 transition-all cursor-pointer"
            >
              + Criar Primeiro Personagem
            </button>
          )}
        </div>
      ) : filteredCharacters.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Nenhum personagem corresponde à busca ou filtro selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCharacters.map(char => {
            const roleStyle = ROLE_COLORS[char.role || ''] || 'bg-slate-100 text-slate-700 border-slate-200';
            const customCount = char.customFields?.length || 0;

            return (
              <div
                key={char.id}
                onClick={() => handleOpenView(char)}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
              >
                {/* Top strip with character theme color */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: char.color || '#14b8a6' }}
                />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {char.avatarUrl ? (
                        <img
                          src={char.avatarUrl}
                          alt={char.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-2xs"
                          style={{ backgroundColor: char.color || '#14b8a6' }}
                        >
                          {char.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <h4 className="font-bold text-slate-800 text-base group-hover:text-teal-600 transition-colors leading-tight">
                          {char.name}
                        </h4>
                        {char.occupation && (
                          <p className="text-xs text-slate-400 mt-0.5">{char.occupation}</p>
                        )}
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleStyle}`}>
                      {char.role}
                    </span>
                  </div>

                  {/* Vitals summary: Age & BirthDate */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 bg-slate-50 p-2 rounded-xl">
                    {char.age && (
                      <div>
                        <span className="font-semibold text-slate-600">Idade:</span> {char.age} anos
                      </div>
                    )}
                    {char.birthDate && (
                      <div>
                        <span className="font-semibold text-slate-600">Nascimento:</span> {char.birthDate}
                      </div>
                    )}
                    {!char.age && !char.birthDate && (
                      <span className="text-slate-400 italic">Idade/Nasc. não especificados</span>
                    )}
                  </div>

                  {/* Traits preview */}
                  <div className="space-y-1.5 mb-3">
                    {char.psychologicalTraits && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        <span className="font-semibold text-slate-700">🧠 Psicologia:</span> {char.psychologicalTraits}
                      </p>
                    )}
                    {char.physicalTraits && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        <span className="font-semibold text-slate-700">👤 Físico:</span> {char.physicalTraits}
                      </p>
                    )}
                    {char.motivation && (
                      <p className="text-xs text-slate-600 line-clamp-1">
                        <span className="font-semibold text-slate-700">🎯 Motivação:</span> {char.motivation}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer with custom boxes badge and action buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                    <span>📝</span>
                    <span>{customCount} {customCount === 1 ? 'campo extra' : 'campos extras'}</span>
                  </span>

                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {!readOnly && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(char)}
                          className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
                          title="Editar personagem"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(char.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Excluir personagem"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenView(char)}
                      className="px-2.5 py-1 text-teal-600 hover:bg-teal-50 rounded-lg font-bold transition-colors"
                    >
                      Ver Ficha →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DOSSIER MODAL / DRAWER (VIEW OR EDIT) */}
      {(viewingCharacter || isEditing) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl animate-fade-in flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm"
                  style={{ backgroundColor: (isEditing ? editForm.color : viewingCharacter?.color) || '#14b8a6' }}
                >
                  {(isEditing ? editForm.name : viewingCharacter?.name)?.charAt(0).toUpperCase() || '👤'}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-800 leading-tight">
                    {isEditing
                      ? (editForm.id ? `Editar: ${editForm.name}` : 'Novo Personagem')
                      : viewingCharacter?.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEditing
                      ? 'Preencha a ficha completa e adicione caixas livres de informação'
                      : `Ficha de Personagem • ${viewingCharacter?.role || 'Coadjuvante'}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isEditing && !readOnly && viewingCharacter && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(viewingCharacter)}
                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Editar Ficha
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setViewingCharacter(null);
                    setIsEditing(false);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Dossier Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6 overflow-x-auto text-xs font-bold flex-shrink-0">
              {[
                { id: 'identity', label: '1. Identidade & Dados' },
                { id: 'physical', label: '2. Traços Físicos' },
                { id: 'psychological', label: '3. Traços Psicológicos' },
                { id: 'story', label: '4. História & Relações' },
                { id: 'custom', label: `5. Caixas Personalizadas (${(isEditing ? editForm.customFields : viewingCharacter?.customFields)?.length || 0})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDossierTab(tab.id as any)}
                  className={`py-3 px-3 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                    activeDossierTab === tab.id
                      ? 'border-teal-500 text-teal-700'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dossier Content Area */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {isEditing ? (
                /* EDIT FORM */
                <form id="characterForm" onSubmit={handleSaveCharacter} className="space-y-6">
                  {/* TAB 1: IDENTIDADE */}
                  {activeDossierTab === 'identity' && (
                    <div className="space-y-5 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Nome do Personagem *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Arthur Pendelton"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Papel na História
                          </label>
                          <select
                            value={editForm.role || 'Protagonista'}
                            onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Idade
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: 28 anos, Imortal, etc."
                            value={editForm.age || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, age: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Data de Nascimento
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: 14 de Julho de 1892"
                            value={editForm.birthDate || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, birthDate: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Ocupação / Cargo
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Detetive, Arqueólogo"
                            value={editForm.occupation || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, occupation: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                          Cor de Destaque / Tema
                        </label>
                        <div className="flex items-center gap-2">
                          {DEFAULT_THEME_COLORS.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditForm(prev => ({ ...prev, color: c }))}
                              style={{ backgroundColor: c }}
                              className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                                editForm.color === c ? 'scale-125 ring-2 ring-slate-800 ring-offset-2' : 'hover:scale-110'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          URL da Foto / Avatar (opcional)
                        </label>
                        <input
                          type="url"
                          placeholder="https://exemplo.com/foto.jpg"
                          value={editForm.avatarUrl || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>

                      {/* Dynamic Identity Traits */}
                      <SectionTraitEditor
                        title="Informações Extras de Identidade"
                        subtitle="Adicione informações adicionais com botões dedicados (espécie, raça, local de origem, alinhamento, etc.)"
                        buttonLabel="+ Adicionar Informação"
                        presetTags={IDENTITY_PRESET_TAGS}
                        items={editForm.identityItems}
                        onAdd={(tag) => handleAddTraitItem('identityItems', tag)}
                        onRemove={(id) => handleRemoveTraitItem('identityItems', id)}
                        onUpdate={(id, field, val) => handleUpdateTraitItem('identityItems', id, field, val)}
                        icon="🪪"
                      />
                    </div>
                  )}

                  {/* TAB 2: TRAÇOS FÍSICOS */}
                  {activeDossierTab === 'physical' && (
                    <div className="space-y-5 animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Aparência Física Geral & Resumo Corporal
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Visão panorâmica: altura, porte físico, formato do rosto, estilo de vestimenta e maneirismos gerais..."
                          value={editForm.physicalTraits || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, physicalTraits: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>

                      {/* Dynamic Physical Traits */}
                      <SectionTraitEditor
                        title="Características Físicas Individuais"
                        subtitle="Adicione características físicas específicas com botões dedicados (cabelo, olhos, cicatrizes, tatuagens, voz, etc.)"
                        buttonLabel="+ Adicionar Característica"
                        presetTags={PHYSICAL_PRESET_TAGS}
                        items={editForm.physicalItems}
                        onAdd={(tag) => handleAddTraitItem('physicalItems', tag)}
                        onRemove={(id) => handleRemoveTraitItem('physicalItems', id)}
                        onUpdate={(id, field, val) => handleUpdateTraitItem('physicalItems', id, field, val)}
                        icon="👤"
                      />
                    </div>
                  )}

                  {/* TAB 3: TRAÇOS PSICOLÓGICOS */}
                  {activeDossierTab === 'psychological' && (
                    <div className="space-y-5 animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Temperamento & Personalidade Geral
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Como este personagem pensa e reage no dia a dia? Temperamento predominante (calmo, explosivo, calculista)..."
                          value={editForm.psychologicalTraits || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, psychologicalTraits: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Motivação Principal / O que ele mais deseja?
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Qual é a força motriz do personagem? O que ele quer alcançar na história e o que teme perder?"
                          value={editForm.motivation || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, motivation: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>

                      {/* Dynamic Psychological Traits */}
                      <SectionTraitEditor
                        title="Traços Psicológicos Individuais"
                        subtitle="Adicione traços específicos com botões dedicados (virtudes, defeitos/falhas, medos/fobias, hábitos, etc.)"
                        buttonLabel="+ Adicionar Traço"
                        presetTags={PSYCHOLOGICAL_PRESET_TAGS}
                        items={editForm.psychologicalItems}
                        onAdd={(tag) => handleAddTraitItem('psychologicalItems', tag)}
                        onRemove={(id) => handleRemoveTraitItem('psychologicalItems', id)}
                        onUpdate={(id, field, val) => handleUpdateTraitItem('psychologicalItems', id, field, val)}
                        icon="🧠"
                      />
                    </div>
                  )}

                  {/* TAB 4: HISTÓRIA & RELAÇÕES */}
                  {activeDossierTab === 'story' && (
                    <div className="space-y-5 animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          História de Origem / Passado (Backstory Geral)
                        </label>
                        <textarea
                          rows={4}
                          placeholder="De onde ele veio? Momentos cruciais da infância ou acontecimentos fundamentais que moldaram quem ele é..."
                          value={editForm.background || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, background: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          Relações & Dinâmicas com outros Personagens
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Quem são seus aliados, inimigos, mentores ou rivais? Como ele se comporta perto de cada um?"
                          value={editForm.relations || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, relations: e.target.value }))}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed outline-none focus:ring-2 focus:ring-teal-400"
                        />
                      </div>

                      {/* Dynamic Story & Relation Facts */}
                      <SectionTraitEditor
                        title="Fatos Marcantes da História & Relações"
                        subtitle="Adicione acontecimentos, segredos ou relações específicas com botões dedicados (marcos, traumas, aliados, rivais, etc.)"
                        buttonLabel="+ Adicionar Fato / Relação"
                        presetTags={STORY_PRESET_TAGS}
                        items={editForm.storyItems}
                        onAdd={(tag) => handleAddTraitItem('storyItems', tag)}
                        onRemove={(id) => handleRemoveTraitItem('storyItems', id)}
                        onUpdate={(id, field, val) => handleUpdateTraitItem('storyItems', id, field, val)}
                        icon="📜"
                      />
                    </div>
                  )}

                  {/* TAB 5: CAIXAS PERSONALIZADAS LIVRES */}
                  {activeDossierTab === 'custom' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">Caixas de Texto Personalizadas</h4>
                          <p className="text-xs text-slate-500">
                            Crie caixas livres definindo seu próprio título e inserindo qualquer anotação importante.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddCustomField}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>+ Adicionar Caixa</span>
                        </button>
                      </div>

                      {(!editForm.customFields || editForm.customFields.length === 0) ? (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                          Nenhuma caixa personalizada adicionada. Clique em "+ Adicionar Caixa" para criar campos como "Segredo de Família", "Poderes", "Citações Marcantes", etc.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {editForm.customFields.map((field, idx) => (
                            <div key={field.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <input
                                  type="text"
                                  placeholder="Título da Caixa (Ex: Poderes, Frase Marcante...)"
                                  value={field.title}
                                  onChange={(e) => handleUpdateCustomField(field.id, e.target.value, field.content)}
                                  className="w-full max-w-sm px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomField(field.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                  title="Remover esta caixa"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>

                              <textarea
                                rows={3}
                                placeholder="Insira a informação aqui..."
                                value={field.content}
                                onChange={(e) => handleUpdateCustomField(field.id, field.title, e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-teal-400"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </form>
              ) : (
                /* VIEW DOSSIER */
                <div className="space-y-6 animate-fade-in">
                  {/* TAB 1: IDENTIDADE */}
                  {activeDossierTab === 'identity' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome Completo</span>
                          <span className="text-base font-extrabold text-slate-800">{viewingCharacter?.name}</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Papel na Trama</span>
                          <span className="text-base font-extrabold text-teal-700">{viewingCharacter?.role || 'Não especificado'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-3.5 rounded-2xl">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Idade</span>
                          <span className="text-sm font-bold text-slate-700">{viewingCharacter?.age || '—'}</span>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Data de Nascimento</span>
                          <span className="text-sm font-bold text-slate-700">{viewingCharacter?.birthDate || '—'}</span>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-2xl">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ocupação</span>
                          <span className="text-sm font-bold text-slate-700">{viewingCharacter?.occupation || '—'}</span>
                        </div>
                      </div>

                      {/* Dynamic Extra Identity Traits */}
                      <SectionTraitViewer
                        title="Informações Extras de Identidade"
                        items={viewingCharacter?.identityItems}
                      />
                    </div>
                  )}

                  {/* TAB 2: TRAÇOS FÍSICOS */}
                  {activeDossierTab === 'physical' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-5 rounded-2xl space-y-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Aparência & Resumo Físico</span>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {viewingCharacter?.physicalTraits || 'Nenhuma descrição física geral informada.'}
                        </p>
                      </div>

                      {/* Dynamic Physical Traits */}
                      <SectionTraitViewer
                        title="Características Físicas Detalhadas"
                        items={viewingCharacter?.physicalItems}
                      />
                    </div>
                  )}

                  {/* TAB 3: TRAÇOS PSICOLÓGICOS */}
                  {activeDossierTab === 'psychological' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-5 rounded-2xl space-y-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Psicologia & Temperamento</span>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {viewingCharacter?.psychologicalTraits || 'Nenhum traço psicológico informado.'}
                        </p>
                      </div>

                      {viewingCharacter?.motivation && (
                        <div className="bg-teal-50/60 p-5 rounded-2xl border border-teal-100 space-y-2">
                          <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">Motivação Principal</span>
                          <p className="text-sm text-teal-900 whitespace-pre-wrap leading-relaxed">
                            {viewingCharacter.motivation}
                          </p>
                        </div>
                      )}

                      {/* Dynamic Psychological Traits */}
                      <SectionTraitViewer
                        title="Traços Psicológicos Detalhados"
                        items={viewingCharacter?.psychologicalItems}
                      />
                    </div>
                  )}

                  {/* TAB 4: HISTÓRIA & RELAÇÕES */}
                  {activeDossierTab === 'story' && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-5 rounded-2xl space-y-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">História de Origem (Backstory)</span>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {viewingCharacter?.background || 'Nenhuma história de fundo informada.'}
                        </p>
                      </div>

                      {viewingCharacter?.relations && (
                        <div className="bg-slate-50 p-5 rounded-2xl space-y-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Relações com outros Personagens</span>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {viewingCharacter.relations}
                          </p>
                        </div>
                      )}

                      {/* Dynamic Story & Relation Facts */}
                      <SectionTraitViewer
                        title="Fatos Marcantes & Relações Detalhadas"
                        items={viewingCharacter?.storyItems}
                      />
                    </div>
                  )}

                  {/* TAB 5: CAIXAS PERSONALIZADAS LIVRES */}
                  {activeDossierTab === 'custom' && (
                    <div className="space-y-4">
                      {(!viewingCharacter?.customFields || viewingCharacter.customFields.length === 0) ? (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-400">
                          Nenhuma caixa personalizada adicionada para este personagem.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewingCharacter.customFields.map((field) => (
                            <div key={field.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <span>📌</span>
                                <span>{field.title}</span>
                              </h5>
                              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                                {field.content || <span className="text-slate-400 italic">Vazio</span>}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
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
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    form="characterForm"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-200 transition-all cursor-pointer"
                  >
                    {isSaving ? 'Salvando...' : 'Salvar Ficha'}
                  </button>
                </>
              ) : (
                <>
                  {!readOnly && viewingCharacter && (
                    <button
                      type="button"
                      onClick={() => handleDelete(viewingCharacter.id)}
                      className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Excluir Personagem
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setViewingCharacter(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold ml-auto cursor-pointer"
                  >
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
