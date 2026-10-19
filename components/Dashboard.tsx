
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { WritingSession, UserSettings, Project, User, ClaimedReward } from '../types';
import { Card } from './ui/Card';
import { Logo } from './ui/Logo';
import { SessionDetailsModal } from './SessionDetailsModal';
import { LanguageSelector } from './ui/LanguageSelector';
import { HeatmapChart } from './ui/HeatmapChart';
import { useLanguage } from '../i18n/LanguageContext';
import { updateUserProfilePicture, updateUserProfileBase64, updateUserHestius } from '../services/authService';
import { compressImage, resizeImageToBase64 } from '../utils/imageProcessor';
import { ImagePicker } from './ui/ImagePicker';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ReferenceLine, PieChart, Pie, Cell, Legend
} from 'recharts';
import { ProjectWorkspace } from './ProjectWorkspace';
import { RewardsShop } from './RewardsShop';
import { AchievementsGallery } from './AchievementsGallery';
import { BookOpen, Users, Sparkles, Clock, Hourglass } from 'lucide-react';
import {
  wordsToDiamonds,
  wordsToScriptus,
  sessionToKronus,
  calculateBalances,
  evaluateStreakWithHestius,
  getClaimedRewards,
  calculateSessionMinutes,
  formatMinutesToHours,
  formatMinutesShort
} from '../services/rewardService';
import { AuthorProfileModal } from './AuthorProfileModal';
import { ScriptusIcon, KronusIcon, HestiusIcon, HestiusOrbs } from './ui/GamificationIcons';

interface DashboardProps {
  user: User;
  sessions: WritingSession[];
  projects: Project[];
  settings: UserSettings;
  onNewSession: (initialData?: Partial<WritingSession>) => void;
  onFocusMode: () => void;
  onUpdateSettings: (settings: UserSettings) => void;
  onAddProject: (project: Project) => Promise<Project | undefined> | void;
  onDeleteProject?: (projectId: string) => Promise<void> | void;
  onResetData: () => void;
  onLogout: () => void;
  onAdminPanel?: () => void;
  onSocial?: () => void; // Added Prop
  onHelp?: () => void; // Added Prop for Help Page
  onUpdateUser?: (updated: Partial<User>) => void;
  readOnly?: boolean;
}

// Default colors used for stats other than projects
const STAT_COLORS = ['#2dd4bf', '#f472b6', '#fbbf24', '#a78bfa', '#60a5fa'];
const DEFAULT_PROJECT_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399',
  '#22d3ee', '#818cf8', '#e879f9', '#f43f5e', '#64748b'
];

type DateFilterType = 'all' | '7days' | '30days' | '6months' | '1year';

// --- ICONS FOR TROPHIES ---
const Icons = {
  Fire: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  ),
  Medal: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
  ),
  Trophy: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></svg>
  ),
  Crown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></svg>
  )
};

// --- TROPHY DEFINITIONS ---
type TrophyType = {
  id: string;
  title: string;
  description: string;
  threshold: number;
  category: 'daily' | 'weekly' | 'monthly' | 'total' | 'streak';
  icon: keyof typeof Icons;
  color: string;
};

const TROPHIES: TrophyType[] = [
  // Daily
  { id: 'daily_500', title: 'Start Rápido', description: 'Escreva 500 palavras em um dia', threshold: 500, category: 'daily', icon: 'Shield', color: 'bg-emerald-100 text-emerald-600' },
  { id: 'daily_1000', title: 'Fluxo Intenso', description: 'Escreva 1.000 palavras em um dia', threshold: 1000, category: 'daily', icon: 'Shield', color: 'bg-teal-100 text-teal-600' },
  { id: 'daily_2000', title: 'Hiperfoco', description: 'Escreva 2.000 palavras em um dia', threshold: 2000, category: 'daily', icon: 'Shield', color: 'bg-cyan-100 text-cyan-600' },
  // Weekly
  { id: 'weekly_3000', title: 'Fim de Semana', description: '3.000 palavras em uma semana', threshold: 3000, category: 'weekly', icon: 'Medal', color: 'bg-indigo-100 text-indigo-600' },
  { id: 'weekly_7000', title: 'Maratonista', description: '7.000 palavras em uma semana', threshold: 7000, category: 'weekly', icon: 'Medal', color: 'bg-violet-100 text-violet-600' },
  // Monthly
  { id: 'monthly_10000', title: 'Romancista Jr', description: '10.000 palavras em um mês', threshold: 10000, category: 'monthly', icon: 'Trophy', color: 'bg-fuchsia-100 text-fuchsia-600' },
  { id: 'monthly_30000', title: 'Best Seller', description: '30.000 palavras em um mês', threshold: 30000, category: 'monthly', icon: 'Trophy', color: 'bg-pink-100 text-pink-600' },
  // Streak
  { id: 'streak_3', title: 'Faísca', description: '3 dias seguidos escrevendo', threshold: 3, category: 'streak', icon: 'Fire', color: 'bg-orange-100 text-orange-600' },
  { id: 'streak_7', title: 'Em Chamas', description: '7 dias seguidos escrevendo', threshold: 7, category: 'streak', icon: 'Fire', color: 'bg-red-100 text-red-600' },
  // Total
  { id: 'total_50000', title: 'O Grande Livro', description: '50.000 palavras no total', threshold: 50000, category: 'total', icon: 'Crown', color: 'bg-amber-100 text-amber-600' },
];


// Helper Component OUTSIDE Main
const Stat = ({ label, value, colorClass, subValue, subtitle, badge }: any) => (
  <div className="flex flex-col">
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">{label}</span>
      {badge}
    </div>
    <div className="flex items-baseline gap-2 mt-1">
      <span className={`text-3xl font-bold ${colorClass}`}>{value}</span>
      {subValue && <span className="text-sm text-slate-400">{subValue}</span>}
    </div>
    {subtitle && <div className="mt-1.5 text-xs text-slate-500 font-medium">{subtitle}</div>}
  </div>
);

// Resilient helper to match a session to its project by ID or Name
export const getProjectForSession = (session: WritingSession, allProjects: Project[]): Project | undefined => {
  if (!session.projectId) return undefined;
  const rawId = String(session.projectId).trim();
  if (!rawId) return undefined;

  // 1. Direct match by ID
  const direct = allProjects.find(p => p.id === rawId);
  if (direct) return direct;

  // 2. Case-insensitive match by project name
  const byName = allProjects.find(p => p.name.trim().toLowerCase() === rawId.toLowerCase());
  if (byName) return byName;

  return undefined;
};

export const isSessionInProject = (session: WritingSession, project: Project, allProjects: Project[]): boolean => {
  if (!session.projectId) return false;
  const rawId = String(session.projectId).trim();
  if (!rawId) return false;

  if (rawId === project.id) return true;
  if (rawId.toLowerCase() === project.name.trim().toLowerCase()) return true;

  const resolved = getProjectForSession(session, allProjects);
  return resolved?.id === project.id;
};

