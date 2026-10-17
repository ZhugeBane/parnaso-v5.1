import React, { useState, useMemo } from 'react';
import { WritingSession, Project } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Trophy,
  Medal,
  Crown,
  Flame,
  Shield,
  Sparkles,
  Zap,
  Target,
  Clock,
  Moon,
  Sun,
  BookOpen,
  Compass,
  CheckCircle2,
  Lock,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';

interface AchievementsGalleryProps {
  sessions: WritingSession[];
  projects: Project[];
  totalWords: number;
}

export type TrophyRarity = 'bronze' | 'silver' | 'gold' | 'diamond';

interface TrophyDefinition {
  id: string;
  category: 'daily' | 'streak' | 'marathon' | 'special';
  threshold: number;
  unit: string;
  rarity: TrophyRarity;
  iconType: 'Shield' | 'Medal' | 'Trophy' | 'Crown' | 'Flame' | 'Moon' | 'Sun' | 'BookOpen' | 'Zap';
}

const TROPHY_DEFINITIONS: TrophyDefinition[] = [
  // --- DAILY RHYTHM ---
  { id: 'daily_500', category: 'daily', threshold: 500, unit: 'palavras', rarity: 'bronze', iconType: 'Shield' },
  { id: 'daily_1000', category: 'daily', threshold: 1000, unit: 'palavras', rarity: 'silver', iconType: 'Shield' },
  { id: 'daily_2000', category: 'daily', threshold: 2000, unit: 'palavras', rarity: 'gold', iconType: 'Shield' },

  // --- STREAK (OFENSIVA) ---
  { id: 'streak_3', category: 'streak', threshold: 3, unit: 'dias seguidos', rarity: 'bronze', iconType: 'Flame' },
  { id: 'streak_7', category: 'streak', threshold: 7, unit: 'dias seguidos', rarity: 'silver', iconType: 'Flame' },

  // --- MARATHONS ---
  { id: 'weekly_3000', category: 'marathon', threshold: 3000, unit: 'palavras na semana', rarity: 'silver', iconType: 'Medal' },
  { id: 'weekly_7000', category: 'marathon', threshold: 7000, unit: 'palavras na semana', rarity: 'gold', iconType: 'Medal' },
  { id: 'monthly_10000', category: 'marathon', threshold: 10000, unit: 'palavras no mês', rarity: 'gold', iconType: 'Trophy' },
  { id: 'monthly_30000', category: 'marathon', threshold: 3000, unit: 'palavras no mês', rarity: 'diamond', iconType: 'Trophy' },
  { id: 'total_50000', category: 'marathon', threshold: 50000, unit: 'palavras no total', rarity: 'diamond', iconType: 'Crown' },
  { id: 'total_100000', category: 'marathon', threshold: 100000, unit: 'palavras no total', rarity: 'diamond', iconType: 'Crown' },

  // --- BEHAVIORAL & SPECIALS ---
  { id: 'night_owl', category: 'special', threshold: 1, unit: 'sessão noturna', rarity: 'bronze', iconType: 'Moon' },
  { id: 'early_bird', category: 'special', threshold: 1, unit: 'sessão matinal', rarity: 'bronze', iconType: 'Sun' },
  { id: 'world_builder', category: 'special', threshold: 3, unit: 'obras criadas', rarity: 'silver', iconType: 'BookOpen' },
  { id: 'phoenix', category: 'special', threshold: 1, unit: 'retorno após hiato', rarity: 'gold', iconType: 'Zap' },
];

const RARITY_CONFIG: Record<TrophyRarity, {
  label: string;
  badge: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
  gradientBg: string;
  iconBg: string;
  progressBar: string;
}> = {
  bronze: {
    label: 'Bronze • Comum',
    badge: '🥉 Bronze',
    textColor: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-600/30 hover:border-amber-600',
    glowColor: 'hover:shadow-amber-900/15',
    gradientBg: 'from-amber-500/10 via-amber-500/5 to-white',
    iconBg: 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-50',
    progressBar: 'bg-gradient-to-r from-emerald-500 to-teal-500'
  },
  silver: {
    label: 'Prata • Raro',
    badge: '🥈 Prata',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-400/40 hover:border-blue-500',
    glowColor: 'hover:shadow-blue-500/20',
    gradientBg: 'from-blue-500/10 via-indigo-500/5 to-white',
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-blue-50',
    progressBar: 'bg-gradient-to-r from-blue-500 to-indigo-500'
  },
  gold: {
    label: 'Ouro • Épico',
    badge: '🥇 Ouro',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-400/60 hover:border-amber-500',
    glowColor: 'hover:shadow-amber-500/25',
    gradientBg: 'from-amber-400/15 via-orange-400/5 to-white',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500 text-amber-950',
    progressBar: 'bg-gradient-to-r from-amber-400 to-orange-500'
  },
  diamond: {
    label: 'Diamante • Lendário',
    badge: '💎 Lendário',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-400/60 hover:border-purple-500',
    glowColor: 'hover:shadow-purple-500/30',
    gradientBg: 'from-purple-500/15 via-pink-500/5 to-white',
    iconBg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-amber-400 text-white',
    progressBar: 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400'
  }
};

