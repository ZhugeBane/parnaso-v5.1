import React, { useState, useEffect, useMemo } from 'react';
import { WritingSession, Project, User, StorySkeletonItem } from '../types';
import { Card } from './ui/Card';
import { useLanguage } from '../i18n/LanguageContext';
import { auth } from '../lib/firebase';
import { getStorySkeleton, subscribeToStorySkeleton, createQuickChapter } from '../services/projectCreativeService';
import {
  Clock,
  Calendar,
  Lock,
  FileText,
  Sparkles,
  BarChart3,
  Brain,
  Wrench,
  Target,
  Trophy,
  CheckCircle2,
  ChevronRight,
  Flame,
  AlertCircle
} from 'lucide-react';
import { ScriptusIcon, KronusIcon, HestiusIcon } from './ui/GamificationIcons';
import { sessionToKronus, evaluateStreakWithHestius, checkHestiusConsistencyRecharge } from '../services/rewardService';

interface SessionFormProps {
  onSubmit: (session: WritingSession) => void;
  onCancel: () => void;
  initialValues?: Partial<WritingSession>;
  projects: Project[];
  onAddProject?: (project: Project) => Promise<Project | undefined> | void;
  userHestius?: number;
  sessions?: WritingSession[];
  user?: User;
}

const DEFAULT_PROJECT_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399',
  '#22d3ee', '#818cf8', '#e879f9', '#f43f5e', '#64748b'
];

// Calculate session duration helper
const calculateDuration = (start?: string, end?: string): string | null => {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Overnight session
  }
  const diff = endMinutes - startMinutes;
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

// --- Semantic 1-5 Scale Component ---

interface SemanticScaleProps {
  label: string;
  value?: number;
  onChange: (val: number) => void;
  options?: number[];
  minLabel?: string;
  maxLabel?: string;
  mode?: 'stress' | 'rating';
}

const SemanticScale: React.FC<SemanticScaleProps> = ({
  label,
  value = 3,
  onChange,
  options = [1, 2, 3, 4, 5],
  minLabel,
  maxLabel,
  mode = 'stress'
}) => {
  const getButtonStyles = (opt: number, isSelected: boolean) => {
    if (mode === 'rating') {
      // 1 (Poor) to 5 (Excellent)
      if (!isSelected) return 'bg-slate-100 text-slate-600 hover:bg-slate-200';
      switch (opt) {
        case 1: return 'bg-rose-500 text-white shadow-md shadow-rose-200 scale-105';
        case 2: return 'bg-amber-500 text-white shadow-md shadow-amber-200 scale-105';
        case 3: return 'bg-yellow-500 text-white shadow-md shadow-yellow-200 scale-105';
        case 4: return 'bg-teal-500 text-white shadow-md shadow-teal-200 scale-105';
        case 5: return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-300 ring-2 ring-emerald-300 scale-110 font-black';
        default: return 'bg-teal-500 text-white';
      }
    } else {
      // Stress / Difficulty / Auto-correction (1 is Calm/Low, 5 is Intense/High)
      if (!isSelected) return 'bg-slate-100 text-slate-600 hover:bg-slate-200';
      switch (opt) {
        case 1: return 'bg-emerald-500 text-white shadow-md shadow-emerald-200 scale-105';
        case 2: return 'bg-teal-500 text-white shadow-md shadow-teal-200 scale-105';
        case 3: return 'bg-amber-500 text-white shadow-md shadow-amber-200 scale-105';
        case 4: return 'bg-orange-500 text-white shadow-md shadow-orange-200 scale-105';
        case 5: return 'bg-rose-500 text-white shadow-md shadow-rose-200 scale-105';
        default: return 'bg-teal-500 text-white';
      }
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</label>
        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
          {value}/5
        </span>
      </div>

      {/* Semantic Scale Buttons Row */}
      <div className="grid grid-cols-5 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80">
        {options.map((opt) => {
          const isSelected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`h-11 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${getButtonStyles(opt, isSelected)}`}
            >
              <span>{opt}</span>
              {mode === 'rating' && opt === 5 && isSelected && <span>⭐</span>}
            </button>
          );
        })}
      </div>

      {/* Balanced Legendas Row (Never squished) */}
      {(minLabel || maxLabel) && (
        <div className="flex items-center justify-between mt-2 px-1 text-[11px] font-semibold">
          {minLabel ? (
            <span className="text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100 truncate max-w-[48%]">
              1 • {minLabel}
            </span>
          ) : <span />}
          {maxLabel ? (
            <span className="text-rose-700 bg-rose-50/80 px-2 py-0.5 rounded-md border border-rose-100 truncate max-w-[48%] text-right">
              5 • {maxLabel}
            </span>
          ) : <span />}
        </div>
      )}
    </div>
  );
};

