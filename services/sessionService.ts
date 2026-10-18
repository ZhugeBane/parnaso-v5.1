
import { WritingSession, UserSettings, INITIAL_SETTINGS, Project } from '../types';
import { db } from '../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import {
  encryptSessionText,
  decryptSessionText,
  sanitizeMetricNumber,
  sanitizeText
} from '../utils/cryptoUtils';

// --- Sessions ---

export const getSessions = async (userId: string): Promise<WritingSession[]> => {
  try {
    // Firestore composite indexes might be required for complex queries (where + orderBy)
    // If index is missing, it might throw an error in console with a link to create it.
    // For now, let's fetch by user and sort in memory if needed to avoid blocking index creation
    const q = query(collection(db, 'writing_sessions'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const rawSessions = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as (WritingSession & { userId?: string })[];

    // Descriptografa automaticamente em memória textos com prefixo ENC_V1:;
    // Textos antigos sem prefixo são exibidos normalmente sem dar erro.
    const sessions = await Promise.all(
      rawSessions.map(async (s) => {
        const ownerUid = s.userId || userId;
        const decryptedContent = s.content
          ? await decryptSessionText(s.content, ownerUid)
          : '';
        return {
          ...s,
          wordCount: sanitizeMetricNumber(s.wordCount, 0, 100000, 0),
          stressLevel: sanitizeMetricNumber(s.stressLevel, 1, 5, 3),
          difficultyLevel: sanitizeMetricNumber(s.difficultyLevel, 1, 5, 1),
          autoCorrectionFrequency: sanitizeMetricNumber(s.autoCorrectionFrequency, 1, 5, 1),
          sessionRating: sanitizeMetricNumber(s.sessionRating, 1, 5, 3),
          content: decryptedContent
        } as WritingSession;
      })
    );

    // Sort descending by date
    return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error getting sessions:", error);
    return [];
  }
};

export const saveSession = async (session: WritingSession, userId: string): Promise<void> => {
  console.log('[saveSession] Iniciando salvamento:', { sessionId: session.id, userId });

  try {
    const { id, ...data } = session;

    // Validação de integridade das métricas para impedir valores negativos, NaN ou saltos irreais
    const safeWordCount = sanitizeMetricNumber(data.wordCount, 0, 100000, 0);
    const safeStressLevel = sanitizeMetricNumber(data.stressLevel, 1, 5, 3);
    const safeDifficultyLevel = sanitizeMetricNumber(data.difficultyLevel, 1, 5, 1);
    const safeAutoCorrection = sanitizeMetricNumber(data.autoCorrectionFrequency, 1, 5, 1);
    const safeRating = sanitizeMetricNumber(data.sessionRating, 1, 5, 3);

    // Criptografia Real Client-Side (AES-GCM / Web Crypto API) com prefixo ENC_V1:
    const encryptedContent = data.content
      ? await encryptSessionText(data.content, userId)
      : '';

    const validatedData = {
      ...data,
      projectId: data.projectId ? data.projectId : null,
      wordCount: safeWordCount,
      stressLevel: safeStressLevel,
      difficultyLevel: safeDifficultyLevel,
      autoCorrectionFrequency: safeAutoCorrection,
      sessionRating: safeRating,
      specificDifficulties: data.specificDifficulties ? sanitizeText(data.specificDifficulties, 2000) : '',
      multitaskingDescription: data.multitaskingDescription ? sanitizeText(data.multitaskingDescription, 500) : '',
      timeStrategyDescription: data.timeStrategyDescription ? sanitizeText(data.timeStrategyDescription, 500) : '',
      rewardDescription: data.rewardDescription ? sanitizeText(data.rewardDescription, 500) : '',
      content: encryptedContent
    };

    // Remover campos undefined (Firestore não aceita undefined)
    const cleanData = Object.entries(validatedData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    const docData = {
      ...cleanData,
      userId
    };

    // Verificar se é atualização de sessão já existente no Firestore ou criação de nova sessão
    let isExisting = false;
    if (id && !/^\d{10,14}$/.test(id) && !id.startsWith('temp_') && !id.startsWith('local_')) {
      try {
        const checkDoc = await getDoc(doc(db, 'writing_sessions', id));
        if (checkDoc.exists()) {
          isExisting = true;
        }
      } catch (e) {
        isExisting = id.length >= 15;
      }
    }

    if (isExisting && id) {
      const docRef = doc(db, 'writing_sessions', id);
      await setDoc(docRef, { ...docData, updatedAt: new Date().toISOString() }, { merge: true });
      console.log('[saveSession] ✅ Sessão existente atualizada e criptografada com sucesso! ID:', id);
    } else {
      const docRef = await addDoc(collection(db, 'writing_sessions'), docData);
      console.log('[saveSession] ✅ Nova sessão salva e criptografada com sucesso! ID:', docRef.id);
    }

    // Atualiza os contadores públicos agregados do usuário para guildas e comunidade
    await syncUserPublicWordStats(userId);
  } catch (error: any) {
    console.error("[saveSession] ❌ ERRO ao salvar sessão:", error);
    throw error; // Re-lançar erro para não engolir
  }
};

export interface UserWordStats {
  wordCountWeekly: number;
  wordCountMonthly: number;
  wordCountYearly: number;
  wordCountTotal: number;
  monthlyHistory: Record<string, number>;
  yearlyHistory: Record<string, number>;
  dailyHistory: Record<string, number>;
  statsUpdatedAt: string;
}

/**
 * Agrega e sincroniza com segurança os contadores de palavras e histórico de períodos
 * no documento público do usuário (coleção 'users') sem expor os textos das sessões.
 */
export const syncUserPublicWordStats = async (userId: string): Promise<UserWordStats> => {
  try {
    if (!userId) {
      return {
        wordCountWeekly: 0,
        wordCountMonthly: 0,
        wordCountYearly: 0,
        wordCountTotal: 0,
        monthlyHistory: {},
        yearlyHistory: {},
        dailyHistory: {},
        statsUpdatedAt: new Date().toISOString()
      };
    }

    const [userSessions, userProjects] = await Promise.all([
      getSessions(userId),
      getProjects(userId).catch(() => [])
    ]);

    // Obras ocultas do automonitoramento não somam para o total público/social
    const hiddenProjectIds = new Set(
      userProjects.filter(p => p.showInAutomonitoring === false).map(p => p.id)
    );

    const validSessions = userSessions.filter(s => !s.projectId || !hiddenProjectIds.has(s.projectId));

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYearKey = String(now.getFullYear());

    // Início da semana (Segunda-feira 00:00:00)
    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const monthlyHistory: Record<string, number> = {};
    const yearlyHistory: Record<string, number> = {};
    const dailyHistory: Record<string, number> = {};
    let wordCountTotal = 0;
    let wordCountWeekly = 0;

    for (const session of validSessions) {
      const words = Math.max(0, session.wordCount || 0);
      wordCountTotal += words;

      const sDate = new Date(session.date);
      if (isNaN(sDate.getTime())) continue;

      const mKey = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
      const yKey = String(sDate.getFullYear());
      const dKey = sDate.toISOString().slice(0, 10);

      monthlyHistory[mKey] = (monthlyHistory[mKey] || 0) + words;
      yearlyHistory[yKey] = (yearlyHistory[yKey] || 0) + words;
      dailyHistory[dKey] = (dailyHistory[dKey] || 0) + words;

      if (sDate.getTime() >= startOfWeek.getTime()) {
        wordCountWeekly += words;
      }
    }

    const wordCountMonthly = monthlyHistory[currentMonthKey] || 0;
    const wordCountYearly = yearlyHistory[currentYearKey] || 0;
    const statsUpdatedAt = new Date().toISOString();

    const statsPayload: UserWordStats = {
      wordCountWeekly,
      wordCountMonthly,
      wordCountYearly,
      wordCountTotal,
      monthlyHistory,
      yearlyHistory,
      dailyHistory,
      statsUpdatedAt
    };

    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, statsPayload, { merge: true });
    } catch (userErr) {
      console.warn('[syncUserPublicWordStats] Aviso ao salvar estatísticas em users:', userErr);
    }

    return statsPayload;
  } catch (err) {
    console.error('[syncUserPublicWordStats] Erro ao sincronizar estatísticas de palavras:', err);
    return {
      wordCountWeekly: 0,
      wordCountMonthly: 0,
      wordCountYearly: 0,
      wordCountTotal: 0,
      monthlyHistory: {},
      yearlyHistory: {},
      dailyHistory: {},
      statsUpdatedAt: new Date().toISOString()
    };
  }
};

export const deleteSession = async (sessionId: string, userId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'writing_sessions', sessionId));
    await syncUserPublicWordStats(userId);
  } catch (error) {
    console.error("[deleteSession] Erro ao excluir sessão:", error);
    throw error;
  }
};