export const getLiteraryRank = (unlockedCount: number) => {
  if (unlockedCount <= 2) {
    return {
      title: 'Aprendiz da Pena',
      badge: 'Nível 1 • Iniciante',
      icon: '📜',
      color: 'from-amber-700 to-amber-900',
      description: 'Dando os primeiros passos na nobre arte da escrita.'
    };
  }
  if (unlockedCount <= 5) {
    return {
      title: 'Cronista Dedicado',
      badge: 'Nível 2 • Praticante',
      icon: '✒️',
      color: 'from-teal-600 to-emerald-700',
      description: 'Construindo o hábito e transformando pensamentos em prosa.'
    };
  }
  if (unlockedCount <= 8) {
    return {
      title: 'Autor em Ascensão',
      badge: 'Nível 3 • Consistente',
      icon: '📖',
      color: 'from-blue-600 to-indigo-700',
      description: 'Disciplina firme e produção em pleno fluxo criativo.'
    };
  }
  if (unlockedCount <= 12) {
    return {
      title: 'Romancista Consagrado',
      badge: 'Nível 4 • Veterano',
      icon: '🖋️',
      color: 'from-purple-600 to-violet-800',
      description: 'Domínio do ritmo e maratonas literárias invejáveis.'
    };
  }
  return {
    title: 'Mestre do Parnaso',
    badge: 'Nível 5 • Lendário',
    icon: '👑',
    color: 'from-amber-400 via-rose-500 to-purple-600',
    description: 'A glória literária máxima alcançada com maestria e dedicação!'
  };
};