export const Dashboard: React.FC<DashboardProps> = ({ user, sessions, projects, settings, onNewSession, onFocusMode, onUpdateSettings, onAddProject, onDeleteProject, onResetData, onLogout, onAdminPanel, onSocial, onHelp, onUpdateUser, readOnly = false }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'general' | 'projects' | 'achievements' | 'rewards'>('general');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [selectedSession, setSelectedSession] = useState<WritingSession | null>(null);
  const [showAuthorProfileModal, setShowAuthorProfileModal] = useState(false);
  const [claims, setClaims] = useState<ClaimedReward[]>([]);

  useEffect(() => {
    let isMounted = true;
    getClaimedRewards(user.id).then(c => {
      if (isMounted) setClaims(c);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [user.id, activeTab]);

  // Work Slidebar Selection ('all' | 'general' | projectId)
  const [selectedWorkId, setSelectedWorkId] = useState<string>('all');
  const slidebarScrollRef = useRef<HTMLDivElement>(null);

  // Quality Chart Metric Filter ('all' | 'avaliacao' | 'estresse' | 'dificuldade' | 'autocorrecao')
  const [qualityMetricFilter, setQualityMetricFilter] = useState<'all' | 'avaliacao' | 'estresse' | 'dificuldade' | 'autocorrecao'>('all');

  // Interactive Goals Inline Edit State
  const [editingGoal, setEditingGoal] = useState<'daily' | 'weekly' | 'dailyTime' | 'weeklyTime' | null>(null);
  const [tempGoalInput, setTempGoalInput] = useState<string>('');

  // Segmented Control View Mode: 'words' (Volume de Palavras) vs 'time' (Tempo de Produção / Kronus)
  const [metricViewMode, setMetricViewMode] = useState<'words' | 'time'>('words');

  // Bar Chart Interactive Work Filter / Highlight
  const [highlightedWorkId, setHighlightedWorkId] = useState<string | null>(null);

  // Calendar Navigation
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);

  // Donut Chart Hovered Strategy
  const [hoveredStrategy, setHoveredStrategy] = useState<{ name: string; value: number } | null>(null);

  // Heatmap Hide Early Hours Toggle (default: true -> 08h-23h)
  const [hideEarlyHours, setHideEarlyHours] = useState<boolean>(true);

  const handleSaveGoal = (type: 'daily' | 'weekly' | 'dailyTime' | 'weeklyTime') => {
    const val = parseInt(tempGoalInput, 10);
    if (!isNaN(val) && val > 0) {
      if (type === 'daily') {
        onUpdateSettings({ ...settings, dailyWordGoal: val });
      } else if (type === 'weekly') {
        onUpdateSettings({ ...settings, weeklyWordGoal: val });
      } else if (type === 'dailyTime') {
        onUpdateSettings({ ...settings, dailyMinutesGoal: val });
      } else if (type === 'weeklyTime') {
        onUpdateSettings({ ...settings, weeklyMinutesGoal: val });
      }
    }
    setEditingGoal(null);
  };

  // Privacy / Print Mode: hides secret project names in charts and legends for photos/screenshots
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('parnaso_privacy_mode') === 'true';
  });

  const togglePrivacyMode = () => {
    setIsPrivacyMode(prev => {
      const next = !prev;
      localStorage.setItem('parnaso_privacy_mode', String(next));
      return next;
    });
  };

  const scrollSlidebar = (direction: 'left' | 'right') => {
    if (slidebarScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      slidebarScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Only projects enabled for automonitoring
  const projectsInAutomonitoring = useMemo(() => {
    return projects.filter(p => p.showInAutomonitoring !== false);
  }, [projects]);

  // Modo Discreto / Cortina de Privacidade (shoulder-surfing protection)
  // Obras ocultas do automonitoramento ficam automaticamente em Modo Discreto,
  // e o usuário também pode ativar/desativar o cadeado em qualquer obra.
  const [customDiscreetIds, setCustomDiscreetIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('parnaso_discreet_works');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [revealedDiscreetIds, setRevealedDiscreetIds] = useState<string[]>([]);

  const isProjectDiscreet = (project: Project): boolean => {
    const isHiddenFromAuto = project.showInAutomonitoring === false;
    const isCustomDiscreet = customDiscreetIds.includes(project.id);
    if (!isHiddenFromAuto && !isCustomDiscreet) return false;
    return !revealedDiscreetIds.includes(project.id);
  };

  const toggleProjectDiscreetLock = (project: Project) => {
    const isHiddenFromAuto = project.showInAutomonitoring === false;
    const isCustomDiscreet = customDiscreetIds.includes(project.id);

    if (isHiddenFromAuto || isCustomDiscreet) {
      // Alterna revelação temporária ou remove do customDiscreetIds
      if (revealedDiscreetIds.includes(project.id)) {
        setRevealedDiscreetIds(prev => prev.filter(id => id !== project.id));
      } else if (isCustomDiscreet && !isHiddenFromAuto) {
        const next = customDiscreetIds.filter(id => id !== project.id);
        setCustomDiscreetIds(next);
        localStorage.setItem('parnaso_discreet_works', JSON.stringify(next));
      } else {
        setRevealedDiscreetIds(prev => [...prev, project.id]);
      }
    } else {
      const next = [...customDiscreetIds, project.id];
      setCustomDiscreetIds(next);
      localStorage.setItem('parnaso_discreet_works', JSON.stringify(next));
      setRevealedDiscreetIds(prev => prev.filter(id => id !== project.id));
    }
  };

  const handleToggleProjectInAutomonitoring = (project: Project, enabled: boolean) => {
    const updated: Project = { ...project, showInAutomonitoring: enabled };
    onAddProject(updated);
    if (!enabled && selectedWorkId === project.id) {
      setSelectedWorkId('all');
    }
  };

  const [showAllSessionsList, setShowAllSessionsList] = useState(false);

  // Modules selector state ("Quais ver")
  const defaultModules = useMemo(() => ({
    goals: true,
    kpis: true,
    wordProduction: true,
    qualityIndicators: true,
    calendar: true,
    strategies: true,
    heatmap: true,
    sessionsList: true,
    insights: true,
  }), []);

  const [visibleModules, setVisibleModules] = useState<{
    goals: boolean;
    kpis: boolean;
    wordProduction: boolean;
    qualityIndicators: boolean;
    calendar: boolean;
    strategies: boolean;
    heatmap: boolean;
    sessionsList: boolean;
    insights: boolean;
  }>(() => {
    const saved = localStorage.getItem('parnaso_visible_modules');
    if (saved) {
      try {
        return {
          goals: true,
          kpis: true,
          wordProduction: true,
          qualityIndicators: true,
          calendar: true,
          strategies: true,
          heatmap: true,
          sessionsList: true,
          insights: true,
          ...JSON.parse(saved)
        };
      } catch (e) {}
    }
    return {
      goals: true,
      kpis: true,
      wordProduction: true,
      qualityIndicators: true,
      calendar: true,
      strategies: true,
      heatmap: true,
      sessionsList: true,
      insights: true,
    };
  });
  const [showModuleSelector, setShowModuleSelector] = useState(false);


  const toggleModule = (moduleKey: keyof typeof defaultModules) => {
    setVisibleModules(prev => {
      const updated = { ...prev, [moduleKey]: !prev[moduleKey] };
      localStorage.setItem('parnaso_visible_modules', JSON.stringify(updated));
      return updated;
    });
  };

  const setAllModules = (val: boolean) => {
    const updated = {
      goals: val,
      kpis: val,
      wordProduction: val,
      qualityIndicators: val,
      calendar: val,
      strategies: val,
      heatmap: val,
      sessionsList: val,
      insights: val,
    };
    setVisibleModules(updated);
    localStorage.setItem('parnaso_visible_modules', JSON.stringify(updated));
  };

  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<UserSettings>(settings);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // New Project Modal State
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectGoal, setNewProjectGoal] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(DEFAULT_PROJECT_COLORS[Math.floor(Math.random() * DEFAULT_PROJECT_COLORS.length)]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const project: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
      targetWordCount: newProjectGoal ? Number(newProjectGoal) : undefined,
      color: newProjectColor,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    await onAddProject(project);
    setShowNewProject(false);
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectGoal('');
    setNewProjectColor(DEFAULT_PROJECT_COLORS[Math.floor(Math.random() * DEFAULT_PROJECT_COLORS.length)]);
  };

  // Projects Gallery Search & Sorting
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectSortBy, setProjectSortBy] = useState<'recent' | 'words' | 'alphabetical'>('recent');

  // Inline Description Quick Edit
  const [editingDescProjectId, setEditingDescProjectId] = useState<string | null>(null);
  const [tempDescValue, setTempDescValue] = useState<string>('');

  // Edit Project Modal State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  const [editProjectGoal, setEditProjectGoal] = useState('');
  const [editProjectColor, setEditProjectColor] = useState('');

  const handleOpenEditProject = (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDesc(project.description || '');
    setEditProjectGoal(project.targetWordCount ? String(project.targetWordCount) : '');
    setEditProjectColor(project.color || '#2dd4bf');
  };

  const handleSaveEditedProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProjectName.trim()) return;

    const updated: Project = {
      ...editingProject,
      name: editProjectName.trim(),
      description: editProjectDesc.trim(),
      targetWordCount: editProjectGoal ? Number(editProjectGoal) : undefined,
      color: editProjectColor || editingProject.color,
    };

    await onAddProject(updated);
    setEditingProject(null);
  };

  const filteredAndSortedProjects = useMemo(() => {
    let list = projects.filter(p => {
      if (!projectSearchQuery.trim()) return true;
      const q = projectSearchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description ? p.description.toLowerCase().includes(q) : false;
      return matchName || matchDesc;
    });

    if (projectSortBy === 'words') {
      list = [...list].sort((a, b) => {
        const wordsA = sessions.filter(s => isSessionInProject(s, a, projects)).reduce((acc, curr) => acc + curr.wordCount, 0);
        const wordsB = sessions.filter(s => isSessionInProject(s, b, projects)).reduce((acc, curr) => acc + curr.wordCount, 0);
        return wordsB - wordsA;
      });
    } else if (projectSortBy === 'alphabetical') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    } else {
      // Recent: if createdAt exists, newest first; otherwise preserve array order
      list = [...list].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    return list;
  }, [projects, sessions, projectSearchQuery, projectSortBy]);

  // Delete Project Modal State (Double Verification: Click Trash -> Confirm Checkbox)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteConfirmedCheck, setDeleteConfirmedCheck] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const handleExecuteDeleteProject = async () => {
    if (!projectToDelete || !onDeleteProject) return;
    try {
      setIsDeletingProject(true);
      await onDeleteProject(projectToDelete.id);
      if (selectedProjectId === projectToDelete.id) {
        setSelectedProjectId(null);
      }
      if (selectedWorkId === projectToDelete.id) {
        setSelectedWorkId('all');
      }
      setProjectToDelete(null);
      setDeleteConfirmedCheck(false);
    } catch (err) {
      console.error('Erro ao excluir projeto:', err);
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleUpdateAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || readOnly) return;
    e.target.value = '';

    try {
      setIsUpdatingAvatar(true);
      
      // HTML5 Canvas resize to 200x200 pixels JPEG (0.7 quality) Base64
      const base64 = await resizeImageToBase64(file, 200, 200, 0.7);
      
      // Save directly to photoBase64 in Firestore users collection
      await updateUserProfileBase64(user.id, base64);
      user.photoBase64 = base64;
      user.photoURL = base64;
      
      window.location.reload();
    } catch (error) {
      console.error("Erro ao atualizar foto:", error);
      alert("Erro ao processar imagem de perfil. Verifique o arquivo e tente novamente.");
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleSelectProfileBase64 = async (base64: string) => {
    if (readOnly) return;
    try {
      setIsUpdatingAvatar(true);
      await updateUserProfileBase64(user.id, base64);
      user.photoBase64 = base64;
      user.photoURL = base64;
      window.location.reload();
    } catch (error) {
      console.error("Erro ao atualizar foto:", error);
      alert("Erro ao salvar foto de perfil.");
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  // --- Filtering Logic ---
  const filterSessionsByDate = (allSessions: WritingSession[], filter: DateFilterType) => {
    const now = new Date();
    // Normalize now to end of day to include all today's sessions
    now.setHours(23, 59, 59, 999);

    let cutoff = new Date(0); // Epoch for 'all'

    if (filter === '7days') {
      cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 7);
    } else if (filter === '30days') {
      cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 30);
    } else if (filter === '6months') {
      cutoff = new Date(now);
      cutoff.setMonth(now.getMonth() - 6);
    } else if (filter === '1year') {
      cutoff = new Date(now);
      cutoff.setFullYear(now.getFullYear() - 1);
    }

    // Reset cutoff hours to start of day
    if (filter !== 'all') {
      cutoff.setHours(0, 0, 0, 0);
    }

    return allSessions.filter(s => new Date(s.date) >= cutoff);
  };

  // --- Work Filter Logic ---
  const workFilteredSessions = useMemo(() => {
    // If inspecting a specific project via Minhas Obras
    if (selectedProjectId) {
      const selectedProj = projects.find(p => p.id === selectedProjectId);
      if (selectedProj) {
        return sessions.filter(s => isSessionInProject(s, selectedProj, projects));
      }
      return sessions.filter(s => s.projectId === selectedProjectId);
    }

    const allowedProjectIds = new Set(projectsInAutomonitoring.map(p => p.id));

    if (selectedWorkId === 'all') {
      return sessions.filter(s => {
        if (!s.projectId) return true;
        const proj = getProjectForSession(s, projects);
        if (!proj) return true; // Keep visible if not linked to any active project
        return allowedProjectIds.has(proj.id);
      });
    }

    if (selectedWorkId === 'general') {
      return sessions.filter(s => {
        if (!s.projectId) return true;
        const proj = getProjectForSession(s, projects);
        return !proj;
      });
    }

    // Specific work selected in slidebar
    const targetProject = projects.find(p => p.id === selectedWorkId);
    if (targetProject) {
      return sessions.filter(s => isSessionInProject(s, targetProject, projects));
    }
    return sessions.filter(s => s.projectId === selectedWorkId);
  }, [sessions, selectedProjectId, selectedWorkId, projectsInAutomonitoring, projects]);

  const filteredSessions = filterSessionsByDate(workFilteredSessions, dateFilter);

  // --- Statistics Logic ---
  const sortedSessions = [...filteredSessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group data for Stacked Bar Chart (supports Words or Time in minutes)
  const dateMap = new Map<string, any>();

  sortedSessions.forEach(s => {
    const dateStr = new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const existing = dateMap.get(dateStr) || { date: dateStr, totalWords: 0, totalTime: 0 };

    // Resolve project to match BarChart dataKey (which is project.id)
    const proj = getProjectForSession(s, projects);
    const key = proj ? proj.id : 'general';
    const sMinutes = calculateSessionMinutes(s.startTime, s.endTime);
    const valToAdd = metricViewMode === 'time' ? sMinutes : s.wordCount;

    existing[key] = (existing[key] || 0) + valToAdd;
    existing.total = (existing.total || 0) + valToAdd;
    existing.totalWords = (existing.totalWords || 0) + s.wordCount;
    existing.totalTime = (existing.totalTime || 0) + sMinutes;

    dateMap.set(dateStr, existing);
  });

  const wordsOverTime = Array.from(dateMap.values());

  // Group quality metrics chronologically by calendar date to avoid duplicate X-axis points
  const qualityMap = new Map<string, {
    date: string;
    fullDate: string;
    estresseTotal: number;
    dificuldadeTotal: number;
    avaliacaoTotal: number;
    autocorrecaoTotal: number;
    count: number;
  }>();

  sortedSessions.forEach(s => {
    const d = new Date(s.date);
    const dateKey = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : s.date;
    const label = !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : s.date;
    const fullDate = !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : s.date;

    const existing = qualityMap.get(dateKey) || {
      date: label,
      fullDate,
      estresseTotal: 0,
      dificuldadeTotal: 0,
      avaliacaoTotal: 0,
      autocorrecaoTotal: 0,
      count: 0
    };

    existing.estresseTotal += (s.stressLevel || 1);
    existing.dificuldadeTotal += (s.difficultyLevel || 1);
    existing.avaliacaoTotal += (s.sessionRating || 1);
    existing.autocorrecaoTotal += (s.autoCorrectionFrequency || 1);
    existing.count += 1;

    qualityMap.set(dateKey, existing);
  });

  const metricsData = Array.from(qualityMap.values()).map(item => ({
    date: item.date,
    fullDate: item.fullDate,
    count: item.count,
    estresse: Number((item.estresseTotal / item.count).toFixed(1)),
    dificuldade: Number((item.dificuldadeTotal / item.count).toFixed(1)),
    avaliacao: Number((item.avaliacaoTotal / item.count).toFixed(1)),
    autocorrecao: Number((item.autocorrecaoTotal / item.count).toFixed(1))
  }));

  const strategyUsage = [
    { name: t('dashboard.skeleton'), value: filteredSessions.filter(s => s.usedSkeleton).length },
    { name: t('dashboard.drafts'), value: filteredSessions.filter(s => s.usedDrafts).length },
    { name: t('dashboard.timeManagement'), value: filteredSessions.filter(s => s.usedTimeStrategy).length },
    { name: t('dashboard.multitasking'), value: filteredSessions.filter(s => s.wasMultitasking).length },
  ].filter(d => d.value > 0);

  const totalStrategyCount = useMemo(() => {
    return strategyUsage.reduce((acc, curr) => acc + curr.value, 0);
  }, [strategyUsage]);

  const topStrategy = useMemo(() => {
    if (strategyUsage.length === 0) return null;
    return [...strategyUsage].sort((a, b) => b.value - a.value)[0];
  }, [strategyUsage]);

  const activeStrategyDisplay = hoveredStrategy || topStrategy;

  // KPIs
  const totalWords = filteredSessions.reduce((acc, curr) => acc + curr.wordCount, 0);
  const lifetimeTotalWords = sessions.reduce((acc, curr) => acc + (curr.wordCount || 0), 0);
  const avgRating = filteredSessions.length ? (filteredSessions.reduce((acc, curr) => acc + (curr.sessionRating || 0), 0) / filteredSessions.length).toFixed(1) : '0';
  const avgStress = filteredSessions.length ? (filteredSessions.reduce((acc, curr) => acc + (curr.stressLevel || 0), 0) / filteredSessions.length).toFixed(1) : '0';
  const avgDifficulty = filteredSessions.length ? (filteredSessions.reduce((acc, curr) => acc + (curr.difficultyLevel || 0), 0) / filteredSessions.length).toFixed(1) : '0';
  const avgAutoCorrection = filteredSessions.length ? (filteredSessions.reduce((acc, curr) => acc + (curr.autoCorrectionFrequency || 0), 0) / filteredSessions.length).toFixed(1) : '0';
  const avgWords = filteredSessions.length ? Math.round(totalWords / filteredSessions.length) : 0;

  // Gamification Balances (Scriptus, Kronus)
  const balances = useMemo(() => {
    return calculateBalances(lifetimeTotalWords, sessions, claims);
  }, [lifetimeTotalWords, sessions, claims]);

  // Streak calculation with Hestius Shield
  const streakResult = useMemo(() => {
    return evaluateStreakWithHestius(workFilteredSessions, user.hestiusCount ?? 1, user.hestiusProtectedDates || []);
  }, [workFilteredSessions, user.hestiusCount, user.hestiusProtectedDates]);
  const currentStreak = streakResult.currentStreak;
  const effectiveHestiusCount = streakResult.effectiveHestius;

  // Auto-persist newly consumed Hestius if evaluated in Dashboard
  useEffect(() => {
    if (streakResult.newlyConsumedDates && streakResult.newlyConsumedDates.length > 0 && user.id) {
      const mergedProtected = Array.from(new Set([...(user.hestiusProtectedDates || []), ...streakResult.newlyConsumedDates]));
      updateUserHestius(user.id, streakResult.effectiveHestius, {
        hestiusProtectedDates: mergedProtected
      }).then(() => {
        if (onUpdateUser) {
          onUpdateUser({
            hestiusCount: streakResult.effectiveHestius,
            hestiusProtectedDates: mergedProtected
          });
        }
      }).catch(err => console.error("Erro ao persistir consumo de Hestius:", err));
    }
  }, [streakResult.newlyConsumedDates, streakResult.effectiveHestius, user.id, user.hestiusProtectedDates, onUpdateUser]);


  // --- Writing Pattern Analysis ---
  const analyzeWritingPatterns = () => {
    if (filteredSessions.length === 0) {
      return {
        preferredTimeOfDay: null,
        mostProductiveDays: [],
        longestStreak: 0,
        writerProfile: null,
        weekdayVsWeekend: null
      };
    }

    // Analyze time of day
    const timeOfDayCount = filteredSessions.reduce((acc, session) => {
      const date = new Date(session.date);
      const hour = date.getHours();
      let period: string;

      if (hour >= 6 && hour < 12) period = 'morning';
      else if (hour >= 12 && hour < 18) period = 'afternoon';
      else if (hour >= 18 && hour < 24) period = 'evening';
      else period = 'night';

      acc[period] = (acc[period] || 0) + session.wordCount;
      return acc;
    }, {} as Record<string, number>);

    const preferredTimeOfDay = Object.entries(timeOfDayCount).length > 0
      ? Object.entries(timeOfDayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null
      : null;

    // Analyze days of week
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dayCount = filteredSessions.reduce((acc, session) => {
      const day = new Date(session.date).getDay();
      acc[day] = (acc[day] || 0) + session.wordCount;
      return acc;
    }, {} as Record<number, number>);

    const sortedDays = Object.entries(dayCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([day]) => dayNames[parseInt(day)]);

    // Weekday vs Weekend
    const weekdayWords = filteredSessions.reduce((sum, s) => {
      const day = new Date(s.date).getDay();
      return day >= 1 && day <= 5 ? sum + s.wordCount : sum;
    }, 0);
    const weekendWords = filteredSessions.reduce((sum, s) => {
      const day = new Date(s.date).getDay();
      return day === 0 || day === 6 ? sum + s.wordCount : sum;
    }, 0);

    let weekdayVsWeekend: string | null = null;
    if (weekdayWords > weekendWords * 1.5) weekdayVsWeekend = 'weekday';
    else if (weekendWords > weekdayWords * 1.5) weekdayVsWeekend = 'weekend';
    else if (weekdayWords > 0 || weekendWords > 0) weekdayVsWeekend = 'balanced';

    // Calculate longest streak
    const sortedSessionsForStreak = [...filteredSessions].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const uniqueDays = new Set(
      sortedSessionsForStreak.map(s => new Date(s.date).toDateString())
    );
    const sortedDates = Array.from(uniqueDays)
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        prevDate.setHours(0, 0, 0, 0);
        currDate.setHours(0, 0, 0, 0);

        const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Writer profile - calculate average duration from startTime/endTime
    const calculateDuration = (session: WritingSession) => {
      const [startHour, startMin] = session.startTime.split(':').map(Number);
      const [endHour, endMin] = session.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return endMinutes - startMinutes;
    };

    const avgDuration = filteredSessions.reduce((sum, s) => sum + calculateDuration(s), 0) / filteredSessions.length;

    let writerProfile: string | null = null;
    const sessionCount = filteredSessions.length;

    if (avgDuration > 60 && sessionCount < 10) writerProfile = 'marathoner';
    else if (avgDuration < 30 && sessionCount > 15) writerProfile = 'sprinter';
    else if (currentStreak >= 7) writerProfile = 'consistent';

    return {
      preferredTimeOfDay,
      mostProductiveDays: sortedDays,
      longestStreak,
      writerProfile,
      weekdayVsWeekend
    };
  };

  const writingInsights = analyzeWritingPatterns();

  // Goals (Words & Production Time)
  const today = new Date().toLocaleDateString('en-CA');
  const todaySessions = workFilteredSessions.filter(s => new Date(s.date).toLocaleDateString('en-CA') === today);
  const wordsToday = todaySessions.reduce((acc, curr) => acc + curr.wordCount, 0);
  const minutesToday = todaySessions.reduce((acc, curr) => acc + calculateSessionMinutes(curr.startTime, curr.endTime), 0);

  const dailyMinutesGoal = settings.dailyMinutesGoal || 30;
  const dailyProgress = Math.min(100, Math.round((wordsToday / (settings.dailyWordGoal || 500)) * 100));
  const dailyTimeProgress = Math.min(100, Math.round((minutesToday / dailyMinutesGoal) * 100));

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekSessions = workFilteredSessions.filter(s => new Date(s.date) >= oneWeekAgo);
  const wordsWeek = weekSessions.reduce((acc, curr) => acc + curr.wordCount, 0);
  const minutesWeek = weekSessions.reduce((acc, curr) => acc + calculateSessionMinutes(curr.startTime, curr.endTime), 0);

  const weeklyMinutesGoal = settings.weeklyMinutesGoal || 180;
  const weeklyProgress = Math.min(100, Math.round((wordsWeek / (settings.weeklyWordGoal || 2500)) * 100));
  const weeklyTimeProgress = Math.min(100, Math.round((minutesWeek / weeklyMinutesGoal) * 100));

  // Total Production Time (Filtered and Averages)
  const totalMinutes = filteredSessions.reduce((acc, s) => acc + calculateSessionMinutes(s.startTime, s.endTime), 0);
  const avgSessionMinutes = filteredSessions.length > 0 ? Math.round(totalMinutes / filteredSessions.length) : 0;
  const avgPaceWpm = totalMinutes > 0 ? Math.round(totalWords / totalMinutes) : (totalWords > 0 && filteredSessions.length > 0 ? Math.round(totalWords / (filteredSessions.length * 30)) : 0);

  // Project Specific Goal
  const activeProject = useMemo(() => {
    if (selectedProjectId) {
      return projects.find(p => p.id === selectedProjectId) || null;
    }
    if (selectedWorkId !== 'all' && selectedWorkId !== 'general') {
      return projects.find(p => p.id === selectedWorkId) || null;
    }
    return null;
  }, [selectedProjectId, selectedWorkId, projects]);

  const projectProgress = activeProject?.targetWordCount ? Math.min(100, Math.round((totalWords / activeProject.targetWordCount) * 100)) : 0;

  // Calendar Navigation and Rich Days Data
  const currentCalendarDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + calendarMonthOffset);
    return d;
  }, [calendarMonthOffset]);

  const calendarMonthLabel = useMemo(() => {
    const monthName = currentCalendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }, [currentCalendarDate]);

  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const checkDate = new Date(year, month, i).toLocaleDateString('en-CA');
      const daySessions = filteredSessions.filter(s => new Date(s.date).toLocaleDateString('en-CA') === checkDate);
      const totalWords = daySessions.reduce((acc, s) => acc + s.wordCount, 0);
      const totalMinutes = daySessions.reduce((acc, s) => acc + calculateSessionMinutes(s.startTime, s.endTime), 0);
      const avgRating = daySessions.length > 0 
        ? (daySessions.reduce((acc, s) => acc + s.sessionRating, 0) / daySessions.length).toFixed(1)
        : null;
      days.push({
        day: i,
        dateKey: checkDate,
        hasSession: daySessions.length > 0,
        sessions: daySessions,
        totalWords,
        totalMinutes,
        avgRating,
      });
    }
    return days;
  }, [currentCalendarDate, filteredSessions]);

  // --- TROPHY CALCULATIONS ---
  const achievementStats = useMemo(() => {
    // 1. Calculate stats needed for trophies
    const stats = {
      maxDailyWords: 0,
      maxWeeklyWords: 0,
      maxMonthlyWords: 0,
      totalWords: 0,
      maxStreak: 0,
    };

    if (sessions.length === 0) return stats;

    stats.totalWords = sessions.reduce((acc, s) => acc + s.wordCount, 0);

    // Group by Day
    const dailyMap = new Map<string, number>();
    sessions.forEach(s => {
      const d = new Date(s.date).toLocaleDateString('en-CA');
      dailyMap.set(d, (dailyMap.get(d) || 0) + s.wordCount);
    });
    stats.maxDailyWords = Math.max(0, ...Array.from(dailyMap.values()));

    // Group by Week (Simple approximation: Year-WeekNumber)
    const getWeekKey = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${d.getFullYear()}-W${weekNo}`;
    };
    const weeklyMap = new Map<string, number>();
    sessions.forEach(s => {
      const key = getWeekKey(new Date(s.date));
      weeklyMap.set(key, (weeklyMap.get(key) || 0) + s.wordCount);
    });
    stats.maxWeeklyWords = Math.max(0, ...Array.from(weeklyMap.values()));

    // Group by Month
    const monthlyMap = new Map<string, number>();
    sessions.forEach(s => {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + s.wordCount);
    });
    stats.maxMonthlyWords = Math.max(0, ...Array.from(monthlyMap.values()));

    // Calculate Max Streak (historical)
    // Get unique sorted dates
    const sortedDates = Array.from(dailyMap.keys()).sort().map(d => new Date(d));
    let currentStreak = 0;
    let maxStreak = 0;
    if (sortedDates.length > 0) {
      currentStreak = 1;
      maxStreak = 1;
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const curr = sortedDates[i].getTime();
        const next = sortedDates[i + 1].getTime();
        const diffDays = Math.round(Math.abs((next - curr) / (1000 * 60 * 60 * 24)));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      }
    }
    stats.maxStreak = maxStreak;

    return stats;
  }, [sessions]);

  const saveSettings = () => {
    onUpdateSettings(tempSettings);
    setShowSettings(false);
    setDeleteConfirm(false);
  };

  const handleReset = () => {
    onResetData();
    setShowSettings(false);
    setDeleteConfirm(false);
    setActiveTab('general');
    setSelectedProjectId(null);
  }

  // --- Heatmap Data Processing ---
  const heatmapData = useMemo(() => {
    const dataMap = new Map<string, { wordCount: number; minutes: number }>();

    filteredSessions.forEach(session => {
      const date = new Date(session.date);
      const day = date.getDay(); // 0-6 (Sunday-Saturday)

      // Extract hour from startTime (format: "HH:MM")
      const hourMatch = session.startTime?.match(/^(\d{1,2})/);
      if (hourMatch) {
        const hour = parseInt(hourMatch[1], 10);
        const key = `${day}-${hour}`;
        const prev = dataMap.get(key) || { wordCount: 0, minutes: 0 };
        const sMins = calculateSessionMinutes(session.startTime, session.endTime);
        dataMap.set(key, {
          wordCount: prev.wordCount + (session.wordCount || 0),
          minutes: prev.minutes + sMins
        });
      }
    });

    // Convert map to array format
    const result: { day: number; hour: number; wordCount: number; minutes: number }[] = [];
    dataMap.forEach((val, key) => {
      const [day, hour] = key.split('-').map(Number);
      result.push({ day, hour, wordCount: val.wordCount, minutes: val.minutes });
    });

    return result;
  }, [filteredSessions]);

  // --- Render Functions ---

  const renderKPIs = () => {
    const stressNum = parseFloat(avgStress);
    const stressSemantic = filteredSessions.length === 0
      ? 'Sem dados'
      : stressNum <= 2.0
        ? 'Tranquilo 🌿'
        : stressNum <= 3.5
          ? 'Moderado ⚖️'
          : 'Intenso ⚡';

    if (metricViewMode === 'time') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border-l-4 border-amber-500 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <Stat
              label={t('dashboard.totalProductionTime') || 'Tempo Total Produzido'}
              value={formatMinutesToHours(totalMinutes)}
              colorClass="text-amber-600"
              subtitle={`Total acumulado no período (${totalWords.toLocaleString('pt-BR')} pal.)`}
            />
          </Card>
          <Card className="border-l-4 border-orange-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <Stat
              label={t('dashboard.avgSessionDuration') || 'Duração Média / Sessão'}
              value={avgSessionMinutes}
              subValue="min"
              colorClass="text-orange-600"
              subtitle="Média de dedicação por registro"
            />
          </Card>
          <Card className="border-l-4 border-teal-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <Stat
              label={t('dashboard.avgPace') || 'Ritmo Médio'}
              value={avgPaceWpm}
              subValue="pal/min"
              colorClass="text-teal-600"
              subtitle={`${filteredSessions.length} ${filteredSessions.length === 1 ? 'sessão analisada' : 'sessões analisadas'}`}
            />
          </Card>
          <Card className="border-l-4 border-yellow-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <Stat
              label={t('dashboard.avgRating') || 'Média de Avaliação'}
              value={`⭐ ${avgRating}`}
              subValue="/ 5.0"
              colorClass="text-yellow-600"
              subtitle={
                filteredSessions.length > 0
                  ? `${filteredSessions.filter(s => s.sessionRating >= 4).length} com nota 4+ ⭐`
                  : 'Nenhuma sessão no período'
              }
            />
          </Card>
          <Card className="border-l-4 border-rose-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <Stat
              label={t('dashboard.avgStress')}
              value={avgStress}
              colorClass="text-rose-500"
              subtitle={stressSemantic}
            />
          </Card>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="border-l-4 border-teal-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <Stat
            label={t('dashboard.totalWords')}
            value={totalWords.toLocaleString('pt-BR')}
            colorClass="text-teal-600"
            subtitle={
              activeProject && activeProject.targetWordCount
                ? `${t('dashboard.goal')}: ${activeProject.targetWordCount.toLocaleString('pt-BR')} (${projectProgress}%)`
                : `⏱️ ${formatMinutesToHours(totalMinutes)} dedicadas • ${filteredSessions.length} ${filteredSessions.length === 1 ? 'sessão' : 'sessões'}`
            }
          />
        </Card>
        <Card className="border-l-4 border-amber-500 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <Stat
            label={t('dashboard.totalProductionTime') || 'Tempo de Produção'}
            value={formatMinutesToHours(totalMinutes)}
            colorClass="text-amber-600"
            subtitle={`Ritmo: ${avgPaceWpm} pal/min • ~${avgSessionMinutes}m/sessão`}
          />
        </Card>
        <Card className="border-l-4 border-purple-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <Stat
            label={t('dashboard.avgPerSession')}
            value={avgWords.toLocaleString('pt-BR')}
            subValue={t('dashboard.words')}
            colorClass="text-purple-600"
            subtitle={`⏱️ ~${avgSessionMinutes} min / sessão`}
          />
        </Card>
        <Card className="border-l-4 border-yellow-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <Stat
            label={t('dashboard.avgRating') || 'Média de Avaliação'}
            value={`⭐ ${avgRating}`}
            subValue="/ 5.0"
            colorClass="text-yellow-600"
            subtitle={
              filteredSessions.length > 0
                ? `${filteredSessions.filter(s => s.sessionRating >= 4).length} com nota 4+ ⭐`
                : 'Nenhuma sessão no período'
            }
          />
        </Card>
        <Card className="border-l-4 border-rose-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <Stat
            label={t('dashboard.avgStress')}
            value={avgStress}
            colorClass="text-rose-500"
            subtitle={stressSemantic}
          />
        </Card>
      </div>
    );
  };

  const renderCharts = () => {
    const showWordProd = visibleModules.wordProduction;
    const showQuality = visibleModules.qualityIndicators;
    const showCalendar = visibleModules.calendar;
    const showStrategies = visibleModules.strategies;

    if (!showWordProd && !showQuality && !showCalendar && !showStrategies) return null;

    const hasLeftCol = showWordProd || showQuality;
    const hasRightCol = showCalendar || showStrategies;

    return (
      <div className={`grid grid-cols-1 ${hasLeftCol && hasRightCol ? 'lg:grid-cols-3' : 'grid-cols-1'} gap-8 mb-8`}>
        {hasLeftCol && (
          <div className={`${hasRightCol ? 'lg:col-span-2' : 'col-span-1'} space-y-8`}>
            {showWordProd && (
              <Card
                title={metricViewMode === 'time' ? (t('dashboard.timeProduction') || 'Evolução da Produção (Tempo)') : t('dashboard.wordProduction')}
                subtitle={metricViewMode === 'time' ? (t('dashboard.timeProductionSubtitle') || 'Acompanhe as horas e minutos dedicados por dia/sessão') : t('dashboard.wordProductionSubtitle')}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="bg-slate-100 rounded-lg p-1 flex text-xs font-medium">
                    <button onClick={() => setDateFilter('7days')} className={`px-3 py-1 rounded-md transition-all ${dateFilter === '7days' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>{t('dashboard.weekly')}</button>
                    <button onClick={() => setDateFilter('30days')} className={`px-3 py-1 rounded-md transition-all ${dateFilter === '30days' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>{t('dashboard.monthly')}</button>
                    <button onClick={() => setDateFilter('6months')} className={`px-3 py-1 rounded-md transition-all ${dateFilter === '6months' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>{t('dashboard.semester')}</button>
                    <button onClick={() => setDateFilter('1year')} className={`px-3 py-1 rounded-md transition-all ${dateFilter === '1year' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>{t('dashboard.yearly')}</button>
                    <button onClick={() => setDateFilter('all')} className={`px-3 py-1 rounded-md transition-all ${dateFilter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>{t('dashboard.all')}</button>
                  </div>

                  {/* Dual-Pill Metric Selector inside Card */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setMetricViewMode('words')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        metricViewMode === 'words' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>📝</span>
                      <span>Palavras</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetricViewMode('time')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        metricViewMode === 'time' ? 'bg-amber-500 text-white shadow-2xs font-bold' : 'text-slate-500 hover:text-amber-700'
                      }`}
                    >
                      <Hourglass className="w-3 h-3" />
                      <span>Tempo</span>
                    </button>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={wordsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(v) => metricViewMode === 'time' ? `${v}m` : v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`}
                      />
                      <RechartsTooltip
                        cursor={{ fill: '#f8fafc', opacity: 0.8 }}
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          padding: '12px'
                        }}
                        formatter={(value: any, name: any) => {
                          const num = Number(value) || 0;
                          if (metricViewMode === 'time') {
                            return [formatMinutesToHours(num), name];
                          }
                          return [`${num.toLocaleString('pt-BR')} palavras`, name];
                        }}
                      />
                      {/* General/No-Project Bar */}
                      {(selectedWorkId === 'all' || selectedWorkId === 'general') && (
                        <Bar
                          dataKey="general"
                          stackId="a"
                          fill="#94a3b8"
                          fillOpacity={highlightedWorkId ? (highlightedWorkId === 'general' ? 1 : 0.15) : 1}
                          name={isPrivacyMode ? "Geral" : t('dashboard.general_project')}
                          radius={[4, 4, 0, 0]}
                        />
                      )}
                      {/* Dynamic Bars for each Project that is active in Automonitoring */}
                      {projectsInAutomonitoring
                        .filter(p => selectedWorkId === 'all' || selectedWorkId === p.id)
                        .map((p, idx) => {
                          const displayName = isPrivacyMode
                            ? `${t('dashboard.workNumber')} #${idx + 1}`
                            : p.name;
                          return (
                            <Bar
                              key={p.id}
                              dataKey={p.id}
                              stackId="a"
                              fill={p.color || '#2dd4bf'}
                              fillOpacity={highlightedWorkId ? (highlightedWorkId === p.id ? 1 : 0.15) : 1}
                              name={displayName}
                              radius={[4, 4, 0, 0]}
                            />
                          );
                        })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Interactive Legend Pills with Work Isolation / Highlight */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filtrar obra:
                  </span>
                  <button
                    type="button"
                    onClick={() => setHighlightedWorkId(null)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      highlightedWorkId === null
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todas
                  </button>
                  {(selectedWorkId === 'all' || selectedWorkId === 'general') && (
                    <button
                      type="button"
                      onClick={() => setHighlightedWorkId(highlightedWorkId === 'general' ? null : 'general')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                        highlightedWorkId === 'general'
                          ? 'bg-slate-200 text-slate-900 border-slate-400 shadow-xs ring-2 ring-slate-400/30 font-bold'
                          : highlightedWorkId !== null
                            ? 'opacity-40 bg-slate-50 border-transparent text-slate-400 hover:opacity-100'
                            : 'bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                      <span>{isPrivacyMode ? "Geral" : t('dashboard.general_project')}</span>
                    </button>
                  )}
                  {projectsInAutomonitoring
                    .filter(p => selectedWorkId === 'all' || selectedWorkId === p.id)
                    .map((p, idx) => {
                      const isHighlighted = highlightedWorkId === p.id;
                      const displayName = isPrivacyMode ? `${t('dashboard.workNumber')} #${idx + 1}` : p.name;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setHighlightedWorkId(isHighlighted ? null : p.id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                            isHighlighted
                              ? 'bg-white shadow-xs ring-2 font-bold'
                              : highlightedWorkId !== null
                                ? 'opacity-40 bg-slate-50 border-transparent text-slate-400 hover:opacity-100'
                                : 'bg-slate-100 text-slate-700 border-transparent hover:bg-slate-200'
                          }`}
                          style={{
                            borderColor: isHighlighted ? (p.color || '#2dd4bf') : 'transparent',
                            color: isHighlighted ? (p.color || '#0d9488') : undefined,
                          }}
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || '#2dd4bf' }}></span>
                          <span>{displayName}</span>
                        </button>
                      );
                    })}
                </div>
              </Card>
            )}

            {showQuality && (() => {
              const ratingNum = Number(avgRating) || 0;
              const stressNum = Number(avgStress) || 0;
              const difficultyNum = Number(avgDifficulty) || 0;
              const autoCorrNum = Number(avgAutoCorrection) || 0;

              const qualityCardsConfig = [
                {
                  key: 'avaliacao' as const,
                  title: 'Avaliação',
                  icon: '⭐',
                  color: '#10b981',
                  avg: avgRating,
                  avgNum: ratingNum,
                  semantic: ratingNum === 0 ? 'Sem dados' : ratingNum >= 4.0 ? 'Ótimo' : ratingNum >= 3.0 ? 'Bom' : 'Regular',
                  cardBg: 'bg-emerald-50/25 hover:bg-emerald-50/45 border-emerald-100/90 hover:border-emerald-200',
                  iconBg: 'bg-emerald-100/80 text-emerald-700',
                  badgeClass: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/70',
                  textColor: 'text-emerald-700'
                },
                {
                  key: 'estresse' as const,
                  title: 'Estresse',
                  icon: '🧘',
                  color: '#f43f5e',
                  avg: avgStress,
                  avgNum: stressNum,
                  semantic: stressNum === 0 ? 'Sem dados' : stressNum <= 2.0 ? 'Baixo' : stressNum <= 3.5 ? 'Moderado' : 'Elevado',
                  cardBg: 'bg-rose-50/25 hover:bg-rose-50/45 border-rose-100/90 hover:border-rose-200',
                  iconBg: 'bg-rose-100/80 text-rose-700',
                  badgeClass: 'bg-rose-100/80 text-rose-700 border-rose-200/70',
                  textColor: 'text-rose-700'
                },
                {
                  key: 'dificuldade' as const,
                  title: 'Dificuldade',
                  icon: '⚡',
                  color: '#f59e0b',
                  avg: avgDifficulty,
                  avgNum: difficultyNum,
                  semantic: difficultyNum === 0 ? 'Sem dados' : difficultyNum <= 2.0 ? 'Baixo' : difficultyNum <= 3.5 ? 'Moderado' : 'Elevado',
                  cardBg: 'bg-amber-50/25 hover:bg-amber-50/45 border-amber-100/90 hover:border-amber-200',
                  iconBg: 'bg-amber-100/80 text-amber-700',
                  badgeClass: 'bg-amber-100/80 text-amber-700 border-amber-200/70',
                  textColor: 'text-amber-700'
                },
                {
                  key: 'autocorrecao' as const,
                  title: 'Autocorreção',
                  icon: '✏️',
                  color: '#8b5cf6',
                  avg: avgAutoCorrection,
                  avgNum: autoCorrNum,
                  semantic: autoCorrNum === 0 ? 'Sem dados' : autoCorrNum <= 2.0 ? 'Baixo' : autoCorrNum <= 3.5 ? 'Moderado' : 'Frequente',
                  cardBg: 'bg-purple-50/25 hover:bg-purple-50/45 border-purple-100/90 hover:border-purple-200',
                  iconBg: 'bg-purple-100/80 text-purple-700',
                  badgeClass: 'bg-purple-100/80 text-purple-700 border-purple-200/70',
                  textColor: 'text-purple-700'
                }
              ];

              const activeSingleMetric = qualityCardsConfig.find(c => c.key === qualityMetricFilter);

              return (
                <Card
                  title={t('dashboard.qualityIndicators')}
                  subtitle={t('dashboard.qualitySubtitle')}
                  headerAction={
                    <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setQualityMetricFilter('all')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          qualityMetricFilter === 'all'
                            ? 'bg-white text-slate-800 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualityMetricFilter('avaliacao')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          qualityMetricFilter === 'avaliacao'
                            ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-emerald-600'
                        }`}
                      >
                        <span>⭐</span>
                        <span>Avaliação</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualityMetricFilter('estresse')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          qualityMetricFilter === 'estresse'
                            ? 'bg-white text-rose-700 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-rose-600'
                        }`}
                      >
                        <span>🧘</span>
                        <span>Estresse</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualityMetricFilter('dificuldade')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          qualityMetricFilter === 'dificuldade'
                            ? 'bg-white text-amber-700 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-amber-600'
                        }`}
                      >
                        <span>⚡</span>
                        <span>Dificuldade</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualityMetricFilter('autocorrecao')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          qualityMetricFilter === 'autocorrecao'
                            ? 'bg-white text-purple-700 shadow-2xs font-bold'
                            : 'text-slate-500 hover:text-purple-600'
                        }`}
                      >
                        <span>✏️</span>
                        <span>Autocorreção</span>
                      </button>
                    </div>
                  }
                >
                  {qualityMetricFilter === 'all' ? (
                    /* 2x2 Sparkline Bento Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {qualityCardsConfig.map((item) => (
                        <div
                          key={item.key}
                          onClick={() => setQualityMetricFilter(item.key)}
                          className={`group rounded-2xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-sm ${item.cardBg}`}
                          title={`Clique para expandir o gráfico de ${item.title}`}
                        >
                          {/* Sub-card Top Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm shadow-2xs ${item.iconBg}`}>
                                {item.icon}
                              </span>
                              <div>
                                <h4 className="text-xs font-extrabold text-slate-800 leading-tight group-hover:underline">
                                  {item.title}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-medium">Escala 1 a 5</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end">
                              <div className="flex items-baseline gap-1">
                                <span className="text-base font-black text-slate-800 leading-none">
                                  {item.avg}
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">/ 5</span>
                              </div>
                              <span className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeClass}`}>
                                {item.semantic}
                              </span>
                            </div>
                          </div>

                          {/* Smooth Sparkline AreaChart */}
                          <div className="h-28 w-full mt-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={metricsData} margin={{ top: 8, right: 6, left: 6, bottom: 2 }}>
                                <defs>
                                  <linearGradient id={`sparkGrad_${item.key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={item.color} stopOpacity={0.25} />
                                    <stop offset="100%" stopColor={item.color} stopOpacity={0.0} />
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis domain={[1, 5]} hide />
                                <RechartsTooltip
                                  content={({ active, payload }: any) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-lg border border-slate-700/60 text-xs space-y-1">
                                          <div className="text-[10px] font-bold text-slate-300 border-b border-slate-700/70 pb-1 flex items-center justify-between gap-3">
                                            <span>{data.fullDate || data.date}</span>
                                            {data.count > 1 && (
                                              <span className="text-[9px] text-teal-300">({data.count} sessões)</span>
                                            )}
                                          </div>
                                          <div className="flex items-center justify-between gap-3 pt-0.5">
                                            <span className="font-semibold text-slate-200 flex items-center gap-1">
                                              <span>{item.icon}</span>
                                              <span>{item.title}:</span>
                                            </span>
                                            <span className="font-black text-white">
                                              {data[item.key]} / 5
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey={item.key}
                                  stroke={item.color}
                                  strokeWidth={2.5}
                                  fill={`url(#sparkGrad_${item.key})`}
                                  dot={false}
                                  activeDot={{ r: 4.5, strokeWidth: 2, fill: '#fff', stroke: item.color }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeSingleMetric ? (
                    /* Full-Width Individual Indicator Area Chart */
                    <div className="space-y-4 animate-fade-in">
                      <div className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border ${activeSingleMetric.cardBg}`}>
                        <div className="flex items-center gap-2.5">
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shadow-2xs ${activeSingleMetric.iconBg}`}>
                            {activeSingleMetric.icon}
                          </span>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-800 leading-tight">
                              {activeSingleMetric.title}
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Evolução histórica e linha de referência da média ({activeSingleMetric.avg} / 5)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200/70 shadow-2xs">
                            <span className="text-[11px] text-slate-500 font-semibold">Média:</span>
                            <span className="text-sm font-black text-slate-800">
                              {activeSingleMetric.avg} <span className="text-xs font-normal text-slate-400">/ 5</span>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeSingleMetric.badgeClass}`}>
                              {activeSingleMetric.semantic}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setQualityMetricFilter('all')}
                            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 text-xs font-bold transition-colors cursor-pointer"
                          >
                            ← Ver Todos
                          </button>
                        </div>
                      </div>

                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={metricsData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                            <defs>
                              <linearGradient id={`singleGrad_${activeSingleMetric.key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={activeSingleMetric.color} stopOpacity={0.25} />
                                <stop offset="100%" stopColor={activeSingleMetric.color} stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                              dataKey="date"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                              dy={8}
                            />
                            <YAxis
                              domain={[1, 5]}
                              ticks={[1, 2, 3, 4, 5]}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                            />
                            {activeSingleMetric.avgNum > 0 && (
                              <ReferenceLine
                                y={activeSingleMetric.avgNum}
                                stroke={activeSingleMetric.color}
                                strokeDasharray="5 5"
                                strokeWidth={1.5}
                                strokeOpacity={0.75}
                                label={{
                                  value: `Média: ${activeSingleMetric.avg}`,
                                  position: 'insideTopRight',
                                  fill: activeSingleMetric.color,
                                  fontSize: 11,
                                  fontWeight: 700
                                }}
                              />
                            )}
                            <RechartsTooltip
                              content={({ active, payload }: any) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-md text-xs space-y-2 min-w-[190px] animate-fade-in">
                                      <div className="border-b border-slate-800 pb-1.5 flex justify-between items-center gap-3">
                                        <span className="font-bold text-slate-200">{data.fullDate || data.date}</span>
                                        {data.count > 1 && (
                                          <span className="text-[10px] font-extrabold bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded">
                                            {data.count} sessões
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between gap-4 pt-0.5">
                                        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                                          <span>{activeSingleMetric.icon}</span>
                                          <span>{activeSingleMetric.title}:</span>
                                        </span>
                                        <span className="font-black text-white bg-white/10 px-2 py-0.5 rounded-lg">
                                          {data[activeSingleMetric.key]} / 5
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey={activeSingleMetric.key}
                              stroke={activeSingleMetric.color}
                              strokeWidth={3}
                              fill={`url(#singleGrad_${activeSingleMetric.key})`}
                              dot={false}
                              activeDot={{ r: 5.5, strokeWidth: 2, fill: '#fff', stroke: activeSingleMetric.color }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : null}
                </Card>
              );
            })()}
          </div>
        )}

        {hasRightCol && (
          <div className={`${hasLeftCol ? 'col-span-1' : 'col-span-1'} space-y-8`}>
            {showCalendar && (
              <Card
                title={t('dashboard.calendar')}
                subtitle={t('dashboard.calendarSubtitle')}
                headerAction={
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setCalendarMonthOffset(prev => prev - 1)}
                      className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
                      title="Mês anterior"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="px-1.5 font-semibold text-slate-700 text-xs min-w-[95px] text-center select-none">
                      {calendarMonthLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalendarMonthOffset(prev => Math.min(0, prev + 1))}
                      disabled={calendarMonthOffset === 0}
                      className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Próximo mês"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                }
              >
                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                  {[t('days.sunday'), t('days.monday'), t('days.tuesday'), t('days.wednesday'), t('days.thursday'), t('days.friday'), t('days.saturday')].map((d, i) => (
                    <div key={i} className="text-slate-400 font-medium py-1">{d.charAt(0)}</div>
                  ))}
                  {calendarDays.map((d, i) => {
                    if (!d) {
                      return <div key={i} className="aspect-square bg-transparent rounded-lg" />;
                    }
                    return (
                      <div
                        key={i}
                        className={`aspect-square flex items-center justify-center rounded-lg text-xs font-semibold transition-all relative group ${
                          d.hasSession
                            ? 'bg-teal-500 text-white shadow-md shadow-teal-200 hover:scale-110 hover:bg-teal-600 cursor-pointer z-10'
                            : 'bg-slate-50 text-slate-400 cursor-default'
                        }`}
                        onClick={() => {
                          if (d.hasSession && d.sessions.length > 0) {
                            setSelectedSession(d.sessions[0]);
                          }
                        }}
                      >
                        {d.day}

                        {/* Rich Popover Tooltip for active writing days */}
                        {d.hasSession && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 bg-slate-900/95 backdrop-blur-xs text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 shadow-xl border border-slate-700 text-left">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-slate-700/80 pb-1 mb-1.5 flex-wrap gap-1">
                              <span>📅 Dia {d.day}</span>
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="text-teal-300 font-extrabold">{d.totalWords.toLocaleString('pt-BR')} pal.</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-amber-300 font-extrabold">⏱️ {d.totalMinutes} min</span>
                              </div>
                            </div>
                            <div className="space-y-1 text-[11px]">
                              {d.sessions.map((s, sIdx) => {
                                const sProj = getProjectForSession(s, projects);
                                const isPrivateWork = sProj && (sProj.showInAutomonitoring === false || customDiscreetIds.includes(sProj.id));
                                const sDuration = calculateSessionMinutes(s.startTime, s.endTime);
                                const calendarProjName = !sProj
                                  ? 'Geral'
                                  : isPrivacyMode
                                    ? (isPrivateWork
                                        ? 'Obra Privada 🔒'
                                        : `${t('dashboard.workNumber')} #${Math.max(1, projectsInAutomonitoring.findIndex(p => p.id === sProj.id) + 1)}`)
                                    : sProj.name;
                                return (
                                  <div key={s.id || sIdx} className="flex items-center justify-between text-slate-300">
                                    <span className="flex items-center gap-1.5 truncate max-w-[100px]">
                                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sProj?.color || '#94a3b8' }}></span>
                                      <span className="truncate">{calendarProjName}</span>
                                    </span>
                                    <span className="text-slate-400 font-mono text-[10px]">{s.wordCount} pal. • ⏱️{sDuration}m • ⭐{s.sessionRating}/5</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-1.5 pt-1 border-t border-slate-700/50 text-[10px] text-teal-300 text-center font-medium">
                              Clique para abrir sessão
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {showStrategies && (
              <Card title={t('dashboard.strategies')}>
                <div className="h-64 w-full relative">
                  {strategyUsage.length > 0 ? (
                    <>
                      {/* Center Dynamic Informational Hub */}
                      {activeStrategyDisplay && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8 z-10">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center max-w-[110px] truncate px-1">
                            {activeStrategyDisplay.name}
                          </span>
                          <span className="text-2xl font-black text-slate-800 my-0.5">
                            {Math.round((activeStrategyDisplay.value / (totalStrategyCount || 1)) * 100)}%
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {activeStrategyDisplay.value} {activeStrategyDisplay.value === 1 ? 'uso' : 'usos'}
                          </span>
                        </div>
                      )}
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={strategyUsage}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={4}
                            cornerRadius={5}
                            dataKey="value"
                            stroke="none"
                            onMouseEnter={(_, index) => setHoveredStrategy(strategyUsage[index])}
                            onMouseLeave={() => setHoveredStrategy(null)}
                          >
                            {strategyUsage.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={STAT_COLORS[index % STAT_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: '12px',
                              border: 'none',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      {t('dashboard.insufficientData')}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderHeatmap = () => (
    <Card
      title={t('dashboard.heatmapTitle')}
      subtitle={t('dashboard.heatmapSubtitle')}
      className="mb-8"
      headerAction={
        <button
          type="button"
          onClick={() => setHideEarlyHours(!hideEarlyHours)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
            hideEarlyHours
              ? 'bg-teal-50 border-teal-200 text-teal-700 font-semibold shadow-2xs'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span>{hideEarlyHours ? '🌙 Madrugada oculta (08h-23h)' : '🕒 24 horas (completo)'}</span>
        </button>
      }
    >
      <HeatmapChart data={heatmapData} hideEarlyHours={hideEarlyHours} />
    </Card>
  );

  const renderSessionList = () => {
    const reversedSessions = sortedSessions.slice().reverse();
    const visibleTableSessions = showAllSessionsList ? reversedSessions : reversedSessions.slice(0, 5);

    return (
      <Card
        title={t('dashboard.lastRecords')}
        headerAction={
          reversedSessions.length > 5 ? (
            <button
              type="button"
              onClick={() => setShowAllSessionsList(prev => !prev)}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50/80 hover:bg-teal-100/70 px-3 py-1 rounded-xl border border-teal-200/70 transition-colors cursor-pointer"
            >
              {showAllSessionsList ? 'Mostrar últimas 5' : `Ver todas (${reversedSessions.length})`}
            </button>
          ) : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">{t('dashboard.date')}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t('dashboard.project')}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t('dashboard.totalWords')}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t('dashboard.productionTime') || 'TEMPO DE PRODUÇÃO'}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t('dashboard.rating')}</th>
                <th scope="col" className="px-4 py-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleTableSessions.map((session) => {
                const proj = getProjectForSession(session, projects);
                const isPrivateProj = proj && (proj.showInAutomonitoring === false || customDiscreetIds.includes(proj.id));
                const autoIdx = proj ? projectsInAutomonitoring.findIndex(p => p.id === proj.id) : -1;
                const sessionMins = calculateSessionMinutes(session.startTime, session.endTime);
                return (
                  <tr
                    key={session.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedSession(session)}
                  >
                    <td className="px-4 py-3 text-slate-600">
                      <div className="font-medium text-slate-800 group-hover:text-teal-700 transition-colors">{new Date(session.date).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-400">{session.startTime} - {session.endTime}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 truncate max-w-[160px]">
                      {proj ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: proj.color }}></div>
                          {isPrivacyMode ? (
                            <span className="text-slate-600 font-medium">
                              {isPrivateProj || autoIdx === -1
                                ? 'Obra Privada 🔒'
                                : `${t('dashboard.workNumber')} #${autoIdx + 1}`}
                            </span>
                          ) : (
                            <span
                              style={isPrivateProj && isProjectDiscreet(proj) ? { filter: 'blur(6px)' } : undefined}
                              className="transition-all duration-300 group-hover:!filter-none"
                            >
                              {proj.name}
                            </span>
                          )}
                        </div>
                      ) : <span className="text-slate-400 italic">{t('dashboard.general_project')}</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{session.wordCount.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                        <Hourglass className="w-3 h-3 text-amber-500" />
                        <span>{formatMinutesShort(sessionMins)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${session.sessionRating >= 4 ? 'bg-emerald-100 text-emerald-700' :
                        session.sessionRating >= 3 ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                        {session.sessionRating}/5
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNewSession(session);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 border border-slate-200/80 hover:border-teal-200 transition-all cursor-pointer"
                            title="Editar informações desta sessão"
                          >
                            <span>✏️</span>
                            <span>Editar</span>
                          </button>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-teal-600 transition-colors">
                          <span>Ver detalhes</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {sortedSessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t('dashboard.noRecords')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  const renderWritingInsights = () => (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        {t('dashboard.insights')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Time of Day Preference */}
        {writingInsights.preferredTimeOfDay && (
          <Card className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg">
                <span className="text-2xl">
                  {writingInsights.preferredTimeOfDay === 'morning' && '🌅'}
                  {writingInsights.preferredTimeOfDay === 'afternoon' && '☀️'}
                  {writingInsights.preferredTimeOfDay === 'evening' && '🌆'}
                  {writingInsights.preferredTimeOfDay === 'night' && '🌙'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{t('dashboard.preferredTime')}</p>
                <p className="text-lg font-bold text-slate-800">
                  {writingInsights.preferredTimeOfDay === 'morning' && t('dashboard.morning')}
                  {writingInsights.preferredTimeOfDay === 'afternoon' && t('dashboard.afternoon')}
                  {writingInsights.preferredTimeOfDay === 'evening' && t('dashboard.evening')}
                  {writingInsights.preferredTimeOfDay === 'night' && t('dashboard.night')}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {writingInsights.preferredTimeOfDay === 'morning' && t('dashboard.timeDescMorning')}
                  {writingInsights.preferredTimeOfDay === 'afternoon' && t('dashboard.timeDescAfternoon')}
                  {writingInsights.preferredTimeOfDay === 'evening' && t('dashboard.timeDescEvening')}
                  {writingInsights.preferredTimeOfDay === 'night' && t('dashboard.timeDescNight')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Most Productive Days */}
        {writingInsights.mostProductiveDays.length > 0 && (
          <Card className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-lg">
                <span className="text-2xl">📅</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{t('dashboard.productiveDays')}</p>
                <p className="text-lg font-bold text-slate-800">
                  {writingInsights.mostProductiveDays.join(', ')}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {t('dashboard.productiveDaysDesc')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Weekday vs Weekend */}
        {writingInsights.weekdayVsWeekend && (
          <Card className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg">
                <span className="text-2xl">
                  {writingInsights.weekdayVsWeekend === 'weekday' && '💼'}
                  {writingInsights.weekdayVsWeekend === 'weekend' && '🏖️'}
                  {writingInsights.weekdayVsWeekend === 'balanced' && '⚖️'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{t('dashboard.routine')}</p>
                <p className="text-lg font-bold text-slate-800">
                  {writingInsights.weekdayVsWeekend === 'weekday' && t('dashboard.weekdayWriter')}
                  {writingInsights.weekdayVsWeekend === 'weekend' && t('dashboard.weekendWriter')}
                  {writingInsights.weekdayVsWeekend === 'balanced' && t('dashboard.balanced')}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {writingInsights.weekdayVsWeekend === 'weekday' && t('dashboard.productiveWeekdays')}
                  {writingInsights.weekdayVsWeekend === 'weekend' && t('dashboard.productiveWeekends')}
                  {writingInsights.weekdayVsWeekend === 'balanced' && t('dashboard.productiveBalanced')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Longest Streak */}
        {writingInsights.longestStreak > 0 && (
          <Card className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-rose-400 to-pink-500 rounded-lg">
                <span className="text-2xl">🔥</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{t('dashboard.longestStreak')}</p>
                <p className="text-lg font-bold text-slate-800">
                  {writingInsights.longestStreak} {t('dashboard.days')}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {t('dashboard.longestStreakDesc')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Writer Profile */}
        {writingInsights.writerProfile && (
          <Card className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg">
                <span className="text-2xl">
                  {writingInsights.writerProfile === 'marathoner' && '🏃'}
                  {writingInsights.writerProfile === 'sprinter' && '⚡'}
                  {writingInsights.writerProfile === 'consistent' && '🎯'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{t('dashboard.writerProfile')}</p>
                <p className="text-lg font-bold text-slate-800">
                  {writingInsights.writerProfile === 'marathoner' && t('dashboard.marathoner')}
                  {writingInsights.writerProfile === 'sprinter' && t('dashboard.sprinter')}
                  {writingInsights.writerProfile === 'consistent' && t('dashboard.consistent')}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {writingInsights.writerProfile === 'marathoner' && t('dashboard.profileMarathonerDesc')}
                  {writingInsights.writerProfile === 'sprinter' && t('dashboard.profileSprinterDesc')}
                  {writingInsights.writerProfile === 'consistent' && t('dashboard.profileConsistentDesc')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Current Streak & Hestius Protection */}
        {(currentStreak > 0 || effectiveHestiusCount > 0) && (
          <Card className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-xs">
                <HestiusIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 flex-wrap mb-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('dashboard.currentStreak')}</p>
                  {effectiveHestiusCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      🛡️ Protegido por {effectiveHestiusCount}/3 Hestius
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/90">
                      ⚠️ Altar desprotegido (0/3 Hestius - Recarregue na Loja)
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold text-slate-800">
                  {currentStreak} {t('dashboard.days')}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {streakResult.isProtected
                    ? '🔥 Chama resgatada por Hestius! Sua sequência foi mantida intacta.'
                    : currentStreak > 0
                      ? t('dashboard.streakKeepItUp')
                      : 'Escreva hoje para manter sua chama acesa!'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );

  const renderWorksSlidebar = () => {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t('dashboard.worksSlidebarTitle')}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
              {selectedWorkId === 'all'
                ? t('dashboard.allWorksSlidebar')
                : selectedWorkId === 'general'
                  ? t('dashboard.generalNoWorkSlidebar')
                  : (isPrivacyMode
                      ? `${t('dashboard.workNumber')} #${projectsInAutomonitoring.findIndex(p => p.id === selectedWorkId) + 1 || 1}`
                      : projects.find(p => p.id === selectedWorkId)?.name)}
            </span>
            {selectedWorkId !== 'all' && selectedWorkId !== 'general' && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                <span>💎</span>
                <span>
                  {Math.floor(
                    sessions
                      .filter(s => {
                        const prj = projects.find(p => p.id === selectedWorkId);
                        return prj ? isSessionInProject(s, prj, projects) : false;
                      })
                      .reduce((a, b) => a + b.wordCount, 0) / 2
                  ).toLocaleString('pt-BR')} 💎
                </span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented Control: Palavras vs Tempo */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setMetricViewMode('words')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  metricViewMode === 'words'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualizar automonitoramento por Volume de Palavras"
              >
                <span>📝</span>
                <span className="hidden sm:inline">Visão por</span>
                <span>Palavras</span>
              </button>
              <button
                type="button"
                onClick={() => setMetricViewMode('time')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  metricViewMode === 'time'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-amber-700'
                }`}
                title="Visualizar automonitoramento por Tempo de Produção (Kronus)"
              >
                <Hourglass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Visão por</span>
                <span>Tempo</span>
              </button>
            </div>

            {/* Print / Privacy Mode Toggle */}
            <button
              type="button"
              onClick={togglePrivacyMode}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-bold transition-all cursor-pointer ${
                isPrivacyMode
                  ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title={t('dashboard.printModeDesc')}
            >
              <span>{isPrivacyMode ? '🙈' : '📸'}</span>
              <span>{isPrivacyMode ? t('dashboard.printModeActive') : t('dashboard.printModeInactive')}</span>
            </button>

            {/* Module selector toggle */}
            <button
              type="button"
              onClick={() => setShowModuleSelector(prev => !prev)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                showModuleSelector
                  ? 'bg-teal-50 border-teal-300 text-teal-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>{t('dashboard.selectWhatToSee')}</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                {Object.values(visibleModules).filter(Boolean).length}/9
              </span>
            </button>
          </div>
        </div>

        {/* Slidebar with left/right scroll controls */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => scrollSlidebar('left')}
            className="hidden sm:flex absolute left-0 z-10 p-2 bg-white/95 shadow-md border border-slate-200 rounded-full text-slate-600 hover:bg-teal-50 hover:text-teal-600 transition-all -ml-3 cursor-pointer"
            title="Rolar para esquerda"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            ref={slidebarScrollRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth py-1 px-1 w-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* Pill: Todas as Obras */}
            <button
              type="button"
              onClick={() => setSelectedWorkId('all')}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedWorkId === 'all'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20 scale-[1.02]'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <span>✨</span>
              <span>{t('dashboard.allWorksSlidebar')}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                selectedWorkId === 'all' ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {projectsInAutomonitoring.length}
              </span>
            </button>

            {/* Pills for each project */}
            {projectsInAutomonitoring.map((proj, idx) => {
              const isSelected = selectedWorkId === proj.id;
              const displayName = isPrivacyMode
                ? `${t('dashboard.workNumber')} #${idx + 1}`
                : proj.name;
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => setSelectedWorkId(proj.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white shadow-md scale-[1.02]'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                  title={isPrivacyMode ? undefined : proj.description || proj.name}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: proj.color || '#2dd4bf' }}
                  />
                  <span className="truncate max-w-[180px]">{displayName}</span>
                </button>
              );
            })}

            {/* Pill: Sem Obra / Geral */}
            <button
              type="button"
              onClick={() => setSelectedWorkId('general')}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedWorkId === 'general'
                  ? 'bg-slate-800 text-white shadow-md scale-[1.02]'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0" />
              <span>{t('dashboard.generalNoWorkSlidebar')}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => scrollSlidebar('right')}
            className="hidden sm:flex absolute right-0 z-10 p-2 bg-white/95 shadow-md border border-slate-200 rounded-full text-slate-600 hover:bg-teal-50 hover:text-teal-600 transition-all -mr-3 cursor-pointer"
            title="Rolar para direita"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Optional Module Selector inline accordion */}
        {showModuleSelector && (
          <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-xl space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('dashboard.modulesTitle')}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAllModules(true)}
                  className="text-[11px] text-teal-600 hover:underline font-bold cursor-pointer"
                >
                  {t('dashboard.selectAll')}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setAllModules(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  {t('dashboard.deselectAll')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {[
                { key: 'goals', label: t('dashboard.moduleGoals') },
                { key: 'kpis', label: t('dashboard.moduleKpis') },
                { key: 'wordProduction', label: t('dashboard.moduleWordProduction') },
                { key: 'qualityIndicators', label: t('dashboard.moduleQuality') },
                { key: 'calendar', label: t('dashboard.moduleCalendar') },
                { key: 'strategies', label: t('dashboard.moduleStrategies') },
                { key: 'heatmap', label: t('dashboard.moduleHeatmap') },
                { key: 'sessionsList', label: t('dashboard.moduleSessions') },
                { key: 'insights', label: t('dashboard.moduleInsights') },
              ].map(({ key, label }) => {
                const isChecked = visibleModules[key as keyof typeof defaultModules];
                return (
                  <label
                    key={key}
                    className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-all ${
                      isChecked
                        ? 'bg-white border-teal-200 text-slate-800 font-medium shadow-xs'
                        : 'bg-slate-100 border-transparent text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer"
                      checked={isChecked}
                      onChange={() => toggleModule(key as keyof typeof defaultModules)}
                    />
                    <span className="truncate">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAutomonitoringSections = () => (
    <div className="space-y-8">
      {/* Goals */}
      {visibleModules.goals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Goal */}
          <Card className="group relative hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>{metricViewMode === 'time' ? '⏱️' : '📝'}</span>
                  <span>{metricViewMode === 'time' ? (t('dashboard.dailyTimeGoal') || 'Meta Diária de Tempo') : t('dashboard.dailyGoal')}</span>
                </span>
                {metricViewMode === 'time' ? (
                  minutesToday >= dailyMinutesGoal && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Meta Batida! ⏱️🎉
                    </span>
                  )
                ) : (
                  wordsToday >= settings.dailyWordGoal && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-700 border border-teal-200">
                      Meta Batida! 🎉
                    </span>
                  )
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingGoal === (metricViewMode === 'time' ? 'dailyTime' : 'daily') ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min="1"
                      className={`w-20 px-2 py-0.5 text-xs font-semibold border rounded-md focus:outline-none focus:ring-1 ${
                        metricViewMode === 'time' ? 'border-amber-400 focus:ring-amber-500' : 'border-teal-400 focus:ring-teal-500'
                      }`}
                      value={tempGoalInput}
                      onChange={(e) => setTempGoalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveGoal(metricViewMode === 'time' ? 'dailyTime' : 'daily');
                        if (e.key === 'Escape') setEditingGoal(null);
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveGoal(metricViewMode === 'time' ? 'dailyTime' : 'daily')}
                      className={`p-1 text-white rounded transition cursor-pointer ${
                        metricViewMode === 'time' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-teal-500 hover:bg-teal-600'
                      }`}
                      title="Salvar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingGoal(null)}
                      className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition cursor-pointer"
                      title="Cancelar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-bold text-slate-700">
                      {metricViewMode === 'time'
                        ? `${minutesToday} min / ${dailyMinutesGoal} min`
                        : `${wordsToday.toLocaleString('pt-BR')} / ${settings.dailyWordGoal.toLocaleString('pt-BR')} ${t('dashboard.words')}`}
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          if (metricViewMode === 'time') {
                            setEditingGoal('dailyTime');
                            setTempGoalInput(String(dailyMinutesGoal));
                          } else {
                            setEditingGoal('daily');
                            setTempGoalInput(String(settings.dailyWordGoal));
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-md cursor-pointer"
                        title={metricViewMode === 'time' ? 'Editar Meta Diária de Tempo' : 'Editar Meta Diária de Palavras'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-1000 ${
                  metricViewMode === 'time'
                    ? minutesToday >= dailyMinutesGoal
                      ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)] ring-1 ring-amber-400/50'
                      : 'bg-amber-400'
                    : wordsToday >= settings.dailyWordGoal
                      ? 'bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.7)] ring-1 ring-teal-400/50'
                      : 'bg-teal-400'
                }`}
                style={{ width: `${metricViewMode === 'time' ? dailyTimeProgress : dailyProgress}%` }}
              ></div>
            </div>
            {/* Secondary complementary metric */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mt-1.5 pt-1 border-t border-slate-100">
              {metricViewMode === 'time' ? (
                <>
                  <span>📝 Volume: {wordsToday.toLocaleString('pt-BR')} / {settings.dailyWordGoal.toLocaleString('pt-BR')} pal.</span>
                  <span className="font-semibold text-slate-500">{dailyProgress}% da meta de palavras</span>
                </>
              ) : (
                <>
                  <span>⏱️ Tempo: {minutesToday} min / {dailyMinutesGoal} min</span>
                  <span className="font-semibold text-slate-500">{dailyTimeProgress}% da meta de tempo</span>
                </>
              )}
            </div>
          </Card>

          {/* Weekly Goal */}
          <Card className="group relative hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>{metricViewMode === 'time' ? '⏱️' : '📝'}</span>
                  <span>{metricViewMode === 'time' ? (t('dashboard.weeklyTimeGoal') || 'Meta Semanal de Tempo') : t('dashboard.weeklyGoal')}</span>
                </span>
                {metricViewMode === 'time' ? (
                  minutesWeek >= weeklyMinutesGoal && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Meta Batida! ⏱️🎉
                    </span>
                  )
                ) : (
                  wordsWeek >= settings.weeklyWordGoal && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Meta Batida! 🎉
                    </span>
                  )
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingGoal === (metricViewMode === 'time' ? 'weeklyTime' : 'weekly') ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      min="1"
                      className={`w-20 px-2 py-0.5 text-xs font-semibold border rounded-md focus:outline-none focus:ring-1 ${
                        metricViewMode === 'time' ? 'border-amber-400 focus:ring-amber-500' : 'border-emerald-400 focus:ring-emerald-500'
                      }`}
                      value={tempGoalInput}
                      onChange={(e) => setTempGoalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveGoal(metricViewMode === 'time' ? 'weeklyTime' : 'weekly');
                        if (e.key === 'Escape') setEditingGoal(null);
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveGoal(metricViewMode === 'time' ? 'weeklyTime' : 'weekly')}
                      className={`p-1 text-white rounded transition cursor-pointer ${
                        metricViewMode === 'time' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
                      }`}
                      title="Salvar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingGoal(null)}
                      className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition cursor-pointer"
                      title="Cancelar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-bold text-slate-700">
                      {metricViewMode === 'time'
                        ? `${formatMinutesToHours(minutesWeek)} / ${formatMinutesToHours(weeklyMinutesGoal)}`
                        : `${wordsWeek.toLocaleString('pt-BR')} / ${settings.weeklyWordGoal.toLocaleString('pt-BR')} ${t('dashboard.words')}`}
                    </span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          if (metricViewMode === 'time') {
                            setEditingGoal('weeklyTime');
                            setTempGoalInput(String(weeklyMinutesGoal));
                          } else {
                            setEditingGoal('weekly');
                            setTempGoalInput(String(settings.weeklyWordGoal));
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-md cursor-pointer"
                        title={metricViewMode === 'time' ? 'Editar Meta Semanal de Tempo' : 'Editar Meta Semanal de Palavras'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-1000 ${
                  metricViewMode === 'time'
                    ? minutesWeek >= weeklyMinutesGoal
                      ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.7)] ring-1 ring-amber-500/50'
                      : 'bg-amber-500'
                    : wordsWeek >= settings.weeklyWordGoal
                      ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)] ring-1 ring-emerald-400/50'
                      : 'bg-emerald-400'
                }`}
                style={{ width: `${metricViewMode === 'time' ? weeklyTimeProgress : weeklyProgress}%` }}
              ></div>
            </div>
            {/* Secondary complementary metric */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mt-1.5 pt-1 border-t border-slate-100">
              {metricViewMode === 'time' ? (
                <>
                  <span>📝 Volume: {wordsWeek.toLocaleString('pt-BR')} / {settings.weeklyWordGoal.toLocaleString('pt-BR')} pal.</span>
                  <span className="font-semibold text-slate-500">{weeklyProgress}% da meta de palavras</span>
                </>
              ) : (
                <>
                  <span>⏱️ Tempo: {formatMinutesToHours(minutesWeek)} / {formatMinutesToHours(weeklyMinutesGoal)}</span>
                  <span className="font-semibold text-slate-500">{weeklyTimeProgress}% da meta de tempo</span>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Writing Insights */}
      {visibleModules.insights && filteredSessions.length > 0 && renderWritingInsights()}

      {/* KPIs */}
      {visibleModules.kpis && renderKPIs()}

      {/* Charts (Word Production, Quality Indicators, Calendar, Strategies) */}
      {(visibleModules.wordProduction || visibleModules.qualityIndicators || visibleModules.calendar || visibleModules.strategies) && renderCharts()}

      {/* Heatmap */}
      {visibleModules.heatmap && renderHeatmap()}

      {/* Session List */}
      {visibleModules.sessionsList && renderSessionList()}
    </div>
  );


  const renderAchievements = () => {
    return (
      <AchievementsGallery
        sessions={sessions}
        projects={projects}
        totalWords={lifetimeTotalWords}
        user={user}
        onUpdateUser={(updated) => onUpdateUser?.(updated)}
      />
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Imposing Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white shadow-xl border border-teal-900/60 p-6 sm:p-7 mb-8">
        {/* Subtle Ambient Glow Elements */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Left Column: Author Avatar + Greeting */}
          <div className="flex items-center gap-5 sm:gap-6">
            {readOnly ? (
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 backdrop-blur-md text-white rounded-2xl border border-white/10 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-white tracking-tight">{t('dashboard.inspecting')}</h1>
                    <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full">{t('dashboard.readOnly')}</span>
                  </div>
                  <p className="text-teal-300 font-bold text-lg">{user.name}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Imposing Avatar with Double Ring Frame */}
                <div
                  className="relative group cursor-pointer flex-shrink-0"
                  onClick={() => !readOnly && setShowAuthorProfileModal(true)}
                  title="Ver e editar Meu Perfil de Autor & Vitrine Literária"
                >
                  <div className="absolute inset-0 bg-emerald-400 rounded-full blur-md opacity-25 group-hover:opacity-70 transition-opacity pointer-events-none"></div>
                  {(user.photoBase64 || user.photoURL) ? (
                    <img
                      src={user.photoBase64 || user.photoURL}
                      alt={user.name}
                      className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-emerald-400 ring-4 ring-emerald-500/30 shadow-2xl transform transition-transform duration-300 group-hover:scale-105 ${isUpdatingAvatar ? 'opacity-50' : ''}`}
                    />
                  ) : (
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full border-2 border-emerald-400 ring-4 ring-emerald-500/30 shadow-2xl flex items-center justify-center text-white text-4xl font-black transform transition-transform duration-300 group-hover:scale-105">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {!readOnly && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="absolute -bottom-1 -right-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-2 rounded-full shadow-lg border-2 border-slate-900 opacity-90 group-hover:opacity-100 transition-all group-hover:scale-110 cursor-pointer"
                      title="Alterar foto de perfil"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleUpdateAvatar} />
                </div>

                {/* Typography and Greeting */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Projeto Parnaso
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 shadow-2xs">
                      Plataforma Literária
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm sm:text-base font-normal tracking-wide">
                    {t('dashboard.welcome')}, <strong onClick={() => !readOnly && setShowAuthorProfileModal(true)} className="font-extrabold text-teal-300 hover:underline cursor-pointer" title="Ver Meu Perfil de Autor & Vitrine">{user.name}.</strong> {t('dashboard.letsWrite')}
                  </p>

                  {/* Equipped Badges in Header */}
                  {user.equippedBadges && user.equippedBadges.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {user.equippedBadges.slice(0, 2).map((badge) => (
                        <span
                          key={badge.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-xs hover:bg-white/20 transition-all cursor-default"
                          title={`${badge.title} (${badge.rarity}): ${badge.description}`}
                        >
                          <span className="text-sm">{badge.icon || '🏅'}</span>
                          <span className="truncate max-w-[130px]">{badge.title}</span>
                          {badge.count && badge.count > 1 ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-500/80 text-white font-black">
                              x{badge.count}
                            </span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Column: Actions and Controls */}
          <div className="flex flex-col gap-3 xl:items-end">
            {/* Top Sub-row: Badges and Secondary Controls */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              {!readOnly && (
                <>
                  {/* Dedicated Author Showcase Button - High Contrast Primary CTA */}
                  <button
                    type="button"
                    onClick={() => setShowAuthorProfileModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-md hover:shadow-lg hover:shadow-purple-500/25 border border-purple-400/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    title="Ver e editar Meu Perfil de Autor & Vitrine Literária"
                  >
                    <BookOpen className="w-4 h-4 text-purple-200" />
                    <span>Meu Perfil</span>
                  </button>

                  {/* Triple Capsule with Glassmorphism: Scriptus, Kronus, Hestius */}
                  <div
                    onClick={() => { setActiveTab('rewards'); setSelectedProjectId(null); }}
                    className={`flex items-center gap-1.5 p-1 rounded-2xl backdrop-blur-md border shadow-sm cursor-pointer transition-all ${
                      activeTab === 'rewards'
                        ? 'bg-purple-900/70 border-purple-400/60 ring-2 ring-purple-400/40 shadow-purple-500/25'
                        : 'bg-slate-900/50 hover:bg-slate-900/70 border-white/15 text-slate-200'
                    }`}
                    title="Loja de Recompensas & Altar de Hestius"
                  >
                    {/* Scriptus Capsule */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/30 text-violet-200 transition-colors">
                      <ScriptusIcon className="w-4 h-4 text-violet-300" />
                      <span className="font-extrabold text-xs tracking-wide text-violet-100">{balances.balanceScriptus.toLocaleString('pt-BR')}</span>
                      <span className="hidden md:inline text-[11px] font-semibold text-violet-300/80">Scriptus</span>
                    </div>

                    {/* Kronus Capsule */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 transition-colors">
                      <KronusIcon className="w-4 h-4 text-amber-300" />
                      <span className="font-extrabold text-xs tracking-wide text-amber-100">{balances.balanceKronus.toLocaleString('pt-BR')}</span>
                      <span className="hidden md:inline text-[11px] font-semibold text-amber-300/80">Kronus</span>
                    </div>

                    {/* Hestius Capsule with Orbs */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 transition-colors">
                      <HestiusIcon className="w-4 h-4 text-rose-300" />
                      <span className="font-extrabold text-xs tracking-wide text-rose-100">
                        {effectiveHestiusCount}/3
                      </span>
                      <div className="hidden sm:flex items-center">
                        <HestiusOrbs count={effectiveHestiusCount} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Social Hub Button - High Contrast Vibrant CTA with Activity Dot */}
                  {onSocial && (
                    <button
                      type="button"
                      onClick={onSocial}
                      className="relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      title={t('dashboard.communityAndChat')}
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </span>
                      <Users className="w-4 h-4 text-white" />
                      <span>{t('dashboard.social')}</span>
                    </button>
                  )}

                  {/* Compact Secondary Controls Tray */}
                  <div className="flex items-center gap-1 bg-black/20 backdrop-blur-md p-1 rounded-xl border border-white/10">
                    <LanguageSelector />

                    <button
                      onClick={() => { setTempSettings(settings); setShowSettings(true); setDeleteConfirm(false); }}
                      className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                      title={t('dashboard.configureGoals')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>

                    {onHelp && (
                      <button
                        onClick={onHelp}
                        className="p-2 text-purple-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                        title={t('dashboard.helpAndAbout')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={onLogout}
                      className="p-2 text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                      title={t('dashboard.logout')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </div>
                </>
              )}

              {user.role === 'admin' && !readOnly && (
                <button
                  onClick={onAdminPanel}
                  className="flex items-center px-3.5 py-2 bg-slate-800/90 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors shadow-md border border-slate-700 text-xs cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('dashboard.adminPanel')}
                </button>
              )}

              {readOnly && (
                <button
                  onClick={onAdminPanel}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/20 transition-colors text-xs cursor-pointer"
                >
                  {t('dashboard.closeInspection')}
                </button>
              )}
            </div>

            {/* Bottom Sub-row: Prominent Action Buttons */}
            {!readOnly && (
              <div className="flex items-center gap-3">
                <button
                  onClick={onFocusMode}
                  className="flex items-center justify-center px-4 sm:px-5 py-2.5 bg-slate-800/90 hover:bg-slate-700/90 text-white font-semibold rounded-xl border border-slate-700/80 shadow-md transition-all hover:-translate-y-0.5 whitespace-nowrap text-xs sm:text-sm cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{t('dashboard.focusMode')}</span>
                </button>

                <button
                  onClick={() => onNewSession()}
                  className="flex items-center justify-center px-5 sm:px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 whitespace-nowrap text-xs sm:text-sm cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{t('dashboard.newSession')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('general'); setSelectedProjectId(null); }}
          className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'general' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          {t('dashboard.general')}
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'projects' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          {t('dashboard.myProjects')}
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'achievements' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          {t('dashboard.achievements')}
        </button>
        <button
          onClick={() => { setActiveTab('rewards'); setSelectedProjectId(null); }}
          className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'rewards' ? 'border-purple-600 text-purple-700 font-bold' : 'border-transparent text-slate-500 hover:text-purple-600'
          }`}
        >
          <span>💎</span>
          <span>{t('dashboard.rewards')}</span>
        </button>
      </div>

      {/* VIEW: PROJECTS LIST */}
      {activeTab === 'projects' && !selectedProjectId && (
        <div className="space-y-6">
          {/* Top Control Bar: Search, Sorting & Counter */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                placeholder="Buscar obra por título ou sinopse..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all placeholder:text-slate-400"
              />
              {projectSearchQuery && (
                <button
                  type="button"
                  onClick={() => setProjectSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Limpar busca"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* Sorting Pills & Active Counter */}
            <div className="flex items-center gap-3 flex-wrap justify-between md:justify-end">
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setProjectSortBy('recent')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    projectSortBy === 'recent'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Recentes
                </button>
                <button
                  type="button"
                  onClick={() => setProjectSortBy('words')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    projectSortBy === 'words'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Mais Palavras
                </button>
                <button
                  type="button"
                  onClick={() => setProjectSortBy('alphabetical')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    projectSortBy === 'alphabetical'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Ordem Alfabética
                </button>
              </div>

              {/* Subtle Counter */}
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap px-1">
                {filteredAndSortedProjects.length} {filteredAndSortedProjects.length === 1 ? 'obra ativa' : 'obras ativas'}
              </span>
            </div>
          </div>

          {/* Grid of Projects */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Inviting "+ Nova Obra" Card */}
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowNewProject(true)}
                className="group relative flex flex-col items-center justify-center min-h-[240px] rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 text-slate-400 hover:text-emerald-700 transition-all duration-300 cursor-pointer shadow-xs hover:shadow-md hover:shadow-emerald-500/10 hover:-translate-y-1 p-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-50 group-hover:bg-emerald-100/70 border border-slate-200/60 group-hover:border-emerald-300 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-all duration-300 mb-3 shadow-inner group-hover:scale-110">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 transition-transform duration-300 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="font-bold text-sm text-slate-700 group-hover:text-emerald-700 transition-colors">
                  {t('dashboard.newProject')}
                </span>
                <span className="text-xs text-slate-400 group-hover:text-emerald-600/80 transition-colors mt-1 text-center">
                  Comece um novo livro, conto ou roteiro
                </span>
              </button>
            )}

            {/* Project Cards */}
            {filteredAndSortedProjects.map(project => {
              const projSessions = sessions.filter(s => isSessionInProject(s, project, projects));
              const projWords = projSessions.reduce((a, b) => a + b.wordCount, 0);
              const projMinutes = projSessions.reduce((a, b) => a + calculateSessionMinutes(b.startTime, b.endTime), 0);
              const projKronus = projSessions.reduce((a, b) => a + sessionToKronus(b.startTime, b.endTime), 0);
              const projScriptus = Math.floor(projWords / 2);
              const percent = project.targetWordCount ? Math.min(100, Math.round((projWords / project.targetWordCount) * 100)) : 0;
              const isDiscreet = isProjectDiscreet(project);
              const hasDiscreetModeEnabled = project.showInAutomonitoring === false || customDiscreetIds.includes(project.id);
              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between"
                >
                  {/* Color indicator strip */}
                  <div
                    className="absolute top-0 left-0 w-2.5 h-full transition-all duration-300 group-hover:w-3.5"
                    style={{ backgroundColor: project.color || '#2dd4bf' }}
                  ></div>

                  <div className="pl-3.5">
                    {/* Header: Title and Quick Action Buttons */}
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        style={isDiscreet ? { filter: 'blur(6px)' } : undefined}
                        onClick={(e) => {
                          if (isDiscreet) {
                            e.stopPropagation();
                            toggleProjectDiscreetLock(project);
                          }
                        }}
                        className={`text-lg sm:text-xl font-bold text-slate-800 group-hover:text-teal-600 transition-all duration-300 truncate ${
                          isDiscreet ? 'group-hover:!filter-none select-none' : ''
                        }`}
                        title={isDiscreet ? 'Modo Discreto ativo (passe o mouse ou clique para revelar)' : project.name}
                      >
                        {project.name}
                      </h3>

                      {/* Quick Action Icons (Hover Menu) */}
                      {!readOnly && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -mr-1 -mt-1 flex-shrink-0">
                          {/* Lock / Discreet Mode Toggle */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProjectDiscreetLock(project);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isDiscreet
                                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                            title={
                              isDiscreet
                                ? 'Modo Discreto ativo (clique para revelar título e sinopse)'
                                : 'Ativar Modo Discreto (borrar título e sinopse contra curiosos)'
                            }
                          >
                            <span className="text-xs leading-none">{isDiscreet ? '🔒' : '🔓'}</span>
                          </button>

                          {/* Quick New Session */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNewSession({ projectId: project.id });
                            }}
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="+ Nova Sessão nesta Obra"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>

                          {/* Edit Project Modal */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditProject(project);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar título, meta ou cor da obra"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          {/* Delete with protection */}
                          {onDeleteProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(project);
                                setDeleteConfirmedCheck(false);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={t('dashboard.deleteProject')}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Editable Synopsis / Description */}
                    {editingDescProjectId === project.id ? (
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          rows={2}
                          value={tempDescValue}
                          onChange={(e) => setTempDescValue(e.target.value)}
                          className="w-full p-2 text-xs border border-teal-300 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                          placeholder="Escreva uma sinopse ou tags para esta obra..."
                          autoFocus
                        />
                        <div className="flex gap-1.5 justify-end mt-1">
                          <button
                            type="button"
                            onClick={() => setEditingDescProjectId(null)}
                            className="px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await onAddProject({ ...project, description: tempDescValue.trim() });
                              setEditingDescProjectId(null);
                            }}
                            className="px-2.5 py-0.5 text-[11px] bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 shadow-2xs transition-colors cursor-pointer"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p
                        style={isDiscreet ? { filter: 'blur(6px)' } : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDiscreet) {
                            toggleProjectDiscreetLock(project);
                            return;
                          }
                          setEditingDescProjectId(project.id);
                          setTempDescValue(project.description || '');
                        }}
                        className={`text-sm mt-1 line-clamp-2 min-h-[2.5rem] transition-all duration-300 rounded p-1 -m-1 cursor-pointer hover:bg-slate-50 ${
                          isDiscreet ? 'group-hover:!filter-none select-none' : ''
                        } ${
                          project.description
                            ? 'text-slate-500 hover:text-slate-700'
                            : 'text-slate-400 italic hover:text-teal-600'
                        }`}
                        title={isDiscreet ? 'Modo Discreto ativo (passe o mouse ou clique para revelar)' : 'Clique para editar a sinopse rapidamente'}
                      >
                        {project.description || '+ Clique para adicionar uma sinopse ou tag...'}
                      </p>
                    )}

                    {/* Progress Section with Permanent Bar */}
                    <div className="mt-5">
                      <div className="flex justify-between items-baseline text-xs text-slate-500 mb-1.5">
                        <span className="font-semibold text-slate-600">{t('dashboard.progress')}</span>
                        <span className="font-medium text-slate-700 flex items-center gap-1.5 flex-wrap justify-end">
                          {project.targetWordCount ? (
                            <>
                              <span className="font-bold text-slate-900">{projWords.toLocaleString('pt-BR')}</span>
                              <span className="text-slate-400"> / {project.targetWordCount.toLocaleString('pt-BR')} pal.</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                {percent}%
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-slate-900">{projWords.toLocaleString('pt-BR')}</span>
                              <span className="text-slate-400"> palavras</span>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditProject(project);
                                  }}
                                  className="text-[10px] font-semibold text-teal-600 hover:underline cursor-pointer"
                                >
                                  + Meta
                                </button>
                              )}
                            </>
                          )}
                          <span className="text-slate-300">•</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                            <Hourglass className="w-3 h-3 text-amber-500" />
                            <span>{formatMinutesToHours(projMinutes)}</span>
                          </span>
                        </span>
                      </div>

                      {/* Clean Colored Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{
                            width: project.targetWordCount
                              ? `${percent}%`
                              : `${Math.min(100, Math.max(10, Math.min(100, (projWords / 10000) * 100)))}%`,
                            backgroundColor: project.color || '#2dd4bf',
                            opacity: project.targetWordCount ? 1 : 0.6,
                          }}
                        />
                      </div>
                    </div>

                    {/* Scriptus & Kronus earned in this project */}
                    <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between bg-violet-50/80 border border-violet-100/90 px-2.5 py-1.5 rounded-xl text-violet-900">
                        <span className="flex items-center gap-1 font-semibold truncate">
                          <ScriptusIcon className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
                          <span className="truncate">Scriptus:</span>
                        </span>
                        <span className="font-extrabold text-violet-800 bg-violet-200/70 px-1.5 py-0.5 rounded-md text-[11px] ml-1">
                          +{projScriptus.toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-amber-50/80 border border-amber-100/90 px-2.5 py-1.5 rounded-xl text-amber-900">
                        <span className="flex items-center gap-1 font-semibold truncate">
                          <KronusIcon className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          <span className="truncate">Kronus:</span>
                        </span>
                        <span className="font-extrabold text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded-md text-[11px] ml-1">
                          +{projKronus.toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Modernized Automonitoring & Discreet Curtain Toggle */}
                    <div
                      className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleProjectInAutomonitoring(project, project.showInAutomonitoring === false)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border select-none ${
                          project.showInAutomonitoring !== false
                            ? 'bg-teal-50/80 border-teal-200 text-teal-700 hover:bg-teal-100/80 shadow-2xs'
                            : 'bg-amber-50/80 border-amber-200 text-amber-700 hover:bg-amber-100/80 shadow-2xs'
                        }`}
                        title={
                          project.showInAutomonitoring !== false
                            ? 'Clique para ocultar esta obra dos gráficos e métricas do automonitoramento'
                            : 'Clique para voltar a exibir esta obra nos gráficos e métricas'
                        }
                      >
                        <span className="text-sm">
                          {project.showInAutomonitoring !== false ? '👁️' : '👁️‍🗨️'}
                        </span>
                        <span>
                          {project.showInAutomonitoring !== false
                            ? 'Visível nas Métricas'
                            : 'Oculto do Automonitoramento'}
                        </span>
                      </button>

                      {/* Discreet Mode / Privacy Curtain Button */}
                      <button
                        type="button"
                        onClick={() => toggleProjectDiscreetLock(project)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border select-none ${
                          isDiscreet
                            ? 'bg-slate-800 border-slate-700 text-amber-300 shadow-2xs'
                            : hasDiscreetModeEnabled
                              ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                              : 'bg-slate-50 border-slate-200/80 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                        title={
                          isDiscreet
                            ? 'Cortina de Privacidade ativa (clique para revelar permanentemente)'
                            : 'Ativar Modo Discreto (borra título e descrição contra curiosos)'
                        }
                      >
                        <span>{isDiscreet ? '🔒' : '🔓'}</span>
                        <span>{isDiscreet ? 'Modo Discreto' : 'Discreto'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty Search Result */}
          {filteredAndSortedProjects.length === 0 && projectSearchQuery && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-8">
              <div className="text-4xl mb-3">🔍</div>
              <h4 className="font-bold text-slate-700 mb-1">Nenhuma obra encontrada</h4>
              <p className="text-xs text-slate-500 mb-4">
                Não encontramos nenhum projeto com o termo "{projectSearchQuery}".
              </p>
              <button
                type="button"
                onClick={() => setProjectSearchQuery('')}
                className="px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer"
              >
                Limpar busca
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW: ACHIEVEMENTS */}
      {activeTab === 'achievements' && renderAchievements()}

      {/* VIEW: REWARDS SHOP */}
      {activeTab === 'rewards' && (
        <RewardsShop
          user={user}
          totalWords={lifetimeTotalWords}
          sessions={sessions}
          onUpdateUser={onUpdateUser}
          readOnly={readOnly}
        />
      )}

      {/* VIEW: PROJECT WORKSPACE (Organização de Ideias, Personagens e Métricas da Obra) */}
      {selectedProjectId && (
        (() => {
          const project = projects.find(p => p.id === selectedProjectId);
          if (!project) return null;
          return (
            <ProjectWorkspace
              project={project}
              user={user}
              sessions={sessions}
              onBackToProjects={() => setSelectedProjectId(null)}
              renderAutomonitoring={() => renderAutomonitoringSections()}
              onDeleteRequested={onDeleteProject ? () => {
                setProjectToDelete(project);
                setDeleteConfirmedCheck(false);
              } : undefined}
              readOnly={readOnly}
            />
          );
        })()
      )}

      {/* VIEW: GENERAL ACTIVE DASHBOARD */}
      {activeTab === 'general' && !selectedProjectId && (
        <>
          {renderWorksSlidebar()}
          {renderAutomonitoringSections()}
        </>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-fade-in overflow-y-auto max-h-[90vh]">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('dashboard.settingsTitle')}
            </h3>

            {/* Profile Picture Selector (200x200 Canvas Base64) */}
            <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <ImagePicker
                currentImage={user.photoBase64 || user.photoURL}
                onImageSelected={handleSelectProfileBase64}
                onImageRemoved={async () => {
                  await updateUserProfileBase64(user.id, '');
                  user.photoBase64 = '';
                  user.photoURL = '';
                  window.location.reload();
                }}
                label="Foto de Perfil"
                fallbackText={user.name}
                fallbackColor="#0d9488"
                size="md"
                helperText="Redimensionado para 200x200 JPEG (0.7) e salvo em photoBase64"
              />
            </div>

            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard.dailyWordGoal')}</label>
                  <input
                    type="number"
                    value={tempSettings.dailyWordGoal}
                    onChange={(e) => setTempSettings({ ...tempSettings, dailyWordGoal: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard.dailyTimeGoalMin') || 'Meta Diária de Tempo (minutos)'}</label>
                  <input
                    type="number"
                    value={tempSettings.dailyMinutesGoal || 30}
                    onChange={(e) => setTempSettings({ ...tempSettings, dailyMinutesGoal: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard.weeklyWordGoal')}</label>
                  <input
                    type="number"
                    value={tempSettings.weeklyWordGoal}
                    onChange={(e) => setTempSettings({ ...tempSettings, weeklyWordGoal: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard.weeklyTimeGoalMin') || 'Meta Semanal de Tempo (minutos)'}</label>
                  <input
                    type="number"
                    value={tempSettings.weeklyMinutesGoal || 180}
                    onChange={(e) => setTempSettings({ ...tempSettings, weeklyMinutesGoal: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h4 className="text-red-500 font-bold mb-2">{t('dashboard.dangerZone')}</h4>
              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                {!deleteConfirm ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-red-800">{t('dashboard.deleteAllData')}</p>
                      <p className="text-sm text-red-600 max-w-[200px] sm:max-w-xs">{t('dashboard.deleteAllDataDesc')}</p>
                    </div>
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors whitespace-nowrap"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-red-800 mb-3 font-medium">{t('dashboard.deleteWarning')}</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleReset}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                      >
                        {t('dashboard.confirmDelete')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={saveSettings}
                className="px-6 py-2 bg-teal-500 text-white font-bold rounded-xl hover:bg-teal-600 transition-colors shadow-sm hover:shadow-md"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6">{t('dashboard.newProject')}</h3>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard.projectName')} *</label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    placeholder={t('dashboard.projectNamePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard.projectDescription')}</label>
                  <textarea
                    rows={2}
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    placeholder={t('dashboard.projectDescriptionPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard.targetWords')} ({t('dashboard.optional')})</label>
                  <input
                    type="number"
                    value={newProjectGoal}
                    onChange={(e) => setNewProjectGoal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    placeholder={t('dashboard.targetWordsPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('dashboard.projectColor')}</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <input type="color" value={newProjectColor} onChange={(e) => setNewProjectColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-none p-0" />
                    <div className="flex-1 flex flex-wrap gap-1">
                      {DEFAULT_PROJECT_COLORS.slice(0, 5).map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewProjectColor(c)}
                          style={{ backgroundColor: c }}
                          className="w-4 h-4 rounded-full border border-white shadow-sm hover:scale-110 transition-transform"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowNewProject(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">{t('common.cancel')}</button>
                  <button type="submit" className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600">{t('dashboard.createProject')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span>✏️</span>
                  <span>Editar Obra</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveEditedProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t('dashboard.projectName')} *</label>
                  <input
                    type="text"
                    required
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors text-sm"
                    placeholder="Título da obra"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t('dashboard.projectDescription')}</label>
                  <textarea
                    rows={3}
                    value={editProjectDesc}
                    onChange={(e) => setEditProjectDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors text-sm"
                    placeholder="Sinopse, premissa ou notas gerais..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Meta de Palavras da Obra ({t('dashboard.optional')})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editProjectGoal}
                    onChange={(e) => setEditProjectGoal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors text-sm"
                    placeholder="Ex: 50000"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Permite acompanhar a barra de progresso e a porcentagem concluída no card.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{t('dashboard.projectColor')}</label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={editProjectColor}
                      onChange={(e) => setEditProjectColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer border-none p-0"
                    />
                    <div className="flex-1 flex flex-wrap gap-1.5">
                      {DEFAULT_PROJECT_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditProjectColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${editProjectColor === c ? 'border-slate-800 scale-110 shadow-sm' : 'border-white hover:scale-105'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm bg-teal-500 text-white font-bold rounded-xl hover:bg-teal-600 transition-colors shadow-sm cursor-pointer"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Double Verification Project Deletion Modal */}
      {projectToDelete && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            if (!isDeletingProject) {
              setProjectToDelete(null);
              setDeleteConfirmedCheck(false);
            }
          }}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl border border-red-100 space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">
                    {t('dashboard.deleteProjectTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Verificação de segurança para exclusão
                  </p>
                </div>
              </div>
              {!isDeletingProject && (
                <button
                  type="button"
                  onClick={() => {
                    setProjectToDelete(null);
                    setDeleteConfirmedCheck(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* Project Info Banner */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: projectToDelete.color || '#2dd4bf' }} />
                <span className="font-bold text-slate-800 text-sm truncate max-w-[240px] sm:max-w-xs">{projectToDelete.name}</span>
              </div>
              <span className="text-xs font-semibold text-slate-500 flex-shrink-0">
                {sessions.filter(s => s.projectId === projectToDelete.id).reduce((a, b) => a + b.wordCount, 0)} {t('dashboard.words')}
              </span>
            </div>

            {/* Irreversible Warning Box */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs sm:text-sm text-red-800 leading-relaxed space-y-1">
              <div className="flex items-center gap-2 font-bold text-red-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Atenção: Ação Irreversível</span>
              </div>
              <p className="text-red-700/90 text-xs">
                {t('dashboard.deleteProjectWarning')}
              </p>
            </div>

            {/* Double Verification: Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={deleteConfirmedCheck}
                  onChange={(e) => setDeleteConfirmedCheck(e.target.checked)}
                  disabled={isDeletingProject}
                  className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-700 leading-snug">
                  {t('dashboard.deleteProjectCheckboxLabel')}
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingProject}
                onClick={() => {
                  setProjectToDelete(null);
                  setDeleteConfirmedCheck(false);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={!deleteConfirmedCheck || isDeletingProject}
                onClick={handleExecuteDeleteProject}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  deleteConfirmedCheck && !isDeletingProject
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                {isDeletingProject ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t('dashboard.deleteProjectDeleting')}</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>{t('dashboard.deleteProjectConfirmBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          projects={projects}
          onClose={() => setSelectedSession(null)}
          onEdit={
            !readOnly
              ? (sessionToEdit) => {
                  setSelectedSession(null);
                  onNewSession(sessionToEdit);
                }
              : undefined
          }
          isPrivateView={readOnly}
        />
      )}

      {/* Author Profile & Showcase Modal */}
      {showAuthorProfileModal && (
        <AuthorProfileModal
          user={user}
          currentUser={user}
          isOpen={showAuthorProfileModal}
          onClose={() => setShowAuthorProfileModal(false)}
          onUpdateCurrentUser={(updated) => {
            Object.assign(user, updated);
          }}
        />
      )}
    </div>
  );
};
