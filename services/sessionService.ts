
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
  try {
    // Remove ID from object if it's auto-generated timestamp, Firestore will generate one or we can use it
    // But since session.id comes from Date.now() in form, we can use it or let firestore gen
    // Let's use Firestore auto-id for cleaner DB, but store the legacy ID or just ignore it.
    // Actually, to keep types consistent, we'll strip the ID from the payload and let Firestore assign a document ID
    const { id, ...data } = session;
    
    await addDoc(collection(db, 'writing_sessions'), {
      ...data,
      userId // Add userId to the document for querying
    });
  } catch (error) {
    console.error("Error saving session:", error);
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
  try {
    const { id, ...data } = project;
    // If ID is short (Date.now from legacy), treat as new doc. If Long (Firestore UUID), update.
    // A simple check: if we passed a specific ID in the type that matches an existing doc.
    
    if (project.id && project.id.length > 20) {
       // Update existing
       const docRef = doc(db, 'projects', project.id);
       await setDoc(docRef, { ...data, userId }, { merge: true });
    } else {
       // Create new
       await addDoc(collection(db, 'projects'), {
         ...data,
         userId
       });
    }
  } catch (error) {
    console.error(error);
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