// --- Toggle as Selectable Card Component ---

interface ToggleCardProps {
  label: string;
  checked?: boolean;
  onChange: (val: boolean) => void;
  icon?: string;
  subLabel?: string;
}

const ToggleCard: React.FC<ToggleCardProps> = ({
  label,
  checked = false,
  onChange,
  icon = '✨',
  subLabel
}) => (
  <div
    onClick={() => onChange(!checked)}
    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
      checked
        ? 'bg-teal-50/80 border-teal-300 text-teal-900 shadow-xs ring-1 ring-teal-200'
        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
    }`}
  >
    <div className="flex items-center gap-3">
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-bold leading-tight">{label}</p>
        {subLabel && <p className="text-[11px] text-slate-400 mt-0.5">{subLabel}</p>}
      </div>
    </div>

    <div
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-teal-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </div>
  </div>
);

// --- Standard Input Field Component ---

const InputField = ({ label, type = "text", value, onChange, placeholder, required }: any) => (
  <div className="mb-3">
    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
      {label} {required && '*'}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all text-xs text-slate-800 font-medium"
    />
  </div>
);

// --- Main Component ---

export const SessionForm: React.FC<SessionFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
  projects,
  onAddProject,
  userHestius,
  sessions,
  user
}) => {
  const { t } = useLanguage();
  const effectiveUserId = user?.id || auth.currentUser?.uid || '';

  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingSession, setPendingSession] = useState<WritingSession | null>(null);
  const [randomMessage, setRandomMessage] = useState("");

  // New Project State
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectGoal, setNewProjectGoal] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(DEFAULT_PROJECT_COLORS[Math.floor(Math.random() * DEFAULT_PROJECT_COLORS.length)]);

  // Chapters State (Requirement 1)
  const [chapters, setChapters] = useState<StorySkeletonItem[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [showNewChapterInput, setShowNewChapterInput] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);

  const motivationalMessages = useMemo(() => [
    t('sessionForm.motivation1'),
    t('sessionForm.motivation2'),
    t('sessionForm.motivation3'),
    t('sessionForm.motivation4'),
    t('sessionForm.motivation5'),
    t('sessionForm.motivation6'),
    t('sessionForm.motivation7'),
    t('sessionForm.motivation8'),
    t('sessionForm.motivation9'),
    t('sessionForm.motivation10')
  ], [t]);

  useEffect(() => {
    if (showSuccess && pendingSession) {
      const timer = setTimeout(() => {
        onSubmit(pendingSession);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, pendingSession, onSubmit]);

  const [formData, setFormData] = useState<Partial<WritingSession>>({
    date: new Date().toISOString(),
    stressLevel: 3,
    difficultyLevel: 1,
    autoCorrectionFrequency: 1,
    sessionRating: 3,
    usedSkeleton: false,
    usedDrafts: false,
    wasMultitasking: false,
    usedTimeStrategy: false,
    selfRewarded: false,
    startTime: '',
    endTime: '',
    wordCount: 0,
    specificDifficulties: '',
    multitaskingDescription: '',
    timeStrategyDescription: '',
    rewardDescription: '',
    content: '',
    ...initialValues,
    projectId: initialValues?.projectId || '',
    chapterId: initialValues?.chapterId || undefined,
    chapterTitle: initialValues?.chapterTitle || undefined
  });

  // Carrega e sincroniza em tempo real os capítulos da obra selecionada
  useEffect(() => {
    if (!formData.projectId || !effectiveUserId) {
      setChapters([]);
      return;
    }
    let isMounted = true;
    setIsLoadingChapters(true);
    getStorySkeleton(formData.projectId, effectiveUserId).then(cached => {
      if (isMounted) {
        setChapters(cached);
        setIsLoadingChapters(false);
        if (formData.chapterId && !formData.chapterTitle) {
          const found = cached.find(c => c.id === formData.chapterId);
          if (found) {
            setFormData(prev => ({ ...prev, chapterTitle: found.title }));
          }
        }
      }
    }).catch(() => {
      if (isMounted) setIsLoadingChapters(false);
    });

    const unsubscribe = subscribeToStorySkeleton(formData.projectId, effectiveUserId, (fresh) => {
      if (isMounted) {
        setChapters(fresh);
        setIsLoadingChapters(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [formData.projectId, effectiveUserId]);

  // Criação inline rápida de novo capítulo direto no formulário
  const handleCreateQuickChapter = async () => {
    if (!newChapterTitle.trim() || !formData.projectId || !effectiveUserId) return;
    setIsCreatingChapter(true);
    try {
      const created = await createQuickChapter(formData.projectId, effectiveUserId, newChapterTitle.trim());
      setChapters(prev => {
        const next = [...prev, created];
        next.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return next;
      });
      setFormData(prev => ({
        ...prev,
        chapterId: created.id,
        chapterTitle: created.title,
        usedSkeleton: true
      }));
      setShowNewChapterInput(false);
      setNewChapterTitle('');
    } catch (err) {
      console.error('Erro ao criar capítulo inline:', err);
      alert('Erro ao criar capítulo. Tente novamente.');
    } finally {
      setIsCreatingChapter(false);
    }
  };

  const handleChange = (key: keyof WritingSession, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showSuccess || pendingSession) return;
    if (!formData.startTime || !formData.endTime) {
      alert(t('sessionForm.fillTimes'));
      return;
    }

    const safeWordCount = Math.max(
      0,
      Math.min(
        100000,
        Number(formData.wordCount) > 0
          ? Math.floor(Number(formData.wordCount))
          : formData.content
            ? formData.content.trim().split(/\s+/).filter(Boolean).length
            : 0
      )
    );

    const newSession: WritingSession = {
      id: initialValues?.id || formData.id || Date.now().toString(),
      projectId: formData.projectId === '' ? undefined : formData.projectId,
      chapterId: formData.chapterId || undefined,
      chapterTitle: formData.chapterTitle || undefined,
      date: formData.date || new Date().toISOString(),
      startTime: formData.startTime!,
      endTime: formData.endTime!,
      wordCount: safeWordCount,
      content: formData.content || '',
      stressLevel: formData.stressLevel!,
      usedSkeleton: formData.usedSkeleton!,
      usedDrafts: formData.usedDrafts!,
      autoCorrectionFrequency: formData.autoCorrectionFrequency!,
      difficultyLevel: formData.difficultyLevel!,
      specificDifficulties: formData.specificDifficulties || '',
      wasMultitasking: formData.wasMultitasking!,
      multitaskingDescription: formData.multitaskingDescription || '',
      usedTimeStrategy: formData.usedTimeStrategy!,
      timeStrategyDescription: formData.timeStrategyDescription || '',
      selfRewarded: formData.selfRewarded!,
      rewardDescription: formData.rewardDescription || '',
      sessionRating: formData.sessionRating!
    };

    const msg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    setRandomMessage(msg);
    setPendingSession(newSession);
    setShowSuccess(true);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !onAddProject) return;

    const project: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      targetWordCount: newProjectGoal ? Number(newProjectGoal) : undefined,
      color: newProjectColor,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    try {
      const saved = await onAddProject(project);
      if (saved && saved.id) {
        handleChange('projectId', saved.id);
      } else {
        handleChange('projectId', project.id);
      }
    } catch (e) {
      console.error('Erro ao adicionar projeto:', e);
      handleChange('projectId', project.id);
    }

    // Reset form
    setShowNewProjectForm(false);
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectGoal('');
  };

  const getDateInputValue = (isoDate?: string) => {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleDateString('en-CA');
  };

  // Calculated duration badge
  const durationText = calculateDuration(formData.startTime, formData.endTime);
  const wordsInText = formData.content ? formData.content.trim().split(/\s+/).filter(Boolean).length : 0;

  // Real-time Gamification Preview (Scriptus, Kronus, Hestius)
  const sessionWords = Number(formData.wordCount) || 0;
  const sessionScriptus = Math.floor(sessionWords / 2);
  const sessionKronus = sessionToKronus(formData.startTime, formData.endTime);

  const willRechargeHestius = useMemo(() => {
    const currentHestius = userHestius ?? 1;
    if (currentHestius >= 3) return false;
    if (!sessions || sessions.length === 0) return false;
    const hypotheticalSessions = [
      {
        ...formData,
        date: formData.date || new Date().toISOString(),
        wordCount: sessionWords
      } as WritingSession,
      ...sessions
    ];
    const streakEval = evaluateStreakWithHestius(hypotheticalSessions, currentHestius);
    const recharge = checkHestiusConsistencyRecharge(streakEval.currentStreak, undefined, currentHestius);
    return recharge.willRecharge;
  }, [formData, sessionWords, sessions, userHestius]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 animate-fade-in">
      {/* Motivational Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-500">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center transform animate-[scaleIn_0.5s_ease-out]">
            <div className="w-20 h-20 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-teal-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">{t('sessionForm.savedSuccess')}</h3>
            <p className="text-base text-slate-600 italic font-medium">"{randomMessage}"</p>
            <div className="mt-6 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-teal-500 h-1.5 rounded-full animate-[progress_2.5s_linear]"></div>
            </div>
          </div>
          <style>{`
            @keyframes scaleIn {
              from { transform: scale(0.9); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            @keyframes progress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span>✍️</span>
            <span>{initialValues?.id ? '✏️ Editar Sessão de Escrita' : t('sessionForm.details')}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Documente sua prática de escrita para alimentar suas métricas de automonitoramento.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          {t('common.cancel')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project & Chapter Selection Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('sessionForm.projectQuestion')}
              </label>
              {!showNewProjectForm && onAddProject && (
                <button
                  type="button"
                  onClick={() => setShowNewProjectForm(true)}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>+</span>
                  <span>{t('sessionForm.newProject')}</span>
                </button>
              )}
            </div>

            {!showNewProjectForm ? (
              <select
                value={formData.projectId || ''}
                onChange={(e) => {
                  const newPid = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    projectId: newPid,
                    chapterId: undefined,
                    chapterTitle: undefined
                  }));
                }}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none bg-white font-medium text-xs text-slate-800 transition-all cursor-pointer"
              >
                <option value="">{t('sessionForm.noProject')}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label={t('sessionForm.projectName')}
                    value={newProjectName}
                    onChange={setNewProjectName}
                    required
                  />
                  <InputField
                    label={t('sessionForm.projectGoal')}
                    type="number"
                    value={newProjectGoal}
                    onChange={setNewProjectGoal}
                  />
                </div>
                <InputField
                  label={t('sessionForm.projectDesc')}
                  value={newProjectDesc}
                  onChange={setNewProjectDesc}
                />

                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-2">
                    {DEFAULT_PROJECT_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewProjectColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform hover:scale-110 cursor-pointer ${newProjectColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewProjectForm(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      {t('sessionForm.cancelNewProject')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateProject}
                      disabled={!newProjectName}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {t('sessionForm.addProject')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chapter / Part of Work Selector (Requirement 1) */}
          {formData.projectId && (
            <div className="pt-3 border-t border-slate-100 animate-fade-in">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📖</span>
                  <span>Capítulo / Parte da Obra</span>
                </label>
                {!showNewChapterInput && (
                  <button
                    type="button"
                    onClick={() => setShowNewChapterInput(true)}
                    className="text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>+</span>
                    <span>Criar novo capítulo aqui mesmo</span>
                  </button>
                )}
              </div>

              {!showNewChapterInput ? (
                <div className="relative">
                  <select
                    value={formData.chapterId || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) {
                        setFormData(prev => ({ ...prev, chapterId: undefined, chapterTitle: undefined }));
                      } else {
                        const ch = chapters.find(c => c.id === selectedId);
                        setFormData(prev => ({
                          ...prev,
                          chapterId: selectedId,
                          chapterTitle: ch ? ch.title : undefined,
                          usedSkeleton: true
                        }));
                      }
                    }}
                    className="w-full px-4 py-2.5 border border-violet-200/90 rounded-xl focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none bg-violet-50/30 hover:bg-violet-50/50 font-medium text-xs text-slate-800 transition-all cursor-pointer"
                  >
                    <option value="">📌 Geral / Sem capítulo específico</option>
                    {chapters.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        #{ch.order} - {ch.title}
                      </option>
                    ))}
                  </select>
                  {isLoadingChapters && (
                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 animate-pulse">
                      Carregando capítulos...
                    </span>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-violet-50/60 rounded-2xl border border-violet-200 space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-violet-900 uppercase tracking-wider mb-1">
                      Nome do Novo Capítulo
                    </label>
                    <input
                      type="text"
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateQuickChapter();
                        }
                      }}
                      placeholder="Ex: Capítulo VII - O Confronto..."
                      className="w-full px-3.5 py-2 bg-white border border-violet-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="text-[11px] text-violet-700/80">
                      Será salvo na obra e sincronizado com o Esqueleto da Obra.
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewChapterInput(false);
                          setNewChapterTitle('');
                        }}
                        className="px-3 py-1.5 font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateQuickChapter}
                        disabled={!newChapterTitle.trim() || isCreatingChapter}
                        className="px-3.5 py-1.5 font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                      >
                        {isCreatingChapter ? 'Criando...' : 'Adicionar Capítulo'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 1. ÁREA DO EDITOR (TOPO) COM ESTÉTICA DE PAPEL / MODO FOCO */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden group focus-within:ring-2 focus-within:ring-teal-400 focus-within:border-teal-400 transition-all">
          {/* Paper Header */}
          <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>{t('sessionForm.draftTitle')}</span>
              <span className="text-[11px] font-medium text-slate-400 normal-case hidden sm:inline">
                ({t('sessionForm.draftSubtitle')})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-extrabold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200 text-xs flex items-center gap-1.5 shadow-2xs">
                <span>📝</span>
                <span>Palavras no texto: {wordsInText}</span>
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <textarea
              className="w-full p-3 bg-slate-50/30 rounded-2xl border border-slate-200/70 focus:bg-white focus:outline-none text-slate-800 font-serif text-sm leading-relaxed transition-all resize-y"
              rows={7}
              placeholder={t('sessionForm.draftPlaceholder')}
              value={formData.content}
              onChange={(e) => {
                const val = e.target.value;
                const words = val.trim() ? val.trim().split(/\s+/).filter(Boolean).length : 0;
                setFormData(prev => ({
                  ...prev,
                  content: val,
                  wordCount: prev.wordCount === 0 || prev.wordCount === undefined ? words : prev.wordCount
                }));
              }}
            />

            <div className="flex items-center justify-end gap-1.5 mt-2 text-[11px] text-slate-400 font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('sessionForm.draftWarning')}</span>
            </div>
          </div>
        </div>

        {/* 2. BENTO GRID DE DUAS COLUNAS PARA AS 5 SEÇÕES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* === COLUNA ESQUERDA === */}
          <div className="space-y-6">
            {/* SEÇÃO 1: MÉTRICAS COM VISUAL DE DASHBOARD */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-teal-50 text-teal-700 rounded-xl">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                    {t('sessionForm.sectionMetrics')}
                  </h3>
                </div>

                {durationText && (
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1 shadow-2xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Duração: {durationText}</span>
                  </span>
                )}
              </div>

              {/* Date */}
              <div>
                <InputField
                  label={t('sessionForm.date')}
                  type="date"
                  value={getDateInputValue(formData.date)}
                  onChange={(v: string) => {
                    if (!v) return;
                    const d = new Date(v + 'T00:00:00');
                    if (!isNaN(d.getTime())) {
                      handleChange('date', d.toISOString());
                    }
                  }}
                  required
                />
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label={t('sessionForm.startTime')}
                  type="time"
                  value={formData.startTime}
                  onChange={(v: string) => handleChange('startTime', v)}
                  required
                />
                <InputField
                  label={t('sessionForm.endTime')}
                  type="time"
                  value={formData.endTime}
                  onChange={(v: string) => handleChange('endTime', v)}
                  required
                />
              </div>

              {/* Words Written (Prominent Hero Input) */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t('sessionForm.wordsWritten')} *
                  </label>
                  {wordsInText > 0 && formData.wordCount !== wordsInText && (
                    <button
                      type="button"
                      onClick={() => handleChange('wordCount', wordsInText)}
                      className="text-[11px] font-bold text-teal-600 hover:underline cursor-pointer"
                    >
                      Copiar contagem do texto ({wordsInText})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.wordCount}
                    onChange={(v: any) => handleChange('wordCount', v.target.value)}
                    placeholder={t('sessionForm.exNumber')}
                    required
                    className="w-full px-4 py-3 bg-teal-50/40 border border-teal-200 rounded-2xl font-black text-2xl text-teal-900 outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-600 uppercase">
                    palavras
                  </span>
                </div>

                {/* Live Gamification Preview (Scriptus, Kronus, Hestius) */}
                <div className="mt-3.5 p-3.5 bg-gradient-to-r from-violet-50/80 via-amber-50/50 to-purple-50/80 border border-violet-100 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                      <span>Ganhos desta Sessão:</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-100/90 text-violet-800 font-extrabold text-xs shadow-2xs border border-violet-200/80">
                        <ScriptusIcon className="w-3.5 h-3.5 text-violet-600" />
                        <span>+{sessionScriptus} Scriptus</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100/90 text-amber-800 font-extrabold text-xs shadow-2xs border border-amber-200/80">
                        <KronusIcon className="w-3.5 h-3.5 text-amber-600" />
                        <span>+{sessionKronus} Kronus</span>
                      </span>
                    </div>
                  </div>

                  {willRechargeHestius && (
                    <div className="flex items-center gap-2 p-2 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold animate-fade-in">
                      <HestiusIcon className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
                      <span>🔥 Esta sessão completará 2 dias seguidos e recarregará +1 Hestius para o seu Altar!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: DIFICULDADES E CORREÇÃO */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-1.5 bg-amber-50 text-amber-700 rounded-xl">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                  {t('sessionForm.sectionDifficulty')}
                </h3>
              </div>

              {/* Autocorreção */}
              <SemanticScale
                label={t('sessionForm.autoCorrection')}
                value={formData.autoCorrectionFrequency}
                onChange={(v: number) => handleChange('autoCorrectionFrequency', v)}
                options={[1, 2, 3, 4, 5]}
                minLabel={t('sessionForm.noCorrection')}
                maxLabel={t('sessionForm.intenseCorrection')}
                mode="stress"
              />

              {/* Dificuldade */}
              <div className="pt-3 border-t border-slate-100">
                <SemanticScale
                  label={t('sessionForm.difficultyLevel')}
                  value={formData.difficultyLevel}
                  onChange={(v: number) => handleChange('difficultyLevel', v)}
                  options={[1, 2, 3, 4, 5]}
                  minLabel={t('sessionForm.none')}
                  maxLabel={t('sessionForm.intense')}
                  mode="stress"
                />
              </div>

              {/* Specific Difficulties Textarea */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('sessionForm.difficultiesQuestion')}
                </label>
                <textarea
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-400 leading-relaxed"
                  rows={2}
                  value={formData.specificDifficulties}
                  onChange={(e) => handleChange('specificDifficulties', e.target.value)}
                  placeholder={t('sessionForm.describeBriefly')}
                />
              </div>
            </div>
          </div>

          {/* === COLUNA DIREITA === */}
          <div className="space-y-6">
            {/* SEÇÃO 2: PROCESSO E ESTADO */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-1.5 bg-rose-50 text-rose-700 rounded-xl">
                  <Brain className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                  {t('sessionForm.sectionProcess')}
                </h3>
              </div>

              {/* Nível de Estresse */}
              <SemanticScale
                label={t('sessionForm.stressLevel')}
                value={formData.stressLevel}
                onChange={(v: number) => handleChange('stressLevel', v)}
                options={[1, 2, 3, 4, 5]}
                minLabel={t('sessionForm.levelCalm')}
                maxLabel={t('sessionForm.levelStressful')}
                mode="stress"
              />

              {/* Selectable Cards: Esqueleto & Rascunhos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <ToggleCard
                  label={t('sessionForm.usedSkeleton')}
                  checked={formData.usedSkeleton}
                  onChange={(v: boolean) => handleChange('usedSkeleton', v)}
                  icon="📐"
                />
                <ToggleCard
                  label={t('sessionForm.usedDrafts')}
                  checked={formData.usedDrafts}
                  onChange={(v: boolean) => handleChange('usedDrafts', v)}
                  icon="📝"
                />
              </div>
            </div>

            {/* SEÇÃO 4: GESTÃO E FOCO */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                  {t('sessionForm.sectionFocus')}
                </h3>
              </div>

              {/* Multitasking Card */}
              <div className="space-y-2">
                <ToggleCard
                  label={t('sessionForm.wasMultitasking')}
                  checked={formData.wasMultitasking}
                  onChange={(v: boolean) => handleChange('wasMultitasking', v)}
                  icon="🔀"
                />
                {formData.wasMultitasking && (
                  <div className="pl-2 animate-fade-in">
                    <InputField
                      label={t('sessionForm.whichActivity')}
                      value={formData.multitaskingDescription}
                      onChange={(v: string) => handleChange('multitaskingDescription', v)}
                      placeholder="Ex: Ouvindo podcast, respondendo mensagens..."
                    />
                  </div>
                )}
              </div>

              {/* Time Strategy Card */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <ToggleCard
                  label={t('sessionForm.usedTimeStrategy')}
                  checked={formData.usedTimeStrategy}
                  onChange={(v: boolean) => handleChange('usedTimeStrategy', v)}
                  icon="⏳"
                />
                {formData.usedTimeStrategy && (
                  <div className="pl-2 animate-fade-in">
                    <InputField
                      label={t('sessionForm.whichStrategy')}
                      value={formData.timeStrategyDescription}
                      onChange={(v: string) => handleChange('timeStrategyDescription', v)}
                      placeholder={t('sessionForm.exPomodoro')}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO 5: CONCLUSÃO */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-1.5 bg-purple-50 text-purple-700 rounded-xl">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                  {t('sessionForm.sectionConclusion')}
                </h3>
              </div>

              {/* Self Rewarded Card */}
              <div className="space-y-2">
                <ToggleCard
                  label={t('sessionForm.selfRewarded')}
                  checked={formData.selfRewarded}
                  onChange={(v: boolean) => handleChange('selfRewarded', v)}
                  icon="🎁"
                />
                {formData.selfRewarded && (
                  <div className="pl-2 animate-fade-in">
                    <InputField
                      label={t('sessionForm.withWhat')}
                      value={formData.rewardDescription}
                      onChange={(v: string) => handleChange('rewardDescription', v)}
                      placeholder={t('sessionForm.exReward')}
                    />
                  </div>
                )}
              </div>

              {/* Session Rating (Semantic Gold/Emerald Scale) */}
              <div className="pt-3 border-t border-slate-100">
                <SemanticScale
                  label={t('sessionForm.sessionRating')}
                  value={formData.sessionRating}
                  onChange={(v: number) => handleChange('sessionRating', v)}
                  options={[1, 2, 3, 4, 5]}
                  minLabel={t('sessionForm.ratingPoor')}
                  maxLabel={t('sessionForm.ratingExcellent')}
                  mode="rating"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 6. BARRA DE AÇÃO DESTACADA NO RODAPÉ */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-lg flex items-center justify-between gap-4 sticky bottom-4 z-30">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {t('common.cancel')}
          </button>

          <button
            type="submit"
            disabled={showSuccess || Boolean(pendingSession)}
            className="px-8 py-3.5 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:opacity-50 disabled:pointer-events-none shadow-xl shadow-teal-500/25 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span>{showSuccess ? 'Salvando...' : initialValues?.id ? 'Salvar Alterações' : 'Salvar Sessão'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};