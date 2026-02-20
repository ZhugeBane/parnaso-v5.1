// TEMPORARY FIX: Simplified social service to fix TypeScript build errors
// Complex Firestore queries with or() and and() were causing compilation issues
// This version fetches all data and filters in memory

import { User, Friendship, Message, Guild, GuildForumThread, GuildForumReply, Competition, ForumThread, ForumReply } from '../types';
import { db, storage } from '../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAllUsers } from './authService';

// --- Friendships ---

export const getFriendships = async (): Promise<Friendship[]> => {
  const snapshot = await getDocs(collection(db, 'friendships'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Friendship));
};

export const getFriendsList = async (userId: string): Promise<{ user: User, friendshipId: string }[]> => {
  // Fetch all friendships and filter in memory to avoid complex query syntax issues
  const snapshot = await getDocs(collection(db, 'friendships'));
  const allUsers = await getAllUsers();

  return snapshot.docs
    .map(doc => {
      const f = doc.data() as Friendship;
      // Only include accepted friendships where user is involved
      if (f.status !== 'accepted') return null;
      if (f.requesterId !== userId && f.receiverId !== userId) return null;

      const friendId = f.requesterId === userId ? f.receiverId : f.requesterId;
      const friendUser = allUsers.find(u => u.id === friendId);
      return friendUser ? { user: friendUser, friendshipId: doc.id } : null;
    })
    .filter(Boolean) as { user: User, friendshipId: string }[];
};

export const getPendingRequests = async (userId: string): Promise<{ user: User, friendshipId: string, type: 'received' | 'sent' }[]> => {
  // Fetch all pending friendships and filter in memory
  const snapshot = await getDocs(collection(db, 'friendships'));
  const allUsers = await getAllUsers();

  return snapshot.docs
    .map(doc => {
      const f = doc.data() as Friendship;
      // Only include pending requests where user is involved
      if (f.status !== 'pending') return null;
      if (f.requesterId !== userId && f.receiverId !== userId) return null;

      const isReceived = f.receiverId === userId;
      const otherId = isReceived ? f.requesterId : f.receiverId;
      const otherUser = allUsers.find(u => u.id === otherId);

      return otherUser ? {
        user: otherUser,
        friendshipId: doc.id,
        type: isReceived ? 'received' as const : 'sent' as const
      } : null;
    })
    .filter(Boolean) as { user: User, friendshipId: string, type: 'received' | 'sent' }[];
};

export const getAvailableUsers = async (currentUserId: string): Promise<User[]> => {
  const allUsers = await getAllUsers();

  // Get my friendships - fetch all and filter in memory
  const snapshot = await getDocs(collection(db, 'friendships'));
  const friendships = snapshot.docs
    .map(d => d.data() as Friendship)
    .filter(f => f.requesterId === currentUserId || f.receiverId === currentUserId);

  return allUsers.filter(u => {
    if (u.id === currentUserId) return false;
    if (u.role === 'admin') return false;
    if (u.isBlocked) return false;

    const hasRelation = friendships.some(f =>
      (f.requesterId === currentUserId && f.receiverId === u.id) ||
      (f.requesterId === u.id && f.receiverId === currentUserId)
    );

    return !hasRelation;
  });
};

export const sendFriendRequest = async (requesterId: string, receiverId: string) => {
  await addDoc(collection(db, 'friendships'), {
    requesterId,
    receiverId,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
};

export const acceptFriendRequest = async (friendshipId: string) => {
  await updateDoc(doc(db, 'friendships', friendshipId), { status: 'accepted' });
};

export const removeFriendship = async (friendshipId: string) => {
  await deleteDoc(doc(db, 'friendships', friendshipId));
};

// --- GUILDS (Previously Groups) ---

export const getUserGuilds = async (userId: string): Promise<Guild[]> => {
  // We use the same 'groups' collection for legacy compatibility
  const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Guild));
};

// Legacy alias
export const getUserGroups = getUserGuilds;

export const createGuild = async (name: string, adminId: string, memberIds: string[], description?: string) => {
  return await addDoc(collection(db, 'groups'), {
    name,
    adminId,
    description: description || '',
    members: [adminId, ...memberIds],
    createdAt: new Date().toISOString()
  });
};

// Legacy alias
export const createGroup = createGuild;

