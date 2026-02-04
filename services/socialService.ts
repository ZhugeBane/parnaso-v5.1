
import { User, Friendship, Message, Group, ForumThread, ForumReply, Competition } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  or,
  and,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { getAllUsers } from './authService';

// --- Friendships ---

export const getFriendships = async (): Promise<Friendship[]> => {
  // This fetches ALL friendships, ideally we filter by user in query
  // But to keep signature compatible with legacy sync calls, we'll fetch relevant ones or return subset
  // For a real app, this should only fetch *my* friendships
  const snapshot = await getDocs(collection(db, 'friendships'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Friendship));
};

export const getFriendsList = async (userId: string): Promise<{ user: User, friendshipId: string }[]> => {
  const q = query(collection(db, 'friendships'), 
    where('status', '==', 'accepted'),
    or(where('requesterId', '==', userId), where('receiverId', '==', userId))
  );
  const snapshot = await getDocs(q);
  const allUsers = await getAllUsers();

  return snapshot.docs.map(doc => {
    const f = doc.data() as Friendship;
    const friendId = f.requesterId === userId ? f.receiverId : f.requesterId;
    const friendUser = allUsers.find(u => u.id === friendId);
    return friendUser ? { user: friendUser, friendshipId: doc.id } : null;
  }).filter(Boolean) as any;
};

export const getPendingRequests = async (userId: string): Promise<{ user: User, friendshipId: string, type: 'received' | 'sent' }[]> => {
  // Firestore OR queries have limitations, let's do two queries or one complex one
  // Simplest: fetch where receiver OR requester is me, then filter in JS for pending
  const q = query(collection(db, 'friendships'), 
    where('status', '==', 'pending'),
    or(where('requesterId', '==', userId), where('receiverId', '==', userId))
  );
  const snapshot = await getDocs(q);
  const allUsers = await getAllUsers();

  return snapshot.docs.map(doc => {
    const f = doc.data() as Friendship;
    const isReceived = f.receiverId === userId;
    const otherId = isReceived ? f.requesterId : f.receiverId;
    const otherUser = allUsers.find(u => u.id === otherId);
    
    return otherUser ? {
      user: otherUser,
      friendshipId: doc.id,
      type: isReceived ? 'received' : 'sent'
    } : null;
  }).filter(Boolean) as any;
};

export const getAvailableUsers = async (currentUserId: string): Promise<User[]> => {
  const allUsers = await getAllUsers();
  
  // Get my friendships
  const q = query(collection(db, 'friendships'), or(where('requesterId', '==', currentUserId), where('receiverId', '==', currentUserId)));
  const snapshot = await getDocs(q);
  const friendships = snapshot.docs.map(d => d.data() as Friendship);

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

// --- GROUPS ---

export const getUserGroups = async (userId: string): Promise<Group[]> => {
  const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Group));
};

export const createGroup = async (name: string, adminId: string, memberIds: string[]) => {
  await addDoc(collection(db, 'groups'), {
    name,
    adminId,
    members: [adminId, ...memberIds],
    createdAt: new Date().toISOString()
  });
};

// --- Messages ---

export const getConversation = async (userId1: string, userId2: string): Promise<Message[]> => {
  // In a real app, use a subcollection or a 'chatId' field. 
  // For now, simple query. Requires composite index likely.
  const q = query(collection(db, 'messages'), 
    or(
      and(where('senderId', '==', userId1), where('receiverId', '==', userId2)),
      and(where('senderId', '==', userId2), where('receiverId', '==', userId1))
    )
  );
  
  const snapshot = await getDocs(q);
  const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
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
  // orderBy requires index, might fail initially. If so, remove orderBy.
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
