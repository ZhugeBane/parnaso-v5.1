import { UserReward, ClaimedReward } from '../types';
import { db } from '../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';

// Local storage key helpers
const getLocalRewardsKey = (userId: string) => `parnaso_rewards_${userId}`;
const getLocalClaimsKey = (userId: string) => `parnaso_claims_${userId}`;

// Convert word count to purple diamonds (2 words = 1 purple diamond)
export const wordsToDiamonds = (words: number): number => {
  return Math.max(0, Math.floor(words / 2));
};

// Default starter rewards when the user has never created any
export const DEFAULT_STARTER_REWARDS: Omit<UserReward, 'id' | 'userId' | 'createdAt'>[] = [
  {
    title: 'Comida favorita ou lanche especial',
    cost: 30, // 60 words
    description: 'Um docinho, café especial, pizza ou o seu prato preferido para comemorar!',
    icon: '🍕',
    category: 'comida'
  },
  {
    title: 'Assistir 1 episódio de série',
    cost: 50, // 100 words
    description: 'Relaxar e maratonar sem culpa!',
    icon: '🎬',
    category: 'lazer'
  },
  {
    title: 'Pausa de 30 min sem culpa',
    cost: 40, // 80 words
    description: 'Deitar, ouvir música ou caminhar com a cabeça fresca.',
    icon: '☕',
    category: 'descanso'
  },
  {
    title: 'Comprar um livro novo',
    cost: 300, // 600 words
    description: 'Aquele livro da sua lista de desejos que você sempre quis ler.',
    icon: '📚',
    category: 'compras'
  },
  {
    title: 'Dia livre de folga da escrita',
    cost: 500, // 1000 words
    description: 'Um dia inteiro dedicado apenas ao lazer e inspiração!',
    icon: '🏖️',
    category: 'descanso'
  }
];

// Clean object helper
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

// --- USER REWARDS (SHOP ITEMS) ---

export const getUserRewards = async (userId: string): Promise<UserReward[]> => {
  if (!userId) return [];

  // Read local cache first
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

    // If remote is empty and local is also empty, seed with default rewards
    if (remoteRewards.length === 0 && cached.length === 0) {
      const seeded: UserReward[] = [];
      const now = new Date().toISOString();
      for (const def of DEFAULT_STARTER_REWARDS) {
        const item: UserReward = {
          id: `seed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId,
          title: def.title,
          cost: def.cost,
          description: def.description,
          icon: def.icon,
          category: def.category,
          createdAt: now
        };
        seeded.push(item);
      }
      localStorage.setItem(getLocalRewardsKey(userId), JSON.stringify(seeded));
      // Try async background upload of defaults
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
    title: reward.title.trim(),
    cost: Math.max(1, Math.floor(reward.cost)),
    description: reward.description?.trim() || '',
    icon: reward.icon || '🎁',
    category: reward.category || 'outro',
    createdAt
  };

  // Update local storage
  const current = await getUserRewards(userId);
  const updated = isNew
    ? [fullReward, ...current]
    : current.map(r => (r.id === id ? fullReward : r));
  localStorage.setItem(getLocalRewardsKey(userId), JSON.stringify(updated));

  // Sync to Firestore
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
  // Remove from local cache
  const current = await getUserRewards(userId);
  const filtered = current.filter(r => r.id !== rewardId);
  localStorage.setItem(getLocalRewardsKey(userId), JSON.stringify(filtered));

  // Remove from Firestore
  try {
    await deleteDoc(doc(db, 'user_rewards', rewardId));
  } catch (e) {
    console.warn('Erro ao excluir recompensa no Firestore:', e);
  }
};

// --- CLAIMED REWARDS (REDEMPTION HISTORY) ---

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
      // Sort newest first
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
  reward: UserReward,
  notes?: string
): Promise<ClaimedReward> => {
  const claimId = `claim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const claimedAt = new Date().toISOString();

  const claim: ClaimedReward = {
    id: claimId,
    userId,
    rewardId: reward.id,
    rewardTitle: reward.title,
    cost: reward.cost,
    claimedAt,
    notes: notes?.trim() || ''
  };

  // Local update
  const currentClaims = await getClaimedRewards(userId);
  const updatedClaims = [claim, ...currentClaims];
  localStorage.setItem(getLocalClaimsKey(userId), JSON.stringify(updatedClaims));

  // Sync to Firestore
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
