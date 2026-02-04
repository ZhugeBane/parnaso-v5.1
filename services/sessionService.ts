
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

// --- Sessions ---

export const getSessions = async (userId: string): Promise<WritingSession[]> => {
  try {
    // Firestore composite indexes might be required for complex queries (where + orderBy)
    // If index is missing, it might throw an error in console with a link to create it.
    // For now, let's fetch by user and sort in memory if needed to avoid blocking index creation
    const q = query(collection(db, 'writing_sessions'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const sessions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as WritingSession[];

    // Sort descending by date
    return sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error getting sessions:", error);
    return [];
  }
};

export const saveSession = async (session: WritingSession, userId: string): Promise<void> => {
  console.log('[saveSession] Iniciando salvamento:', { session, userId });

  try {
    const { id, ...data } = session;

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

    console.log('[saveSession] Dados a salvar:', docData);
    console.log('[saveSession] Firestore DB instance:', db ? 'OK' : 'ERRO - DB não inicializado');

    const docRef = await addDoc(collection(db, 'writing_sessions'), docData);

    console.log('[saveSession] ✅ Sessão salva com sucesso! ID:', docRef.id);
  } catch (error: any) {
    console.error("[saveSession] ❌ ERRO ao salvar sessão:", error);
    console.error("[saveSession] Tipo de erro:", error?.constructor?.name);
    console.error("[saveSession] Código do erro:", error?.code);
    console.error("[saveSession] Mensagem:", error?.message);
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

export const saveProject = async (project: Project, userId: string): Promise<void> => {
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

    // If ID is short (Date.now from legacy), treat as new doc. If Long (Firestore UUID), update.
    // A simple check: if we passed a specific ID in the type that matches an existing doc.

    if (project.id && project.id.length > 20) {
      // Update existing
      console.log('[saveProject] Atualizando projeto existente com ID:', project.id);
      const docRef = doc(db, 'projects', project.id);
      await setDoc(docRef, docData, { merge: true });
      console.log('[saveProject] ✅ Projeto atualizado com sucesso!');
    } else {
      // Create new
      console.log('[saveProject] Criando novo projeto...');
      const docRef = await addDoc(collection(db, 'projects'), docData);
      console.log('[saveProject] ✅ Projeto criado com sucesso! ID:', docRef.id);
    }
  } catch (error: any) {
    console.error('[saveProject] ❌ ERRO ao salvar projeto:', error);
    console.error('[saveProject] Tipo de erro:', error?.constructor?.name);
    console.error('[saveProject] Código do erro:', error?.code);
    console.error('[saveProject] Mensagem:', error?.message);
    throw error; // Re-lançar erro para não engolir
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
