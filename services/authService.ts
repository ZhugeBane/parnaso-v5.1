
import { User, PublishedWork, EquippedBadge, AchievementUnlockRecord } from '../types';
import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { sanitizeText } from '../utils/cryptoUtils';

// Helper to map Firestore doc to User type
const mapUser = (docData: any, uid: string, email: string): User => ({
  id: uid,
  name: docData.name || 'Usuário',
  email: email,
  role: docData.role || 'user',
  isBlocked: docData.isBlocked || false,
  status: docData.status, // Important to carry this over
  photoBase64: docData.photoBase64,
  photoURL: docData.photoBase64 || docData.photoURL,
  lastSeen: docData.lastSeen,
  isOnline: docData.isOnline,
  wordCountWeekly: typeof docData.wordCountWeekly === 'number' ? docData.wordCountWeekly : 0,
  wordCountMonthly: typeof docData.wordCountMonthly === 'number' ? docData.wordCountMonthly : 0,
  wordCountYearly: typeof docData.wordCountYearly === 'number' ? docData.wordCountYearly : 0,
  wordCountTotal: typeof docData.wordCountTotal === 'number' ? docData.wordCountTotal : 0,
  monthlyHistory: docData.monthlyHistory || {},
  yearlyHistory: docData.yearlyHistory || {},
  dailyHistory: docData.dailyHistory || {},
  statsUpdatedAt: docData.statsUpdatedAt,

  // Author Profile & Showcase Fields
  bio: docData.bio || '',
  location: docData.location || '',
  contactEmail: docData.contactEmail || '',
  instagram: docData.instagram || '',
  whatsapp: docData.whatsapp || '',
  publishedWorks: Array.isArray(docData.publishedWorks) ? docData.publishedWorks : [],

  // Gamification: Hestius (Streak Freeze)
  hestiusCount: typeof docData.hestiusCount === 'number' ? Math.max(0, Math.min(3, docData.hestiusCount)) : 1,
  hestiusLastRechargeDate: docData.hestiusLastRechargeDate || '',
  hestiusLastConsumedDate: docData.hestiusLastConsumedDate || '',
  hestiusProtectedDates: Array.isArray(docData.hestiusProtectedDates) ? docData.hestiusProtectedDates : [],

  // Badges & Collectible Achievements
  equippedBadges: Array.isArray(docData.equippedBadges) ? docData.equippedBadges.slice(0, 2) : [],
  achievementHistory: Array.isArray(docData.achievementHistory) ? docData.achievementHistory : [],
});

export const updateUserPresence = async (userId: string, isOnline: boolean = true): Promise<void> => {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      lastSeen: new Date().toISOString(),
      isOnline
    });
  } catch {
    // Ignore transient network errors for presence pings
  }
};

export const isUserCurrentlyOnline = (user?: User | null): boolean => {
  if (!user) return false;
  if (user.isOnline === false) return false;
  if (!user.lastSeen) return false;
  const lastSeenMs = new Date(user.lastSeen).getTime();
  if (isNaN(lastSeenMs)) return false;
  // Considered online if active within the last 2 minutes (120 seconds)
  return (Date.now() - lastSeenMs) < 2 * 60 * 1000;
};

export const register = async (name: string, email: string, password: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update Display Name in Auth
    await updateProfile(user, { displayName: name });

    // Create User Document in Firestore (for roles/blocking)
    const userDocRef = doc(db, 'users', user.uid);
    const userData = {
      name,
      email,
      role: 'user',
      isBlocked: false,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await setDoc(userDocRef, userData);

    // Fazer logout imediatamente após registro
    await signOut(auth);

    return {
      id: user.uid,
      name,
      email,
      role: 'user',
      isBlocked: false,
      status: 'pending'
    };
  } catch (error: any) {
    console.error(error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("Este e-mail já está cadastrado.");
    }
    throw new Error("Erro ao criar conta: " + error.message);
  }
};

export const login = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch extra data from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();

      // Verificar se conta está pendente de aprovação
      if (data.status === 'pending') {
        await signOut(auth);
        throw new Error("Sua conta está aguardando aprovação do administrador.");
      }

      // Verificar se conta está rejeitada
      if (data.status === 'rejected') {
        await signOut(auth);
        throw new Error("Sua conta foi rejeitada pelo administrador.");
      }

      if (data.isBlocked) {
        await signOut(auth);
        throw new Error("Conta bloqueada pelo administrador.");
      }
      await updateUserPresence(user.uid, true);
      return mapUser({ ...data, lastSeen: new Date().toISOString(), isOnline: true }, user.uid, user.email!);
    } else {
      // Fallback if doc doesn't exist (legacy users or direct auth creation)
      return {
        id: user.uid,
        name: user.displayName || 'Usuário',
        email: user.email!,
        role: 'user',
        isBlocked: false,
        lastSeen: new Date().toISOString(),
        isOnline: true
      };
    }
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential') {
      throw new Error("E-mail ou senha incorretos.");
    }
    throw error;
  }
};

