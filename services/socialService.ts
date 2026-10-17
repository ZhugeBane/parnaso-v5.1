// Social Service - Friends, Blocking, Guilds, Forum, Challenges, and Agora Voice Room

import {
  User,
  Friendship,
  Message,
  Guild,
  GuildForumThread,
  GuildForumReply,
  Competition,
  ForumThread,
  ForumReply,
  GuildChallenge,
  AgoraParticipant,
  AgoraSignalMessage
} from '../types';
import { db, auth } from '../lib/firebase';
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
  getDoc,
  setDoc
} from 'firebase/firestore';
import { getAllUsers } from './authService';
import { sanitizeText, sanitizeMetricNumber, toSafePublicUser } from '../utils/cryptoUtils';

// --- Friendships & Blocking ---

type RawFriendshipDoc = Friendship & {
  id: string;
  recipientId?: string;
  user1?: string;
  user2?: string;
  updatedAt?: string;
};

interface ResolvedPairRelation {
  otherUserId: string;
  status: 'accepted' | 'pending' | 'blocked' | 'none';
  friendshipId: string;
  direction?: 'received' | 'sent';
  createdAt?: string;
  blockedBy?: string;
}

const getDocTimestampMs = (f: Partial<RawFriendshipDoc>): number => {
  const ts = f.updatedAt || f.createdAt;
  if (!ts) return 0;
  const parsed = new Date(ts).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getPairUsers = (f: Partial<RawFriendshipDoc>): { reqId?: string; recId?: string } => {
  const reqId = f.requesterId || f.user1;
  const recId = f.receiverId || f.recipientId || f.user2;
  return { reqId, recId };
};

const canCurrentUserModifyDoc = (d: RawFriendshipDoc, uid: string): boolean => {
  return (
    d.requesterId === uid ||
    d.recipientId === uid ||
    d.user1 === uid ||
    d.user2 === uid
  );
};

/**
 * Resolves the effective relationship state between `userId` and every other user
 * across all documents in `friendships`, handling cases where a legacy `'pending'` doc
 * could not be updated/deleted in-place by the receiver due to Firestore rules and was
 * superseded by a newer `'accepted'` or `'removed'` document.
 */
const resolveRelationsForUser = (
  allDocs: RawFriendshipDoc[],
  userId: string
): Map<string, ResolvedPairRelation> => {
  const byOtherUser = new Map<string, RawFriendshipDoc[]>();

  for (const d of allDocs) {
    const { reqId, recId } = getPairUsers(d);
    if (reqId !== userId && recId !== userId) continue;
    const otherId = reqId === userId ? recId : reqId;
    if (!otherId || otherId === userId) continue;
    const list = byOtherUser.get(otherId) || [];
    list.push(d);
    byOtherUser.set(otherId, list);
  }

  const resolved = new Map<string, ResolvedPairRelation>();

  byOtherUser.forEach((docsForPair, otherId) => {
    // 1. Block always takes highest priority
    const blockedDoc = docsForPair.find(d => d.status === 'blocked');
    if (blockedDoc) {
      resolved.set(otherId, {
        otherUserId: otherId,
        status: 'blocked',
        friendshipId: blockedDoc.id,
        blockedBy: blockedDoc.blockedBy || blockedDoc.requesterId
      });
      return;
    }

    // 2. Find latest removal/rejection timestamp
    const removedDocs = docsForPair.filter(
      d => (d.status as string) === 'removed' || (d.status as string) === 'rejected'
    );
    const latestRemovedMs = removedDocs.length > 0
      ? Math.max(0, ...removedDocs.map(getDocTimestampMs))
      : 0;

    // 3. Active docs are those created/updated strictly after the latest removal (or when no removal exists)
    const activeDocs = docsForPair.filter(d => {
      if (d.status !== 'accepted' && d.status !== 'pending') return false;
      if (latestRemovedMs === 0) return true;
      return getDocTimestampMs(d) > latestRemovedMs;
    });

    // Silently clean up any stale/superseded docs that the current user has permission to delete
    for (const d of docsForPair) {
      const isSupersededByRemoval =
        (d.status === 'accepted' || d.status === 'pending') &&
        latestRemovedMs > 0 &&
        getDocTimestampMs(d) <= latestRemovedMs;
      if (isSupersededByRemoval && canCurrentUserModifyDoc(d, userId)) {
        deleteDoc(doc(db, 'friendships', d.id)).catch(() => {});
      }
    }

    if (activeDocs.length === 0) {
      resolved.set(otherId, {
        otherUserId: otherId,
        status: 'none',
        friendshipId: ''
      });
      return;
    }

    // 4. If any active doc is 'accepted', the friendship is accepted
    const acceptedDocs = activeDocs
      .filter(d => d.status === 'accepted')
      .sort((a, b) => getDocTimestampMs(b) - getDocTimestampMs(a));

    if (acceptedDocs.length > 0) {
      const primaryAccepted = acceptedDocs[0];
      // Clean up any leftover pending docs that the current user owns
      for (const d of activeDocs) {
        if (d.id !== primaryAccepted.id && canCurrentUserModifyDoc(d, userId)) {
          deleteDoc(doc(db, 'friendships', d.id)).catch(() => {});
        }
      }
      resolved.set(otherId, {
        otherUserId: otherId,
        status: 'accepted',
        friendshipId: primaryAccepted.id,
        createdAt: primaryAccepted.updatedAt || primaryAccepted.createdAt
      });
      return;
    }

    // 5. Otherwise, the relationship is 'pending'
    const pendingDocs = activeDocs
      .filter(d => d.status === 'pending')
      .sort((a, b) => getDocTimestampMs(b) - getDocTimestampMs(a));

    if (pendingDocs.length > 0) {
      const primaryPending = pendingDocs[0];
      const { recId } = getPairUsers(primaryPending);
      const direction = recId === userId ? 'received' : 'sent';
      resolved.set(otherId, {
        otherUserId: otherId,
        status: 'pending',
        friendshipId: primaryPending.id,
        direction,
        createdAt: primaryPending.createdAt
      });
    }
  });

  return resolved;
};

export const getFriendships = async (): Promise<Friendship[]> => {
  const snapshot = await getDocs(collection(db, 'friendships'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Friendship));
};

export const getFriendsList = async (userId: string): Promise<{ user: User, friendshipId: string }[]> => {
  const snapshot = await getDocs(collection(db, 'friendships'));
  const allUsers = (await getAllUsers()).map(u => toSafePublicUser(u, u.id));
  const allDocs: RawFriendshipDoc[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

  const resolvedMap = resolveRelationsForUser(allDocs, userId);
  const result: { user: User; friendshipId: string }[] = [];

  resolvedMap.forEach(rel => {
    if (rel.status !== 'accepted') return;
    const friendUser = allUsers.find(u => u.id === rel.otherUserId);
    if (!friendUser) return;
    result.push({ user: friendUser, friendshipId: rel.friendshipId });
  });

  return result;
};

export const getPendingRequests = async (
  userId: string
): Promise<{ user: User; friendshipId: string; type: 'received' | 'sent'; createdAt?: string }[]> => {
  const snapshot = await getDocs(collection(db, 'friendships'));
  const allUsers = (await getAllUsers()).map(u => toSafePublicUser(u, u.id));
  const allDocs: RawFriendshipDoc[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

  const resolvedMap = resolveRelationsForUser(allDocs, userId);
  const pendingList: { user: User; friendshipId: string; type: 'received' | 'sent'; createdAt?: string }[] = [];

  resolvedMap.forEach(rel => {
    if (rel.status !== 'pending' || !rel.direction) return;
    const otherUser = allUsers.find(u => u.id === rel.otherUserId);
    if (!otherUser) return;
    pendingList.push({
      user: otherUser,
      friendshipId: rel.friendshipId,
      type: rel.direction,
      createdAt: rel.createdAt
    });
  });

  return pendingList.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
};

export const getBlockedUsersList = async (userId: string): Promise<{ user: User, friendshipId: string }[]> => {
  const snapshot = await getDocs(collection(db, 'friendships'));
  const allUsers = (await getAllUsers()).map(u => toSafePublicUser(u, u.id));
  const seenIds = new Set<string>();

  return snapshot.docs
    .map(d => {
      const f = d.data() as RawFriendshipDoc;
      if (f.status !== 'blocked') return null;
      const blocker = f.blockedBy || f.requesterId;
      if (blocker !== userId) return null;

      const { reqId, recId } = getPairUsers(f);
      const blockedId = reqId === userId ? recId : reqId;
      if (!blockedId || seenIds.has(blockedId)) return null;

      const blockedUser = allUsers.find(u => u.id === blockedId);
      if (!blockedUser) return null;
      seenIds.add(blockedId);
      return { user: blockedUser, friendshipId: d.id };
    })
    .filter(Boolean) as { user: User, friendshipId: string }[];
};

export const getAvailableUsers = async (currentUserId: string): Promise<User[]> => {
  const rawUsers = await getAllUsers();
  const snapshot = await getDocs(collection(db, 'friendships'));
  const allDocs: RawFriendshipDoc[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

  const resolvedMap = resolveRelationsForUser(allDocs, currentUserId);

  return rawUsers
    .filter(u => {
      if (u.id === currentUserId) return false;
      if (u.role === 'admin') return false;
      if (u.isBlocked) return false;

      const rel = resolvedMap.get(u.id);
      if (rel && (rel.status === 'accepted' || rel.status === 'pending' || rel.status === 'blocked')) {
        return false;
      }
      return true;
    })
    .map(u => toSafePublicUser(u, u.id));
};

export const sendFriendRequest = async (requesterId: string, receiverId: string): Promise<string | undefined> => {
  const actorId = auth.currentUser?.uid || requesterId;
  const snapshot = await getDocs(collection(db, 'friendships'));
  const allDocs: RawFriendshipDoc[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

  const pairDocs = allDocs.filter(f => {
    const { reqId, recId } = getPairUsers(f);
    return (
      (reqId === actorId && recId === receiverId) ||
      (reqId === receiverId && recId === actorId)
    );
  });

  if (pairDocs.some(f => f.status === 'blocked')) {
    throw new Error('Não é possível adicionar este usuário pois há um bloqueio ativo.');
  }

  const resolvedMap = resolveRelationsForUser(allDocs, actorId);
  const currentRel = resolvedMap.get(receiverId);
  if (currentRel && (currentRel.status === 'accepted' || currentRel.status === 'pending')) {
    return currentRel.friendshipId;
  }

  // Clean up any old removed/rejected tombstones owned by actorId
  for (const oldDoc of pairDocs) {
    if ((oldDoc.status as string) === 'removed' || (oldDoc.status as string) === 'rejected') {
      deleteDoc(doc(db, 'friendships', oldDoc.id)).catch(() => {});
    }
  }

  const maxExistingMs = Math.max(0, ...pairDocs.map(getDocTimestampMs));
  const nowIso = new Date(Math.max(Date.now(), maxExistingMs + 1000)).toISOString();

  const docRef = await addDoc(collection(db, 'friendships'), {
    requesterId: actorId,
    receiverId,
    recipientId: receiverId,
    user1: actorId,
    user2: receiverId,
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso
  });
  return docRef.id;
};

export const acceptFriendRequest = async (friendshipId: string, userId1?: string, userId2?: string): Promise<string> => {
  const actorId = auth.currentUser?.uid || userId1;
  const snapshot = await getDocs(collection(db, 'friendships'));
  const allDocs: RawFriendshipDoc[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

  const targetDoc = allDocs.find(d => d.id === friendshipId);
  let myUid = actorId;
  let otherUid = userId2;

  if (targetDoc) {
    const { reqId, recId } = getPairUsers(targetDoc);
    if (!myUid) myUid = recId || reqId;
    if (!otherUid) {
      otherUid = reqId === myUid ? recId : reqId;
    }
  }

  const pairDocs = (myUid && otherUid)
    ? allDocs.filter(d => {
        const { reqId, recId } = getPairUsers(d);
        return (
          (reqId === myUid && recId === otherUid) ||
          (reqId === otherUid && recId === myUid)
        );
      })
    : (targetDoc ? [targetDoc] : []);

  const maxExistingMs = Math.max(0, ...pairDocs.map(getDocTimestampMs));
  const nowIso = new Date(Math.max(Date.now(), maxExistingMs + 1000)).toISOString();

  let acceptedDocId: string | null = null;
  const candidateDocs = [
    ...(targetDoc ? [targetDoc] : []),
    ...pairDocs.filter(d => d.id !== friendshipId && d.status !== 'blocked')
  ];

  // 1. Try to update an existing friendship doc in-place if Firestore rules allow it
  for (const cand of candidateDocs) {
    const { reqId, recId } = getPairUsers(cand);
    const effectiveReq = reqId || otherUid || myUid;
    const effectiveRec = recId || myUid || otherUid;
    try {
      await updateDoc(doc(db, 'friendships', cand.id), {
        status: 'accepted',
        requesterId: effectiveReq,
        receiverId: effectiveRec,
        recipientId: effectiveRec,
        user1: effectiveReq,
        user2: effectiveRec,
        updatedAt: nowIso
      });
      acceptedDocId = cand.id;
      break;
    } catch {
      // Legacy doc created without recipientId/user2 cannot be updated by receiver under strict rules
    }
  }

  // 2. Fallback: create a new 'accepted' friendship doc where requesterId == request.auth.uid (always permitted by Firestore create rules)
  if (!acceptedDocId && myUid && otherUid) {
    const created = await addDoc(collection(db, 'friendships'), {
      requesterId: myUid,
      receiverId: otherUid,
      recipientId: otherUid,
      user1: myUid,
      user2: otherUid,
      status: 'accepted',
      createdAt: nowIso,
      updatedAt: nowIso
    });
    acceptedDocId = created.id;
  }

  // 3. Clean up any duplicate or removed docs that the current user has permission to delete
  for (const dup of pairDocs) {
    if (dup.id !== acceptedDocId && dup.status !== 'blocked') {
      try {
        await deleteDoc(doc(db, 'friendships', dup.id));
      } catch {
        // Ignore if legacy doc owned by the other user; the newer 'accepted' doc supersedes it
      }
    }
  }

  return acceptedDocId || friendshipId;
};

/**
 * Removes a friendship or declines/cancels a pending request between the two users
 * so they can find and add each other again in Search.
 */
export const removeFriendship = async (friendshipId: string, userId1?: string, userId2?: string) => {
  try {
    const actorId = auth.currentUser?.uid || userId1;
    const snapshot = await getDocs(collection(db, 'friendships'));
    const allDocs: RawFriendshipDoc[] = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    const targetDoc = allDocs.find(d => d.id === friendshipId);
    let myUid = actorId;
    let otherUid = userId2;

    if (targetDoc) {
      const { reqId, recId } = getPairUsers(targetDoc);
      if (!myUid) myUid = recId || reqId;
      if (!otherUid) {
        otherUid = reqId === myUid ? recId : reqId;
      }
    }

    const pairDocs = (myUid && otherUid)
      ? allDocs.filter(d => {
          if (d.status === 'blocked') return false;
          const { reqId, recId } = getPairUsers(d);
          return (
            (reqId === myUid && recId === otherUid) ||
            (reqId === otherUid && recId === myUid)
          );
        })
      : (targetDoc ? [targetDoc] : []);

    const maxExistingMs = Math.max(0, ...pairDocs.map(getDocTimestampMs));
    const nowIso = new Date(Math.max(Date.now(), maxExistingMs + 1000)).toISOString();

    let anyActiveDeleteFailed = false;
    for (const dup of pairDocs) {
      try {
        await deleteDoc(doc(db, 'friendships', dup.id));
      } catch {
        if (dup.status === 'pending' || dup.status === 'accepted') {
          anyActiveDeleteFailed = true;
        }
      }
    }

    // If a legacy doc owned by the other user could not be deleted directly, write a 'removed' record owned by myUid
    if (anyActiveDeleteFailed && myUid && otherUid) {
      await addDoc(collection(db, 'friendships'), {
        requesterId: myUid,
        receiverId: otherUid,
        recipientId: otherUid,
        user1: myUid,
        user2: otherUid,
        status: 'removed',
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }
  } catch (err) {
    console.error('Erro ao remover amizade:', err);
  }
};

/**
 * Blocks a user socially: removes any friendship/request between them and creates a blocked record.
 */
export const blockUserSocial = async (blockerId: string, targetUserId: string) => {
  const actorId = auth.currentUser?.uid || blockerId;
  const snapshot = await getDocs(collection(db, 'friendships'));
  const existing = snapshot.docs.filter(d => {
    const f = d.data() as RawFriendshipDoc;
    const { reqId, recId } = getPairUsers(f);
    return (
      (reqId === actorId && recId === targetUserId) ||
      (reqId === targetUserId && recId === actorId)
    );
  });

  // Delete all non-blocked records between the two users that actorId can delete
  for (const docSnap of existing) {
    const f = docSnap.data() as RawFriendshipDoc;
    if (f.status !== 'blocked') {
      try {
        await deleteDoc(doc(db, 'friendships', docSnap.id));
      } catch {
        // Ignore if legacy doc owned by targetUserId
      }
    }
  }

  // Check if blocker already has a block doc
  const alreadyBlockedByMe = existing.some(d => {
    const f = d.data() as RawFriendshipDoc;
    return f.status === 'blocked' && (f.blockedBy === actorId || f.requesterId === actorId);
  });

  if (!alreadyBlockedByMe) {
    const nowIso = new Date().toISOString();
    await addDoc(collection(db, 'friendships'), {
      requesterId: actorId,
      receiverId: targetUserId,
      recipientId: targetUserId,
      user1: actorId,
      user2: targetUserId,
      blockedBy: actorId,
      status: 'blocked',
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }
};

/**
 * Unblocks a user that was previously blocked by blockerId, allowing them to be searched and added again.
 */
export const unblockUserSocial = async (blockerId: string, targetUserId: string) => {
  const actorId = auth.currentUser?.uid || blockerId;
  const snapshot = await getDocs(collection(db, 'friendships'));
  const toDelete = snapshot.docs.filter(d => {
    const f = d.data() as RawFriendshipDoc;
    if (f.status !== 'blocked') return false;
    const { reqId, recId } = getPairUsers(f);
    const isMyBlock = (f.blockedBy === actorId || reqId === actorId);
    const involvesTarget = (recId === targetUserId || reqId === targetUserId);
    return isMyBlock && involvesTarget;
  });

  for (const docSnap of toDelete) {
    try {
      await deleteDoc(doc(db, 'friendships', docSnap.id));
    } catch {
      // Ignore
    }
  }
};

// --- GUILDS (Previously Groups) ---

const syncGuildDirectoryEntry = async (guild: Guild) => {
  try {
    const actorId = auth.currentUser?.uid || guild.adminId;
    const dirRef = doc(db, 'forum_threads', `guild_dir_${guild.id}`);
    await setDoc(dirRef, {
      _docType: 'guild_directory',
      authorId: actorId,
      creatorId: actorId,
      guildId: guild.id,
      name: guild.name,
      description: guild.description || '',
      emblemBase64: guild.emblemBase64 || guild.emblemUrl || '',
      emblemUrl: guild.emblemBase64 || guild.emblemUrl || '',
      adminId: guild.adminId,
      adminIds: guild.adminIds || [guild.adminId],
      members: guild.members || [],
      pendingMemberIds: guild.pendingMemberIds || [],
      challenges: guild.challenges || [],
      agoraParticipants: guild.agoraParticipants || [],
      statsResetDate: guild.statsResetDate || null,
      createdAt: guild.createdAt || new Date().toISOString()
    }, { merge: true });
  } catch {
    // Non-critical directory sync
  }
};

export const getUserGuilds = async (userId: string): Promise<Guild[]> => {
  const guildMap = new Map<string, Guild>();

  try {
    const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(d => {
      const data = d.data() as Guild;
      const g: Guild = {
        ...data,
        id: d.id,
        members: data.members || [],
        pendingMemberIds: data.pendingMemberIds || []
      };
      guildMap.set(g.id, g);
      syncGuildDirectoryEntry(g);
    });
  } catch (err) {
    console.warn('Erro ao buscar grupos do usuário:', err);
  }

  // Also check guild directory for guilds where user is an approved member
  try {
    const fSnap = await getDocs(collection(db, 'forum_threads'));
    fSnap.docs.forEach(d => {
      const data = d.data() as any;
      if (data._docType === 'guild_directory' && Array.isArray(data.members) && data.members.includes(userId)) {
        const gId = data.guildId || d.id.replace(/^guild_dir_/, '');
        const existing = guildMap.get(gId);
        if (!existing) {
          guildMap.set(gId, {
            id: gId,
            name: data.name,
            description: data.description || '',
            emblemBase64: data.emblemBase64 || '',
            emblemUrl: data.emblemUrl || '',
            adminId: data.adminId,
            adminIds: data.adminIds || [data.adminId],
            members: data.members || [],
            pendingMemberIds: Array.isArray(data.pendingMemberIds) ? data.pendingMemberIds : [],
            challenges: data.challenges || [],
            agoraParticipants: Array.isArray(data.agoraParticipants) ? data.agoraParticipants : [],
            statsResetDate: data.statsResetDate || undefined,
            createdAt: data.createdAt
          });
        } else {
          // Merge challenges & pendingMemberIds if directory has updates
          const mergedMembers = Array.from(new Set([...(existing.members || []), ...(data.members || [])]));
          const rawPending = existing.pendingMemberIds !== undefined
            ? existing.pendingMemberIds
            : (Array.isArray(data.pendingMemberIds) ? data.pendingMemberIds : []);
          const cleanPending = rawPending.filter((id: string) => !mergedMembers.includes(id));

          const existingChallenges = existing.challenges || [];
          const dirChallenges = data.challenges || [];
          const challengeMap = new Map<string, GuildChallenge>();
          [...existingChallenges, ...dirChallenges].forEach((c: GuildChallenge) => {
            if (c?.id) challengeMap.set(c.id, c);
          });
          guildMap.set(gId, {
            ...existing,
            members: mergedMembers,
            pendingMemberIds: cleanPending,
            challenges: Array.from(challengeMap.values())
          });
        }
      }
    });
  } catch {
    // Ignore directory fallback errors
  }

  return Array.from(guildMap.values());
};

/**
 * Fetches all guilds in the community so users can search and request to join guilds.
 */
export const getAllGuilds = async (currentUserId?: string): Promise<Guild[]> => {
  const guildMap = new Map<string, Guild>();

  if (currentUserId) {
    const myGuilds = await getUserGuilds(currentUserId);
    myGuilds.forEach(g => guildMap.set(g.id, g));
  }

  // 1. Try reading all documents from 'groups' collection
  try {
    const snap = await getDocs(collection(db, 'groups'));
    snap.docs.forEach(d => {
      const data = d.data() as Guild;
      const g: Guild = {
        ...data,
        id: d.id,
        members: data.members || [],
        pendingMemberIds: data.pendingMemberIds || []
      };
      guildMap.set(g.id, g);
      syncGuildDirectoryEntry(g);
    });
  } catch {
    // If Firestore security rules restrict reading non-member groups directly, fall back to directory
  }

  // 2. Merge with public guild directory entries
  try {
    const fSnap = await getDocs(collection(db, 'forum_threads'));
    fSnap.docs.forEach(d => {
      const data = d.data() as any;
      if (data._docType === 'guild_directory') {
        const gId = data.guildId || d.id.replace(/^guild_dir_/, '');
        const existing = guildMap.get(gId);
        if (!existing) {
          guildMap.set(gId, {
            id: gId,
            name: data.name,
            description: data.description || '',
            emblemBase64: data.emblemBase64 || '',
            emblemUrl: data.emblemUrl || '',
            adminId: data.adminId,
            adminIds: data.adminIds || [data.adminId],
            members: data.members || [],
            pendingMemberIds: Array.isArray(data.pendingMemberIds) ? data.pendingMemberIds : [],
            challenges: data.challenges || [],
            agoraParticipants: Array.isArray(data.agoraParticipants) ? data.agoraParticipants : [],
            statsResetDate: data.statsResetDate || undefined,
            createdAt: data.createdAt
          });
        } else {
          const mergedMembers = Array.from(new Set([...(existing.members || []), ...(data.members || [])]));
          const rawPending = existing.pendingMemberIds !== undefined
            ? existing.pendingMemberIds
            : (Array.isArray(data.pendingMemberIds) ? data.pendingMemberIds : []);
          const cleanPending = rawPending.filter((id: string) => !mergedMembers.includes(id));
          guildMap.set(gId, {
            ...existing,
            members: mergedMembers,
            pendingMemberIds: cleanPending
          });
        }
      }
    });
  } catch {
    // Ignore
  }

  return Array.from(guildMap.values());
};

/**
 * Submits a membership application to join a guild.
 * Only Guild Admins can approve the request before the user becomes a member and can access guild info.
 */
export const requestJoinGuild = async (guildId: string, userId: string): Promise<void> => {
  // 1. Update the group document
  try {
    const guildRef = doc(db, 'groups', guildId);
    const snap = await getDoc(guildRef);
    if (snap.exists()) {
      const data = snap.data() as Guild;
      if ((data.members || []).includes(userId)) return;
      const pendingMemberIds = Array.from(new Set([...(data.pendingMemberIds || []), userId]));
      await updateDoc(guildRef, { pendingMemberIds });
    }
  } catch {
    // Fallback to directory update if group doc update is restricted
  }

  // 2. Also update the directory entry
  try {
    const dirRef = doc(db, 'forum_threads', `guild_dir_${guildId}`);
    const dirSnap = await getDoc(dirRef);
    if (dirSnap.exists()) {
      const dirData = dirSnap.data() as any;
      if ((dirData.members || []).includes(userId)) return;
      const pendingMemberIds = Array.from(new Set([...(dirData.pendingMemberIds || []), userId]));
      await updateDoc(dirRef, { pendingMemberIds });
    }
  } catch {
    // Ignore
  }
};

/**
 * Cancels a user's pending membership application to a guild.
 */
export const cancelJoinGuildRequest = async (guildId: string, userId: string): Promise<void> => {
  try {
    const guildRef = doc(db, 'groups', guildId);
    const snap = await getDoc(guildRef);
    if (snap.exists()) {
      const data = snap.data() as Guild;
      const pendingMemberIds = (data.pendingMemberIds || []).filter(id => id !== userId);
      await updateDoc(guildRef, { pendingMemberIds });
    }
  } catch {
    // Ignore
  }

  try {
    const dirRef = doc(db, 'forum_threads', `guild_dir_${guildId}`);
    const dirSnap = await getDoc(dirRef);
    if (dirSnap.exists()) {
      const dirData = dirSnap.data() as any;
      const pendingMemberIds = (dirData.pendingMemberIds || []).filter((id: string) => id !== userId);
      await updateDoc(dirRef, { pendingMemberIds });
    }
  } catch {
    // Ignore
  }
};

/**
 * Admin-only action: Approves a candidate's request to join the guild, moving them from pendingMemberIds to members.
 */
export const approveGuildMember = async (guildId: string, targetUserId: string): Promise<void> => {
  let updatedGuild: Guild | null = null;

  try {
    const guildRef = doc(db, 'groups', guildId);
    const snap = await getDoc(guildRef);
    if (snap.exists()) {
      const data = snap.data() as Guild;
      const members = Array.from(new Set([...(data.members || []), targetUserId]));
      const pendingMemberIds = (data.pendingMemberIds || []).filter(id => id !== targetUserId);
      await updateDoc(guildRef, { members, pendingMemberIds });
      updatedGuild = { ...data, id: guildId, members, pendingMemberIds };
    }
  } catch (err) {
    console.warn('Erro ao aprovar membro em groups:', err);
  }

  try {
    const dirRef = doc(db, 'forum_threads', `guild_dir_${guildId}`);
    const dirSnap = await getDoc(dirRef);
    if (dirSnap.exists()) {
      const dirData = dirSnap.data() as any;
      const members = Array.from(new Set([...(dirData.members || []), targetUserId]));
      const pendingMemberIds = (dirData.pendingMemberIds || []).filter((id: string) => id !== targetUserId);
      await updateDoc(dirRef, { members, pendingMemberIds });
    } else if (updatedGuild) {
      await syncGuildDirectoryEntry(updatedGuild);
    }
  } catch {
    // Ignore
  }
};

/**
 * Admin-only action: Rejects a candidate's request to join the guild.
 */
export const rejectGuildMember = async (guildId: string, targetUserId: string): Promise<void> => {
  await cancelJoinGuildRequest(guildId, targetUserId);
};

/**
 * Legacy helper (now routes to requestJoinGuild for non-admin applications).
 */
export const joinGuild = requestJoinGuild;

// Legacy alias
export const getUserGroups = getUserGuilds;

export const createGuild = async (
  name: string,
  adminId: string,
  memberIds: string[] = [],
  description?: string,
  emblemBase64?: string
) => {
  const safeName = sanitizeText(name, 80);
  if (!safeName) throw new Error('Nome da guilda inválido.');
  const safeDescription = sanitizeText(description || '', 500);
  const uniqueMembers = Array.from(new Set([adminId, ...(memberIds || [])]));
  const createdAt = new Date().toISOString();
  const guildData = {
    name: safeName,
    adminId,
    adminIds: [adminId],
    description: safeDescription,
    emblemBase64: emblemBase64 || '',
    emblemUrl: emblemBase64 || '',
    members: uniqueMembers,
    pendingMemberIds: [],
    challenges: [],
    agoraParticipants: [],
    createdAt
  };
  const docRef = await addDoc(collection(db, 'groups'), guildData);
  await syncGuildDirectoryEntry({ id: docRef.id, ...guildData });
  return docRef;
};

// Legacy alias
export const createGroup = createGuild;

export const updateGuildEmblemBase64 = async (guildId: string, base64: string): Promise<string> => {
  await updateDoc(doc(db, 'groups', guildId), {
    emblemBase64: base64,
    emblemUrl: base64
  });
  try {
    const dirRef = doc(db, 'forum_threads', `guild_dir_${guildId}`);
    await updateDoc(dirRef, { emblemBase64: base64, emblemUrl: base64 });
  } catch {
    // Ignore
  }
  return base64;
};

export const updateGuildEmblem = async (guildId: string, fileOrBase64: File | Blob | string): Promise<string> => {
  if (typeof fileOrBase64 === 'string') {
    return updateGuildEmblemBase64(guildId, fileOrBase64);
  }

  const { resizeImageToBase64 } = await import('../utils/imageProcessor');
  const base64 = await resizeImageToBase64(fileOrBase64, 200, 200, 0.7);
  return updateGuildEmblemBase64(guildId, base64);
};

export const promoteMemberToAdmin = async (guildId: string, userId: string) => {
  const guildRef = doc(db, 'groups', guildId);
  const snap = await getDoc(guildRef);
  if (snap.exists()) {
    const data = snap.data() as Guild;
    const adminIds = data.adminIds || (data.adminId ? [data.adminId] : []);
    if (!adminIds.includes(userId)) {
      const updatedAdmins = [...adminIds, userId];
      await updateDoc(guildRef, {
        adminIds: updatedAdmins
      });
      await syncGuildDirectoryEntry({ ...data, id: guildId, adminIds: updatedAdmins });
    }
  }
};

export const resetGuildStats = async (guildId: string) => {
  const resetDate = new Date().toISOString();
  await updateDoc(doc(db, 'groups', guildId), {
    statsResetDate: resetDate
  });
  try {
    const dirRef = doc(db, 'forum_threads', `guild_dir_${guildId}`);
    await updateDoc(dirRef, { statsResetDate: resetDate });
  } catch {
    // Ignore
  }
};

export const createGuildChallenge = async (
  guildId: string,
  challenge: Omit<GuildChallenge, 'id' | 'createdAt' | 'status'>
): Promise<GuildChallenge> => {
  const safeTitle = sanitizeText(challenge.title, 80);
  if (!safeTitle) throw new Error('Título do desafio inválido.');
  const safeDesc = sanitizeText(challenge.description || '', 500) || 'Alcance a meta estipulada pela guilda!';

  const newChallenge: GuildChallenge = {
    title: safeTitle,
    description: safeDesc,
    type: challenge.type || 'word_count',
    target: sanitizeMetricNumber(challenge.target, 1, 10000000, 1000),
    durationDays: sanitizeMetricNumber(challenge.durationDays, 1, 365, 7),
    id: Math.random().toString(36).substring(2, 11),
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  try {
    const guildRef = doc(db, 'groups', guildId);
    const snap = await getDoc(guildRef);
    if (snap.exists()) {
      const data = snap.data() as Guild;
      const challenges = [...(data.challenges || []), newChallenge];
      await updateDoc(guildRef, { challenges });
      await syncGuildDirectoryEntry({ ...data, id: guildId, challenges });
      return newChallenge;
    }
  } catch (err) {
    console.warn('Fallback guild challenge to directory:', err);
  }

  // Fallback to directory entry if direct update on groups fails
  try {
    const dirRef = doc(db, 'forum_threads', `guild_dir_${guildId}`);
    const dirSnap = await getDoc(dirRef);
    if (dirSnap.exists()) {
      const dirData = dirSnap.data() as any;
      const challenges = [...(dirData.challenges || []), newChallenge];
      await updateDoc(dirRef, { challenges });
    }
  } catch (err) {
    console.error('Erro ao criar desafio na guilda:', err);
    throw err;
  }

  return newChallenge;
};

// --- GUILD AGORA (VOICE ROOM PRESENCE & WEBRTC SIGNALING) ---

const AGORA_PRESENCE_TTL_MS = 45000;

export const pingGuildAgoraPresence = async (
  guildId: string,
  user: User,
  isMuted: boolean = false
): Promise<void> => {
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const participantEntry: AgoraParticipant = {
    userId: user.id,
    name: sanitizeText(user.name, 80) || 'Escritor',
    photoURL: user.photoBase64 || user.photoURL || '',
    isMuted: Boolean(isMuted),
    joinedAt: nowIso,
    lastPing: nowIso
  };

  // 1. Update presence document in guild_threads (include authorId, title, content for firestore.rules compatibility)
  try {
    const presenceRef = doc(db, 'guild_threads', `agora_${guildId}_${user.id}`);
    await setDoc(presenceRef, {
      _docType: 'agora_presence',
      authorId: user.id,
      title: 'agora_presence',
      content: 'active',
      guildId,
      userId: user.id,
      name: participantEntry.name,
      photoURL: participantEntry.photoURL,
      isMuted: participantEntry.isMuted,
      joinedAt: nowIso,
      lastPing: nowIso,
      createdAt: nowIso
    }, { merge: true });
  } catch (err) {
    console.warn('Aviso ao gravar presença da Ágora em guild_threads:', err);
  }

  // 2. Also update agoraParticipants directly on groups/{guildId} so all members always see connected peers
  try {
    const guildRef = doc(db, 'groups', guildId);
    const snap = await getDoc(guildRef);
    if (snap.exists()) {
      const data = snap.data() as Guild;
      const existingList = Array.isArray(data.agoraParticipants) ? data.agoraParticipants : [];
      const prevSelf = existingList.find(p => p.userId === user.id);
      const activeOthers = existingList.filter(p => {
        if (!p || p.userId === user.id) return false;
        const t = new Date(p.lastPing || p.joinedAt || 0).getTime();
        return !isNaN(t) && (nowMs - t) < AGORA_PRESENCE_TTL_MS;
      });
      const updatedList: AgoraParticipant[] = [
        ...activeOthers,
        {
          ...participantEntry,
          joinedAt: prevSelf?.joinedAt || nowIso
        }
      ];
      await updateDoc(guildRef, { agoraParticipants: updatedList });
    }
  } catch {
    // Fallback to guild directory if needed
  }

  // 3. Also sync on guild_dir_${guildId} in forum_threads
  try {
    const dirRef = doc(db, 'forum_threads', `guild_dir_${guildId}`);
    const dirSnap = await getDoc(dirRef);
    if (dirSnap.exists()) {
      const dirData = dirSnap.data() as any;
      const existingList: AgoraParticipant[] = Array.isArray(dirData.agoraParticipants) ? dirData.agoraParticipants : [];
      const prevSelf = existingList.find(p => p.userId === user.id);
      const activeOthers = existingList.filter(p => {
        if (!p || p.userId === user.id) return false;
        const t = new Date(p.lastPing || p.joinedAt || 0).getTime();
        return !isNaN(t) && (nowMs - t) < AGORA_PRESENCE_TTL_MS;
      });
      const updatedList: AgoraParticipant[] = [
        ...activeOthers,
        {
          ...participantEntry,
          joinedAt: prevSelf?.joinedAt || nowIso
        }
      ];
      await updateDoc(dirRef, { agoraParticipants: updatedList });
    }
  } catch {
    // Ignore
  }
};

export const leaveGuildAgora = async (guildId: string, userId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'guild_threads', `agora_${guildId}_${userId}`));
  } catch {
    // Ignore
  }

  try {
    const guildRef = doc(db, 'groups', guildId);
    const snap = await getDoc(guildRef);
    if (snap.exists()) {
      const data = snap.data() as Guild;
      const updatedList = (data.agoraParticipants || []).filter(p => p.userId !== userId);
      await updateDoc(guildRef, { agoraParticipants: updatedList });
    }
  } catch {
    // Ignore
  }

  try {
    const dirRef = doc(db, 'forum_threads', `guild_dir_${guildId}`);
    const dirSnap = await getDoc(dirRef);
    if (dirSnap.exists()) {
      const dirData = dirSnap.data() as any;
      const updatedList = (dirData.agoraParticipants || []).filter((p: AgoraParticipant) => p.userId !== userId);
      await updateDoc(dirRef, { agoraParticipants: updatedList });
    }
  } catch {
    // Ignore
  }

  // Clean up any pending WebRTC signals sent by this user in this guild
  try {
    const q = query(collection(db, 'guild_threads'), where('guildId', '==', guildId));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data() as any;
      if (data._docType === 'agora_signal' && (data.senderId === userId || data.targetId === userId)) {
        try {
          await deleteDoc(doc(db, 'guild_threads', d.id));
        } catch {
          // Ignore
        }
      }
    }
  } catch {
    // Ignore
  }
};

export const getGuildAgoraParticipants = async (guildId: string): Promise<AgoraParticipant[]> => {
  const participantMap = new Map<string, AgoraParticipant>();
  const now = Date.now();

  const addIfFresh = (raw: any) => {
    if (!raw || !raw.userId) return;
    const lastPingMs = new Date(raw.lastPing || raw.joinedAt || 0).getTime();
    if (isNaN(lastPingMs) || (now - lastPingMs) >= AGORA_PRESENCE_TTL_MS) return;

    const existing = participantMap.get(raw.userId);
    const existingMs = existing ? new Date(existing.lastPing || existing.joinedAt || 0).getTime() : 0;
    if (!existing || lastPingMs >= existingMs) {
      participantMap.set(raw.userId, {
        userId: raw.userId,
        name: sanitizeText(raw.name, 80) || 'Escritor',
        photoURL: raw.photoURL || '',
        joinedAt: raw.joinedAt || raw.lastPing,
        lastPing: raw.lastPing || raw.joinedAt,
        isMuted: Boolean(raw.isMuted)
      });
    }
  };

  // 1. Check groups/{guildId}
  try {
    const guildSnap = await getDoc(doc(db, 'groups', guildId));
    if (guildSnap.exists()) {
      const data = guildSnap.data() as Guild;
      (data.agoraParticipants || []).forEach(addIfFresh);
    }
  } catch {
    // Ignore
  }

  // 2. Check forum_threads/guild_dir_${guildId}
  try {
    const dirSnap = await getDoc(doc(db, 'forum_threads', `guild_dir_${guildId}`));
    if (dirSnap.exists()) {
      const data = dirSnap.data() as any;
      (data.agoraParticipants || []).forEach(addIfFresh);
    }
  } catch {
    // Ignore
  }

  // 3. Check guild_threads presence documents
  try {
    const q = query(collection(db, 'guild_threads'), where('guildId', '==', guildId));
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(d => {
      const data = d.data() as any;
      if (data._docType === 'agora_presence') {
        addIfFresh(data);
      }
    });
  } catch {
    // Ignore
  }

  return Array.from(participantMap.values());
};

/**
 * Sends a WebRTC signaling message (SDP offer, SDP answer, or ICE candidate) to a specific peer in the guild's Ágora.
 */
export const sendAgoraSignal = async (
  guildId: string,
  senderId: string,
  targetId: string,
  type: 'offer' | 'answer' | 'ice-candidate',
  payload: any
): Promise<void> => {
  const nowIso = new Date().toISOString();
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signalDoc = {
    _docType: 'agora_signal',
    authorId: senderId,
    creatorId: senderId,
    title: `sig_${type}`,
    content: payloadStr,
    guildId,
    senderId,
    targetId,
    signalType: type,
    createdAt: nowIso
  };

  try {
    if (type === 'offer' || type === 'answer') {
      const deterministicId = `agorasig_${guildId}_${senderId}_${targetId}_${type}`;
      await setDoc(doc(db, 'guild_threads', deterministicId), signalDoc);
    } else {
      await addDoc(collection(db, 'guild_threads'), signalDoc);
    }
  } catch {
    // Fallback to forum_threads if guild_threads is restricted
    try {
      await addDoc(collection(db, 'forum_threads'), signalDoc);
    } catch {
      // Ignore
    }
  }
};

/**
 * Polls incoming WebRTC signaling messages addressed to `currentUserId` in `guildId` and cleans up expired signals.
 */
export const pollAgoraSignals = async (
  guildId: string,
  currentUserId: string
): Promise<AgoraSignalMessage[]> => {
  const results: AgoraSignalMessage[] = [];
  const now = Date.now();

  const processDocs = async (collectionName: 'guild_threads' | 'forum_threads', docs: any[]) => {
    for (const d of docs) {
      const data = d.data() as any;
      if (data._docType !== 'agora_signal' || data.guildId !== guildId) continue;

      const createdMs = new Date(data.createdAt || 0).getTime();
      const isExpired = isNaN(createdMs) || (now - createdMs) > 45000;

      if (isExpired && data.senderId === currentUserId) {
        try {
          await deleteDoc(doc(db, collectionName, d.id));
        } catch {
          // Ignore
        }
        continue;
      }

      if (data.targetId === currentUserId && !isExpired) {
        results.push({
          id: d.id,
          guildId: data.guildId,
          senderId: data.senderId,
          targetId: data.targetId,
          type: data.signalType as 'offer' | 'answer' | 'ice-candidate',
          payload: data.content,
          createdAt: data.createdAt
        });
        // Delete signal after reading so it is processed once
        try {
          await deleteDoc(doc(db, collectionName, d.id));
        } catch {
          // Ignore if rules prevent recipient from deleting sender's doc; caller will deduplicate by ID
        }
      }
    }
  };

  try {
    const q = query(collection(db, 'guild_threads'), where('guildId', '==', guildId));
    const snap = await getDocs(q);
    await processDocs('guild_threads', snap.docs);
  } catch {
    // Ignore
  }

  return results.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

// --- GUILD FORUM ---

export const getGuildThreads = async (guildId: string): Promise<GuildForumThread[]> => {
  try {
    const q = query(
      collection(db, 'guild_threads'),
      where('guildId', '==', guildId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .filter(d => !(d.data() as any)._docType)
      .map(d => {
        const data = d.data() as GuildForumThread;
        return {
          ...data,
          id: d.id,
          title: sanitizeText(data.title, 80),
          content: sanitizeText(data.content, 3000)
        };
      });
  } catch {
    const q = query(collection(db, 'guild_threads'), where('guildId', '==', guildId));
    const snapshot = await getDocs(q);
    const threads = snapshot.docs
      .filter(d => !(d.data() as any)._docType)
      .map(d => {
        const data = d.data() as GuildForumThread;
        return {
          ...data,
          id: d.id,
          title: sanitizeText(data.title, 80),
          content: sanitizeText(data.content, 3000)
        };
      });
    return threads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
};

export const createGuildThread = async (guildId: string, authorId: string, title: string, content: string) => {
  const safeTitle = sanitizeText(title, 80);
  const safeContent = sanitizeText(content, 3000);
  if (!safeTitle || !safeContent) return;
  await addDoc(collection(db, 'guild_threads'), {
    guildId,
    authorId,
    title: safeTitle,
    content: safeContent,
    createdAt: new Date().toISOString()
  });
};

export const getGuildReplies = async (threadId: string): Promise<GuildForumReply[]> => {
  const q = query(collection(db, 'guild_replies'), where('threadId', '==', threadId));
  const snapshot = await getDocs(q);
  const replies = snapshot.docs.map(d => {
    const data = d.data() as GuildForumReply;
    return {
      ...data,
      id: d.id,
      content: sanitizeText(data.content, 3000)
    };
  });
  return replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const replyToGuildThread = async (authorId: string, threadId: string, content: string) => {
  const safeContent = sanitizeText(content, 3000);
  if (!safeContent) return;
  await addDoc(collection(db, 'guild_replies'), {
    threadId,
    authorId,
    content: safeContent,
    createdAt: new Date().toISOString()
  });
};

export const deleteGuildForumThread = async (threadId: string) => {
  await deleteDoc(doc(db, 'guild_threads', threadId));
};

export const deleteGuildForumReply = async (replyId: string) => {
  await deleteDoc(doc(db, 'guild_replies', replyId));
};

// --- Messages ---

export const getConversation = async (userId1: string, userId2: string): Promise<Message[]> => {
  const snapshot = await getDocs(collection(db, 'messages'));
  const msgs = snapshot.docs
    .map(d => {
      const data = d.data() as Message;
      return {
        ...data,
        id: d.id,
        content: sanitizeText(data.content, 1000)
      };
    })
    .filter(msg =>
      (msg.senderId === userId1 && msg.receiverId === userId2) ||
      (msg.senderId === userId2 && msg.receiverId === userId1)
    );
  return msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const getGroupMessages = async (groupId: string): Promise<Message[]> => {
  const q = query(collection(db, 'messages'), where('groupId', '==', groupId));
  const snapshot = await getDocs(q);
  const msgs = snapshot.docs.map(d => {
    const data = d.data() as Message;
    return {
      ...data,
      id: d.id,
      content: sanitizeText(data.content, 1000)
    };
  });
  return msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const sendMessage = async (senderId: string, receiverId: string, content: string) => {
  const safeContent = sanitizeText(content, 1000);
  if (!safeContent) return;
  await addDoc(collection(db, 'messages'), {
    senderId,
    receiverId,
    content: safeContent,
    timestamp: new Date().toISOString(),
    read: false
  });
};

export const sendGroupMessage = async (senderId: string, groupId: string, content: string) => {
  const safeContent = sanitizeText(content, 1000);
  if (!safeContent) return;
  await addDoc(collection(db, 'messages'), {
    senderId,
    groupId,
    content: safeContent,
    timestamp: new Date().toISOString(),
    read: false
  });
};

export const markAsRead = async (_senderId: string, _receiverId: string) => {
  // No-op for MVP optimization
};

// --- FORUM ---

export const getForumThreads = async (): Promise<ForumThread[]> => {
  const q = query(collection(db, 'forum_threads'), orderBy('createdAt', 'desc'));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs
      .filter(d => !(d.data() as any)._docType)
      .map(d => {
        const data = d.data() as ForumThread;
        return {
          ...data,
          id: d.id,
          title: sanitizeText(data.title, 80),
          content: sanitizeText(data.content, 3000)
        };
      });
  } catch {
    const snapshot = await getDocs(collection(db, 'forum_threads'));
    return snapshot.docs
      .filter(d => !(d.data() as any)._docType)
      .map(d => {
        const data = d.data() as ForumThread;
        return {
          ...data,
          id: d.id,
          title: sanitizeText(data.title, 80),
          content: sanitizeText(data.content, 3000)
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
};

export const getForumReplies = async (threadId: string): Promise<ForumReply[]> => {
  const q = query(collection(db, 'forum_replies'), where('threadId', '==', threadId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(d => {
      const data = d.data() as ForumReply;
      return {
        ...data,
        id: d.id,
        content: sanitizeText(data.content, 3000)
      };
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const createForumThread = async (authorId: string, title: string, content: string, category: string) => {
  const safeTitle = sanitizeText(title, 80);
  const safeContent = sanitizeText(content, 3000);
  if (!safeTitle || !safeContent) return;
  await addDoc(collection(db, 'forum_threads'), {
    authorId,
    title: safeTitle,
    content: safeContent,
    category: sanitizeText(category, 40) || 'Geral',
    createdAt: new Date().toISOString(),
    likes: []
  });
};

export const replyToThread = async (authorId: string, threadId: string, content: string) => {
  const safeContent = sanitizeText(content, 3000);
  if (!safeContent) return;
  await addDoc(collection(db, 'forum_replies'), {
    threadId,
    authorId,
    content: safeContent,
    createdAt: new Date().toISOString()
  });
};

export const toggleForumThreadLike = async (threadId: string, userId: string): Promise<string[]> => {
  const threadRef = doc(db, 'forum_threads', threadId);
  const snap = await getDoc(threadRef);
  if (snap.exists()) {
    const data = snap.data() as ForumThread;
    const likes = data.likes || [];
    const newLikes = likes.includes(userId)
      ? likes.filter(id => id !== userId)
      : [...likes, userId];
    await updateDoc(threadRef, { likes: newLikes });
    return newLikes;
  }
  return [];
};

// --- COMPETITIONS ---

export const getCompetitions = async (): Promise<Competition[]> => {
  const compMap = new Map<string, Competition>();

  // 1. Primary 'competitions' collection
  try {
    const snapshot = await getDocs(collection(db, 'competitions'));
    snapshot.docs.forEach(d => {
      const data = d.data() as Competition;
      compMap.set(d.id, {
        ...data,
        id: d.id,
        title: sanitizeText(data.title, 80),
        description: sanitizeText(data.description, 500)
      });
    });
  } catch (err) {
    console.warn('Fallback reading competitions:', err);
  }

  // 2. Fallback from 'forum_threads' where _docType === 'competition'
  try {
    const fSnap = await getDocs(collection(db, 'forum_threads'));
    fSnap.docs.forEach(d => {
      const data = d.data() as any;
      if (data._docType === 'competition' && !compMap.has(d.id)) {
        compMap.set(d.id, {
          id: d.id,
          creatorId: data.creatorId,
          title: sanitizeText(data.title, 80),
          description: sanitizeText(data.description, 500),
          type: data.type || 'word_count',
          target: Number(data.target) || 1000,
          startDate: data.startDate,
          endDate: data.endDate,
          participants: Array.isArray(data.participants) ? data.participants : [data.creatorId],
          status: data.status || 'active'
        });
      }
    });
  } catch {
    // Ignore
  }

  return Array.from(compMap.values()).sort(
    (a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime()
  );
};

export const createCompetition = async (
  creatorId: string,
  title: string,
  description: string,
  type: 'word_count' | 'days_streak',
  target: number,
  durationDays: number
): Promise<Competition> => {
  const safeTitle = sanitizeText(title, 80);
  if (!safeTitle) throw new Error('Título do desafio inválido.');
  const safeDesc = sanitizeText(description || '', 500) || 'Complete a meta dentro do prazo do desafio!';
  const validTarget = sanitizeMetricNumber(target, 1, 10000000, 1000);
  const validDuration = sanitizeMetricNumber(durationDays, 1, 365, 7);

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + validDuration);

  const payload = {
    creatorId,
    title: safeTitle,
    description: safeDesc,
    type: type || 'word_count',
    target: validTarget,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    participants: [creatorId],
    status: 'active' as const
  };

  try {
    const docRef = await addDoc(collection(db, 'competitions'), payload);
    return { id: docRef.id, ...payload };
  } catch (err) {
    console.warn('Saving competition via forum_threads fallback:', err);
    const fallbackRef = await addDoc(collection(db, 'forum_threads'), {
      ...payload,
      _docType: 'competition',
      createdAt: startDate.toISOString()
    });
    return { id: fallbackRef.id, ...payload };
  }
};

export const joinCompetition = async (competitionId: string, userId: string) => {
  try {
    const ref = doc(db, 'competitions', competitionId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as Competition;
      if (!data.participants.includes(userId)) {
        await updateDoc(ref, {
          participants: [...data.participants, userId]
        });
      }
      return;
    }
  } catch {
    // Try fallback collection
  }

  try {
    const fRef = doc(db, 'forum_threads', competitionId);
    const fSnap = await getDoc(fRef);
    if (fSnap.exists()) {
      const data = fSnap.data() as any;
      const participants = Array.isArray(data.participants) ? data.participants : [];
      if (!participants.includes(userId)) {
        await updateDoc(fRef, {
          participants: [...participants, userId]
        });
      }
    }
  } catch (err) {
    console.error('Erro ao entrar no desafio:', err);
  }
};

// --- DELETE OPERATIONS ---

export const deleteForumThread = async (threadId: string) => {
  await deleteDoc(doc(db, 'forum_threads', threadId));
};

export const deleteForumReply = async (replyId: string) => {
  await deleteDoc(doc(db, 'forum_replies', replyId));
};

export const deleteCompetition = async (competitionId: string) => {
  try {
    await deleteDoc(doc(db, 'competitions', competitionId));
  } catch {
    // Ignore
  }
  try {
    await deleteDoc(doc(db, 'forum_threads', competitionId));
  } catch {
    // Ignore
  }
};
