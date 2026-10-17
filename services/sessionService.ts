
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

    const docRef = await addDoc(collection(db, 'writing_sessions'), docData);

    console.log('[saveSession] ✅ Sessão salva e criptografada com sucesso! ID:', docRef.id);
  } catch (error: any) {
    console.error("[saveSession] ❌ ERRO ao salvar sessão:", error);
    throw error; // Re-lançar erro para não engolir
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
