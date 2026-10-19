import { UserReward, ClaimedReward, WritingSession } from '../types';
import { db } from '../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { sanitizeMetricNumber, sanitizeText } from '../utils/cryptoUtils';

// Local storage key helpers
const getLocalRewardsKey = (userId: string) => `parnaso_rewards_${userId}`;
const getLocalClaimsKey = (userId: string) => `parnaso_claims_${userId}`;
const getLocalHestiusKey = (userId: string) => `parnaso_hestius_${userId}`;

// ==========================================
// 1. SCRIPTUS (Moeda de Volume de Palavras)
// Regra: 2 palavras escritas = 1 Scriptus
// ==========================================

export const wordsToScriptus = (words: number): number => {
  const safeWords = sanitizeMetricNumber(words, 0, 50000000, 0);
  return Math.max(0, Math.floor(safeWords / 2));
};

// Alias para compatibilidade retroativa total com código antigo
export const wordsToDiamonds = wordsToScriptus;

export const calculateTotalScriptus = (totalWords: number): number => {
  return wordsToScriptus(totalWords);
};

// ==========================================
// 2. KRONUS (Moeda de Tempo de Dedicação)
// Regra: 2 minutos de sessão = 1 Kronus
// ==========================================

/**
 * Calcula a duração em minutos de uma sessão a partir de startTime e endTime (HH:mm).
 * Trata viradas de meia-noite (ex: 23:30 às 00:30 = 60 min).
 * Aplica um teto saudável de segurança (máx. 240 min = 4 horas / 120 Kronus por sessão única).
 */
export const calculateSessionMinutes = (startTime?: string, endTime?: string): number => {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Sessão atravessou a meia-noite
  }

  const rawDiff = endMinutes - startMinutes;
  if (rawDiff <= 0) return 0;

  // Teto saudável de segurança: máx 240 minutos (4h) por sessão única
  return Math.min(240, rawDiff);
};

export const minutesToKronus = (minutes: number): number => {
  return Math.max(0, Math.floor(minutes / 2));
};

export const sessionToKronus = (startTime?: string, endTime?: string): number => {
  const mins = calculateSessionMinutes(startTime, endTime);
  return minutesToKronus(mins);
};

export const calculateTotalKronus = (sessions: WritingSession[]): number => {
  if (!Array.isArray(sessions) || sessions.length === 0) return 0;
  return sessions.reduce((acc, s) => acc + sessionToKronus(s.startTime, s.endTime), 0);
};

export const formatMinutesToHours = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(minutes || 0));
  if (safeMinutes === 0) return '0 min';
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
};