// --- Settings ---

export const getSettings = async (userId: string): Promise<UserSettings> => {
  try {
    const docRef = doc(db, 'user_settings', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserSettings;
    }
    return INITIAL_SETTINGS;
  } catch (error) {
    console.error(error);
    return INITIAL_SETTINGS;
  }
};

export const saveSettings = async (settings: UserSettings, userId: string): Promise<void> => {
  try {
    await setDoc(doc(db, 'user_settings', userId), settings);
  } catch (error) {
    console.error(error);
  }
};

// --- Projects ---

export const getProjects = async (userId: string): Promise<Project[]> => {
  try {
    const q = query(collection(db, 'projects'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id, // Firestore ID
      ...doc.data()
    })) as Project[];
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const saveProject = async (project: Project, userId: string): Promise<Project> => {
  console.log('[saveProject] Iniciando salvamento:', { project, userId });

  try {
    const { id, ...data } = project;

    // Remover campos undefined (Firestore não aceita undefined)
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    const docData = {
      ...cleanData,
      userId
    };

    console.log('[saveProject] Dados a salvar:', docData);
    console.log('[saveProject] ID do projeto:', id);
    console.log('[saveProject] Firestore DB instance:', db ? 'OK' : 'ERRO - DB não inicializado');

    // Determine if updating an existing project or creating a new one
    let isExisting = false;
    if (project.id && !/^\d{10,14}$/.test(project.id) && !project.id.startsWith('temp_') && !project.id.startsWith('local_')) {
      try {
        const checkDoc = await getDoc(doc(db, 'projects', project.id));
        if (checkDoc.exists()) {
          isExisting = true;
        }
      } catch (e) {
        // Fallback for network issues (Firestore IDs are 20 alphanumeric characters)
        isExisting = project.id.length >= 15;
      }
    }

    if (isExisting && project.id) {
      // Update existing
      console.log('[saveProject] Atualizando projeto existente com ID:', project.id);
      const docRef = doc(db, 'projects', project.id);
      await setDoc(docRef, docData, { merge: true });
      console.log('[saveProject] ✅ Projeto atualizado com sucesso!');
      return { ...project, ...cleanData, id: project.id };
    } else {
      // Create new
      console.log('[saveProject] Criando novo projeto...');
      const docRef = await addDoc(collection(db, 'projects'), docData);
      console.log('[saveProject] ✅ Projeto criado com sucesso! ID:', docRef.id);
      return { ...project, ...cleanData, id: docRef.id };
    }
  } catch (error: any) {
    console.error('[saveProject] ❌ ERRO ao salvar projeto:', error);
    console.error('[saveProject] Tipo de erro:', error?.constructor?.name);
    console.error('[saveProject] Código do erro:', error?.code);
    console.error('[saveProject] Mensagem:', error?.message);
    throw error; // Re-lançar erro para não engolir
  }
};

export const deleteProject = async (projectId: string, userId: string): Promise<void> => {
  console.log('[deleteProject] Iniciando exclusão do projeto:', { projectId, userId });
  try {
    // 1. Excluir o documento da obra em si
    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);
    console.log('[deleteProject] ✅ Documento do projeto excluído.');

    // 2. Desvincular sessões de escrita associadas a esta obra
    // (preserva as palavras escritas, streaks e métricas históricas gerais do escritor)
    try {
      const sessionsQ = query(
        collection(db, 'writing_sessions'),
        where('projectId', '==', projectId),
        where('userId', '==', userId)
      );
      const sessionSnap = await getDocs(sessionsQ);
      if (!sessionSnap.empty) {
        const batch = writeBatch(db);
        sessionSnap.forEach((docSnap) => {
          batch.update(docSnap.ref, { projectId: null });
        });
        await batch.commit();
        console.log(`[deleteProject] ✅ ${sessionSnap.size} sessões desvinculadas com sucesso.`);
      }
    } catch (sessionErr) {
      console.warn('[deleteProject] Aviso ao desvincular sessões:', sessionErr);
    }

    // 3. Excluir personagens associados a esta obra
    try {
      const charsQ = query(
        collection(db, 'project_characters'),
        where('projectId', '==', projectId),
        where('userId', '==', userId)
      );
      const charsSnap = await getDocs(charsQ);
      if (!charsSnap.empty) {
        const batchChars = writeBatch(db);
        charsSnap.forEach((docSnap) => {
          batchChars.delete(docSnap.ref);
        });
        await batchChars.commit();
        console.log(`[deleteProject] ✅ ${charsSnap.size} personagens excluídos.`);
      }
      localStorage.removeItem(`parnaso_characters_${projectId}`);
    } catch (charErr) {
      console.warn('[deleteProject] Aviso ao excluir personagens da obra:', charErr);
    }

    // 4. Excluir mapas conceituais associados a esta obra
    try {
      const mapsQ = query(
        collection(db, 'project_concept_maps'),
        where('projectId', '==', projectId),
        where('userId', '==', userId)
      );
      const mapsSnap = await getDocs(mapsQ);
      if (!mapsSnap.empty) {
        const batchMaps = writeBatch(db);
        mapsSnap.forEach((docSnap) => {
          batchMaps.delete(docSnap.ref);
        });
        await batchMaps.commit();
        console.log(`[deleteProject] ✅ ${mapsSnap.size} mapas conceituais excluídos.`);
      }
      localStorage.removeItem(`parnaso_concept_maps_${projectId}`);
    } catch (mapErr) {
      console.warn('[deleteProject] Aviso ao excluir mapas conceituais da obra:', mapErr);
    }

    // 5. Excluir comentários e post-its associados a esta obra
    try {
      const commentsQ = query(
        collection(db, 'project_comments'),
        where('projectId', '==', projectId),
        where('userId', '==', userId)
      );
      const commentsSnap = await getDocs(commentsQ);
      if (!commentsSnap.empty) {
        const batchComments = writeBatch(db);
        commentsSnap.forEach((docSnap) => {
          batchComments.delete(docSnap.ref);
        });
        await batchComments.commit();
        console.log(`[deleteProject] ✅ ${commentsSnap.size} comentários excluídos.`);
      }
      localStorage.removeItem(`parnaso_comments_${projectId}`);
    } catch (commentErr) {
      console.warn('[deleteProject] Aviso ao excluir comentários da obra:', commentErr);
    }

    console.log('[deleteProject] ✅ Exclusão completa finalizada!');
  } catch (error: any) {
    console.error('[deleteProject] ❌ Erro ao excluir projeto:', error);
    throw error;
  }
};

// --- Admin Helpers ---

export const getGlobalStats = async () => {
  try {
    // Note: Counting all documents in client SDK is expensive (reads). 
    // In production, use Aggregation Queries.
    const sessionsSnap = await getDocs(collection(db, 'writing_sessions'));

    const totalSessions = sessionsSnap.size;
    const totalWords = sessionsSnap.docs.reduce((acc, doc) => acc + (doc.data().wordCount || 0), 0);

    return { totalWords, totalSessions };
  } catch (e) {
    return { totalWords: 0, totalSessions: 0 };
  }
};

// --- Migration / Fallback ---
export const clearAllData = async (userId: string) => {
  try {
    const batch = writeBatch(db);

    // Get all sessions
    const sessionsQ = query(collection(db, 'writing_sessions'), where('userId', '==', userId));
    const sessionsSnap = await getDocs(sessionsQ);
    sessionsSnap.forEach((doc) => batch.delete(doc.ref));

    // Get all projects
    const projectsQ = query(collection(db, 'projects'), where('userId', '==', userId));
    const projectsSnap = await getDocs(projectsQ);
    projectsSnap.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();
  } catch (e) {
    console.error("Error clearing data", e);
  }
};
