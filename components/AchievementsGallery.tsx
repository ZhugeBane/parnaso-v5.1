import React, { useState, useMemo, useEffect } from 'react';
import { WritingSession, Project, User, EquippedBadge, AchievementUnlockRecord } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { updateUserEquippedBadges, syncUserAchievements } from '../services/authService';
import {
  Trophy,
  Medal,
  Crown,
  Flame,
  Shield,
  Sparkles,
  Zap,
  Target,
  Moon,
  Sun,
  BookOpen,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Award,
  Check,
  Pin
} from 'lucide-react';

export type TrophyRarity = 'bronze' | 'silver' | 'gold' | 'diamond';
export type TrophyCycle = 'weekly' | 'monthly' | 'semiannual' | 'annual';

interface TrophyDefinition {
  id: string;
  category: TrophyCycle;
  threshold: number;
  unit: string;
  rarity: TrophyRarity;
  iconType: 'Shield' | 'Medal' | 'Trophy' | 'Crown' | 'Flame' | 'Moon' | 'Sun' | 'BookOpen' | 'Zap';
  emojiIcon: string;
}

interface AchievementsGalleryProps {
  sessions: WritingSession[];
  projects: Project[];
  totalWords: number;
  user?: User | null;
  onUpdateUser?: (updated: User) => void;
}