export const formatMinutesShort = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(minutes || 0));
  if (safeMinutes === 0) return '0 min';
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${String(remainingMinutes).padStart(2, '0')}m`;
};

// ==========================================
// 3. HESTIUS (Guardião da Chama / Bloqueio de Ofensiva)
// Regra: Máximo 3 cargas (0/3 a 3/3).
// Protege sequência se falhar 1 dia.
// ==========================================

export const HESTIUS_MAX = 3;
export const HESTIUS_REFILL_SCRIPTUS_COST = 100; // 100 Scriptus = 200 palavras
export const HESTIUS_REFILL_KRONUS_COST = 50;     // 50 Kronus = 100 minutos

export interface StreakEvaluationResult {
  currentStreak: number;
  isProtected: boolean;
  consumedHestius: number;
  effectiveHestius: number;
  protectedDates: string[];
  newlyConsumedDates: string[];
}

/**
 * Avalia a sequência atual (ofensiva) considerando o escudo de Hestius.
 * Se o usuário passar 1 dia inteiro sem registrar sessão, em vez de zerar a
 * sequência, o sistema consome automaticamente 1 Hestius para manter a chama acesa
 * e PRESERVA a sequência intacta (sem adicionar dias fantasmas de escrita).
 */
export const evaluateStreakWithHestius = (
  sessions: WritingSession[],
  userHestius: number = 1,
  alreadyProtectedDates: string[] = []
): StreakEvaluationResult => {
  const clampedHestius = Math.max(0, Math.min(HESTIUS_MAX, userHestius));

  if (!sessions || sessions.length === 0) {
    return {
      currentStreak: 0,
      isProtected: false,
      consumedHestius: 0,
      effectiveHestius: clampedHestius,
      protectedDates: [],
      newlyConsumedDates: []
    };
  }

  // Obter timestamps de dias únicos com sessões (YYYY-MM-DD no fuso local)
  const uniqueDateStrings = new Set<string>();
  for (const s of sessions) {
    if (s.date) {
      const d = new Date(s.date);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        uniqueDateStrings.add(`${y}-${m}-${day}`);
      }
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayKey = formatDateKey(today);
  const userWroteToday = uniqueDateStrings.has(todayKey);

  let currentStreak = 0;
  let availableHestius = clampedHestius;
  const protectedDates: string[] = [];
  const tentativeNewlyConsumed: string[] = [];

  // Se o usuário escreveu hoje, conta hoje como +1 na sequência
  if (userWroteToday) {
    currentStreak++;
  }

  // Começa a verificar os dias anteriores a partir de ontem
  let loopDate = new Date(today);
  loopDate.setDate(loopDate.getDate() - 1);

  // Itera dia a dia para trás
  const MAX_DAYS_LOOKBACK = 365;
  for (let i = 0; i < MAX_DAYS_LOOKBACK; i++) {
    const key = formatDateKey(loopDate);

    if (uniqueDateStrings.has(key)) {
      currentStreak++;
    } else if (alreadyProtectedDates.includes(key)) {
      // Dia já protegido anteriormente por um Hestius previamente consumido
      // Mantém a corrente intacta, mas NÃO incrementa o streak (não foi dia de escrita)
      protectedDates.push(key);
    } else {
      // Dia falhado e ainda não protegido!
      if (availableHestius > 0) {
        // Hestius tenta proteger esse dia
        availableHestius--;
        tentativeNewlyConsumed.push(key);
        // CRUCIAL: NÃO incrementa currentStreak! Preserva a corrente de escrita real sem inflar dias falsos.
      } else {
        // Sem Hestius suficiente -> a corrente se rompe
        break;
      }
    }

    // Retrocede 1 dia
    loopDate.setDate(loopDate.getDate() - 1);
  }

  // Validação: Hestius só é legitimamente consumido se houver uma sequência real mantida!
  // Se currentStreak for 0 (nenhum dia escrito encontrado), não se consome Hestius à toa.
  const hasRealStreak = currentStreak > 0;
  const newlyConsumedDates = hasRealStreak ? tentativeNewlyConsumed : [];
  const consumedHestius = newlyConsumedDates.length;
  const effectiveHestius = hasRealStreak ? availableHestius : clampedHestius;
  const isProtected = (protectedDates.length > 0 || newlyConsumedDates.length > 0) && hasRealStreak;

  return {
    currentStreak,
    isProtected,
    consumedHestius,
    effectiveHestius,
    protectedDates: [...protectedDates, ...newlyConsumedDates],
    newlyConsumedDates
  };
};

/**
 * Verifica se uma nova sessão ou sequência ativa engatilha recarga de Hestius.
 * Regra: A cada 2 dias seguidos de ofensiva real (escrevendo), o usuário
 * recarrega automaticamente +1 Hestius (respeitando o teto de 3).
 */
export const checkHestiusConsistencyRecharge = (
  currentStreak: number,
  lastRechargeDate?: string,
  currentHestius: number = 1
): { willRecharge: boolean; newHestiusCount: number } => {
  const safeHestius = Math.max(0, Math.min(HESTIUS_MAX, currentHestius));
  if (safeHestius >= HESTIUS_MAX) {
    return { willRecharge: false, newHestiusCount: safeHestius };
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  if (lastRechargeDate === todayKey) {
    return { willRecharge: false, newHestiusCount: safeHestius };
  }

  // Atingiu múltiplo de 2 na sequência (2, 4, 6...)
  if (currentStreak >= 2 && currentStreak % 2 === 0) {
    return {
      willRecharge: true,
      newHestiusCount: Math.min(HESTIUS_MAX, safeHestius + 1)
    };
  }

  return { willRecharge: false, newHestiusCount: safeHestius };
};

// ==========================================
// 4. BALANÇOS E CÁLCULOS GERAIS
// ==========================================

export const calculateBalances = (
  totalWords: number,
  sessions: WritingSession[],
  claims: ClaimedReward[]
) => {
  const totalEarnedScriptus = wordsToScriptus(totalWords);
  const totalEarnedKronus = calculateTotalKronus(sessions);

  const totalSpentScriptus = (claims || [])
    .filter(c => !c.currency || c.currency === 'scriptus')
    .reduce((acc, c) => acc + (c.cost || 0), 0);

  const totalSpentKronus = (claims || [])
    .filter(c => c.currency === 'kronus')
    .reduce((acc, c) => acc + (c.cost || 0), 0);

  const balanceScriptus = Math.max(0, totalEarnedScriptus - totalSpentScriptus);
  const balanceKronus = Math.max(0, totalEarnedKronus - totalSpentKronus);

  return {
    totalEarnedScriptus,
    totalSpentScriptus,
    balanceScriptus,
    totalEarnedKronus,
    totalSpentKronus,
    balanceKronus
  };
};

// ==========================================
// 5. RECOMPENSAS DA LOJA (SHOP & CLAIMS)
// ==========================================

export const DEFAULT_STARTER_REWARDS: Omit<UserReward, 'id' | 'userId' | 'createdAt'>[] = [
  {
    title: 'Comida favorita ou lanche especial',
    cost: 30, // 60 palavras
    currency: 'scriptus',
    description: 'Um docinho, café especial, pizza ou o seu prato preferido para comemorar!',
    icon: '🍕',
    category: 'comida'
  },
  {
    title: 'Assistir 1 episódio de série',
    cost: 50, // 100 palavras
    currency: 'scriptus',
    description: 'Relaxar e maratonar sem culpa!',
    icon: '🎬',
    category: 'lazer'
  },
  {
    title: 'Pausa de 30 min sem culpa',
    cost: 40, // 80 palavras
    currency: 'scriptus',
    description: 'Deitar, ouvir música ou caminhar com a cabeça fresca.',
    icon: '☕',
    category: 'descanso'
  },
  {
    title: 'Comprar um livro novo',
    cost: 300, // 600 palavras
    currency: 'scriptus',
    description: 'Aquele livro da sua lista de desejos que você sempre quis ler.',
    icon: '📚',
    category: 'compras'
  },
  {
    title: 'Dia livre de folga da escrita',
    cost: 500, // 1000 palavras
    currency: 'scriptus',
    description: 'Um dia inteiro dedicado apenas ao lazer e inspiração!',
    icon: '🏖️',
    category: 'descanso'
  }
];

const cleanDataForFirestore = (obj: any): any => {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    if (val !== undefined) {
      if (Array.isArray(val)) {
        acc[key] = val.map(item => (typeof item === 'object' && item !== null ? cleanDataForFirestore(item) : item));
      } else if (typeof val === 'object' && val !== null) {
        acc[key] = cleanDataForFirestore(val);
      } else {
        acc[key] = val;
      }
    }
    return acc;
  }, {} as any);
};

export const getUserRewards = async (userId: string): Promise<UserReward[]> => {
  if (!userId) return [];

  const localRaw = localStorage.getItem(getLocalRewardsKey(userId));
  let cached: UserReward[] = [];
  if (localRaw) {
    try {
      cached = JSON.parse(localRaw);
    } catch (e) {
      console.warn('Erro ao ler cache local de recompensas:', e);
    }
  }

  try {
    const q = query(
      collection(db, 'user_rewards'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const remoteRewards = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as UserReward[];

    if (remoteRewards.length === 0 && cached.length === 0) {
      const seeded: UserReward[] = [];
      const now = new Date().toISOString();
      for (const def of DEFAULT_STARTER_REWARDS) {
        const item: UserReward = {
          id: `seed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId,
          title: def.title,
          cost: def.cost,
          currency: def.currency || 'scriptus',
          description: def.description,
          icon: def.icon,
          category: def.category,
          createdAt: now
        };
        seeded.push(item);
      }
      localStorage.setItem(getLocalRewardsKey(userId), JSON.stringify(seeded));
      Promise.all(seeded.map(s => addDoc(collection(db, 'user_rewards'), cleanDataForFirestore(s)))).catch(() => {});
      return seeded;
    }

    if (remoteRewards.length > 0) {
      localStorage.setItem(getLocalRewardsKey(userId), JSON.stringify(remoteRewards));
      return remoteRewards;
    }
  } catch (err) {
    console.warn('Erro ao buscar recompensas do Firestore, usando cache local:', err);
  }

  return cached;
};