export const logout = async () => {
  if (auth.currentUser) {
    await updateUserPresence(auth.currentUser.uid, false);
  }
  await signOut(auth);
};

export const getCurrentUser = async (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();

            // Verificar se conta está pendente de aprovação
            if (data.status === 'pending') {
              await signOut(auth);
              resolve(null);
              return;
            }

            // Verificar se conta está rejeitada
            if (data.status === 'rejected') {
              await signOut(auth);
              resolve(null);
              return;
            }

            // Verificar se conta está bloqueada
            if (data.isBlocked) {
              await signOut(auth);
              resolve(null);
              return;
            }

            await updateUserPresence(user.uid, true);
            resolve(mapUser({ ...data, lastSeen: new Date().toISOString(), isOnline: true }, user.uid, user.email!));
          } else {
            resolve({
              id: user.uid,
              name: user.displayName || 'Usuário',
              email: user.email!,
              role: 'user',
              isBlocked: false,
              status: 'approved', // Default legacy behavior
              lastSeen: new Date().toISOString(),
              isOnline: true
            });
          }
        } catch (e) {
          console.error(e);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
};

// --- Admin Functions ---

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unknown',
        email: data.email || '',
        role: data.role || 'user',
        isBlocked: data.isBlocked || false,
        status: data.status || 'approved', // Default para usuários antigos
        photoBase64: data.photoBase64,
        photoURL: data.photoBase64 || data.photoURL,
        lastSeen: data.lastSeen,
        isOnline: data.isOnline,
        wordCountWeekly: typeof data.wordCountWeekly === 'number' ? data.wordCountWeekly : 0,
        wordCountMonthly: typeof data.wordCountMonthly === 'number' ? data.wordCountMonthly : 0,
        wordCountYearly: typeof data.wordCountYearly === 'number' ? data.wordCountYearly : 0,
        wordCountTotal: typeof data.wordCountTotal === 'number' ? data.wordCountTotal : 0,
        monthlyHistory: data.monthlyHistory || {},
        yearlyHistory: data.yearlyHistory || {},
        dailyHistory: data.dailyHistory || {},
        statsUpdatedAt: data.statsUpdatedAt,

        // Author Profile & Showcase Fields
        bio: data.bio || '',
        location: data.location || '',
        contactEmail: data.contactEmail || '',
        instagram: data.instagram || '',
        whatsapp: data.whatsapp || '',
        publishedWorks: Array.isArray(data.publishedWorks) ? data.publishedWorks : [],

        // Gamification & Badges
        hestiusCount: typeof data.hestiusCount === 'number' ? Math.max(0, Math.min(3, data.hestiusCount)) : 1,
        equippedBadges: Array.isArray(data.equippedBadges) ? data.equippedBadges.slice(0, 2) : [],
        achievementHistory: Array.isArray(data.achievementHistory) ? data.achievementHistory : []
      };
    });
  } catch (e) {
    console.error("Error fetching users", e);
    return [];
  }
};

export const toggleUserBlock = async (userId: string, currentStatus: boolean): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { isBlocked: !currentStatus });
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    // Note: Firebase Client SDK cannot delete Auth user easily without re-auth.
    // We will delete the Firestore document, effectively removing them from the app logic.
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    throw new Error("Falha ao deletar usuário. Verifique as permissões.");
  }
};

// Aprovar usuário pendente
export const approveUser = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { status: 'approved' });
  } catch (error) {
    console.error("Erro ao aprovar usuário:", error);
    throw new Error("Falha ao aprovar usuário.");
  }
};

// Rejeitar usuário pendente (deleta o usuário)
export const rejectUser = async (userId: string): Promise<void> => {
  try {
    await deleteUser(userId);
  } catch (error) {
    console.error("Erro ao rejeitar usuário:", error);
    throw new Error("Falha ao rejeitar usuário.");
  }
};

export const checkUserExists = async (email: string): Promise<boolean> => {
  // Not easily possible with client SDK to check without trying to login/register
  return true;
};