const TROPHY_DEFINITIONS: TrophyDefinition[] = [
  // --- SEMANAIS (WEEKLY) ---
  { id: 'weekly_3000', category: 'weekly', threshold: 3000, unit: 'palavras na semana', rarity: 'silver', iconType: 'Medal', emojiIcon: '🥈' },
  { id: 'weekly_7000', category: 'weekly', threshold: 7000, unit: 'palavras na semana', rarity: 'gold', iconType: 'Medal', emojiIcon: '🥇' },
  { id: 'streak_3', category: 'weekly', threshold: 3, unit: 'dias seguidos', rarity: 'bronze', iconType: 'Flame', emojiIcon: '🔥' },
  { id: 'streak_7', category: 'weekly', threshold: 7, unit: 'dias seguidos', rarity: 'silver', iconType: 'Flame', emojiIcon: '⚡' },

  // --- MENSAIS (MONTHLY) ---
  { id: 'monthly_10000', category: 'monthly', threshold: 10000, unit: 'palavras no mês', rarity: 'gold', iconType: 'Trophy', emojiIcon: '🏆' },
  { id: 'monthly_30000', category: 'monthly', threshold: 30000, unit: 'palavras no mês', rarity: 'diamond', iconType: 'Trophy', emojiIcon: '💎' },
  { id: 'monthly_constancia_20', category: 'monthly', threshold: 20, unit: 'dias escritos no mês', rarity: 'gold', iconType: 'Moon', emojiIcon: '🌙' },

  // --- SEMESTRAIS (SEMIANNUAL) ---
  { id: 'semester_50000', category: 'semiannual', threshold: 50000, unit: 'palavras no semestre', rarity: 'diamond', iconType: 'Crown', emojiIcon: '👑' },
  { id: 'semester_sessions_60', category: 'semiannual', threshold: 60, unit: 'sessões no semestre', rarity: 'gold', iconType: 'Zap', emojiIcon: '📜' },

  // --- ANUAIS / VITALÍCIAS (ANNUAL) ---
  { id: 'annual_100000', category: 'annual', threshold: 100000, unit: 'palavras no ano', rarity: 'diamond', iconType: 'Crown', emojiIcon: '👑' },
  { id: 'annual_sessions_200', category: 'annual', threshold: 200, unit: 'sessões no ano', rarity: 'diamond', iconType: 'Trophy', emojiIcon: '🏛️' },
  { id: 'daily_500', category: 'annual', threshold: 500, unit: 'palavras em 1 dia', rarity: 'bronze', iconType: 'Shield', emojiIcon: '🛡️' },
  { id: 'daily_1000', category: 'annual', threshold: 1000, unit: 'palavras em 1 dia', rarity: 'silver', iconType: 'Shield', emojiIcon: '⚔️' },
  { id: 'daily_2000', category: 'annual', threshold: 2000, unit: 'palavras em 1 dia', rarity: 'gold', iconType: 'Shield', emojiIcon: '🌟' },
  { id: 'total_50000', category: 'annual', threshold: 50000, unit: 'palavras no total', rarity: 'diamond', iconType: 'Crown', emojiIcon: '📚' },
  { id: 'total_100000', category: 'annual', threshold: 100000, unit: 'palavras no total', rarity: 'diamond', iconType: 'Crown', emojiIcon: '🪐' },
  { id: 'night_owl', category: 'annual', threshold: 1, unit: 'sessão noturna', rarity: 'bronze', iconType: 'Moon', emojiIcon: '🦉' },
  { id: 'early_bird', category: 'annual', threshold: 1, unit: 'sessão matinal', rarity: 'bronze', iconType: 'Sun', emojiIcon: '🌅' },
  { id: 'world_builder', category: 'annual', threshold: 3, unit: 'obras criadas', rarity: 'silver', iconType: 'BookOpen', emojiIcon: '🗺️' },
  { id: 'phoenix', category: 'annual', threshold: 1, unit: 'retorno após pausa', rarity: 'gold', iconType: 'Zap', emojiIcon: '🔥' },
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
  if (unlockedCount <= 13) {
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
  totalWords,
  user,
  onUpdateUser
}) => {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'in_progress'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0);
  const [isEquipping, setIsEquipping] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Process all sessions chronologically to evaluate recurring cycles
  const evaluatedAchievements = useMemo(() => {
    // Maps for aggregation
    const dailyWordsMap = new Map<string, number>();
    const dailySessionsMap = new Map<string, WritingSession[]>();
    const weeklyWordsMap = new Map<string, number>();
    const monthlyWordsMap = new Map<string, number>();
    const monthlyDaysMap = new Map<string, Set<string>>();
    const semesterWordsMap = new Map<string, number>();
    const semesterSessionsMap = new Map<string, number>();
    const annualWordsMap = new Map<string, number>();
    const annualSessionsMap = new Map<string, number>();

    // Helper for week key (ISO format: YYYY-Www)
    const getWeekKey = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    // Helper for semester key: YYYY-S1 or YYYY-S2
    const getSemesterKey = (date: Date) => {
      const year = date.getFullYear();
      const semester = date.getMonth() < 6 ? 'S1' : 'S2';
      return `${year}-${semester}`;
    };

    let nightSessionsCount = 0;
    let earlySessionsCount = 0;

    sessions.forEach(s => {
      const sessionDate = new Date(s.date);
      const dateStr = sessionDate.toLocaleDateString('en-CA');
      const monthKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
      const weekKey = getWeekKey(sessionDate);
      const semesterKey = getSemesterKey(sessionDate);
      const yearKey = String(sessionDate.getFullYear());

      // Daily
      dailyWordsMap.set(dateStr, (dailyWordsMap.get(dateStr) || 0) + (s.wordCount || 0));
      if (!dailySessionsMap.has(dateStr)) dailySessionsMap.set(dateStr, []);
      dailySessionsMap.get(dateStr)!.push(s);

      // Weekly
      weeklyWordsMap.set(weekKey, (weeklyWordsMap.get(weekKey) || 0) + (s.wordCount || 0));

      // Monthly
      monthlyWordsMap.set(monthKey, (monthlyWordsMap.get(monthKey) || 0) + (s.wordCount || 0));
      if (!monthlyDaysMap.has(monthKey)) monthlyDaysMap.set(monthKey, new Set<string>());
      monthlyDaysMap.get(monthKey)!.add(dateStr);

      // Semiannual
      semesterWordsMap.set(semesterKey, (semesterWordsMap.get(semesterKey) || 0) + (s.wordCount || 0));
      semesterSessionsMap.set(semesterKey, (semesterSessionsMap.get(semesterKey) || 0) + 1);

      // Annual
      annualWordsMap.set(yearKey, (annualWordsMap.get(yearKey) || 0) + (s.wordCount || 0));
      annualSessionsMap.set(yearKey, (annualSessionsMap.get(yearKey) || 0) + 1);

      // Night / Early check
      let hour = -1;
      if (s.startTime) {
        hour = parseInt(s.startTime.split(':')[0], 10);
      } else {
        hour = sessionDate.getHours();
      }
      if (!isNaN(hour)) {
        if (hour >= 22 || hour < 4) nightSessionsCount++;
        if (hour >= 4 && hour < 8) earlySessionsCount++;
      }
    });

    // Max Historical Streak & 3/7 days streak occurrences
    const sortedDates = Array.from(dailyWordsMap.keys()).sort().map(d => new Date(d));
    let currentStreak = 0;
    let maxHistoricalStreak = 0;
    let streak3Count = 0;
    let streak7Count = 0;

    if (sortedDates.length > 0) {
      currentStreak = 1;
      maxHistoricalStreak = 1;
      if (currentStreak >= 3) streak3Count++;
      if (currentStreak >= 7) streak7Count++;

      for (let i = 0; i < sortedDates.length - 1; i++) {
        const curr = sortedDates[i].getTime();
        const next = sortedDates[i + 1].getTime();
        const diffDays = Math.round(Math.abs((next - curr) / 86400000));
        if (diffDays === 1) {
          currentStreak++;
          if (currentStreak === 3) streak3Count++;
          if (currentStreak === 7) streak7Count++;
        } else {
          currentStreak = 1;
        }
        if (currentStreak > maxHistoricalStreak) maxHistoricalStreak = currentStreak;
      }
    }

    // Phoenix detection (break of 5+ days then resumed)
    let hasPhoenix = 0;
    if (sortedDates.length >= 2) {
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const diffDays = Math.round(Math.abs((sortedDates[i].getTime() - sortedDates[i + 1].getTime()) / 86400000));
        if (diffDays >= 5) {
          hasPhoenix = 1;
          break;
        }
      }
    }

    // History map of unlock events grouped by period (monthKey -> record[])
    const historyUnlockMap = new Map<string, AchievementUnlockRecord[]>();
    const addUnlockEvent = (rec: AchievementUnlockRecord) => {
      const list = historyUnlockMap.get(rec.periodKey) || [];
      list.push(rec);
      historyUnlockMap.set(rec.periodKey, list);
    };

    // Calculate details for each definition
    const processed = TROPHY_DEFINITIONS.map(def => {
      let currentValue = 0;
      let collectionCount = 0;
      let latestUnlockDate: string | undefined = undefined;

      switch (def.id) {
        // --- WEEKLY CYCLES ---
        case 'weekly_3000': {
          let qualifyingWeeks = 0;
          weeklyWordsMap.forEach((words) => {
            if (words >= 3000) qualifyingWeeks++;
          });
          collectionCount = qualifyingWeeks;
          currentValue = Math.max(0, ...Array.from(weeklyWordsMap.values()));
          break;
        }
        case 'weekly_7000': {
          let qualifyingWeeks = 0;
          weeklyWordsMap.forEach((words) => {
            if (words >= 7000) qualifyingWeeks++;
          });
          collectionCount = qualifyingWeeks;
          currentValue = Math.max(0, ...Array.from(weeklyWordsMap.values()));
          break;
        }
        case 'streak_3': {
          collectionCount = streak3Count;
          currentValue = maxHistoricalStreak;
          break;
        }
        case 'streak_7': {
          collectionCount = streak7Count;
          currentValue = maxHistoricalStreak;
          break;
        }

        // --- MONTHLY CYCLES ---
        case 'monthly_10000': {
          let qualifyingMonths = 0;
          monthlyWordsMap.forEach((words, mKey) => {
            if (words >= 10000) {
              qualifyingMonths++;
              addUnlockEvent({ id: def.id, periodKey: mKey, count: 1, unlockedAt: `${mKey}-28` });
            }
          });
          collectionCount = qualifyingMonths;
          currentValue = Math.max(0, ...Array.from(monthlyWordsMap.values()));
          break;
        }
        case 'monthly_30000': {
          let qualifyingMonths = 0;
          monthlyWordsMap.forEach((words, mKey) => {
            if (words >= 30000) {
              qualifyingMonths++;
              addUnlockEvent({ id: def.id, periodKey: mKey, count: 1, unlockedAt: `${mKey}-28` });
            }
          });
          collectionCount = qualifyingMonths;
          currentValue = Math.max(0, ...Array.from(monthlyWordsMap.values()));
          break;
        }
        case 'monthly_constancia_20': {
          let qualifyingMonths = 0;
          let maxDaysInAnyMonth = 0;
          monthlyDaysMap.forEach((daysSet, mKey) => {
            if (daysSet.size > maxDaysInAnyMonth) maxDaysInAnyMonth = daysSet.size;
            if (daysSet.size >= 20) {
              qualifyingMonths++;
              addUnlockEvent({ id: def.id, periodKey: mKey, count: 1, unlockedAt: `${mKey}-25` });
            }
          });
          collectionCount = qualifyingMonths;
          currentValue = maxDaysInAnyMonth;
          break;
        }

        // --- SEMESTER CYCLES ---
        case 'semester_50000': {
          let qualifyingSemesters = 0;
          semesterWordsMap.forEach((words) => {
            if (words >= 50000) qualifyingSemesters++;
          });
          collectionCount = qualifyingSemesters;
          currentValue = Math.max(0, ...Array.from(semesterWordsMap.values()));
          break;
        }
        case 'semester_sessions_60': {
          let qualifyingSemesters = 0;
          semesterSessionsMap.forEach((cnt) => {
            if (cnt >= 60) qualifyingSemesters++;
          });
          collectionCount = qualifyingSemesters;
          currentValue = Math.max(0, ...Array.from(semesterSessionsMap.values()));
          break;
        }

        // --- ANNUAL & LIFETIME CYCLES ---
        case 'annual_100000': {
          let qualifyingYears = 0;
          annualWordsMap.forEach((words) => {
            if (words >= 100000) qualifyingYears++;
          });
          collectionCount = qualifyingYears;
          currentValue = Math.max(0, ...Array.from(annualWordsMap.values()));
          break;
        }
        case 'annual_sessions_200': {
          let qualifyingYears = 0;
          annualSessionsMap.forEach((cnt) => {
            if (cnt >= 200) qualifyingYears++;
          });
          collectionCount = qualifyingYears;
          currentValue = Math.max(0, ...Array.from(annualSessionsMap.values()));
          break;
        }
        case 'daily_500': {
          let daysCount = 0;
          dailyWordsMap.forEach((w) => { if (w >= 500) daysCount++; });
          collectionCount = daysCount;
          currentValue = Math.max(0, ...Array.from(dailyWordsMap.values()));
          break;
        }
        case 'daily_1000': {
          let daysCount = 0;
          dailyWordsMap.forEach((w) => { if (w >= 1000) daysCount++; });
          collectionCount = daysCount;
          currentValue = Math.max(0, ...Array.from(dailyWordsMap.values()));
          break;
        }
        case 'daily_2000': {
          let daysCount = 0;
          dailyWordsMap.forEach((w) => { if (w >= 2000) daysCount++; });
          collectionCount = daysCount;
          currentValue = Math.max(0, ...Array.from(dailyWordsMap.values()));
          break;
        }
        case 'total_50000':
        case 'total_100000': {
          currentValue = totalWords;
          collectionCount = totalWords >= def.threshold ? 1 : 0;
          break;
        }
        case 'night_owl': {
          currentValue = nightSessionsCount;
          collectionCount = nightSessionsCount;
          break;
        }
        case 'early_bird': {
          currentValue = earlySessionsCount;
          collectionCount = earlySessionsCount;
          break;
        }
        case 'world_builder': {
          currentValue = projects.length;
          collectionCount = projects.length >= 3 ? 1 : 0;
          break;
        }
        case 'phoenix': {
          currentValue = hasPhoenix;
          collectionCount = hasPhoenix;
          break;
        }
        default:
          currentValue = 0;
          collectionCount = 0;
      }

      const unlocked = collectionCount > 0 || currentValue >= def.threshold;
      const progress = Math.min(100, (currentValue / def.threshold) * 100);
      const deficit = Math.max(0, def.threshold - currentValue);

      // Latest session timestamp fallback if unlocked
      if (unlocked && sessions.length > 0) {
        latestUnlockDate = sessions[sessions.length - 1].date;
      }

      return {
        ...def,
        currentValue,
        collectionCount: Math.max(collectionCount, unlocked ? 1 : 0),
        unlocked,
        progress,
        deficit,
        latestUnlockDate,
        title: t(`trophies.${def.id}.title`) || def.id,
        description: t(`trophies.${def.id}.description`) || ''
      };
    });

    return { processed, historyUnlockMap };
  }, [sessions, projects, totalWords, t]);

  const { processed: processedTrophies, historyUnlockMap } = evaluatedAchievements;

  // Sync unlock history to Firestore if user doc is available
  useEffect(() => {
    if (!user?.id) return;
    const allRecords: AchievementUnlockRecord[] = [];
    historyUnlockMap.forEach((records) => {
      allRecords.push(...records);
    });
    // Check if we need to sync (length difference or empty)
    if (allRecords.length > 0 && (!user.achievementHistory || user.achievementHistory.length < allRecords.length)) {
      syncUserAchievements(user.id, allRecords);
    }
  }, [user?.id, historyUnlockMap, user?.achievementHistory]);

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

  // Equipped badges state from user
  const equippedBadges: EquippedBadge[] = useMemo(() => {
    return Array.isArray(user?.equippedBadges) ? user.equippedBadges.slice(0, 2) : [];
  }, [user?.equippedBadges]);

  const isBadgeEquipped = (trophyId: string) => {
    return equippedBadges.some(b => b.id === trophyId);
  };

  // Toggle Equip / Unequip Badge
  const handleToggleEquip = async (trophy: typeof processedTrophies[0]) => {
    if (!user?.id) {
      alert('Você precisa estar logado para equipar insígnias.');
      return;
    }

    try {
      setIsEquipping(trophy.id);
      let updatedBadges: EquippedBadge[] = [...equippedBadges];

      if (isBadgeEquipped(trophy.id)) {
        // Unequip
        updatedBadges = updatedBadges.filter(b => b.id !== trophy.id);
        await updateUserEquippedBadges(user.id, updatedBadges);
        if (onUpdateUser) onUpdateUser({ ...user, equippedBadges: updatedBadges });
        showToast(`Insígnia "${trophy.title}" removida do seu perfil.`);
      } else {
        // Equip (max 2)
        const newBadge: EquippedBadge = {
          id: trophy.id,
          title: trophy.title,
          icon: trophy.emojiIcon,
          rarity: trophy.rarity,
          description: trophy.description,
          unlockedAt: trophy.latestUnlockDate || new Date().toISOString(),
          count: trophy.collectionCount
        };

        if (updatedBadges.length >= 2) {
          // Replace the oldest (index 0)
          updatedBadges = [updatedBadges[1], newBadge];
          showToast(`Insígnia equipada! (Substituiu a mais antiga para manter o limite de 2).`);
        } else {
          updatedBadges.push(newBadge);
          showToast(`Insígnia "${trophy.title}" equipada no seu perfil! ✨`);
        }

        await updateUserEquippedBadges(user.id, updatedBadges);
        if (onUpdateUser) onUpdateUser({ ...user, equippedBadges: updatedBadges });
      }
    } catch (e) {
      console.error('Erro ao equipar insígnia:', e);
      alert('Não foi possível atualizar a insígnia. Tente novamente.');
    } finally {
      setIsEquipping(null);
    }
  };

  // Monthly Showcase Stepper logic
  const currentTargetMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + selectedMonthOffset);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
    return { key, label: capitalizedLabel, year, month };
  }, [selectedMonthOffset]);

  // Trophies unlocked in current selected month
  const monthlyShowcaseTrophies = useMemo(() => {
    const records = historyUnlockMap.get(currentTargetMonth.key) || [];
    const unlockedIds = new Set(records.map(r => r.id));

    // Also include any trophy whose latestUnlockDate falls in this month
    return processedTrophies.filter(trophy => {
      if (!trophy.unlocked) return false;
      if (unlockedIds.has(trophy.id)) return true;
      if (trophy.latestUnlockDate) {
        const d = new Date(trophy.latestUnlockDate);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return k === currentTargetMonth.key;
      }
      return false;
    });
  }, [historyUnlockMap, currentTargetMonth.key, processedTrophies]);

  // Filtered trophies list for standard catalog
  const filteredTrophies = useMemo(() => {
    return processedTrophies.filter(item => {
      if (statusFilter === 'unlocked' && !item.unlocked) return false;
      if (statusFilter === 'in_progress' && item.unlocked) return false;
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-purple-500/40 text-xs font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. HERO BANNER DE PROGRESSO GERAL & RANK LITERÁRIO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white p-6 sm:p-8 shadow-2xl border border-purple-500/20">
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

            {/* Equipped Badges Preview Pill Container */}
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-purple-200/80 font-bold flex items-center gap-1">
                <Pin className="w-3.5 h-3.5 text-purple-300" />
                <span>Insígnias no Perfil ({equippedBadges.length}/2):</span>
              </span>
              {equippedBadges.length > 0 ? (
                equippedBadges.map((badge, idx) => (
                  <span
                    key={badge.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/15 border border-purple-300/40 text-purple-100 shadow-sm backdrop-blur-md"
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.title}</span>
                    <span className="text-[10px] text-purple-300 font-bold">#{idx + 1}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs italic text-purple-300/60">
                  Nenhuma insígnia equipada. Clique em "Exibir Insígnia" em qualquer conquista desbloqueada!
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Closest Locked Trophy */}
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
                  <div className="flex justify-between items-center text-[10px] text-purple-200/80 font-bold">
                    <span>
                      {closestLockedTrophy.currentValue.toLocaleString('pt-BR')} / {closestLockedTrophy.threshold.toLocaleString('pt-BR')} {closestLockedTrophy.unit}
                    </span>
                    <span className="text-amber-300">
                      Faltam {closestLockedTrophy.deficit.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md border border-amber-300/30 p-6 rounded-3xl shadow-xl text-center space-y-2">
                <Award className="w-12 h-12 text-amber-300 mx-auto animate-bounce" />
                <h4 className="text-lg font-black text-white">Todas as Conquistas Concluídas!</h4>
                <p className="text-xs text-purple-200">Você é um verdadeiro Mestre do Parnaso.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. TABS & CONTROLS: CATEGORIAS TEMPORAIS & HISTÓRICO */}
      <div className="space-y-4">
        {/* Main Cycle Categories Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'Todas as Conquistas', icon: '✨' },
            { id: 'weekly', label: 'Semanais', icon: '⚡' },
            { id: 'monthly', label: 'Mensais', icon: '🌙' },
            { id: 'semiannual', label: 'Semestrais', icon: '🛡️' },
            { id: 'annual', label: 'Anuais / Vitalícias', icon: '👑' },
            { id: 'monthly_shelf', label: 'Estante Mensal', icon: '🏛️' }
          ].map(tab => {
            const isSelected = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 shadow-2xs ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-105'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filter Row (Only when not in monthly shelf) */}
        {categoryFilter !== 'monthly_shelf' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-2xs border border-slate-200/60">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'unlocked'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Conquistadas</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">{unlockedCount}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('in_progress')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'in_progress'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Em Progresso</span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">{totalCount - unlockedCount}</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-semibold px-2">
              💡 Conquistas cíclicas podem ser obtidas múltiplas vezes (<span className="text-purple-600 font-bold">x2, x3...</span>)
            </div>
          </div>
        )}
      </div>

      {/* 3. VIEW MODE A: ESTANTE DE TROFÉUS MENSAL */}
      {categoryFilter === 'monthly_shelf' ? (
        <div className="space-y-6">
          {/* Month Stepper Header */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span>🏛️</span>
                <span>Estante de Troféus Mensal</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Navegue pelos meses para ver quais insígnias e marcos você conquistou em cada período
              </p>
            </div>

            {/* Stepper Selector */}
            <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedMonthOffset(prev => prev - 1)}
                className="p-2 rounded-xl hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="min-w-[160px] text-center">
                <span className="text-sm font-extrabold text-slate-800 flex items-center justify-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>{currentTargetMonth.label}</span>
                </span>
              </div>
              <button
                type="button"
                disabled={selectedMonthOffset >= 0}
                onClick={() => setSelectedMonthOffset(prev => Math.min(0, prev + 1))}
                className="p-2 rounded-xl hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Próximo mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Month's Unlocked Showcase Grid */}
          {monthlyShowcaseTrophies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {monthlyShowcaseTrophies.map(trophy => {
                const rarity = RARITY_CONFIG[trophy.rarity];
                const equipped = isBadgeEquipped(trophy.id);

                return (
                  <div
                    key={trophy.id}
                    className={`relative overflow-hidden rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 border-2 bg-white ${rarity.borderColor} ${rarity.glowColor} shadow-lg hover:shadow-2xl hover:scale-[1.02]`}
                  >
                    <div className="relative z-10">
                      {/* Top Header: Badge & Multiplier */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                          {rarity.badge}
                        </span>

                        {trophy.collectionCount > 1 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
                            Colecionada x{trophy.collectionCount}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Conquistada</span>
                          </span>
                        )}
                      </div>

                      {/* Icon Circle */}
                      <div className="flex items-center justify-center my-3">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg ${rarity.iconBg}`}>
                          {renderIcon(trophy.iconType)}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="text-center mt-3 space-y-1">
                        <h3 className="font-black text-lg text-slate-800">
                          {trophy.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed min-h-[32px]">
                          {trophy.description}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action: Equip / Unequip Badge */}
                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-3 relative z-10">
                      <div className="text-center text-[11px] text-slate-400 font-medium">
                        Meta atingida em {currentTargetMonth.label}
                      </div>

                      <button
                        type="button"
                        disabled={isEquipping === trophy.id}
                        onClick={() => handleToggleEquip(trophy)}
                        className={`w-full py-2.5 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                          equipped
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/30 ring-2 ring-purple-400'
                            : 'bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        {equipped ? (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                            <span>✨ Em Exibição no Perfil</span>
                          </>
                        ) : (
                          <>
                            <Pin className="w-4 h-4 text-slate-400" />
                            <span>📌 Exibir Insígnia</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-2xl">
                🏛️
              </div>
              <h4 className="text-base font-bold text-slate-700">
                Nenhuma insígnia conquistada em {currentTargetMonth.label}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Continue escrevendo e registrando suas sessões para preencher esta estante literária de marcos!
              </p>
            </div>
          )}
        </div>
      ) : (
        /* 4. VIEW MODE B: CATÁLOGO PADRÃO DE CARDS */
        filteredTrophies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTrophies.map(trophy => {
              const rarity = RARITY_CONFIG[trophy.rarity];
              const isUnlocked = trophy.unlocked;
              const equipped = isBadgeEquipped(trophy.id);

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
                    {/* Top Header: Rarity & Multiplier / Progress */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                        {rarity.badge}
                      </span>

                      {isUnlocked ? (
                        trophy.collectionCount > 1 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                            Colecionada x{trophy.collectionCount}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Conquistada</span>
                          </span>
                        )
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

                  {/* Bottom Area: Progress or Done + Equip Button */}
                  <div className="mt-5 pt-4 border-t border-slate-100/90 relative z-10 space-y-3">
                    {isUnlocked ? (
                      <>
                        <div className="text-center space-y-0.5">
                          <span className="text-[11px] font-bold text-emerald-600 block">
                            Meta Atingida com Sucesso! 🎉
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {trophy.collectionCount > 1
                              ? `Conquistada ${trophy.collectionCount} vezes ao longo dos ciclos`
                              : `Marca: ${trophy.currentValue.toLocaleString('pt-BR')} / ${trophy.threshold.toLocaleString('pt-BR')} ${trophy.unit}`}
                          </span>
                        </div>

                        {/* Equip Button for Unlocked Badge */}
                        <button
                          type="button"
                          disabled={isEquipping === trophy.id}
                          onClick={() => handleToggleEquip(trophy)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                            equipped
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-500/25 ring-2 ring-purple-400'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 hover:border-purple-300'
                          }`}
                        >
                          {equipped ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                              <span>✨ Em Exibição (1/2)</span>
                            </>
                          ) : (
                            <>
                              <Pin className="w-3.5 h-3.5 text-purple-600" />
                              <span>📌 Exibir Insígnia</span>
                            </>
                          )}
                        </button>
                      </>
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
        )
      )}
    </div>
  );
};