export const saveUserReward = async (
  userId: string,
  reward: Omit<UserReward, 'id' | 'userId' | 'createdAt'> & { id?: string; createdAt?: string }
): Promise<UserReward> => {
  const isNew = !reward.id;
  const id = reward.id || `rew_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = reward.createdAt || new Date().toISOString();

  const fullReward: UserReward = {
    id,
    userId,
    title: sanitizeText(reward.title, 100) || 'Recompensa',
    cost: sanitizeMetricNumber(reward.cost, 1, 1000000, 10),
    currency: reward.currency === 'kronus' ? 'kronus' : 'scriptus',
    description: sanitizeText(reward.description || '', 500),
    icon: reward.icon || '🎁',
    category: reward.category || 'outro',
    createdAt
  };

  const current = await getUserRewards(userId);
  const updated = isNew
    ? [fullReward, ...current]
    : current.map(r => (r.id === id ? fullReward : r));
  localStorage.setItem(getLocalRewardsKey(userId), JSON.stringify(updated));

  try {
    const cleanData = cleanDataForFirestore(fullReward);
    const docRef = doc(db, 'user_rewards', id);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (e) {
    console.warn('Erro ao salvar recompensa no Firestore (armazenado localmente):', e);
  }

  return fullReward;
};

export const deleteUserReward = async (userId: string, rewardId: string): Promise<void> => {
  const current = await getUserRewards(userId);
  const filtered = current.filter(r => r.id !== rewardId);
  localStorage.setItem(getLocalRewardsKey(userId), JSON.stringify(filtered));

  try {
    await deleteDoc(doc(db, 'user_rewards', rewardId));
  } catch (e) {
    console.warn('Erro ao excluir recompensa no Firestore:', e);
  }
};

export const getClaimedRewards = async (userId: string): Promise<ClaimedReward[]> => {
  if (!userId) return [];

  const localRaw = localStorage.getItem(getLocalClaimsKey(userId));
  let cached: ClaimedReward[] = [];
  if (localRaw) {
    try {
      cached = JSON.parse(localRaw);
    } catch (e) {
      console.warn('Erro ao ler histórico local de resgates:', e);
    }
  }

  try {
    const q = query(
      collection(db, 'user_reward_claims'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const remoteClaims = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as ClaimedReward[];

    if (remoteClaims.length > 0) {
      remoteClaims.sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime());
      localStorage.setItem(getLocalClaimsKey(userId), JSON.stringify(remoteClaims));
      return remoteClaims;
    }
  } catch (err) {
    console.warn('Erro ao buscar resgates do Firestore, usando cache:', err);
  }

  return cached.sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime());
};

export const claimReward = async (
  userId: string,
  reward: UserReward | { id: string; title: string; cost: number; currency?: 'scriptus' | 'kronus' },
  notes?: string
): Promise<ClaimedReward> => {
  const claimId = `claim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const claimedAt = new Date().toISOString();

  const claim: ClaimedReward = {
    id: claimId,
    userId,
    rewardId: reward.id,
    rewardTitle: sanitizeText(reward.title, 100) || 'Recompensa',
    cost: sanitizeMetricNumber(reward.cost, 1, 1000000, 10),
    currency: reward.currency === 'kronus' ? 'kronus' : 'scriptus',
    claimedAt,
    notes: sanitizeText(notes || '', 500)
  };

  const currentClaims = await getClaimedRewards(userId);
  const updatedClaims = [claim, ...currentClaims];
  localStorage.setItem(getLocalClaimsKey(userId), JSON.stringify(updatedClaims));

  try {
    const cleanData = cleanDataForFirestore(claim);
    await setDoc(doc(db, 'user_reward_claims', claimId), cleanData);
  } catch (e) {
    console.warn('Erro ao salvar resgate no Firestore (armazenado localmente):', e);
  }

  return claim;
};

export const deleteClaimedReward = async (userId: string, claimId: string): Promise<void> => {
  const current = await getClaimedRewards(userId);
  const filtered = current.filter(c => c.id !== claimId);
  localStorage.setItem(getLocalClaimsKey(userId), JSON.stringify(filtered));

  try {
    await deleteDoc(doc(db, 'user_reward_claims', claimId));
  } catch (e) {
    console.warn('Erro ao excluir resgate do Firestore:', e);
  }
};