export const resetPassword = async (email: string): Promise<void> => {
  const trimmedEmail = email?.trim();
  if (!trimmedEmail) {
    throw new Error("Por favor, informe seu e-mail.");
  }

  try {
    // Configura idioma em português para o e-mail de recuperação do Firebase
    auth.languageCode = 'pt';
    console.log('[resetPassword] Enviando e-mail de recuperação para:', trimmedEmail);
    await sendPasswordResetEmail(auth, trimmedEmail);
    console.log('[resetPassword] ✅ E-mail de recuperação enviado com sucesso!');
  } catch (error: any) {
    console.error("[resetPassword] ❌ Erro ao enviar e-mail de recuperação:", error);
    if (error.code === 'auth/user-not-found') {
      throw new Error("Nenhum usuário cadastrado com este e-mail.");
    } else if (error.code === 'auth/invalid-email') {
      throw new Error("Endereço de e-mail inválido. Verifique o formato digitado.");
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error("Muitas tentativas recentes. Aguarde alguns instantes antes de tentar novamente.");
    }
    throw new Error(error.message || "Erro ao enviar e-mail de recuperação.");
  }
};

import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const updateUserProfileBase64 = async (userId: string, photoBase64: string): Promise<string> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    photoBase64,
    photoURL: photoBase64
  });

  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      await updateProfile(auth.currentUser, { photoURL: photoBase64 });
    } catch (e) {
      console.warn("Could not update Firebase Auth profile photoURL", e);
    }
  }

  return photoBase64;
};

export const updateUserProfilePicture = async (userId: string, fileOrBase64: File | Blob | string): Promise<string> => {
  if (typeof fileOrBase64 === 'string') {
    return updateUserProfileBase64(userId, fileOrBase64);
  }

  // Use HTML5 Canvas to resize to 200x200 JPEG 0.7 Base64
  const { resizeImageToBase64 } = await import('../utils/imageProcessor');
  const base64 = await resizeImageToBase64(fileOrBase64, 200, 200, 0.7);
  return updateUserProfileBase64(userId, base64);
};

export const updateAuthorProfile = async (
  userId: string,
  profileData: {
    name?: string;
    bio?: string;
    location?: string;
    contactEmail?: string;
    instagram?: string;
    whatsapp?: string;
    photoBase64?: string;
    publishedWorks?: PublishedWork[];
  }
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  const cleanData: any = {};
  if (profileData.name !== undefined) cleanData.name = sanitizeText(profileData.name, 80);
  if (profileData.bio !== undefined) cleanData.bio = sanitizeText(profileData.bio, 250);
  if (profileData.location !== undefined) cleanData.location = sanitizeText(profileData.location, 100);
  if (profileData.contactEmail !== undefined) cleanData.contactEmail = sanitizeText(profileData.contactEmail, 120);
  if (profileData.instagram !== undefined) cleanData.instagram = sanitizeText(profileData.instagram, 100);
  if (profileData.whatsapp !== undefined) cleanData.whatsapp = sanitizeText(profileData.whatsapp, 50);
  if (profileData.photoBase64 !== undefined) {
    cleanData.photoBase64 = profileData.photoBase64;
    cleanData.photoURL = profileData.photoBase64;
  }
  if (profileData.publishedWorks !== undefined) {
    cleanData.publishedWorks = profileData.publishedWorks;
  }

  await updateDoc(userRef, cleanData);

  if (auth.currentUser && auth.currentUser.uid === userId) {
    const authProfileUpdate: any = {};
    if (cleanData.name) authProfileUpdate.displayName = cleanData.name;
    if (cleanData.photoURL) authProfileUpdate.photoURL = cleanData.photoURL;
    if (Object.keys(authProfileUpdate).length > 0) {
      try {
        await updateProfile(auth.currentUser, authProfileUpdate);
      } catch {}
    }
  }
};

export const updateUserHestius = async (
  userId: string,
  hestiusCount: number,
  additionalData?: { hestiusLastRechargeDate?: string; hestiusLastConsumedDate?: string; hestiusProtectedDates?: string[] }
): Promise<void> => {
  if (!userId) return;
  const safeCount = Math.max(0, Math.min(3, hestiusCount));
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      hestiusCount: safeCount,
      ...(additionalData || {})
    });
  } catch (e) {
    console.warn('Erro ao atualizar Hestius no Firestore:', e);
  }
};

export const updateUserEquippedBadges = async (
  userId: string,
  equippedBadges: EquippedBadge[]
): Promise<void> => {
  if (!userId) return;
  const safeBadges = Array.isArray(equippedBadges) ? equippedBadges.slice(0, 2) : [];
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      equippedBadges: safeBadges
    });
  } catch (e) {
    console.error('Erro ao atualizar insígnias equipadas no Firestore:', e);
    throw e;
  }
};

export const syncUserAchievements = async (
  userId: string,
  achievementHistory: AchievementUnlockRecord[]
): Promise<void> => {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      achievementHistory: achievementHistory || []
    });
  } catch (e) {
    console.warn('Erro ao sincronizar histórico de conquistas no Firestore:', e);
  }
};