export const updateGuildEmblem = async (guildId: string, file: File) => {
  const storageRef = ref(storage, `guilds/${guildId}/emblem_${Date.now()}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  await updateDoc(doc(db, 'groups', guildId), {
    emblemUrl: downloadURL
  });

  return downloadURL;
};

// --- GUILD FORUM ---

export const getGuildThreads = async (guildId: string): Promise<GuildForumThread[]> => {
  const q = query(
    collection(db, 'guild_threads'),
    where('guildId', '==', guildId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GuildForumThread));
};

export const createGuildThread = async (guildId: string, authorId: string, title: string, content: string) => {
  await addDoc(collection(db, 'guild_threads'), {
    guildId,
    authorId,
    title,
    content,
    createdAt: new Date().toISOString()
  });
};

export const getGuildReplies = async (threadId: string): Promise<GuildForumReply[]> => {
  const q = query(collection(db, 'guild_replies'), where('threadId', '==', threadId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GuildForumReply));
};

export const replyToGuildThread = async (authorId: string, threadId: string, content: string) => {
  await addDoc(collection(db, 'guild_replies'), {
    threadId,
    authorId,
    content,
    createdAt: new Date().toISOString()
  });
};

// --- Messages ---

export const getConversation = async (userId1: string, userId2: string): Promise<Message[]> => {
  // Fetch all messages and filter in memory to avoid complex query syntax
  const snapshot = await getDocs(collection(db, 'messages'));
  const msgs = snapshot.docs
    .map(d => ({ id: d.id, ...d.data() } as Message))
    .filter(msg =>
      (msg.senderId === userId1 && msg.receiverId === userId2) ||
      (msg.senderId === userId2 && msg.receiverId === userId1)
    );
  return msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const getGroupMessages = async (groupId: string): Promise<Message[]> => {
  const q = query(collection(db, 'messages'), where('groupId', '==', groupId));
  const snapshot = await getDocs(q);
  const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
  return msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const sendMessage = async (senderId: string, receiverId: string, content: string) => {
  await addDoc(collection(db, 'messages'), {
    senderId,
    receiverId,
    content,
    timestamp: new Date().toISOString(),
    read: false
  });
};

export const sendGroupMessage = async (senderId: string, groupId: string, content: string) => {
  await addDoc(collection(db, 'messages'), {
    senderId,
    groupId,
    content,
    timestamp: new Date().toISOString(),
    read: false
  });
};

export const markAsRead = async (senderId: string, receiverId: string) => {
  // Batch update difficult without knowing IDs. Skipping for MVP optimization.
};

// --- FORUM ---

export const getForumThreads = async (): Promise<ForumThread[]> => {
  const q = query(collection(db, 'forum_threads'), orderBy('createdAt', 'desc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ForumThread));
  } catch {
    const snapshot = await getDocs(collection(db, 'forum_threads'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ForumThread));
  }
};

export const getForumReplies = async (threadId: string): Promise<ForumReply[]> => {
  const q = query(collection(db, 'forum_replies'), where('threadId', '==', threadId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ForumReply));
};

export const createForumThread = async (authorId: string, title: string, content: string, category: string) => {
  await addDoc(collection(db, 'forum_threads'), {
    authorId,
    title,
    content,
    category,
    createdAt: new Date().toISOString(),
    likes: []
  });
};

export const replyToThread = async (authorId: string, threadId: string, content: string) => {
  await addDoc(collection(db, 'forum_replies'), {
    threadId,
    authorId,
    content,
    createdAt: new Date().toISOString()
  });
};

// --- COMPETITIONS ---

export const getCompetitions = async (): Promise<Competition[]> => {
  const snapshot = await getDocs(collection(db, 'competitions'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Competition));
};

export const createCompetition = async (creatorId: string, title: string, description: string, type: string, target: number, durationDays: number) => {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);

  await addDoc(collection(db, 'competitions'), {
    creatorId,
    title,
    description,
    type,
    target,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    participants: [creatorId],
    status: 'active'
  });
};

export const joinCompetition = async (competitionId: string, userId: string) => {
  const ref = doc(db, 'competitions', competitionId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as Competition;
    if (!data.participants.includes(userId)) {
      await updateDoc(ref, {
        participants: [...data.participants, userId]
      });
    }
  }
};

// --- DELETE OPERATIONS (Admin) ---

export const deleteForumThread = async (threadId: string) => {
  await deleteDoc(doc(db, 'forum_threads', threadId));
};

export const deleteForumReply = async (replyId: string) => {
  await deleteDoc(doc(db, 'forum_replies', replyId));
};

export const deleteCompetition = async (competitionId: string) => {
  await deleteDoc(doc(db, 'competitions', competitionId));
};
