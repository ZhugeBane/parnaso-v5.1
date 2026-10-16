import { Character, ChapterConceptMap } from '../types';
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
const getLocalCharactersKey = (projectId: string) => `parnaso_characters_${projectId}`;
const getLocalMapsKey = (projectId: string) => `parnaso_concept_maps_${projectId}`;

// Clean object of undefined values for Firestore
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

// --- CHARACTERS ---

export const getCharacters = async (projectId: string, userId: string): Promise<Character[]> => {
  // Read local cache first for instant response
  const localRaw = localStorage.getItem(getLocalCharactersKey(projectId));
  let cached: Character[] = [];
  if (localRaw) {
    try {
      cached = JSON.parse(localRaw);
    } catch (e) {
      console.warn('Erro ao ler cache local de personagens:', e);
    }
  }

  try {
    const q = query(
      collection(db, 'project_characters'),
      where('projectId', '==', projectId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const remoteChars = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as Character[];

    // Sort by createdAt or name
    remoteChars.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Update cache
    localStorage.setItem(getLocalCharactersKey(projectId), JSON.stringify(remoteChars));
    return remoteChars;
  } catch (error) {
    console.warn('Usando personagens do cache local devido a erro no Firestore:', error);
    return cached;
  }
};

export const saveCharacter = async (character: Character, userId: string): Promise<Character> => {
  const { id, ...data } = character;
  const cleanData = cleanDataForFirestore({
    ...data,
    userId,
    updatedAt: new Date().toISOString()
  });

  let savedChar: Character = { ...character };

  try {
    if (id && id.length > 20) {
      // Update existing
      const docRef = doc(db, 'project_characters', id);
      await setDoc(docRef, cleanData, { merge: true });
      savedChar = { ...character, ...cleanData, id };
    } else {
      // Create new
      const docRef = await addDoc(collection(db, 'project_characters'), {
        ...cleanData,
        createdAt: character.createdAt || new Date().toISOString()
      });
      savedChar = { ...character, ...cleanData, id: docRef.id };
    }
  } catch (error) {
    console.error('Erro ao salvar personagem no Firestore, salvando localmente:', error);
    if (!savedChar.id) {
      savedChar.id = 'local_' + Date.now();
    }
  }

  // Update local cache
  try {
    const localRaw = localStorage.getItem(getLocalCharactersKey(character.projectId));
    let list: Character[] = localRaw ? JSON.parse(localRaw) : [];
    const index = list.findIndex(c => c.id === savedChar.id);
    if (index >= 0) {
      list[index] = savedChar;
    } else {
      list.push(savedChar);
    }
    localStorage.setItem(getLocalCharactersKey(character.projectId), JSON.stringify(list));
  } catch (e) {
    console.error('Erro ao atualizar cache local de personagem:', e);
  }

  return savedChar;
};

export const deleteCharacter = async (characterId: string, projectId: string): Promise<void> => {
  try {
    if (characterId && !characterId.startsWith('local_')) {
      await deleteDoc(doc(db, 'project_characters', characterId));
    }
  } catch (error) {
    console.error('Erro ao excluir personagem do Firestore:', error);
  }

  // Remove from local cache
  try {
    const localRaw = localStorage.getItem(getLocalCharactersKey(projectId));
    if (localRaw) {
      const list: Character[] = JSON.parse(localRaw);
      const filtered = list.filter(c => c.id !== characterId);
      localStorage.setItem(getLocalCharactersKey(projectId), JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Erro ao atualizar cache local ao excluir personagem:', e);
  }
};

// --- CHAPTER CONCEPT MAPS ---

export const getChapterConceptMaps = async (projectId: string, userId: string): Promise<ChapterConceptMap[]> => {
  const localRaw = localStorage.getItem(getLocalMapsKey(projectId));
  let cached: ChapterConceptMap[] = [];
  if (localRaw) {
    try {
      cached = JSON.parse(localRaw);
    } catch (e) {
      console.warn('Erro ao ler cache de mapas conceituais:', e);
    }
  }

  try {
    const q = query(
      collection(db, 'project_concept_maps'),
      where('projectId', '==', projectId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const remoteMaps = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as ChapterConceptMap[];

    // Sort by chapter number
    remoteMaps.sort((a, b) => a.chapterNumber - b.chapterNumber);

    localStorage.setItem(getLocalMapsKey(projectId), JSON.stringify(remoteMaps));
    return remoteMaps;
  } catch (error) {
    console.warn('Usando mapas do cache local devido a erro no Firestore:', error);
    return cached;
  }
};

export const saveChapterConceptMap = async (chapterMap: ChapterConceptMap, userId: string): Promise<ChapterConceptMap> => {
  const { id, ...data } = chapterMap;
  const cleanData = cleanDataForFirestore({
    ...data,
    userId,
    updatedAt: new Date().toISOString()
  });

  let savedMap: ChapterConceptMap = { ...chapterMap };

  try {
    if (id && id.length > 20) {
      const docRef = doc(db, 'project_concept_maps', id);
      await setDoc(docRef, cleanData, { merge: true });
      savedMap = { ...chapterMap, ...cleanData, id };
    } else {
      const docRef = await addDoc(collection(db, 'project_concept_maps'), {
        ...cleanData,
        createdAt: chapterMap.createdAt || new Date().toISOString()
      });
      savedMap = { ...chapterMap, ...cleanData, id: docRef.id };
    }
  } catch (error) {
    console.error('Erro ao salvar mapa no Firestore, salvando localmente:', error);
    if (!savedMap.id) {
      savedMap.id = 'local_map_' + Date.now();
    }
  }

  // Update local cache
  try {
    const localRaw = localStorage.getItem(getLocalMapsKey(chapterMap.projectId));
    let list: ChapterConceptMap[] = localRaw ? JSON.parse(localRaw) : [];
    const index = list.findIndex(m => m.id === savedMap.id);
    if (index >= 0) {
      list[index] = savedMap;
    } else {
      list.push(savedMap);
    }
    list.sort((a, b) => a.chapterNumber - b.chapterNumber);
    localStorage.setItem(getLocalMapsKey(chapterMap.projectId), JSON.stringify(list));
  } catch (e) {
    console.error('Erro ao atualizar cache local de mapas conceituais:', e);
  }

  return savedMap;
};

export const deleteChapterConceptMap = async (mapId: string, projectId: string): Promise<void> => {
  try {
    if (mapId && !mapId.startsWith('local_')) {
      await deleteDoc(doc(db, 'project_concept_maps', mapId));
    }
  } catch (error) {
    console.error('Erro ao excluir mapa do Firestore:', error);
  }

  try {
    const localRaw = localStorage.getItem(getLocalMapsKey(projectId));
    if (localRaw) {
      const list: ChapterConceptMap[] = JSON.parse(localRaw);
      const filtered = list.filter(m => m.id !== mapId);
      localStorage.setItem(getLocalMapsKey(projectId), JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Erro ao atualizar cache local ao excluir mapa:', e);
  }
};