export const AchievementsGallery: React.FC<AchievementsGalleryProps> = ({
  sessions,
  projects,
  totalWords
}) => {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'in_progress'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Compute all metrics required by trophies
  const stats = useMemo(() => {
    const computed = {
      maxDailyWords: 0,
      maxWeeklyWords: 0,
      maxMonthlyWords: 0,
      totalWords,
      maxStreak: 0,
      nightSessionsCount: 0,
      earlySessionsCount: 0,
      totalProjectsCount: projects.length,
      hasPhoenix: 0
    };

    if (sessions.length === 0) return computed;

    // Daily Map
    const dailyMap = new Map<string, number>();
    sessions.forEach(s => {
      const d = new Date(s.date).toLocaleDateString('en-CA');
      dailyMap.set(d, (dailyMap.get(d) || 0) + s.wordCount);
    });
    computed.maxDailyWords = Math.max(0, ...Array.from(dailyMap.values()));

    // Weekly Map
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
    computed.maxWeeklyWords = Math.max(0, ...Array.from(weeklyMap.values()));

    // Monthly Map
    const monthlyMap = new Map<string, number>();
    sessions.forEach(s => {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + s.wordCount);
    });
    computed.maxMonthlyWords = Math.max(0, ...Array.from(monthlyMap.values()));

    // Max Historical Streak
    const sortedDates = Array.from(dailyMap.keys()).sort().map(d => new Date(d));
    let currentStreak = 0;
    let maxStreak = 0;
    if (sortedDates.length > 0) {
      currentStreak = 1;
      maxStreak = 1;
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const curr = sortedDates[i].getTime();
        const next = sortedDates[i + 1].getTime();
        const diffDays = Math.round(Math.abs((next - curr) / 86400000));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      }
    }
    computed.maxStreak = maxStreak;

    // Night Owl & Early Bird
    sessions.forEach(s => {
      let hour = -1;
      if (s.startTime) {
        hour = parseInt(s.startTime.split(':')[0], 10);
      } else {
        hour = new Date(s.date).getHours();
      }

      if (!isNaN(hour)) {
        if (hour >= 22 || hour < 4) computed.nightSessionsCount++;
        if (hour >= 4 && hour < 8) computed.earlySessionsCount++;
      }
    });

    // Phoenix (resumed writing after 5+ days gap)
    if (sortedDates.length >= 2) {
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const diffDays = Math.round(Math.abs((sortedDates[i].getTime() - sortedDates[i + 1].getTime()) / 86400000));
        if (diffDays >= 5) {
          computed.hasPhoenix = 1;
          break;
        }
      }
    }

    return computed;
  }, [sessions, projects, totalWords]);

  // Evaluate each trophy status and progress
  const processedTrophies = useMemo(() => {
    return TROPHY_DEFINITIONS.map(def => {
      let currentValue = 0;

      switch (def.id) {
        case 'daily_500':
        case 'daily_1000':
        case 'daily_2000':
          currentValue = stats.maxDailyWords;
          break;
        case 'weekly_3000':
        case 'weekly_7000':
          currentValue = stats.maxWeeklyWords;
          break;
        case 'monthly_10000':
        case 'monthly_30000':
          currentValue = stats.maxMonthlyWords;
          break;
        case 'total_50000':
        case 'total_100000':
          currentValue = stats.totalWords;
          break;
        case 'streak_3':
        case 'streak_7':
          currentValue = stats.maxStreak;
          break;
        case 'night_owl':
          currentValue = stats.nightSessionsCount;
          break;
        case 'early_bird':
          currentValue = stats.earlySessionsCount;
          break;
        case 'world_builder':
          currentValue = stats.totalProjectsCount;
          break;
        case 'phoenix':
          currentValue = stats.hasPhoenix;
          break;
        default:
          currentValue = 0;
      }

      const unlocked = currentValue >= def.threshold;
      const progress = Math.min(100, (currentValue / def.threshold) * 100);
      const deficit = Math.max(0, def.threshold - currentValue);

      return {
        ...def,
        currentValue,
        unlocked,
        progress,
        deficit,
        title: t(`trophies.${def.id}.title`) || def.id,
        description: t(`trophies.${def.id}.description`) || ''
      };
    });
  }, [stats, t]);

  // Overall Statistics
  const unlockedCount = processedTrophies.filter(t => t.unlocked).length;
  const totalCount = processedTrophies.length;
  const overallPercentage = Math.round((unlockedCount / totalCount) * 100);
  const literaryRank = getLiteraryRank(unlockedCount);

  // Closest locked achievement
  const closestLockedTrophy = useMemo(() => {
    const locked = processedTrophies.filter(t => !t.unlocked);
    if (locked.length === 0) return null;
    return [...locked].sort((a, b) => b.progress - a.progress)[0];
  }, [processedTrophies]);

  // Filtered trophies list
  const filteredTrophies = useMemo(() => {
    return processedTrophies.filter(item => {
      // Status filter
      if (statusFilter === 'unlocked' && !item.unlocked) return false;
      if (statusFilter === 'in_progress' && item.unlocked) return false;

      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      return true;
    });
  }, [processedTrophies, statusFilter, categoryFilter]);

  // Render Icon helper
  const renderIcon = (type: TrophyDefinition['iconType']) => {
    switch (type) {
      case 'Shield': return <Shield className="w-8 h-8" />;
      case 'Medal': return <Medal className="w-8 h-8" />;
      case 'Trophy': return <Trophy className="w-8 h-8" />;
      case 'Crown': return <Crown className="w-8 h-8" />;
      case 'Flame': return <Flame className="w-8 h-8" />;
      case 'Moon': return <Moon className="w-8 h-8" />;
      case 'Sun': return <Sun className="w-8 h-8" />;
      case 'BookOpen': return <BookOpen className="w-8 h-8" />;
      case 'Zap': return <Zap className="w-8 h-8" />;
      default: return <Trophy className="w-8 h-8" />;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. HERO BANNER DE PROGRESSO GERAL & RANK LITERÁRIO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white p-6 sm:p-8 shadow-2xl border border-purple-500/20">
        {/* Glow ambient background elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Left Column: Literary Title & Overall Progress */}
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-purple-200 text-xs font-bold backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>{literaryRank.badge}</span>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span>{literaryRank.icon}</span>
                <span>{literaryRank.title}</span>
              </h2>
              <p className="text-sm sm:text-base text-purple-200/90 mt-1 leading-relaxed">
                {literaryRank.description}
              </p>
            </div>

            {/* Overall Progress Bar */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-300">Progresso Geral das Conquistas</span>
                <span className="text-purple-300 font-extrabold">
                  {unlockedCount} de {totalCount} ({overallPercentage}%)
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 p-0.5 overflow-hidden backdrop-blur-sm border border-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 transition-all duration-1000 shadow-md shadow-purple-500/50"
                  style={{ width: `${overallPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Mini-Card "Próxima Conquista Mais Próxima" */}
          <div className="lg:max-w-sm w-full">
            {closestLockedTrophy ? (
              <div className="bg-white/10 backdrop-blur-md border border-purple-300/25 p-5 rounded-3xl shadow-xl space-y-3 relative overflow-hidden group hover:border-purple-300/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    <span>Mais Próxima de Desbloquear</span>
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {Math.round(closestLockedTrophy.progress)}%
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
                    {renderIcon(closestLockedTrophy.iconType)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-white text-base truncate">
                      {closestLockedTrophy.title}
                    </h4>
                    <p className="text-xs text-purple-200/80 truncate">
                      {closestLockedTrophy.description}
                    </p>
                  </div>
                </div>

                {/* Mini progress tracker */}
                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 to-purple-400 transition-all duration-700"
                      style={{ width: `${closestLockedTrophy.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>{closestLockedTrophy.currentValue.toLocaleString('pt-BR')} / {closestLockedTrophy.threshold.toLocaleString('pt-BR')}</span>
                    <span className="text-amber-300 font-bold">
                      Falta apenas {closestLockedTrophy.deficit.toLocaleString('pt-BR')} {closestLockedTrophy.unit}!
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md border border-amber-300/30 p-5 rounded-3xl shadow-xl text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-2xl">
                  🏆
                </div>
                <h4 className="font-black text-white text-base">Coleção Completa!</h4>
                <p className="text-xs text-purple-200">
                  Você desbloqueou todos os troféus literários. Uma verdadeira lenda viva da escrita!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. FILTROS RÁPIDOS E CATEGORIZAÇÃO */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unlocked')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'unlocked'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Conquistadas</span>
              <span className="text-[10px] bg-purple-700/30 px-1.5 py-0.5 rounded-full">{unlockedCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('in_progress')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'in_progress'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Em Progresso</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full">{totalCount - unlockedCount}</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: 'Todas as Categorias', icon: '✨' },
              { id: 'daily', label: 'Ritmo Diário', icon: '⚡' },
              { id: 'streak', label: 'Consistência (Ofensiva)', icon: '🔥' },
              { id: 'marathon', label: 'Maratonas & Volume', icon: '🏃‍♂️' },
              { id: 'special', label: 'Especiais', icon: '🌟' }
            ].map(cat => {
              const isSelected = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. GRID DE CARDS GAMIFICADOS */}
      {filteredTrophies.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTrophies.map(trophy => {
            const rarity = RARITY_CONFIG[trophy.rarity];
            const isUnlocked = trophy.unlocked;

            return (
              <div
                key={trophy.id}
                className={`relative overflow-hidden rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 border-2 ${
                  isUnlocked
                    ? `bg-white ${rarity.borderColor} ${rarity.glowColor} shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1`
                    : 'bg-slate-50/90 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-md'
                }`}
              >
                {/* Subtle top gradient aura for unlocked */}
                {isUnlocked && (
                  <div
                    className={`absolute top-0 left-0 right-0 h-28 bg-gradient-to-b ${rarity.gradientBg} pointer-events-none opacity-40`}
                  />
                )}

                <div className="relative z-10">
                  {/* Top Header: Rarity & Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                      {rarity.badge}
                    </span>

                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Conquistado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                        <Lock className="w-2.5 h-2.5" />
                        <span>{Math.round(trophy.progress)}%</span>
                      </span>
                    )}
                  </div>

                  {/* Icon Circle */}
                  <div className="flex items-center justify-center my-2">
                    <div
                      className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 ${
                        isUnlocked
                          ? `${rarity.iconBg} shadow-slate-300`
                          : 'bg-slate-200 text-slate-400 grayscale opacity-60'
                      }`}
                    >
                      {renderIcon(trophy.iconType)}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="text-center mt-3 space-y-1">
                    <h3 className={`font-black text-lg ${isUnlocked ? 'text-slate-800' : 'text-slate-600'}`}>
                      {trophy.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed min-h-[32px]">
                      {trophy.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Area: Progress or Done */}
                <div className="mt-5 pt-4 border-t border-slate-100/90 relative z-10">
                  {isUnlocked ? (
                    <div className="text-center space-y-0.5">
                      <span className="text-[11px] font-bold text-emerald-600 block">
                        Meta Atingida com Sucesso! 🎉
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Marca: {trophy.currentValue.toLocaleString('pt-BR')} / {trophy.threshold.toLocaleString('pt-BR')} {trophy.unit}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline text-[11px] font-bold text-slate-600">
                        <span>Progresso</span>
                        <span className="font-extrabold text-slate-800">
                          {trophy.currentValue.toLocaleString('pt-BR')} / {trophy.threshold.toLocaleString('pt-BR')}
                        </span>
                      </div>

                      {/* Colorful Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${rarity.progressBar} transition-all duration-700 shadow-xs`}
                          style={{ width: `${trophy.progress}%` }}
                        />
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-medium">
                          Faltam {trophy.deficit.toLocaleString('pt-BR')} {trophy.unit}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-slate-400 text-sm bg-white rounded-3xl border border-dashed border-slate-200">
          Nenhuma conquista encontrada para este filtro.
        </div>
      )}
    </div>
  );
};
