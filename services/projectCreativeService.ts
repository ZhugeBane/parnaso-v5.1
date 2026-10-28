import { Character, ChapterConceptMap, ProjectComment, StorySkeletonItem, StoryEnvironment, ProjectDiaryEntry } from '../types';
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
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

// Local storage key helpers
const getLocalCharactersKey = (projectId: string) => `parnaso_characters_${projectId}`;
const getLocalMapsKey = (projectId: string) => `parnaso_concept_maps_${projectId}`;
const getLocalCommentsKey = (projectId: string) => `parnaso_comments_${projectId}`;
const getLocalSkeletonKey = (projectId: string) => `parnaso_skeleton_${projectId}`;
const getLocalEnvironmentsKey = (projectId: string) => `parnaso_environments_${projectId}`;
const getLocalDiaryKey = (projectId: string) => `parnaso_diary_${projectId}`;

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
    if (id && !id.startsWith('local_') && !id.startsWith('temp_') && !id.startsWith('char_') && id.length >= 15) {
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
    if (id && !id.startsWith('local_') && !id.startsWith('temp_') && !id.startsWith('map_') && id.length >= 15) {
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

// --- POST-IT COMMENTS ---

export const getProjectComments = async (projectId: string, userId: string): Promise<ProjectComment[]> => {
  // Read local cache first for instant response
  const localRaw = localStorage.getItem(getLocalCommentsKey(projectId));
  let cached: ProjectComment[] = [];
  if (localRaw) {
    try {
      cached = JSON.parse(localRaw);
    } catch (e) {
      console.warn('Erro ao ler cache local de comentários:', e);
    }
  }

  try {
    const q = query(
      collection(db, 'project_comments'),
      where('projectId', '==', projectId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const remoteComments = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as ProjectComment[];

    // Sort descending by createdAt (newest first)
    remoteComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Update cache
    localStorage.setItem(getLocalCommentsKey(projectId), JSON.stringify(remoteComments));
    return remoteComments;
  } catch (error) {
    console.warn('Usando comentários do cache local devido a erro no Firestore:', error);
    return cached;
  }
};

export const saveProjectComment = async (comment: ProjectComment, userId: string): Promise<ProjectComment> => {
  const { id, ...data } = comment;
  const cleanData = cleanDataForFirestore({
    ...data,
    userId,
    updatedAt: new Date().toISOString()
  });

  let savedComment: ProjectComment = { ...comment };

  try {
    if (id && !id.startsWith('local_') && !id.startsWith('temp_') && !id.startsWith('comment_') && id.length >= 15) {
      // Update existing
      const docRef = doc(db, 'project_comments', id);
      await setDoc(docRef, cleanData, { merge: true });
      savedComment = { ...comment, ...cleanData, id };
    } else {
      // Create new
      const docRef = await addDoc(collection(db, 'project_comments'), {
        ...cleanData,
        createdAt: comment.createdAt || new Date().toISOString()
      });
      savedComment = { ...comment, ...cleanData, id: docRef.id };
    }
  } catch (error) {
    console.error('Erro ao salvar comentário no Firestore, salvando localmente:', error);
    if (!savedComment.id) {
      savedComment.id = 'local_comment_' + Date.now();
    }
  }

  // Update local cache
  try {
    const localRaw = localStorage.getItem(getLocalCommentsKey(comment.projectId));
    let list: ProjectComment[] = localRaw ? JSON.parse(localRaw) : [];
    const index = list.findIndex(c => c.id === savedComment.id);
    if (index >= 0) {
      list[index] = savedComment;
    } else {
      list.unshift(savedComment);
    }
    localStorage.setItem(getLocalCommentsKey(comment.projectId), JSON.stringify(list));
  } catch (e) {
    console.error('Erro ao atualizar cache local de comentários:', e);
  }

  return savedComment;
};

export const deleteProjectComment = async (commentId: string, projectId: string): Promise<void> => {
  try {
    if (commentId && !commentId.startsWith('local_')) {
      await deleteDoc(doc(db, 'project_comments', commentId));
    }
  } catch (error) {
    console.error('Erro ao excluir comentário do Firestore:', error);
  }

  try {
    const localRaw = localStorage.getItem(getLocalCommentsKey(projectId));
    if (localRaw) {
      const list: ProjectComment[] = JSON.parse(localRaw);
      const filtered = list.filter(c => c.id !== commentId);
      localStorage.setItem(getLocalCommentsKey(projectId), JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Erro ao atualizar cache local ao excluir comentário:', e);
  }
};



// ==========================================
// 4. STORY SKELETON (Esqueleto da Obra / Ideias Encadeadas)
// ==========================================

export const getStorySkeleton = async (projectId: string, userId: string): Promise<StorySkeletonItem[]> => {
  const localRaw = localStorage.getItem(getLocalSkeletonKey(projectId));
  let cached: StorySkeletonItem[] = [];
  if (localRaw) {
    try {
      cached = JSON.parse(localRaw);
    } catch (e) {
      console.warn('Erro ao ler cache de esqueleto:', e);
    }
  }

  try {
    const q = query(
      collection(db, 'project_skeleton_items'),
      where('projectId', '==', projectId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const remoteItems = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as StorySkeletonItem[];

    // Sort by order ascending
    remoteItems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    localStorage.setItem(getLocalSkeletonKey(projectId), JSON.stringify(remoteItems));
    return remoteItems;
  } catch (error) {
    console.warn('Usando esqueleto do cache local devido a erro no Firestore:', error);
    return cached;
  }
};

export const subscribeToStorySkeleton = (
  projectId: string,
  userId: string,
  callback: (items: StorySkeletonItem[]) => void
): (() => void) => {
  if (!projectId || !userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'project_skeleton_items'),
    where('projectId', '==', projectId),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as StorySkeletonItem[];
    items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    try {
      localStorage.setItem(getLocalSkeletonKey(projectId), JSON.stringify(items));
    } catch {}
    callback(items);
  }, (err) => {
    console.warn('Erro no listener de esqueleto:', err);
  });
};

export const saveStorySkeletonItem = async (
  item: StorySkeletonItem,
  userId: string
): Promise<StorySkeletonItem> => {
  const { id, ...data } = item;
  const cleanData = cleanDataForFirestore({
    ...data,
    userId,
    updatedAt: new Date().toISOString()
  });

  let savedItem: StorySkeletonItem = { ...item };

  try {
    if (id && !id.startsWith('local_') && !id.startsWith('temp_') && id.length >= 15) {
      const docRef = doc(db, 'project_skeleton_items', id);
      await setDoc(docRef, cleanData, { merge: true });
      savedItem = { ...item, ...cleanData, id };
    } else {
      const docRef = await addDoc(collection(db, 'project_skeleton_items'), {
        ...cleanData,
        createdAt: item.createdAt || new Date().toISOString()
      });
      savedItem = { ...item, ...cleanData, id: docRef.id };
    }
  } catch (error) {
    console.error('Erro ao salvar item do esqueleto no Firestore, salvando localmente:', error);
    if (!savedItem.id) {
      savedItem.id = 'local_skel_' + Date.now();
    }
  }

  // Update local cache
  try {
    const localRaw = localStorage.getItem(getLocalSkeletonKey(item.projectId));
    let list: StorySkeletonItem[] = localRaw ? JSON.parse(localRaw) : [];
    const index = list.findIndex(i => i.id === savedItem.id);
    if (index >= 0) {
      list[index] = savedItem;
    } else {
      list.push(savedItem);
    }
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    localStorage.setItem(getLocalSkeletonKey(item.projectId), JSON.stringify(list));
  } catch (e) {
    console.error('Erro ao atualizar cache local de esqueleto:', e);
  }

  return savedItem;
};

export const deleteStorySkeletonItem = async (itemId: string, projectId: string): Promise<void> => {
  try {
    if (itemId && !itemId.startsWith('local_')) {
      await deleteDoc(doc(db, 'project_skeleton_items', itemId));
    }
  } catch (error) {
    console.error('Erro ao excluir item do esqueleto no Firestore:', error);
  }

  try {
    const localRaw = localStorage.getItem(getLocalSkeletonKey(projectId));
    if (localRaw) {
      const list: StorySkeletonItem[] = JSON.parse(localRaw);
      const filtered = list.filter(i => i.id !== itemId);
      // Re-normalize order
      filtered.forEach((item, idx) => {
        item.order = idx + 1;
      });
      localStorage.setItem(getLocalSkeletonKey(projectId), JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Erro ao atualizar cache local ao excluir item do esqueleto:', e);
  }
};

export const reorderStorySkeleton = async (
  projectId: string,
  userId: string,
  orderedItems: StorySkeletonItem[]
): Promise<void> => {
  const normalized = orderedItems.map((item, idx) => ({
    ...item,
    order: idx + 1,
    updatedAt: new Date().toISOString()
  }));

  // Update local cache immediately for instantaneous responsiveness
  try {
    localStorage.setItem(getLocalSkeletonKey(projectId), JSON.stringify(normalized));
  } catch {}

  // Update in Firestore
  try {
    const batch = writeBatch(db);
    for (const item of normalized) {
      if (item.id && !item.id.startsWith('local_')) {
        const docRef = doc(db, 'project_skeleton_items', item.id);
        batch.update(docRef, { order: item.order, updatedAt: item.updatedAt });
      }
    }
    await batch.commit();
  } catch (error) {
    console.warn('Erro ao atualizar reordenação de esqueleto no Firestore:', error);
  }
};

export const createQuickChapter = async (
  projectId: string,
  userId: string,
  chapterTitle: string
): Promise<StorySkeletonItem> => {
  const currentItems = await getStorySkeleton(projectId, userId);
  const nextOrder = currentItems.length + 1;
  const initialIdeaId = `idea_skel_${Date.now()}_1`;

  const newItem: StorySkeletonItem = {
    id: `skel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    projectId,
    userId,
    order: nextOrder,
    title: chapterTitle.trim(),
    status: 'draft',
    content: '',
    ideas: [{ id: initialIdeaId, content: '' }],
    createdAt: new Date().toISOString()
  };

  return await saveStorySkeletonItem(newItem, userId);
};

// ==========================================
// 5. PHYSICAL ENVIRONMENTS (Ambientes Físicos / Cenários)
// ==========================================

export const getStoryEnvironments = async (projectId: string, userId: string): Promise<StoryEnvironment[]> => {
  const localRaw = localStorage.getItem(getLocalEnvironmentsKey(projectId));
  let cached: StoryEnvironment[] = [];
  if (localRaw) {
    try {
      cached = JSON.parse(localRaw);
    } catch (e) {
      console.warn('Erro ao ler cache de ambientes físicos:', e);
    }
  }

  try {
    const q = query(
      collection(db, 'project_environments'),
      where('projectId', '==', projectId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const remoteEnvs = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as StoryEnvironment[];

    remoteEnvs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    localStorage.setItem(getLocalEnvironmentsKey(projectId), JSON.stringify(remoteEnvs));
    return remoteEnvs;
  } catch (error) {
    console.warn('Usando ambientes físicos do cache local devido a erro no Firestore:', error);
    return cached;
  }
};

export const subscribeToStoryEnvironments = (
  projectId: string,
  userId: string,
  callback: (envs: StoryEnvironment[]) => void
): (() => void) => {
  if (!projectId || !userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'project_environments'),
    where('projectId', '==', projectId),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const envs = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as StoryEnvironment[];
    envs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    try {
      localStorage.setItem(getLocalEnvironmentsKey(projectId), JSON.stringify(envs));
    } catch {}
    callback(envs);
  }, (err) => {
    console.warn('Erro no listener de ambientes físicos:', err);
  });
};

export const saveStoryEnvironment = async (
  env: StoryEnvironment,
  userId: string
): Promise<StoryEnvironment> => {
  const { id, ...data } = env;
  const cleanData = cleanDataForFirestore({
    ...data,
    userId,
    updatedAt: new Date().toISOString()
  });

  let savedEnv: StoryEnvironment = { ...env };

  try {
    if (id && !id.startsWith('local_') && !id.startsWith('temp_') && id.length >= 15) {
      const docRef = doc(db, 'project_environments', id);
      await setDoc(docRef, cleanData, { merge: true });
      savedEnv = { ...env, ...cleanData, id };
    } else {
      const docRef = await addDoc(collection(db, 'project_environments'), {
        ...cleanData,
        createdAt: env.createdAt || new Date().toISOString()
      });
      savedEnv = { ...env, ...cleanData, id: docRef.id };
    }
  } catch (error) {
    console.error('Erro ao salvar ambiente no Firestore, salvando localmente:', error);
    if (!savedEnv.id) {
      savedEnv.id = 'local_env_' + Date.now();
    }
  }

  // Update local cache
  try {
    const localRaw = localStorage.getItem(getLocalEnvironmentsKey(env.projectId));
    let list: StoryEnvironment[] = localRaw ? JSON.parse(localRaw) : [];
    const index = list.findIndex(e => e.id === savedEnv.id);
    if (index >= 0) {
      list[index] = savedEnv;
    } else {
      list.push(savedEnv);
    }
    localStorage.setItem(getLocalEnvironmentsKey(env.projectId), JSON.stringify(list));
  } catch (e) {
    console.error('Erro ao atualizar cache local de ambiente:', e);
  }

  return savedEnv;
};

export const deleteStoryEnvironment = async (envId: string, projectId: string): Promise<void> => {
  try {
    if (envId && !envId.startsWith('local_')) {
      await deleteDoc(doc(db, 'project_environments', envId));
    }
  } catch (error) {
    console.error('Erro ao excluir ambiente do Firestore:', error);
  }

  try {
    const localRaw = localStorage.getItem(getLocalEnvironmentsKey(projectId));
    if (localRaw) {
      const list: StoryEnvironment[] = JSON.parse(localRaw);
      const filtered = list.filter(e => e.id !== envId);
      localStorage.setItem(getLocalEnvironmentsKey(projectId), JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Erro ao atualizar cache local ao excluir ambiente:', e);
  }
};

// ==========================================
// 6. PROJECT DIARY (Diário da Obra)
// ==========================================

export const getProjectDiaryEntries = async (
  projectId: string,
  userId: string
): Promise<ProjectDiaryEntry[]> => {
  const localRaw = localStorage.getItem(getLocalDiaryKey(projectId));
  let cached: ProjectDiaryEntry[] = [];
  if (localRaw) {
    try {
      cached = JSON.parse(localRaw);
    } catch (e) {
      console.warn('Erro ao ler cache de diário:', e);
    }
  }

  try {
    const q = query(
      collection(db, 'project_diary_entries'),
      where('projectId', '==', projectId),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const remote = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as ProjectDiaryEntry[];

    // Sort descending by entryDate / createdAt (most recent first)
    remote.sort((a, b) => new Date(b.entryDate || b.createdAt).getTime() - new Date(a.entryDate || a.createdAt).getTime());

    localStorage.setItem(getLocalDiaryKey(projectId), JSON.stringify(remote));
    return remote;
  } catch (error) {
    console.warn('Usando páginas do diário do cache local devido a erro no Firestore:', error);
    return cached;
  }
};

export const saveProjectDiaryEntry = async (
  entry: ProjectDiaryEntry,
  userId: string
): Promise<ProjectDiaryEntry> => {
  const { id, ...data } = entry;
  const now = new Date().toISOString();
  const cleanData = cleanDataForFirestore({
    ...data,
    userId,
    entryDate: entry.entryDate || now,
    updatedAt: now
  });

  let savedEntry: ProjectDiaryEntry = { ...entry };

  try {
    if (id && !id.startsWith('local_') && !id.startsWith('temp_') && id.length >= 15) {
      const docRef = doc(db, 'project_diary_entries', id);
      await setDoc(docRef, cleanData, { merge: true });
      savedEntry = { ...entry, ...cleanData, id };
    } else {
      const docRef = await addDoc(collection(db, 'project_diary_entries'), {
        ...cleanData,
        createdAt: entry.createdAt || now
      });
      savedEntry = { ...entry, ...cleanData, id: docRef.id };
    }
  } catch (error) {
    console.warn('Erro ao salvar página no Firestore, salvando apenas localmente:', error);
    if (!savedEntry.id) {
      savedEntry.id = `local_diary_${Date.now()}`;
    }
  }

  // Update local cache
  try {
    const localRaw = localStorage.getItem(getLocalDiaryKey(entry.projectId));
    let list: ProjectDiaryEntry[] = localRaw ? JSON.parse(localRaw) : [];
    const idx = list.findIndex(e => e.id === savedEntry.id);
    if (idx >= 0) {
      list[idx] = savedEntry;
    } else {
      list.unshift(savedEntry);
    }
    list.sort((a, b) => new Date(b.entryDate || b.createdAt).getTime() - new Date(a.entryDate || a.createdAt).getTime());
    localStorage.setItem(getLocalDiaryKey(entry.projectId), JSON.stringify(list));
  } catch (e) {
    console.error('Erro ao salvar no cache local:', e);
  }

  return savedEntry;
};

export const deleteProjectDiaryEntry = async (
  entryId: string,
  projectId: string,
  userId: string
): Promise<void> => {
  try {
    if (entryId && !entryId.startsWith('local_') && !entryId.startsWith('temp_')) {
      await deleteDoc(doc(db, 'project_diary_entries', entryId));
    }
  } catch (error) {
    console.warn('Erro ao deletar página do Firestore:', error);
  }

  try {
    const localRaw = localStorage.getItem(getLocalDiaryKey(projectId));
    if (localRaw) {
      const list: ProjectDiaryEntry[] = JSON.parse(localRaw);
      const filtered = list.filter(e => e.id !== entryId);
      localStorage.setItem(getLocalDiaryKey(projectId), JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Erro ao atualizar cache local ao excluir página do diário:', e);
  }
};

export const subscribeToProjectDiaryEntries = (
  projectId: string,
  userId: string,
  callback: (entries: ProjectDiaryEntry[]) => void
): (() => void) => {
  // Read local cache immediately
  const localRaw = localStorage.getItem(getLocalDiaryKey(projectId));
  if (localRaw) {
    try {
      callback(JSON.parse(localRaw));
    } catch {}
  }

  try {
    const q = query(
      collection(db, 'project_diary_entries'),
      where('projectId', '==', projectId),
      where('userId', '==', userId)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as ProjectDiaryEntry[];
        entries.sort((a, b) => new Date(b.entryDate || b.createdAt).getTime() - new Date(a.entryDate || a.createdAt).getTime());
        localStorage.setItem(getLocalDiaryKey(projectId), JSON.stringify(entries));
        callback(entries);
      },
      (err) => {
        console.warn('Erro no listener de diário da obra:', err);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
};

// ==========================================
// 7. CREATIVE COUNTS HELPER (para os cards de Obras)
// ==========================================

export interface ProjectCreativeCounts {
  skeletonCount: number;
  environmentsCount: number;
  charactersCount: number;
  mapsCount: number;
  diaryCount: number;
}

export const getProjectCreativeCounts = async (
  projectId: string,
  userId: string
): Promise<ProjectCreativeCounts> => {
  // Try local caches first for zero-latency
  let skeletonCount = 0;
  let environmentsCount = 0;
  let charactersCount = 0;
  let mapsCount = 0;
  let diaryCount = 0;

  try {
    const skRaw = localStorage.getItem(getLocalSkeletonKey(projectId));
    if (skRaw) skeletonCount = JSON.parse(skRaw).length;
    const envRaw = localStorage.getItem(getLocalEnvironmentsKey(projectId));
    if (envRaw) environmentsCount = JSON.parse(envRaw).length;
    const charRaw = localStorage.getItem(getLocalCharactersKey(projectId));
    if (charRaw) charactersCount = JSON.parse(charRaw).length;
    const mapRaw = localStorage.getItem(getLocalMapsKey(projectId));
    if (mapRaw) mapsCount = JSON.parse(mapRaw).length;
    const diaryRaw = localStorage.getItem(getLocalDiaryKey(projectId));
    if (diaryRaw) diaryCount = JSON.parse(diaryRaw).length;
  } catch {}

  // Fetch Firestore in parallel
  try {
    const [skSnap, envSnap, diarySnap] = await Promise.all([
      getDocs(query(collection(db, 'project_skeleton_items'), where('projectId', '==', projectId), where('userId', '==', userId))),
      getDocs(query(collection(db, 'project_environments'), where('projectId', '==', projectId), where('userId', '==', userId))),
      getDocs(query(collection(db, 'project_diary_entries'), where('projectId', '==', projectId), where('userId', '==', userId)))
    ]);
    skeletonCount = skSnap.size;
    environmentsCount = envSnap.size;
    diaryCount = diarySnap.size;
  } catch (err) {
    // Keep local fallback
  }

  return { skeletonCount, environmentsCount, charactersCount, mapsCount, diaryCount };
};
