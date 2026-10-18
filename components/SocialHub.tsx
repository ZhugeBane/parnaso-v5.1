


import React, { useState, useEffect, useRef } from 'react';
import { User, Message, Guild, GuildForumThread, GuildForumReply, Competition, WritingSession, ForumThread, ForumReply, AgoraParticipant } from '../types';
import {
  getFriendsList,
  getPendingRequests,
  getAvailableUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  blockUserSocial,
  unblockUserSocial,
  getBlockedUsersList,
  getConversation,
  sendMessage,
  markAsRead,
  getUserGuilds,
  getAllGuilds,
  joinGuild,
  requestJoinGuild,
  cancelJoinGuildRequest,
  approveGuildMember,
  rejectGuildMember,
  createGuild,
  getUserGroups,
  createGroup,
  getGroupMessages,
  sendGroupMessage,
  updateGuildEmblem,
  getGuildThreads,
  createGuildThread,
  getGuildReplies,
  replyToGuildThread,
  deleteGuildForumThread,
  deleteGuildForumReply,
  getForumThreads,
  getForumReplies,
  createForumThread,
  replyToThread,
  getCompetitions,
  createCompetition,
  joinCompetition,
  deleteForumThread,
  deleteForumReply,
  deleteCompetition,
  promoteMemberToAdmin,
  resetGuildStats,
  updateGuildDescription,
  createGuildChallenge,
  toggleForumThreadLike,
  updateGuildEmblemBase64,
  pingGuildAgoraPresence,
  leaveGuildAgora,
  getGuildAgoraParticipants,
  sendAgoraSignal,
  pollAgoraSignals
} from '../services/socialService';
import { compressImage, resizeImageToBase64 } from '../utils/imageProcessor';
import { ImagePicker } from './ui/ImagePicker';
import { useLanguage } from '../i18n/LanguageContext';
import { getSessions } from '../services/sessionService';
import { getAllUsers, isUserCurrentlyOnline, updateUserPresence } from '../services/authService';
import { sanitizeText, toSafePublicUser } from '../utils/cryptoUtils';
import { Users, Shield, MessageSquare, Trophy, Search, UserPlus, ArrowRight, Sparkles, Flame, Zap, Calendar } from 'lucide-react';

interface SocialHubProps {
  currentUser: User;
  onExit: () => void;
}

export const SocialHub: React.FC<SocialHubProps> = ({ currentUser, onExit }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'friends' | 'guilds' | 'forum' | 'competitions' | 'find'>('friends');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Anti-Spam & Flood Protection: 3-second Cooldown (Rate Limit) + isSubmitting state
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  const lastActionTimestampRef = useRef<number>(0);

  const canPerformSocialAction = (): boolean => {
    const now = Date.now();
    if (isActionSubmitting || isCooldownActive || now - lastActionTimestampRef.current < 3000) {
      return false;
    }
    lastActionTimestampRef.current = now;
    setIsCooldownActive(true);
    setTimeout(() => {
      setIsCooldownActive(false);
    }, 3000);
    return true;
  };

  // Friends & Blocking Data
  const [friends, setFriends] = useState<{ user: User, friendshipId: string }[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<{ user: User, friendshipId: string }[]>([]);
  const [requests, setRequests] = useState<{ user: User; friendshipId: string; type: 'received' | 'sent'; createdAt?: string }[]>([]);
  const [requestsFilter, setRequestsFilter] = useState<'all' | 'received' | 'sent'>('all');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [acceptingIds, setAcceptingIds] = useState<string[]>([]);

  // Optimistic caches to prevent 4-second polling from reverting accepted/rejected friend requests
  const recentlyAcceptedUsersRef = useRef<Map<string, { user: User; friendshipId: string; timestamp: number }>>(new Map());
  const recentlyRejectedIdsRef = useRef<Map<string, number>>(new Map());
  const isMutatingFriendshipRef = useRef<boolean>(false);

  // Guild Data
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [allGuilds, setAllGuilds] = useState<Guild[]>([]);
  const [guildSearchTerm, setGuildSearchTerm] = useState('');
  const [memberStats, setMemberStats] = useState<Record<string, number>>({}); // UserID -> Total Words
  const [showCreateGuild, setShowCreateGuild] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGuildEmblemBase64, setNewGuildEmblemBase64] = useState('');
  const [selectedGuildMembers, setSelectedGuildMembers] = useState<string[]>([]);
  const [guildSubTab, setGuildSubTab] = useState<'home' | 'chat' | 'forum' | 'agora'>('home');
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeDesc, setNewChallengeDesc] = useState('');
  const [newChallengeTarget, setNewChallengeTarget] = useState(1000);
  const [newChallengeDuration, setNewChallengeDuration] = useState(7);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [isSubmittingChallenge, setIsSubmittingChallenge] = useState(false);

  // Guild Engagement, Banner & Campfire Sprint States
  const [isEditingGuildDesc, setIsEditingGuildDesc] = useState(false);
  const [editedGuildDesc, setEditedGuildDesc] = useState('');
  const [isSavingGuildDesc, setIsSavingGuildDesc] = useState(false);
  const [showAdminGearMenu, setShowAdminGearMenu] = useState(false);
  const [customGuildGoalTarget, setCustomGuildGoalTarget] = useState<number | null>(null);
  const [cheeredMembers, setCheeredMembers] = useState<Record<string, boolean>>({});
  const [memberSparks, setMemberSparks] = useState<Record<string, number>>({});
  const [expandedChallengeId, setExpandedChallengeId] = useState<string | null>(null);
  const [campfireDurationMin, setCampfireDurationMin] = useState<15 | 25>(25);
  const [campfireSecondsLeft, setCampfireSecondsLeft] = useState<number>(25 * 60);
  const [isCampfireActive, setIsCampfireActive] = useState<boolean>(false);
  const [campfireCompletedCount, setCampfireCompletedCount] = useState<number>(0);

  // Guild Forum & Ágora State
  const [guildThreads, setGuildThreads] = useState<GuildForumThread[]>([]);
  const [selectedGuildThread, setSelectedGuildThread] = useState<GuildForumThread | null>(null);
  const [guildReplies, setGuildReplies] = useState<GuildForumReply[]>([]);
  const [showCreateGuildThread, setShowCreateGuildThread] = useState(false);
  const [isUpdatingEmblem, setIsUpdatingEmblem] = useState(false);
  const [forumError, setForumError] = useState<string | null>(null);
  const [audioPermission, setAudioPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [agoraParticipants, setAgoraParticipants] = useState<AgoraParticipant[]>([]);
  const [connectedPeerIds, setConnectedPeerIds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimFrameRef = useRef<number | null>(null);
  const activeAgoraGuildIdRef = useRef<string | null>(null);

  // WebRTC Mesh Audio Refs for Ágora
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const processedSignalIdsRef = useRef<Set<string>>(new Set());
  const peerOfferSentAtRef = useRef<Map<string, number>>(new Map());

  // Forum Data
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [threadReplies, setThreadReplies] = useState<ForumReply[]>([]);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newThreadCategory, setNewThreadCategory] = useState<ForumThread['category']>('Geral');
  const [newReplyContent, setNewReplyContent] = useState('');

  // Competition Data
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [compStats, setCompStats] = useState<Record<string, Record<string, { current: number, percent: number }>>>({});
  const [showCreateComp, setShowCreateComp] = useState(false);
  const [newCompTitle, setNewCompTitle] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [newCompType, setNewCompType] = useState<'word_count' | 'days_streak'>('word_count');
  const [newCompTarget, setNewCompTarget] = useState(1000);
  const [newCompDuration, setNewCompDuration] = useState(7);
  const [compError, setCompError] = useState<string | null>(null);
  const [isSubmittingComp, setIsSubmittingComp] = useState(false);

  // Chat State (Direct & Group)
  const [selectedChat, setSelectedChat] = useState<{ type: 'direct' | 'group', target: User | Guild } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showGuildChatProduction, setShowGuildChatProduction] = useState(false);
  const [showChatEmojiPicker, setShowChatEmojiPicker] = useState(false);
  const [sentDirectSpark, setSentDirectSpark] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Active guild dynamically synced from guilds or allGuilds array
  const activeGuild: Guild | null = selectedChat?.type === 'group'
    ? (guilds.find(g => g.id === selectedChat.target.id) || allGuilds.find(g => g.id === selectedChat.target.id) || (selectedChat.target as Guild))
    : null;

  const cleanupPeerConnection = (peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      try {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch {
        // Ignore
      }
      peerConnectionsRef.current.delete(peerId);
    }
    const audioEl = remoteAudioElementsRef.current.get(peerId);
    if (audioEl) {
      try {
        audioEl.pause();
        audioEl.srcObject = null;
      } catch {
        // Ignore
      }
      remoteAudioElementsRef.current.delete(peerId);
    }
    peerOfferSentAtRef.current.delete(peerId);
    setConnectedPeerIds(Array.from(peerConnectionsRef.current.keys()));
  };

  const cleanupAllPeerConnections = () => {
    Array.from(peerConnectionsRef.current.keys()).forEach(peerId => {
      cleanupPeerConnection(peerId);
    });
    peerConnectionsRef.current.clear();
    remoteAudioElementsRef.current.clear();
    processedSignalIdsRef.current.clear();
    peerOfferSentAtRef.current.clear();
    setConnectedPeerIds([]);
  };

  const getOrCreatePeerConnection = async (
    guildId: string,
    peerId: string,
    shouldCreateOffer: boolean
  ): Promise<RTCPeerConnection | null> => {
    if (!audioStreamRef.current) return null;

    let pc = peerConnectionsRef.current.get(peerId);
    if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) {
      cleanupPeerConnection(peerId);
      pc = undefined;
    }

    if (!pc) {
      pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Attach local microphone tracks
      audioStreamRef.current.getTracks().forEach(track => {
        if (audioStreamRef.current) {
          pc!.addTrack(track, audioStreamRef.current);
        }
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendAgoraSignal(guildId, currentUser.id, peerId, 'ice-candidate', event.candidate.toJSON()).catch(() => {});
        }
      };

      pc.ontrack = (event) => {
        const remoteStream = event.streams?.[0] || new MediaStream([event.track]);
        let audioEl = remoteAudioElementsRef.current.get(peerId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          (audioEl as any).playsInline = true;
          remoteAudioElementsRef.current.set(peerId, audioEl);
        }
        if (audioEl.srcObject !== remoteStream) {
          audioEl.srcObject = remoteStream;
          audioEl.play().catch(() => {});
        }
        setConnectedPeerIds(Array.from(peerConnectionsRef.current.keys()));
      };

      pc.onconnectionstatechange = () => {
        if (pc?.connectionState === 'connected') {
          setConnectedPeerIds(Array.from(peerConnectionsRef.current.keys()));
        } else if (pc?.connectionState === 'failed' || pc?.connectionState === 'closed') {
          cleanupPeerConnection(peerId);
        }
      };

      peerConnectionsRef.current.set(peerId, pc);
    }

    if (shouldCreateOffer) {
      try {
        peerOfferSentAtRef.current.set(peerId, Date.now());
        const offer = await pc.createOffer({
          offerToReceiveAudio: true
        });
        await pc.setLocalDescription(offer);
        await sendAgoraSignal(guildId, currentUser.id, peerId, 'offer', {
          type: offer.type,
          sdp: offer.sdp
        });
      } catch (err) {
        console.warn('Erro ao iniciar conexão de áudio WebRTC:', err);
      }
    }

    return pc;
  };

  const stopAudioInternal = () => {
    cleanupAllPeerConnections();
    if (audioAnimFrameRef.current) {
      cancelAnimationFrame(audioAnimFrameRef.current);
      audioAnimFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (activeAgoraGuildIdRef.current) {
      leaveGuildAgora(activeAgoraGuildIdRef.current, currentUser.id).catch(() => {});
      activeAgoraGuildIdRef.current = null;
    }
    setAudioLevel(0);
    setIsMuted(false);
  };

  // Cleanup audio tracks on unmount
  useEffect(() => {
    return () => {
      stopAudioInternal();
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      await updateUserPresence(currentUser.id, true);
      await refreshData();
    };
    init();

    // Simulate real-time by refreshing every 4 seconds
    const interval = setInterval(() => {
      if (!isMutatingFriendshipRef.current) {
        refreshData();
      }
      refreshChatIfActive();
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedChat, selectedThread]);

  // Keep Ágora participants, presence & WebRTC audio connections synced when viewing or connected to Ágora
  useEffect(() => {
    const targetGuildId = activeGuild?.id || activeAgoraGuildIdRef.current;
    if (!targetGuildId || (guildSubTab !== 'agora' && audioPermission !== 'granted')) return;
    let isMounted = true;

    const syncAgora = async () => {
      try {
        if (audioPermission === 'granted') {
          activeAgoraGuildIdRef.current = targetGuildId;
          await pingGuildAgoraPresence(targetGuildId, currentUser, isMuted);
        }

        const fetchedParticipants = await getGuildAgoraParticipants(targetGuildId);
        let mergedParticipants = [...fetchedParticipants];

        // Always include self immediately when connected so UI never lags
        if (audioPermission === 'granted' && !mergedParticipants.some(p => p.userId === currentUser.id)) {
          mergedParticipants.unshift({
            userId: currentUser.id,
            name: currentUser.name,
            photoURL: currentUser.photoBase64 || currentUser.photoURL || '',
            joinedAt: new Date().toISOString(),
            lastPing: new Date().toISOString(),
            isMuted
          });
        }

        if (isMounted) {
          setAgoraParticipants(mergedParticipants);
        }

        // WebRTC Mesh Audio Signaling when local user is connected to Ágora
        if (audioPermission === 'granted' && audioStreamRef.current) {
          // 1. Poll incoming WebRTC signals addressed to currentUser
          const incomingSignals = await pollAgoraSignals(targetGuildId, currentUser.id);
          for (const sig of incomingSignals) {
            if (processedSignalIdsRef.current.has(`${sig.id}_${sig.createdAt}`)) continue;
            processedSignalIdsRef.current.add(`${sig.id}_${sig.createdAt}`);

            try {
              const data = JSON.parse(sig.payload);
              if (sig.type === 'offer') {
                const pc = await getOrCreatePeerConnection(targetGuildId, sig.senderId, false);
                if (pc) {
                  await pc.setRemoteDescription(new RTCSessionDescription(data));
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  await sendAgoraSignal(targetGuildId, currentUser.id, sig.senderId, 'answer', {
                    type: answer.type,
                    sdp: answer.sdp
                  });
                }
              } else if (sig.type === 'answer') {
                const pc = peerConnectionsRef.current.get(sig.senderId);
                if (pc && pc.signalingState === 'have-local-offer') {
                  await pc.setRemoteDescription(new RTCSessionDescription(data));
                }
              } else if (sig.type === 'ice-candidate') {
                const pc = peerConnectionsRef.current.get(sig.senderId);
                if (pc && pc.remoteDescription) {
                  await pc.addIceCandidate(new RTCIceCandidate(data));
                }
              }
            } catch (sigErr) {
              console.warn('Aviso no sinal WebRTC da Ágora:', sigErr);
            }
          }

          // 2. Initiate peer connections to any active participants not yet connected
          const activePeerIds = new Set(
            mergedParticipants.filter(p => p.userId !== currentUser.id).map(p => p.userId)
          );

          // Disconnect peers who left the room
          Array.from(peerConnectionsRef.current.keys()).forEach(peerId => {
            if (!activePeerIds.has(peerId)) {
              cleanupPeerConnection(peerId);
            }
          });

          for (const peerId of activePeerIds) {
            const existingPc = peerConnectionsRef.current.get(peerId);
            const lastOfferAt = peerOfferSentAtRef.current.get(peerId) || 0;
            const nowMs = Date.now();
            const isConnected = existingPc && (existingPc.connectionState === 'connected' || existingPc.connectionState === 'connecting');

            // Deterministic initiator (currentUser.id < peerId) or retry after 8s if no connection established yet
            const shouldInitiate = !isConnected && (
              ( !existingPc && currentUser.id < peerId ) ||
              ( !existingPc && (nowMs - lastOfferAt) > 6000 ) ||
              ( existingPc && existingPc.connectionState !== 'connected' && (nowMs - lastOfferAt) > 10000 && currentUser.id < peerId )
            );

            if (shouldInitiate) {
              await getOrCreatePeerConnection(targetGuildId, peerId, true);
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao sincronizar Ágora:', err);
      }
    };

    syncAgora();
    const agoraInterval = setInterval(syncAgora, 2500);
    return () => {
      isMounted = false;
      clearInterval(agoraInterval);
    };
  }, [activeGuild?.id, guildSubTab, audioPermission, isMuted]);

  const refreshData = async () => {
    try {
      const [
        usersRes,
        friendsRes,
        blockedRes,
        requestsRes,
        availableRes,
        userGuildsRes,
        communityGuildsRes,
        threadsRes,
        compsRes
      ] = await Promise.all([
        getAllUsers().catch(() => allUsers),
        getFriendsList(currentUser.id).catch(() => friends),
        getBlockedUsersList(currentUser.id).catch(() => blockedUsers),
        getPendingRequests(currentUser.id).catch(() => requests),
        getAvailableUsers(currentUser.id).catch(() => availableUsers),
        getUserGuilds(currentUser.id).catch(() => guilds),
        getAllGuilds(currentUser.id).catch(() => allGuilds),
        getForumThreads().catch(() => threads),
        getCompetitions().catch(() => competitions)
      ]);

      // Prune optimistic caches older than 45 seconds
      const nowMs = Date.now();
      recentlyAcceptedUsersRef.current.forEach((val, key) => {
        if (nowMs - val.timestamp > 45000) recentlyAcceptedUsersRef.current.delete(key);
      });
      recentlyRejectedIdsRef.current.forEach((ts, key) => {
        if (nowMs - ts > 45000) recentlyRejectedIdsRef.current.delete(key);
      });

      // Merge any recently accepted friends so they never disappear during Firestore propagation
      const mergedFriends = [...friendsRes];
      recentlyAcceptedUsersRef.current.forEach(({ user, friendshipId }) => {
        if (!mergedFriends.some(f => f.user.id === user.id)) {
          mergedFriends.push({ user, friendshipId });
        }
      });

      const acceptedUserIds = new Set(mergedFriends.map(f => f.user.id));

      // Filter out any requests that were recently accepted or rejected
      const filteredRequests = requestsRes.filter(r => {
        if (acceptedUserIds.has(r.user.id)) return false;
        if (recentlyAcceptedUsersRef.current.has(r.user.id)) return false;
        if (recentlyRejectedIdsRef.current.has(r.friendshipId)) return false;
        if (recentlyRejectedIdsRef.current.has(r.user.id)) return false;
        return true;
      });

      setAllUsers(usersRes.map(u => u.id === currentUser.id ? u : toSafePublicUser(u, u.id)));
      setFriends(mergedFriends);
      setBlockedUsers(blockedRes);
      setRequests(filteredRequests);
      setAvailableUsers(availableRes.filter(u => !acceptedUserIds.has(u.id)));
      setGuilds(userGuildsRes);
      setAllGuilds(communityGuildsRes);
      setThreads(threadsRes);
      setCompetitions(compsRes);

      // Calculate guild member stats
      const uniqueMemberIds = Array.from(new Set(userGuildsRes.flatMap(g => g.members)));
      const newMemberStats: Record<string, number> = {};

      for (const memberId of uniqueMemberIds) {
        try {
          const userSessions = await getSessions(memberId);
          const guildWithMember = userGuildsRes.find(g => g.members.includes(memberId));
          const resetTime = guildWithMember?.statsResetDate ? new Date(guildWithMember.statsResetDate).getTime() : 0;

          const total = userSessions
            .filter(s => new Date(s.date).getTime() >= resetTime)
            .reduce((acc, s) => acc + s.wordCount, 0);
          newMemberStats[memberId] = total;
        } catch (err) {
          newMemberStats[memberId] = memberStats[memberId] || 0;
        }
      }
      setMemberStats(newMemberStats);

      // Calculate stats asynchronously for competitions
      const newStats: Record<string, Record<string, { current: number, percent: number }>> = {};
      for (const comp of compsRes) {
        newStats[comp.id] = {};
        for (const pid of comp.participants) {
          try {
            const sessions = await getSessions(pid);
            newStats[comp.id][pid] = calculateProgress(comp, sessions);
          } catch (err) {
            newStats[comp.id][pid] = { current: 0, percent: 0 };
          }
        }
      }
      setCompStats(newStats);
    } catch (e) {
      console.error("Erro ao atualizar dados da comunidade:", e);
    }
  };

  const calculateProgress = (comp: Competition, sessions: WritingSession[]) => {
    const start = new Date(comp.startDate).getTime();
    const end = new Date(comp.endDate).getTime();

    const validSessions = sessions.filter(s => {
      const sDate = new Date(s.date).getTime();
      return sDate >= start && sDate <= end;
    });

    let current = 0;
    if (comp.type === 'word_count') {
      current = validSessions.reduce((acc, s) => acc + s.wordCount, 0);
    } else {
      // Days streak in period (simplified count of days)
      const days = new Set(validSessions.map(s => new Date(s.date).toLocaleDateString()));
      current = days.size;
    }

    const targetNum = Math.max(1, Number(comp.target) || 1);
    const percent = Math.min(100, Math.round((current / targetNum) * 100));
    return { current, percent };
  };

  const refreshChatIfActive = async () => {
    if (selectedChat) {
      let convo: Message[] = [];
      if (selectedChat.type === 'direct') {
        const user = selectedChat.target as User;
        convo = await getConversation(currentUser.id, user.id);
      } else {
        const guild = selectedChat.target as Guild;
        convo = await getGroupMessages(guild.id);
      }
      setMessages(prev => {
        if (prev.length !== convo.length) return convo;
        return prev;
      });
    }
    if (selectedThread) {
      const replies = await getForumReplies(selectedThread.id);
      setThreadReplies(prev => {
        if (prev.length !== replies.length) return replies;
        return prev;
      });
    }
  };

  // --- Effect: Select Chat ---
  useEffect(() => {
    if (selectedChat) {
      const loadChat = async () => {
        if (selectedChat.type === 'direct') {
          const user = selectedChat.target as User;
          const convo = await getConversation(currentUser.id, user.id);
          setMessages(convo);
          markAsRead(user.id, currentUser.id);
        } else {
          const guild = selectedChat.target as Guild;
          const convo = await getGroupMessages(guild.id);
          setMessages(convo);
        }
        scrollToBottom();
      };
      loadChat();
    }
  }, [selectedChat]);

  // --- Effect: Select Thread ---
  useEffect(() => {
    if (selectedThread) {
      const loadThread = async () => {
        setThreadReplies(await getForumReplies(selectedThread.id));
      };
      loadThread();
    }
  }, [selectedThread]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 60);
  };

  useEffect(() => {
    if (selectedChat && (selectedChat.type === 'direct' || guildSubTab === 'chat')) {
      scrollToBottom();
    }
  }, [messages, selectedChat, guildSubTab]);

  // --- Handlers: Friends & Blocking ---
  const handleSendRequest = async (userId: string) => {
    try {
      const targetUser = availableUsers.find(u => u.id === userId) || allUsers.find(u => u.id === userId);
      const createdId = await sendFriendRequest(currentUser.id, userId);
      if (targetUser) {
        setRequests(prev => {
          if (prev.some(r => r.user.id === userId)) return prev;
          return [
            {
              user: targetUser,
              friendshipId: createdId || `temp-${Date.now()}`,
              type: 'sent',
              createdAt: new Date().toISOString()
            },
            ...prev
          ];
        });
        setAvailableUsers(prev => prev.filter(u => u.id !== userId));
      }
      await refreshData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAccept = async (id: string, targetUser?: User) => {
    if (acceptingIds.includes(id)) return;
    const acceptedReq = requests.find(r => r.friendshipId === id || (targetUser && r.user.id === targetUser.id));
    const otherUser = targetUser || acceptedReq?.user;

    setAcceptingIds(prev => [...prev, id]);
    isMutatingFriendshipRef.current = true;

    const nowMs = Date.now();
    recentlyRejectedIdsRef.current.set(id, nowMs);
    if (otherUser) {
      recentlyAcceptedUsersRef.current.set(otherUser.id, {
        user: otherUser,
        friendshipId: id,
        timestamp: nowMs
      });
    }

    setRequests(prev => prev.filter(r => r.friendshipId !== id && (!otherUser || r.user.id !== otherUser.id)));
    if (otherUser) {
      setFriends(prev => {
        if (prev.some(f => f.user.id === otherUser.id)) return prev;
        return [...prev, { user: otherUser, friendshipId: id }];
      });
      setAvailableUsers(prev => prev.filter(u => u.id !== otherUser.id));
    }

    try {
      const realAcceptedId = await acceptFriendRequest(id, currentUser.id, otherUser?.id);
      if (otherUser && realAcceptedId) {
        recentlyAcceptedUsersRef.current.set(otherUser.id, {
          user: otherUser,
          friendshipId: realAcceptedId,
          timestamp: Date.now()
        });
        setFriends(prev => prev.map(f => f.user.id === otherUser.id ? { ...f, friendshipId: realAcceptedId } : f));
      }
    } catch (err) {
      console.error("Erro ao aceitar solicitação:", err);
    } finally {
      isMutatingFriendshipRef.current = false;
      setAcceptingIds(prev => prev.filter(item => item !== id));
      await refreshData();
    }
  };

  const handleReject = async (id: string, targetUserId?: string) => {
    isMutatingFriendshipRef.current = true;
    const nowMs = Date.now();
    recentlyRejectedIdsRef.current.set(id, nowMs);
    if (targetUserId) {
      recentlyRejectedIdsRef.current.set(targetUserId, nowMs);
      recentlyAcceptedUsersRef.current.delete(targetUserId);
    }
    setRequests(prev => prev.filter(r => r.friendshipId !== id && (!targetUserId || r.user.id !== targetUserId)));
    try {
      await removeFriendship(id, currentUser.id, targetUserId);
    } finally {
      isMutatingFriendshipRef.current = false;
      await refreshData();
    }
  };

  const handleRemoveFriend = async (e: React.MouseEvent, friendshipId: string, friendUserId?: string) => {
    e.stopPropagation();
    if (confirm(t('social.friends.confirmRemoveFriend'))) {
      const friendObj = friends.find(f => f.friendshipId === friendshipId);
      const targetId = friendUserId || friendObj?.user.id;
      if (targetId) {
        recentlyAcceptedUsersRef.current.delete(targetId);
      }
      await removeFriendship(friendshipId, currentUser.id, targetId);
      if (selectedChat?.type === 'direct' && targetId && selectedChat.target.id === targetId) {
        setSelectedChat(null);
      }
      await refreshData();
    }
  };

  const handleBlockUser = async (e: React.MouseEvent, targetUser: User) => {
    e.stopPropagation();
    if (confirm(`Deseja bloquear ${targetUser.name}? Enquanto estiver bloqueado(a), esta pessoa não poderá enviar solicitações de amizade nem aparecerá nas buscas.`)) {
      await blockUserSocial(currentUser.id, targetUser.id);
      if (selectedChat?.type === 'direct' && selectedChat.target.id === targetUser.id) {
        setSelectedChat(null);
      }
      await refreshData();
    }
  };

  const handleUnblockUser = async (targetUserId: string) => {
    await unblockUserSocial(currentUser.id, targetUserId);
    await refreshData();
  };

  // --- Handlers: Chat ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = sanitizeText(newMessage, 1000);
    if (!cleanMsg || !selectedChat) return;
    if (!canPerformSocialAction()) return;

    try {
      setIsActionSubmitting(true);
      if (selectedChat.type === 'direct') {
        const user = selectedChat.target as User;
        await sendMessage(currentUser.id, user.id, cleanMsg);
        setMessages(await getConversation(currentUser.id, user.id));
      } else {
        const guild = activeGuild || (selectedChat.target as Guild);
        await sendGroupMessage(currentUser.id, guild.id, cleanMsg);
        setMessages(await getGroupMessages(guild.id));
      }
      setNewMessage('');
      setShowChatEmojiPicker(false);
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleInsertChatEmoji = (emoji: string) => {
    setNewMessage(prev => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${emoji} `);
    setShowChatEmojiPicker(false);
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 20);
  };

  const handleSendDirectSpark = async (targetUser: User) => {
    if (isActionSubmitting || isCooldownActive) return;
    if (!canPerformSocialAction()) return;
    try {
      setIsActionSubmitting(true);
      setSentDirectSpark(true);
      setTimeout(() => setSentDirectSpark(false), 2600);
      const sparkText = `🔥👏 Enviou uma faísca literária de incentivo para sua escrita hoje! ✨`;
      await sendMessage(currentUser.id, targetUser.id, sparkText);
      setMessages(await getConversation(currentUser.id, targetUser.id));
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // --- Handlers: Guilds ---
  const handleCreateGuild = async () => {
    const cleanName = sanitizeText(newGuildName, 80);
    const cleanDesc = sanitizeText(newGroupDesc, 500);
    if (!cleanName) return;
    if (!canPerformSocialAction()) return;
    try {
      setIsActionSubmitting(true);
      await createGuild(cleanName, currentUser.id, selectedGuildMembers, cleanDesc, newGuildEmblemBase64);
      setShowCreateGuild(false);
      setNewGuildName('');
      setNewGroupDesc('');
      setNewGuildEmblemBase64('');
      setSelectedGuildMembers([]);
      await refreshData();
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleRequestJoinGuild = async (e: React.MouseEvent, guild: Guild) => {
    e.stopPropagation();
    try {
      const updatedGuild: Guild = {
        ...guild,
        pendingMemberIds: Array.from(new Set([...(guild.pendingMemberIds || []), currentUser.id]))
      };
      setAllGuilds(prev => prev.map(g => g.id === guild.id ? updatedGuild : g));
      await requestJoinGuild(guild.id, currentUser.id);
      await refreshData();
    } catch (err) {
      console.error("Erro ao solicitar entrada na guilda:", err);
      alert("Não foi possível enviar sua solicitação para a guilda no momento.");
    }
  };

  const handleCancelGuildRequest = async (e: React.MouseEvent, guild: Guild) => {
    e.stopPropagation();
    try {
      const updatedGuild: Guild = {
        ...guild,
        pendingMemberIds: (guild.pendingMemberIds || []).filter(id => id !== currentUser.id)
      };
      setAllGuilds(prev => prev.map(g => g.id === guild.id ? updatedGuild : g));
      await cancelJoinGuildRequest(guild.id, currentUser.id);
      await refreshData();
    } catch (err) {
      console.error("Erro ao cancelar solicitação na guilda:", err);
    }
  };

  const handleApproveGuildMember = async (guildId: string, candidateUserId: string) => {
    const targetGuild = guilds.find(g => g.id === guildId) || allGuilds.find(g => g.id === guildId);
    if (!targetGuild || !isOwnerOrAdmin(targetGuild)) return;

    const updatedGuild: Guild = {
      ...targetGuild,
      members: Array.from(new Set([...(targetGuild.members || []), candidateUserId])),
      pendingMemberIds: (targetGuild.pendingMemberIds || []).filter(id => id !== candidateUserId)
    };
    setGuilds(prev => prev.map(g => g.id === guildId ? updatedGuild : g));
    setAllGuilds(prev => prev.map(g => g.id === guildId ? updatedGuild : g));
    if (selectedChat?.type === 'group' && selectedChat.target.id === guildId) {
      setSelectedChat({ type: 'group', target: updatedGuild });
    }

    await approveGuildMember(guildId, candidateUserId);
    await refreshData();
  };

  const handleRejectGuildMember = async (guildId: string, candidateUserId: string) => {
    const targetGuild = guilds.find(g => g.id === guildId) || allGuilds.find(g => g.id === guildId);
    if (!targetGuild || !isOwnerOrAdmin(targetGuild)) return;

    const updatedGuild: Guild = {
      ...targetGuild,
      pendingMemberIds: (targetGuild.pendingMemberIds || []).filter(id => id !== candidateUserId)
    };
    setGuilds(prev => prev.map(g => g.id === guildId ? updatedGuild : g));
    setAllGuilds(prev => prev.map(g => g.id === guildId ? updatedGuild : g));
    if (selectedChat?.type === 'group' && selectedChat.target.id === guildId) {
      setSelectedChat({ type: 'group', target: updatedGuild });
    }

    await rejectGuildMember(guildId, candidateUserId);
    await refreshData();
  };

  const handleUpdateEmblem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedChat?.type === 'group' && activeGuild) {
      try {
        setIsUpdatingEmblem(true);
        const guild = activeGuild;
        
        // HTML5 Canvas resize to 200x200 JPEG 0.7 Base64
        const base64 = await resizeImageToBase64(file, 200, 200, 0.7);
        await updateGuildEmblemBase64(guild.id, base64);

        // Update local state immediately
        const updatedGuild = { ...guild, emblemBase64: base64, emblemUrl: base64 };
        setGuilds(prev => prev.map(g => g.id === guild.id ? updatedGuild : g));
        setSelectedChat({ ...selectedChat, target: updatedGuild });

        await refreshData();
      } catch (error) {
        console.error("Erro ao atualizar brasão:", error);
        alert(t('social.guilds.errorEmblem'));
      } finally {
        setIsUpdatingEmblem(false);
      }
    }
  };

  // Guild Forum Handlers
  const fetchGuildThreadData = async (guildId: string) => {
    setGuildThreads(await getGuildThreads(guildId));
  };

  const handleCreateGuildThread = async () => {
    const cleanTitle = sanitizeText(newThreadTitle, 80);
    const cleanContent = sanitizeText(newThreadContent, 3000);
    if (selectedChat?.type === 'group' && activeGuild && cleanTitle && cleanContent) {
      if (!canPerformSocialAction()) return;
      try {
        setIsActionSubmitting(true);
        setForumError(null);
        const guild = activeGuild;
        await createGuildThread(guild.id, currentUser.id, cleanTitle, cleanContent);
        setNewThreadTitle('');
        setNewThreadContent('');
        setShowCreateGuildThread(false);
        await fetchGuildThreadData(guild.id);
        await refreshData();
      } catch (error) {
        setForumError(t('social.forum.errorPublish'));
      } finally {
        setIsActionSubmitting(false);
      }
    }
  };

  const handleSelectGuildThread = async (thread: GuildForumThread) => {
    setSelectedGuildThread(thread);
    setGuildReplies(await getGuildReplies(thread.id));
  };

  const handleReplyGuildThread = async () => {
    const cleanReply = sanitizeText(newReplyContent, 3000);
    if (selectedGuildThread && cleanReply) {
      if (!canPerformSocialAction()) return;
      try {
        setIsActionSubmitting(true);
        await replyToGuildThread(currentUser.id, selectedGuildThread.id, cleanReply);
        setNewReplyContent('');
        setGuildReplies(await getGuildReplies(selectedGuildThread.id));
      } finally {
        setIsActionSubmitting(false);
      }
    }
  };

  const toggleGuildMember = (userId: string) => {
    setSelectedGuildMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // --- Handlers: Forum ---
  const handleCreateThread = async () => {
    const cleanTitle = sanitizeText(newThreadTitle, 80);
    const cleanContent = sanitizeText(newThreadContent, 3000);
    if (!cleanTitle || !cleanContent) {
      setForumError(t('social.forum.titleContentRequired'));
      return;
    }
    if (!canPerformSocialAction()) return;
    try {
      setIsActionSubmitting(true);
      setForumError(null);
      await createForumThread(currentUser.id, cleanTitle, cleanContent, newThreadCategory);
      setShowCreateThread(false);
      setNewThreadTitle('');
      setNewThreadContent('');
      await refreshData();
    } catch (error) {
      console.error("Erro ao criar tópico:", error);
      setForumError(t('social.forum.errorCreateThread'));
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleToggleLike = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    const newLikes = await toggleForumThreadLike(threadId, currentUser.id);
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, likes: newLikes } : t));
    if (selectedThread?.id === threadId) {
      setSelectedThread(prev => prev ? { ...prev, likes: newLikes } : null);
    }
  };

  const handleJoinAudio = async () => {
    try {
      stopAudioInternal();
      setAudioPermission('pending');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      audioStreamRef.current = stream;
      setIsMuted(false);
      setAudioPermission('granted');

      // Setup Web Audio API analyser for real-time voice level meter
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.75;
          source.connect(analyser);
          audioContextRef.current = ctx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevel = () => {
            if (!analyserRef.current || !audioStreamRef.current) return;
            const track = audioStreamRef.current.getAudioTracks()[0];
            if (!track || !track.enabled) {
              setAudioLevel(0);
            } else {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 90) * 100)));
            }
            audioAnimFrameRef.current = requestAnimationFrame(updateLevel);
          };
          audioAnimFrameRef.current = requestAnimationFrame(updateLevel);
        }
      } catch (audioCtxErr) {
        console.warn("Visualizador de áudio indisponível:", audioCtxErr);
      }

      if (activeGuild) {
        activeAgoraGuildIdRef.current = activeGuild.id;
        await pingGuildAgoraPresence(activeGuild.id, currentUser, false);
        const participants = await getGuildAgoraParticipants(activeGuild.id);
        const withSelf = participants.some(p => p.userId === currentUser.id)
          ? participants
          : [
              {
                userId: currentUser.id,
                name: currentUser.name,
                photoURL: currentUser.photoBase64 || currentUser.photoURL || '',
                joinedAt: new Date().toISOString(),
                lastPing: new Date().toISOString(),
                isMuted: false
              },
              ...participants
            ];
        setAgoraParticipants(withSelf);

        // Immediately initiate WebRTC offers to all other active participants in the Ágora
        for (const part of withSelf) {
          if (part.userId !== currentUser.id) {
            await getOrCreatePeerConnection(activeGuild.id, part.userId, true);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      setAudioPermission('denied');
      alert(t('social.forum.errorMicrophone'));
    }
  };

  const handleToggleMute = async () => {
    if (!audioStreamRef.current) return;
    const tracks = audioStreamRef.current.getAudioTracks();
    const nextMuted = !isMuted;
    tracks.forEach(track => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
    if (nextMuted) setAudioLevel(0);
    if (activeGuild) {
      await pingGuildAgoraPresence(activeGuild.id, currentUser, nextMuted);
      const participants = await getGuildAgoraParticipants(activeGuild.id);
      setAgoraParticipants(participants);
    }
  };

  const handleStopAudio = async () => {
    const guildId = activeAgoraGuildIdRef.current || activeGuild?.id;
    stopAudioInternal();
    setAudioPermission('pending');
    if (guildId) {
      await leaveGuildAgora(guildId, currentUser.id);
      const participants = await getGuildAgoraParticipants(guildId);
      setAgoraParticipants(participants);
    }
  };

  const handleReplyThread = async () => {
    const cleanReply = sanitizeText(newReplyContent, 3000);
    if (!selectedThread || !cleanReply) return;
    if (!canPerformSocialAction()) return;
    try {
      setIsActionSubmitting(true);
      await replyToThread(currentUser.id, selectedThread.id, cleanReply);
      setThreadReplies(await getForumReplies(selectedThread.id));
      setNewReplyContent('');
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // --- Handlers: Competitions ---
  const handleCreateCompetition = async () => {
    const cleanTitle = sanitizeText(newCompTitle, 80);
    if (!cleanTitle) {
      setCompError("Informe um título para lançar o desafio literário.");
      return;
    }
    if (!canPerformSocialAction()) return;
    try {
      setIsSubmittingComp(true);
      setIsActionSubmitting(true);
      setCompError(null);
      const cleanDesc = sanitizeText(newCompDesc, 500) || "Desafio literário da comunidade ParnasoTec.";
      const cleanTarget = Math.max(1, Number(newCompTarget) || 1000);
      const cleanDuration = Math.max(1, Number(newCompDuration) || 7);

      const created = await createCompetition(
        currentUser.id,
        cleanTitle,
        cleanDesc,
        newCompType,
        cleanTarget,
        cleanDuration
      );

      // Optimistically prepend to state so user sees it immediately
      setCompetitions(prev => [created, ...prev.filter(c => c.id !== created.id)]);
      try {
        const mySessions = await getSessions(currentUser.id);
        setCompStats(prev => ({
          ...prev,
          [created.id]: {
            [currentUser.id]: calculateProgress(created, mySessions)
          }
        }));
      } catch (e) {}

      setShowCreateComp(false);
      setNewCompTitle('');
      setNewCompDesc('');
      setActiveTab('competitions');
      setSelectedChat(null);
      setSelectedThread(null);
      await refreshData();
    } catch (err: any) {
      console.error("Erro ao lançar desafio:", err);
      setCompError("Não foi possível lançar o desafio. Tente novamente.");
    } finally {
      setIsSubmittingComp(false);
      setIsActionSubmitting(false);
    }
  };

  const isOwnerOrAdmin = (guild: Guild) => {
    return guild.adminId === currentUser.id || (guild.adminIds || []).includes(currentUser.id);
  };

  const isGuildMember = (guild?: Guild | null) => {
    if (!guild) return false;
    return (guild.members || []).includes(currentUser.id) || isOwnerOrAdmin(guild);
  };

  // Campfire Sprint Timer Effect
  useEffect(() => {
    if (!isCampfireActive) return;
    const timer = setInterval(() => {
      setCampfireSecondsLeft(prev => {
        if (prev <= 1) {
          setIsCampfireActive(false);
          setCampfireCompletedCount(c => c + 1);
          return campfireDurationMin * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isCampfireActive, campfireDurationMin]);

  const handleSelectCampfireDuration = (mins: 15 | 25) => {
    setCampfireDurationMin(mins);
    setIsCampfireActive(false);
    setCampfireSecondsLeft(mins * 60);
  };

  const formatCampfireTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getGuildRankInfo = (totalWords: number) => {
    if (totalWords >= 100000) {
      return {
        level: 5,
        title: 'Imortais do Parnaso',
        icon: '👑',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
        defaultGoal: Math.max(150000, Math.ceil((totalWords + 1) / 50000) * 50000)
      };
    }
    if (totalWords >= 50000) {
      return {
        level: 4,
        title: 'Academia de Ébano',
        icon: '🏛️',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
        defaultGoal: 100000
      };
    }
    if (totalWords >= 25000) {
      return {
        level: 3,
        title: 'Confraria das Penas',
        icon: '📜',
        badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        defaultGoal: 50000
      };
    }
    if (totalWords >= 10000) {
      return {
        level: 2,
        title: 'Ordem dos Cronistas',
        icon: '🪶',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        defaultGoal: 25000
      };
    }
    return {
      level: 1,
      title: 'Círculo de Aprendizes',
      icon: '🌱',
      badgeBg: 'bg-teal-100 text-teal-800 border-teal-300',
      defaultGoal: 25000
    };
  };

  const handleSaveGuildDescription = async () => {
    if (!activeGuild) return;
    try {
      setIsSavingGuildDesc(true);
      const clean = await updateGuildDescription(activeGuild.id, editedGuildDesc);
      const updated: Guild = { ...activeGuild, description: clean };
      setGuilds(prev => prev.map(g => g.id === activeGuild.id ? updated : g));
      setAllGuilds(prev => prev.map(g => g.id === activeGuild.id ? updated : g));
      setSelectedChat({ type: 'group', target: updated });
      setIsEditingGuildDesc(false);
    } catch (err) {
      console.error('Erro ao atualizar lema da guilda:', err);
    } finally {
      setIsSavingGuildDesc(false);
    }
  };

  const handleSendMemberSpark = (memberId: string) => {
    setCheeredMembers(prev => ({ ...prev, [memberId]: true }));
    setMemberSparks(prev => ({ ...prev, [memberId]: (prev[memberId] || 0) + 1 }));
    setTimeout(() => {
      setCheeredMembers(prev => ({ ...prev, [memberId]: false }));
    }, 2500);
  };

  const handleResetStats = async (guildId: string) => {
    setShowAdminGearMenu(false);
    if (confirm(t('social.guilds.resetConfirm'))) {
      await resetGuildStats(guildId);
      await refreshData();
    }
  };

  const handlePromoteAdmin = async (guildId: string, userId: string) => {
    await promoteMemberToAdmin(guildId, userId);
    await refreshData();
    alert(t('social.guilds.promotedAdmin'));
  };

  const handleCreateChallenge = async () => {
    const cleanTitle = sanitizeText(newChallengeTitle, 80);
    if (!cleanTitle) {
      setChallengeError("Informe um nome para a missão da guilda.");
      return;
    }
    if (!selectedChat || selectedChat.type !== 'group' || !activeGuild) return;
    if (!canPerformSocialAction()) return;
    try {
      setIsSubmittingChallenge(true);
      setIsActionSubmitting(true);
      setChallengeError(null);
      const guild = activeGuild;
      const createdChallenge = await createGuildChallenge(guild.id, {
        title: cleanTitle,
        description: sanitizeText(newChallengeDesc, 500) || "Missão literária dos membros da guilda.",
        type: 'word_count',
        target: Math.max(1, Number(newChallengeTarget) || 1000),
        durationDays: Math.max(1, Number(newChallengeDuration) || 7)
      });

      const updatedGuild: Guild = {
        ...guild,
        challenges: [...(guild.challenges || []), createdChallenge]
      };
      setGuilds(prev => prev.map(g => g.id === guild.id ? updatedGuild : g));
      setAllGuilds(prev => prev.map(g => g.id === guild.id ? updatedGuild : g));
      setSelectedChat({ type: 'group', target: updatedGuild });

      setNewChallengeTitle('');
      setNewChallengeDesc('');
      setShowCreateChallenge(false);
      await refreshData();
    } catch (err) {
      console.error("Erro ao propor desafio na guilda:", err);
      setChallengeError("Não foi possível criar o desafio da guilda.");
    } finally {
      setIsSubmittingChallenge(false);
      setIsActionSubmitting(false);
    }
  };

  const handleDeleteGuildThread = async (threadId: string) => {
    if (confirm(t('social.forum.confirmDeleteThreadPerm'))) {
      await deleteGuildForumThread(threadId);
      if (activeGuild) {
        await fetchGuildThreadData(activeGuild.id);
      }
    }
  };

  const handleDeleteGuildReply = async (replyId: string) => {
    if (confirm(t('social.forum.confirmDeleteReply'))) {
      await deleteGuildForumReply(replyId);
      if (selectedGuildThread) {
        setGuildReplies(await getGuildReplies(selectedGuildThread.id));
      }
    }
  };

  const handleJoinCompetition = async (compId: string) => {
    await joinCompetition(compId, currentUser.id);
    setCompetitions(prev =>
      prev.map(c => c.id === compId ? { ...c, participants: Array.from(new Set([...c.participants, currentUser.id])) } : c)
    );
    await refreshData();
  };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (confirm(t('social.forum.confirmDeleteThread'))) {
      await deleteForumThread(threadId);
      if (selectedThread?.id === threadId) setSelectedThread(null);
      await refreshData();
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (confirm(t('social.forum.confirmDeleteReplySure'))) {
      await deleteForumReply(replyId);
      if (selectedThread) {
        setThreadReplies(await getForumReplies(selectedThread.id));
      }
    }
  };

  const handleDeleteCompetition = async (compId: string) => {
    if (confirm(t('social.competitions.confirmDelete'))) {
      await deleteCompetition(compId);
      setCompetitions(prev => prev.filter(c => c.id !== compId));
      await refreshData();
    }
  };

  // Helper to get User Name
  const getUserName = (userId: string) => {
    if (userId === currentUser.id) return currentUser.name;
    return allUsers.find(u => u.id === userId)?.name || 'Usuário';
  };

  const getUserAvatar = (u?: User | null) => {
    if (!u) return undefined;
    return u.photoBase64 || u.photoURL || (u as any).avatarBase64;
  };

  const getUserPhotoURL = (userId: string) => {
    if (userId === currentUser.id) return getUserAvatar(currentUser);
    const u = allUsers.find(u => u.id === userId);
    return getUserAvatar(u);
  };

  // Real online presence check (within last 2 minutes and not explicitly logged out)
  const checkUserOnline = (u?: User | null): boolean => {
    if (!u) return false;
    if (u.id === currentUser.id) return true;
    const latest = allUsers.find(item => item.id === u.id) || u;
    return isUserCurrentlyOnline(latest);
  };

  const getAvatarGradient = (seed: string) => {
    const gradients = [
      'from-emerald-500 to-teal-600',
      'from-violet-500 to-purple-600',
      'from-blue-500 to-indigo-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-teal-500 to-cyan-600',
    ];
    let hash = 0;
    const str = seed || 'Parnaso';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  const getSenderNameColor = (seed: string) => {
    const colors = [
      'text-indigo-600',
      'text-emerald-600',
      'text-violet-600',
      'text-amber-600',
      'text-rose-600',
      'text-teal-600',
    ];
    let hash = 0;
    const str = seed || 'Parnaso';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const formatChatDateDivider = (isoString: string) => {
    const msgDate = new Date(isoString);
    if (isNaN(msgDate.getTime())) return 'Hoje';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return 'Hoje';
    }
    if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }
    return msgDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      ...(msgDate.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {})
    });
  };

  const renderChatMessagesList = (chatMessages: Message[], mode: 'guild' | 'direct') => {
    if (chatMessages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center select-none">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-3 shadow-xs border ${
            mode === 'guild'
              ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            {mode === 'guild' ? '💬' : '✨'}
          </div>
          <p className="text-sm font-extrabold text-slate-700">
            {mode === 'guild' ? 'O salão de conversas da guilda está aberto!' : 'Inicie a conversa literária!'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            {mode === 'guild'
              ? 'Compartilhe ideias, metas do dia ou incentive seus companheiros de escrita.'
              : 'Envie uma mensagem ou uma faísca de incentivo para começar o diálogo.'}
          </p>
        </div>
      );
    }

    return chatMessages.map((msg, index) => {
      const isMe = msg.senderId === currentUser.id;
      const prevMsg = index > 0 ? chatMessages[index - 1] : null;

      const msgDate = new Date(msg.timestamp);
      const prevDate = prevMsg ? new Date(prevMsg.timestamp) : null;
      const isNewDay = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

      const msgMinuteKey = `${msgDate.getHours()}:${msgDate.getMinutes()}`;
      const prevMinuteKey = prevDate ? `${prevDate.getHours()}:${prevDate.getMinutes()}` : '';
      const isGrouped = Boolean(
        !isNewDay &&
        prevMsg &&
        prevMsg.senderId === msg.senderId &&
        msgMinuteKey === prevMinuteKey
      );

      const senderName = getUserName(msg.senderId);
      const senderPhoto = getUserPhotoURL(msg.senderId);
      const timeFormatted = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const isSenderGuildOwner = mode === 'guild' && activeGuild?.adminId === msg.senderId;
      const isSenderGuildAdmin = mode === 'guild' && !isSenderGuildOwner && (activeGuild?.adminIds || []).includes(msg.senderId);

      return (
        <React.Fragment key={msg.id || `${msg.timestamp}-${index}`}>
          {isNewDay && (
            <div className="flex justify-center my-4 select-none">
              <span className="px-3.5 py-1 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200/80 text-[11px] font-bold text-slate-500 shadow-2xs tracking-wide capitalize">
                {formatChatDateDivider(msg.timestamp)}
              </span>
            </div>
          )}

          <div className={`flex items-start ${isMe ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-3.5'}`}>
            {/* Left Avatar for received messages (or spacer when grouped consecutively) */}
            {!isMe && (
              <div className="mr-2.5 flex-shrink-0">
                {!isGrouped ? (
                  senderPhoto ? (
                    <img
                      src={senderPhoto}
                      alt={senderName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200/90 shadow-2xs"
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(senderName)} text-white flex items-center justify-center font-extrabold text-xs shadow-2xs border border-white`}
                    >
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                  )
                ) : (
                  <div className="w-9 h-1" />
                )}
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={`relative max-w-[78%] md:max-w-[62%] px-4 py-2.5 shadow-sm transition-all ${
                isMe
                  ? `${
                      mode === 'guild'
                        ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white'
                        : 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white'
                    } ${isGrouped ? 'rounded-2xl rounded-r-md' : 'rounded-2xl rounded-tr-sm'}`
                  : `bg-white text-slate-700 border border-slate-200/80 ${
                      isGrouped ? 'rounded-2xl rounded-l-md' : 'rounded-2xl rounded-tl-sm'
                    }`
              }`}
            >
              {/* Sender Header inside received bubble (only on first message of a group) */}
              {!isMe && !isGrouped && (
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className={`text-xs font-extrabold tracking-tight ${getSenderNameColor(senderName)}`}>
                    {senderName}
                  </span>
                  {isSenderGuildOwner && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80">
                      👑 Líder
                    </span>
                  )}
                  {isSenderGuildAdmin && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                      🛡️ Admin
                    </span>
                  )}
                </div>
              )}

              {/* Message Text & Discreet Bottom-Right Timestamp */}
              <div className="flex flex-col">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
                <div className={`flex items-center justify-end gap-1 mt-1 select-none ${
                  isMe
                    ? mode === 'guild'
                      ? 'text-indigo-100/90'
                      : 'text-emerald-100/90'
                    : 'text-slate-400'
                }`}>
                  <span className="text-[10px] font-medium leading-none">
                    {timeFormatted}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  const getCategoryBadgeStyle = (category?: string) => {
    switch (category) {
      case 'Dúvidas':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'Inspiração':
        return 'bg-purple-50 text-purple-700 border-purple-200/80';
      case 'Feedback':
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
      case 'Geral':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    }
  };

  // Deduplicate friends list by user.id
  const uniqueFriends = React.useMemo(() => {
    const map = new Map<string, { user: User; friendshipId: string }>();
    friends.forEach(item => {
      if (item?.user?.id && !map.has(item.user.id)) {
        const freshUser = allUsers.find(u => u.id === item.user.id) || item.user;
        map.set(item.user.id, { user: freshUser, friendshipId: item.friendshipId });
      }
    });
    return Array.from(map.values());
  }, [friends, allUsers]);

  const receivedRequests = React.useMemo(
    () => requests.filter(r => r.type === 'received'),
    [requests]
  );
  const sentRequests = React.useMemo(
    () => requests.filter(r => r.type === 'sent'),
    [requests]
  );

  const trimmedSearch = searchTerm.trim();
  const hasValidSearch = trimmedSearch.length >= 2;

  const filteredAvailable = hasValidSearch
    ? availableUsers.filter(u =>
        u.name.toLowerCase().includes(trimmedSearch.toLowerCase())
      )
    : [];

  const matchingPendingRequests = hasValidSearch
    ? requests.filter(r =>
        r.user.name.toLowerCase().includes(trimmedSearch.toLowerCase())
      )
    : [];

  const renderRequestCard = (req: { user: User; friendshipId: string; type: 'received' | 'sent'; createdAt?: string }) => {
    const { user, friendshipId, type } = req;
    const reqAvatar = getUserAvatar(user);
    const isOnline = checkUserOnline(user);

    return (
      <div
        key={friendshipId || `${type}-${user.id}`}
        className={`bg-white border p-2.5 rounded-xl shadow-2xs flex items-center justify-between gap-2 transition-all ${
          type === 'received'
            ? 'border-purple-200/90 hover:border-purple-300'
            : 'border-amber-200/80 hover:border-amber-300'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0">
            {reqAvatar ? (
              <img src={reqAvatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(user.name)} text-white flex items-center justify-center text-xs font-extrabold`}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                isOnline ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
            {type === 'received' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded-md border border-purple-200/60">
                <span>📥</span>
                <span>Solicitação recebida</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200/60">
                <span>⏳</span>
                <span>Enviada • Aguardando</span>
              </span>
            )}
          </div>
        </div>

        {type === 'received' ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => handleAccept(friendshipId, user)}
              disabled={acceptingIds.includes(friendshipId)}
              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer shadow-2xs"
              title="Aceitar amizade"
            >
              {acceptingIds.includes(friendshipId) ? 'Aceitando...' : 'Aceitar'}
            </button>
            <button
              onClick={() => handleReject(friendshipId, user.id)}
              disabled={acceptingIds.includes(friendshipId)}
              className="px-2 py-1.5 bg-slate-100 hover:bg-rose-50 disabled:opacity-50 text-slate-500 hover:text-rose-600 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
              title="Recusar solicitação"
            >
              Recusar
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleReject(friendshipId, user.id)}
            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 font-bold rounded-lg text-[10px] transition-colors cursor-pointer flex-shrink-0"
            title="Cancelar solicitação enviada"
          >
            Cancelar
          </button>
        )}
      </div>
    );
  };

  const renderFriendRequestsSection = () => (
    <div className="mb-3 bg-gradient-to-b from-purple-50/60 via-slate-50/70 to-amber-50/30 p-3 rounded-2xl border border-purple-100/90 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <span>📬</span>
          <span>Solicitações de Amizade</span>
        </h3>
        {requests.length > 0 && (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
            {requests.length} pendente{requests.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filter Pills: Todas / Recebidas / Enviadas */}
      <div className="grid grid-cols-3 gap-1 bg-white/90 p-1 rounded-xl border border-slate-200/70">
        <button
          type="button"
          onClick={() => setRequestsFilter('all')}
          className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
            requestsFilter === 'all'
              ? 'bg-slate-800 text-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Todas ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setRequestsFilter('received')}
          className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            requestsFilter === 'received'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-500 hover:text-purple-700'
          }`}
        >
          <span>📥</span>
          <span>Recebidas ({receivedRequests.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setRequestsFilter('sent')}
          className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            requestsFilter === 'sent'
              ? 'bg-amber-500 text-white shadow-2xs'
              : 'text-slate-500 hover:text-amber-700'
          }`}
        >
          <span>📤</span>
          <span>Enviadas ({sentRequests.length})</span>
        </button>
      </div>

      {/* Content based on active filter */}
      {requestsFilter === 'all' && (
        <div className="space-y-2.5">
          {receivedRequests.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 px-0.5 flex items-center gap-1">
                <span>📥 Recebidas ({receivedRequests.length})</span>
              </p>
              {receivedRequests.map(renderRequestCard)}
            </div>
          )}

          {sentRequests.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 px-0.5 flex items-center gap-1">
                <span>📤 Enviadas por você ({sentRequests.length})</span>
              </p>
              {sentRequests.map(renderRequestCard)}
            </div>
          )}

          {requests.length === 0 && (
            <p className="text-[11px] text-slate-400 text-center py-2">
              Nenhuma solicitação recebida ou enviada pendente.
            </p>
          )}
        </div>
      )}

      {requestsFilter === 'received' && (
        <div className="space-y-1.5">
          {receivedRequests.length > 0 ? (
            receivedRequests.map(renderRequestCard)
          ) : (
            <p className="text-[11px] text-slate-400 text-center py-2">
              Você não tem solicitações de amizade recebidas no momento.
            </p>
          )}
        </div>
      )}

      {requestsFilter === 'sent' && (
        <div className="space-y-1.5">
          {sentRequests.length > 0 ? (
            sentRequests.map(renderRequestCard)
          ) : (
            <p className="text-[11px] text-slate-400 text-center py-2">
              Você não possui solicitações de amizade enviadas aguardando resposta.
            </p>
          )}
        </div>
      )}
    </div>
  );

  const trimmedGuildSearch = guildSearchTerm.trim().toLowerCase();
  const filteredMyGuilds = guilds.filter(g =>
    !trimmedGuildSearch ||
    g.name.toLowerCase().includes(trimmedGuildSearch) ||
    (g.description || '').toLowerCase().includes(trimmedGuildSearch)
  );
  const discoverableGuilds = allGuilds.filter(
    g => !guilds.some(myG => myG.id === g.id) && !(g.members || []).includes(currentUser.id)
  );
  const filteredDiscoverableGuilds = discoverableGuilds.filter(g =>
    !trimmedGuildSearch ||
    g.name.toLowerCase().includes(trimmedGuildSearch) ||
    (g.description || '').toLowerCase().includes(trimmedGuildSearch)
  );
  const totalPendingGuildApplicationsForAdmin = guilds.reduce((acc, g) => {
    if (isOwnerOrAdmin(g)) {
      return acc + (g.pendingMemberIds?.length || 0);
    }
    return acc;
  }, 0);

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden animate-fade-in">

      {/* LEFT SIDEBAR: Navigation & Lists */}
      <div className={`${(selectedChat || selectedThread) ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-88 lg:w-96 bg-white border-r border-slate-200/80 h-full shadow-xs z-10`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-black text-slate-800 text-base leading-tight tracking-tight">
                  {t('social.title')}
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">ParnasoTec Social</p>
              </div>
            </div>
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs text-slate-600 hover:text-slate-900 font-bold transition-all cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Voltar</span>
            </button>
          </div>

          {/* Modern 5 Sub-Tabs Pill Bar with Larger Lucide Icons & Rich Category Gradients */}
          <div className="grid grid-cols-5 bg-slate-100/90 p-1.5 rounded-2xl gap-1 border border-slate-200/70">
            <button
              onClick={() => { setActiveTab('friends'); setSelectedChat(null); setSelectedThread(null); }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer gap-1 ${
                activeTab === 'friends'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm border border-emerald-400/40'
                  : 'text-slate-500 hover:text-emerald-700 hover:bg-white/70'
              }`}
            >
              <Users className={`w-5 h-5 ${activeTab === 'friends' ? 'text-white' : 'text-emerald-600'}`} strokeWidth={2.2} />
              <span className="truncate max-w-full leading-tight">{t('social.tabs.friends')}</span>
              {requests.length > 0 ? (
                <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white shadow-2xs">
                  {requests.length}
                </span>
              ) : uniqueFriends.length > 0 ? (
                <span className={`absolute top-1 right-1 text-[8px] font-black px-1 rounded-full ${
                  activeTab === 'friends' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {uniqueFriends.length}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => { setActiveTab('guilds'); setSelectedChat(null); setSelectedThread(null); }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer gap-1 ${
                activeTab === 'guilds'
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm border border-violet-400/40'
                  : 'text-slate-500 hover:text-violet-700 hover:bg-white/70'
              }`}
            >
              <Shield className={`w-5 h-5 ${activeTab === 'guilds' ? 'text-white' : 'text-violet-600'}`} strokeWidth={2.2} />
              <span className="truncate max-w-full leading-tight">{t('social.tabs.guilds')}</span>
              {totalPendingGuildApplicationsForAdmin > 0 ? (
                <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white shadow-2xs">
                  {totalPendingGuildApplicationsForAdmin}
                </span>
              ) : guilds.length > 0 ? (
                <span className={`absolute top-1 right-1 text-[8px] font-black px-1 rounded-full ${
                  activeTab === 'guilds' ? 'bg-white/25 text-white' : 'bg-violet-100 text-violet-700'
                }`}>
                  {guilds.length}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => { setActiveTab('forum'); setSelectedChat(null); setSelectedThread(null); }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer gap-1 ${
                activeTab === 'forum'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm border border-amber-400/40'
                  : 'text-slate-500 hover:text-amber-700 hover:bg-white/70'
              }`}
            >
              <MessageSquare className={`w-5 h-5 ${activeTab === 'forum' ? 'text-white' : 'text-amber-600'}`} strokeWidth={2.2} />
              <span className="truncate max-w-full leading-tight">{t('social.tabs.forum')}</span>
              {threads.length > 0 && (
                <span className={`absolute top-1 right-1 text-[8px] font-black px-1 rounded-full ${
                  activeTab === 'forum' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  {threads.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('competitions'); setSelectedChat(null); setSelectedThread(null); }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer gap-1 ${
                activeTab === 'competitions'
                  ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-sm border border-orange-400/40'
                  : 'text-slate-500 hover:text-orange-700 hover:bg-white/70'
              }`}
            >
              <Trophy className={`w-5 h-5 ${activeTab === 'competitions' ? 'text-white' : 'text-orange-500'}`} strokeWidth={2.2} />
              <span className="truncate max-w-full leading-tight">{t('social.tabs.competitions')}</span>
              {competitions.length > 0 && (
                <span className={`absolute top-1 right-1 text-[8px] font-black px-1 rounded-full ${
                  activeTab === 'competitions' ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-700'
                }`}>
                  {competitions.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('find'); setSelectedChat(null); setSelectedThread(null); }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer gap-1 ${
                activeTab === 'find'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm border border-emerald-400/40'
                  : 'text-slate-500 hover:text-emerald-700 hover:bg-white/70'
              }`}
            >
              <Search className={`w-5 h-5 ${activeTab === 'find' ? 'text-white' : 'text-teal-600'}`} strokeWidth={2.2} />
              <span className="truncate max-w-full leading-tight">{t('social.tabs.find')}</span>
              {requests.length > 0 && (
                <span className="absolute -top-1 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white"></span>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5">

          {/* TAB: FRIENDS */}
          {activeTab === 'friends' && (
            <div className="space-y-2.5">
              <div className="mb-3">
                <button
                  onClick={() => setActiveTab('find')}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm group"
                >
                  <div className="flex items-center gap-3 min-w-0 text-left">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ring-1 ring-white/30">
                      <UserPlus className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold tracking-tight truncate">
                        + {t('social.friends.addFriend')}
                      </p>
                      <p className="text-[10px] text-emerald-100 font-medium truncate">
                        Encontre escritores e acompanhe jornadas
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-100 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </button>
              </div>

              {/* Sent & Received Friend Requests directly visible in Friends tab */}
              {renderFriendRequestsSection()}

              {uniqueFriends.map(({ user, friendshipId }) => {
                const avatar = getUserAvatar(user);
                const isSelected = selectedChat?.type === 'direct' && selectedChat.target.id === user.id;
                const isOnline = checkUserOnline(user);
                return (
                  <div
                    key={user.id}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition-all group/friend ${
                      isSelected
                        ? 'bg-emerald-50/90 border border-emerald-200 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => { setSelectedChat({ type: 'direct', target: user }); setSelectedThread(null); }}
                      className="flex items-center flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <div className="relative mr-3 flex-shrink-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={user.name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(user.name)} flex items-center justify-center text-white font-extrabold text-sm border-2 border-white shadow-sm`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={isOnline ? 'Online' : 'Offline'}
                        ></span>
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-sm truncate ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                            {user.name}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            isOnline
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/70'
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                          <span>💬</span>
                          <span>{t('social.friends.clickToChat')}</span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/friend:opacity-100 transition-all">
                      <button
                        onClick={(e) => handleRemoveFriend(e, friendshipId, user.id)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all rounded-xl cursor-pointer"
                        title="Desfazer amizade (poderá adicionar novamente)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleBlockUser(e, user)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl cursor-pointer"
                        title="Bloquear usuário"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}

              {uniqueFriends.length === 0 && (
                <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5 text-xl">
                    👥
                  </div>
                  <p className="text-xs font-bold text-slate-600 mb-1">Sua lista de amigos está vazia</p>
                  <p className="text-[11px] text-slate-400">Use a aba Buscar para encontrar e adicionar outros escritores.</p>
                </div>
              )}

              {/* Blocked Users Section */}
              {blockedUsers.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500 px-1 flex items-center justify-between">
                    <span>🚫 Usuários Bloqueados ({blockedUsers.length})</span>
                  </h4>
                  {blockedUsers.map(({ user }) => (
                    <div key={user.id} className="flex items-center justify-between p-2.5 bg-rose-50/40 border border-rose-100 rounded-xl">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-slate-600 truncate">{user.name}</span>
                      </div>
                      <button
                        onClick={() => handleUnblockUser(user.id)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Desbloquear
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: GUILDS */}
          {activeTab === 'guilds' && (
            <div className="space-y-3">
              {/* Compact Banner Action Button: Fundar Nova Guilda */}
              <button
                onClick={() => setShowCreateGuild(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm group"
              >
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ring-1 ring-white/30">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold tracking-tight truncate">
                      + {t('social.guilds.foundNewGuild')}
                    </p>
                    <p className="text-[10px] text-violet-100 font-medium truncate">
                      Crie seu clã literário e some palavras
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-violet-100 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </button>

              {/* Guild Search Input */}
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Procurar guilda pelo nome ou lema..."
                  value={guildSearchTerm}
                  onChange={(e) => setGuildSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-100/90 focus:bg-white border border-slate-200/80 focus:border-violet-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-violet-500/20 transition-all text-slate-800 placeholder:text-slate-400"
                />
                {guildSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setGuildSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* My Guilds */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Minhas Guildas ({filteredMyGuilds.length})
                  </span>
                </div>

                {filteredMyGuilds.map(guild => {
                  const isSelected = selectedChat?.target.id === guild.id;
                  const pendingCount = isOwnerOrAdmin(guild) ? (guild.pendingMemberIds?.length || 0) : 0;
                  return (
                    <button
                      key={guild.id}
                      onClick={() => {
                        if (!isGuildMember(guild)) return;
                        setSelectedChat({ type: 'group', target: guild });
                        setSelectedThread(null);
                        setGuildSubTab('home');
                        fetchGuildThreadData(guild.id);
                      }}
                      className={`group/guild w-full flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-violet-100/80 border-violet-300 shadow-xs ring-1 ring-violet-400/20'
                          : 'bg-violet-50/40 hover:bg-violet-50/80 border-violet-100 hover:border-violet-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center min-w-0 flex-1 mr-2">
                        {(guild.emblemBase64 || guild.emblemUrl) ? (
                          <img
                            src={guild.emblemBase64 || guild.emblemUrl}
                            alt="Emblem"
                            className="w-14 h-14 rounded-2xl object-cover mr-3.5 border-2 border-violet-200 shadow-xs flex-shrink-0"
                          />
                        ) : (
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarGradient(guild.name)} flex items-center justify-center text-white font-black text-lg mr-3.5 border-2 border-white shadow-sm flex-shrink-0`}>
                            {guild.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="text-left flex-1 min-w-0">
                          <div className={`font-extrabold text-sm truncate ${isSelected ? 'text-violet-950' : 'text-slate-800'}`}>
                            {guild.name}
                          </div>
                          {guild.description ? (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{guild.description}</p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic truncate mt-0.5">Clã literário ParnasoTec</p>
                          )}
                          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/90 border border-violet-200/80 text-violet-700 font-extrabold text-[10px] shadow-2xs">
                              <Users className="w-3 h-3 text-violet-500" />
                              <span>{guild.members.length} {t('social.guilds.members')}</span>
                            </span>
                            {pendingCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-extrabold text-[10px]">
                                <span>📥</span>
                                <span>{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected
                          ? 'bg-violet-600 text-white'
                          : 'bg-white/80 text-violet-500 group-hover/guild:bg-violet-600 group-hover/guild:text-white'
                      }`}>
                        <ArrowRight className="w-4 h-4 group-hover/guild:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  );
                })}

                {filteredMyGuilds.length === 0 && !trimmedGuildSearch && (
                  <div className="text-center py-6 px-4 bg-violet-50/30 rounded-2xl border border-dashed border-violet-200">
                    <p className="text-xs font-bold text-slate-600 mb-0.5">Você ainda não participa de uma guilda</p>
                    <p className="text-[11px] text-slate-400">Funde uma nova ou explore as guildas da comunidade abaixo!</p>
                  </div>
                )}
              </div>

              {/* Explore / Search Community Guilds (Non-members can only apply, not view internal info) */}
              {(filteredDiscoverableGuilds.length > 0 || trimmedGuildSearch) && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-600">
                      🧭 Explorar Guildas ({filteredDiscoverableGuilds.length})
                    </span>
                  </div>

                  {filteredDiscoverableGuilds.map(guild => {
                    const hasPendingApplication = (guild.pendingMemberIds || []).includes(currentUser.id);
                    return (
                      <div
                        key={guild.id}
                        className={`w-full flex flex-col p-3.5 rounded-2xl border transition-all shadow-2xs gap-2.5 ${
                          hasPendingApplication
                            ? 'border-amber-200 bg-amber-50/30'
                            : 'bg-violet-50/25 hover:bg-violet-50/60 border-violet-100 hover:border-violet-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center min-w-0 flex-1">
                            {(guild.emblemBase64 || guild.emblemUrl) ? (
                              <img
                                src={guild.emblemBase64 || guild.emblemUrl}
                                alt="Emblem"
                                className="w-12 h-12 rounded-2xl object-cover mr-3 border border-violet-200 flex-shrink-0"
                              />
                            ) : (
                              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getAvatarGradient(guild.name)} flex items-center justify-center text-white font-extrabold text-sm mr-3 flex-shrink-0 shadow-2xs`}>
                                {guild.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-xs text-slate-800 truncate">{guild.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {guild.description || 'Guilda literária da comunidade'}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-block text-[9px] font-bold text-violet-700 bg-white/90 border border-violet-200/70 px-1.5 py-0.5 rounded-md">
                                  🔒 Acesso mediante aprovação
                                </span>
                              </div>
                            </div>
                          </div>

                          {hasPendingApplication ? (
                            <button
                              onClick={(e) => handleCancelGuildRequest(e, guild)}
                              className="px-2.5 py-1.5 bg-amber-100 hover:bg-rose-100 text-amber-800 hover:text-rose-700 border border-amber-200 rounded-xl text-[10px] font-bold transition-colors flex-shrink-0 cursor-pointer"
                              title="Clique para cancelar sua solicitação"
                            >
                              ⏳ Aguardando (Cancelar)
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleRequestJoinGuild(e, guild)}
                              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[11px] font-bold transition-colors flex-shrink-0 cursor-pointer shadow-xs"
                            >
                              📩 Candidatar-se
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {trimmedGuildSearch && filteredDiscoverableGuilds.length === 0 && filteredMyGuilds.length === 0 && (
                    <div className="text-center py-6 px-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs font-semibold text-slate-500">Nenhuma guilda encontrada para "{guildSearchTerm}".</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: FORUM */}
          {activeTab === 'forum' && (
            <div className="space-y-3">
              {/* Compact Banner Action Button: Novo Tópico */}
              <button
                onClick={() => setShowCreateThread(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm group"
              >
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ring-1 ring-white/30">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold tracking-tight truncate">
                      {t('social.forum.newThread')}
                    </p>
                    <p className="text-[10px] text-amber-50 font-medium truncate">
                      Compartilhe ideias, dúvidas ou trechos
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-50 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </button>

              {threads.map(thread => {
                const authorName = getUserName(thread.authorId);
                const authorAvatar = getUserPhotoURL(thread.authorId);
                const isSelected = selectedThread?.id === thread.id;
                const likeCount = thread.likes?.length || 0;

                return (
                  <div key={thread.id} className="relative group">
                    <button
                      onClick={() => { setSelectedThread(thread); setSelectedChat(null); }}
                      className={`w-full text-left p-3.5 rounded-2xl border border-l-4 border-l-amber-400 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                          : 'bg-white border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/20 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 pr-5">
                        <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${getCategoryBadgeStyle(thread.category)}`}>
                          {thread.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70">
                            <MessageSquare className="w-3 h-3" />
                            <span>Debate</span>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                            likeCount > 0
                              ? 'bg-rose-50 text-rose-600 border-rose-200/80'
                              : 'bg-slate-50 text-slate-400 border-slate-200/60'
                          }`}>
                            <span>❤️</span>
                            <span>{likeCount}</span>
                          </span>
                        </div>
                      </div>

                      <h3 className="font-extrabold text-slate-800 text-sm leading-snug mb-1 line-clamp-2">
                        {thread.title}
                      </h3>

                      {thread.content && (
                        <p className="text-xs text-slate-500 line-clamp-1 mb-3 leading-relaxed">
                          {thread.content}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {authorAvatar ? (
                            <img src={authorAvatar} alt={authorName} className="w-8 h-8 rounded-full object-cover border border-amber-200 shadow-2xs flex-shrink-0" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(authorName)} text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0 shadow-2xs`}>
                              {authorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500 truncate">
                              {t('social.forum.by')} <strong className="font-bold text-slate-800">{authorName}</strong>
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </div>
                    </button>
                    {(currentUser.role === 'admin' || thread.authorId === currentUser.id) && (
                      <button
                        onClick={(e) => handleDeleteThread(e, thread.id)}
                        className="absolute top-3 right-2.5 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-rose-50 cursor-pointer"
                        title={t('social.forum.deleteThread')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: COMPETITIONS */}
          {activeTab === 'competitions' && (
            <div className="space-y-3">
              {/* Compact Banner Action Button: Criar Novo Desafio */}
              <button
                onClick={() => { setCompError(null); setShowCreateComp(true); }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm group"
              >
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ring-1 ring-white/30">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold tracking-tight truncate">
                      {t('social.competitions.createNewChallenge')}
                    </p>
                    <p className="text-[10px] text-amber-50 font-medium truncate">
                      Lance metas de palavras ou dias seguidos
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-50 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </button>

              {competitions.map(comp => {
                const isParticipant = comp.participants.includes(currentUser.id);
                return (
                  <div key={comp.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs relative group hover:border-amber-200 transition-all">
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <h3 className="font-bold text-slate-800 text-sm leading-snug pr-4 flex items-center gap-1.5">
                        <span className="text-amber-500">🏆</span>
                        <span>{comp.title}</span>
                      </h3>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70 px-2 py-0.5 rounded-full uppercase flex-shrink-0">
                        {comp.type === 'word_count' ? t('social.competitions.wordType') : t('social.competitions.streakType')}
                      </span>
                    </div>
                    {(currentUser.role === 'admin' || comp.creatorId === currentUser.id) && (
                      <button
                        onClick={() => handleDeleteCompetition(comp.id)}
                        className="absolute top-3 right-16 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title={t('social.competitions.deleteChallenge')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">{comp.description}</p>

                    {isParticipant ? (
                      <div className="space-y-2.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        {comp.participants.map(pid => {
                          const stat = compStats[comp.id]?.[pid] || { current: 0, percent: 0 };
                          const { current, percent } = stat;
                          const pName = getUserName(pid);
                          const pAvatar = getUserPhotoURL(pid);
                          return (
                            <div key={pid} className="text-xs">
                              <div className="flex justify-between items-center mb-1">
                                <span className="flex items-center gap-1.5 font-semibold text-slate-700 truncate">
                                  {pAvatar ? (
                                    <img src={pAvatar} alt={pName} className="w-4 h-4 rounded-full object-cover" />
                                  ) : (
                                    <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${getAvatarGradient(pName)} text-white text-[8px] font-bold inline-flex items-center justify-center`}>
                                      {pName.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                  <span className="truncate">{pName}</span>
                                </span>
                                <span className="text-[11px] font-bold text-slate-600">{current.toLocaleString('pt-BR')} / {comp.target.toLocaleString('pt-BR')}</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoinCompetition(comp.id)}
                        className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        {t('social.competitions.joinChallenge')}
                      </button>
                    )}
                  </div>
                );
              })}

              {competitions.length === 0 && (
                <div className="p-5 bg-gradient-to-b from-amber-50/50 via-white to-orange-50/30 rounded-2xl border border-amber-200/70 shadow-2xs space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-200/90 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-inner ring-4 ring-amber-50">
                      <Trophy className="w-8 h-8 text-amber-500" strokeWidth={2} />
                    </div>
                    <p className="text-sm font-extrabold text-slate-800">Nenhum desafio ativo no momento</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Escolha uma sugestão rápida abaixo para lançar o próximo desafio da comunidade:
                    </p>
                  </div>

                  {/* Quick Challenge Suggestions */}
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 px-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Sugestões Rápidas de Desafio</span>
                    </p>

                    {[
                      {
                        badge: '⚡',
                        label: 'Sprint de 1.000 palavras em 3 dias',
                        sub: 'Meta curta para destravar o ritmo criativo',
                        title: 'Sprint Relâmpago de 1.000 Palavras',
                        desc: 'Meta rápida de 1.000 palavras em 3 dias para destravar a escrita ao lado da comunidade!',
                        type: 'word_count' as const,
                        target: 1000,
                        duration: 3
                      },
                      {
                        badge: '🔥',
                        label: 'Maratona de Fim de Semana • 3.000 palavras',
                        sub: 'Foco intenso para avançar capítulos inteiros',
                        title: 'Maratona Literária de Fim de Semana',
                        desc: 'Desafio coletivo de 3.000 palavras em 3 dias para avançar capítulos com foco total!',
                        type: 'word_count' as const,
                        target: 3000,
                        duration: 3
                      },
                      {
                        badge: '📅',
                        label: 'Hábito Inabalável • 7 dias seguidos',
                        sub: 'Escreva todos os dias por uma semana',
                        title: 'Ofensiva Literária de 7 Dias',
                        desc: 'Registre sessões de escrita todos os dias durante 7 dias consecutivos sem quebrar a corrente!',
                        type: 'days_streak' as const,
                        target: 7,
                        duration: 7
                      }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCompError(null);
                          setNewCompTitle(preset.title);
                          setNewCompDesc(preset.desc);
                          setNewCompType(preset.type);
                          setNewCompTarget(preset.target);
                          setNewCompDuration(preset.duration);
                          setShowCreateComp(true);
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-amber-50/80 border border-amber-200/70 hover:border-amber-300 transition-all flex items-center justify-between gap-2.5 cursor-pointer group/preset shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-sm flex-shrink-0">
                            {preset.badge}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-slate-800 group-hover/preset:text-amber-900 truncate">
                              {preset.label}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {preset.sub}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover/preset:translate-x-0.5 transition-transform flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: FIND */}
          {activeTab === 'find' && (
            <div className="space-y-3">

              {/* Sent & Received Friend Requests */}
              {renderFriendRequestsSection()}

              {/* Search Input */}
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={t('social.friends.searchWriter')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-100/90 focus:bg-white border border-slate-200/80 focus:border-emerald-500 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-800 placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Privacy Guard: Only show users when at least 2 characters are typed */}
              {!hasValidSearch ? (
                <div className="text-center py-10 px-5 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 mt-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mb-1">Busca Privada de Escritores</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Digite pelo menos 2 letras do nome do escritor para buscar na comunidade.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  {matchingPendingRequests.map(req => renderRequestCard(req))}
                  {filteredAvailable.map(user => {
                    const uAvatar = getUserAvatar(user);
                    const isOnline = checkUserOnline(user);
                    return (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 hover:border-emerald-200 rounded-2xl shadow-2xs transition-all">
                        <div className="flex items-center min-w-0 mr-2">
                          <div className="relative mr-3 flex-shrink-0">
                            {uAvatar ? (
                              <img src={uAvatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(user.name)} text-white flex items-center justify-center text-sm font-extrabold shadow-2xs`}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-slate-800 block truncate">{user.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {isOnline ? '🟢 Online agora' : 'Escritor da Comunidade'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleSendRequest(user.id)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-emerald-200/80"
                            title={t('social.friends.add')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            <span>Adicionar</span>
                          </button>
                          <button
                            onClick={(e) => handleBlockUser(e, user)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Bloquear este usuário"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAvailable.length === 0 && matchingPendingRequests.length === 0 && (
                    <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-500 font-semibold text-xs">{t('social.friends.noWritersFound')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Blocked Users Management in Find Tab */}
              {blockedUsers.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500 px-1">
                    🚫 Usuários Bloqueados ({blockedUsers.length})
                  </h4>
                  {blockedUsers.map(({ user }) => (
                    <div key={user.id} className="flex items-center justify-between p-2.5 bg-rose-50/40 border border-rose-100 rounded-xl">
                      <span className="text-xs font-semibold text-slate-600 truncate">{user.name}</span>
                      <button
                        onClick={() => handleUnblockUser(user.id)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Desbloquear
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Fixed Sidebar Footer: Mini-Card de Status Social do Escritor */}
        <div className="mt-auto p-3 border-t border-slate-100 bg-gradient-to-r from-slate-50/90 via-emerald-50/30 to-violet-50/30 flex-shrink-0">
          <div className="p-2.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              {getUserAvatar(currentUser) ? (
                <img
                  src={getUserAvatar(currentUser)}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-xl object-cover border border-emerald-200 shadow-2xs"
                />
              ) : (
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(currentUser.name)} text-white flex items-center justify-center font-extrabold text-xs shadow-2xs`}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" title="Online" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 truncate">
                  🌟 Seu Status Social
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-700 truncate mt-0.5">
                {uniqueFriends.length} {uniqueFriends.length === 1 ? 'Amigo' : 'Amigos'} • {guilds.length} {guilds.length === 1 ? 'Guilda' : 'Guildas'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                Compartilhe sua jornada literária!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Content (Chat or Thread) */}
      <div className={`${(!selectedChat && !selectedThread) ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-slate-50 relative border-l border-slate-200`}>

        {/* VIEW: CHAT (DIRECT OR GROUP) */}
        {selectedChat && (
          <>
            <div className="h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 flex items-center px-4 md:px-6 justify-between flex-shrink-0 gap-3">
              <div className="flex items-center min-w-0">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="mr-2.5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title="Voltar para a lista"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Voltar</span>
                </button>

                {selectedChat.type === 'direct' ? (
                  <div className="flex items-center min-w-0">
                    <div className="relative mr-3 flex-shrink-0">
                      {getUserPhotoURL((selectedChat.target as User).id) || (selectedChat.target as User).photoBase64 || (selectedChat.target as User).photoURL ? (
                        <img
                          src={getUserPhotoURL((selectedChat.target as User).id) || (selectedChat.target as User).photoBase64 || (selectedChat.target as User).photoURL}
                          alt={(selectedChat.target as User).name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-emerald-200 shadow-xs"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient((selectedChat.target as User).name)} text-white flex items-center justify-center font-bold text-base shadow-xs border-2 border-white`}>
                          {(selectedChat.target as User).name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${
                          checkUserOnline(selectedChat.target as User) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-800 text-sm md:text-base truncate">
                          {(selectedChat.target as User).name}
                        </h3>
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                          <span>🪶</span>
                          <span>Escritor Parceiro</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {checkUserOnline(selectedChat.target as User) ? (
                          <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                            <span>{t('social.chat.online')} agora</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                            <span>Offline • Conversa Direta</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Compact Context Pill for Guild Top Bar (avoids duplicating the large Estandarte below) */
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex-shrink-0">
                      {(activeGuild?.emblemBase64 || activeGuild?.emblemUrl || (selectedChat.target as Guild).emblemBase64 || (selectedChat.target as Guild).emblemUrl) ? (
                        <img
                          src={activeGuild?.emblemBase64 || activeGuild?.emblemUrl || (selectedChat.target as Guild).emblemBase64 || (selectedChat.target as Guild).emblemUrl}
                          alt="Mini Brasão"
                          className="w-8 h-8 rounded-xl object-cover border border-indigo-200 shadow-2xs"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${getAvatarGradient(activeGuild?.name || (selectedChat.target as Guild).name)} text-white flex items-center justify-center font-black text-xs shadow-2xs`}>
                          {(activeGuild?.name || (selectedChat.target as Guild).name).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-extrabold px-2 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                        <span>🛡️</span>
                        <span className="hidden sm:inline">Guilda</span>
                      </span>
                      <span className="font-bold text-slate-700 text-sm truncate">
                        {activeGuild?.name || (selectedChat.target as Guild).name}
                      </span>
                      {activeGuild && isOwnerOrAdmin(activeGuild) && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-2 py-0.5 rounded-lg border border-slate-200/70 hover:border-indigo-200 transition-colors cursor-pointer flex-shrink-0"
                          title={t('social.guilds.changeEmblem')}
                        >
                          <span>🎨</span>
                          <span>{t('social.guilds.changeEmblem')}</span>
                        </button>
                      )}
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleUpdateEmblem} />
                    </div>
                  </div>
                )}
              </div>

              {selectedChat.type === 'direct' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleSendDirectSpark(selectedChat.target as User)}
                    disabled={isActionSubmitting || sentDirectSpark}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                      sentDirectSpark
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200/80'
                    }`}
                    title="Enviar uma faísca literária de incentivo rápido na conversa"
                  >
                    <span>{sentDirectSpark ? '✨' : '🔥'}</span>
                    <span className="hidden sm:inline">
                      {sentDirectSpark ? 'Incentivo Enviado!' : 'Incentivar'}
                    </span>
                  </button>
                  <button
                    onClick={(e) => handleBlockUser(e, selectedChat.target as User)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Bloquear este usuário"
                  >
                    <span>🚫</span>
                    <span className="hidden md:inline">Bloquear</span>
                  </button>
                </div>
              )}

              {selectedChat.type === 'group' && activeGuild && isGuildMember(activeGuild) && (
                <div className="flex bg-slate-100/90 p-1 rounded-xl gap-1 border border-slate-200/70">
                  <button
                    onClick={() => setGuildSubTab('home')}
                    className={`relative px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      guildSubTab === 'home'
                        ? 'bg-white shadow-xs text-indigo-700 ring-1 ring-indigo-500/20'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
                  >
                    <span className="text-xs leading-none">🏰</span>
                    <span>{t('social.tabs.home')}</span>
                    {isOwnerOrAdmin(activeGuild) && (activeGuild.pendingMemberIds?.length || 0) > 0 && (
                      <span className="px-1.5 py-0.1 rounded-full bg-amber-500 text-white text-[9px] font-black">
                        {activeGuild.pendingMemberIds?.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setGuildSubTab('chat')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      guildSubTab === 'chat'
                        ? 'bg-white shadow-xs text-indigo-700 ring-1 ring-indigo-500/20'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
                  >
                    <span className="text-xs leading-none">💬</span>
                    <span>{t('social.tabs.chat')}</span>
                  </button>
                  <button
                    onClick={() => { setGuildSubTab('forum'); if (activeGuild) fetchGuildThreadData(activeGuild.id); }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      guildSubTab === 'forum'
                        ? 'bg-white shadow-xs text-indigo-700 ring-1 ring-indigo-500/20'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
                  >
                    <span className="text-xs leading-none">📜</span>
                    <span>{t('social.tabs.forum')}</span>
                  </button>
                  <button
                    onClick={() => setGuildSubTab('agora')}
                    className={`relative px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      guildSubTab === 'agora'
                        ? 'bg-white shadow-xs text-indigo-700 ring-1 ring-indigo-500/20'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
                  >
                    <span className="text-xs leading-none">🎙️</span>
                    <span>{t('social.tabs.agora')}</span>
                    {agoraParticipants.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {selectedChat.type === 'group' && activeGuild && !isGuildMember(activeGuild) && (
              <div className="flex-1 overflow-y-auto bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-3xl mx-auto">
                    🔒
                  </div>
                  <h3 className="text-xl font-black text-slate-800">Acesso Restrito aos Membros</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    As informações internas da guilda (membros, ranking de palavras, chat, fórum e Ágora) ficam visíveis apenas após um Administrador aprovar sua solicitação de entrada.
                  </p>
                  {(activeGuild.pendingMemberIds || []).includes(currentUser.id) ? (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                      ⏳ Sua candidatura já foi enviada e aguarda aprovação de um Adm.
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleRequestJoinGuild(e, activeGuild)}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      📩 Solicitar Entrada na Guilda
                    </button>
                  )}
                </div>
              </div>
            )}

            {selectedChat.type === 'group' && guildSubTab === 'home' && activeGuild && isGuildMember(activeGuild) && (() => {
              const totalGuildWords = activeGuild.members.reduce(
                (acc, mId) => acc + (memberStats[mId] || 0),
                0
              );
              const onlineGuildMembersCount = activeGuild.members.filter(mId =>
                mId === currentUser.id || checkUserOnline(allUsers.find(u => u.id === mId))
              ).length;
              const rankInfo = getGuildRankInfo(totalGuildWords);
              const collectiveGoalTarget = customGuildGoalTarget || rankInfo.defaultGoal;
              const collectiveGoalPercent = Math.min(
                100,
                Math.round((totalGuildWords / Math.max(1, collectiveGoalTarget)) * 100)
              );
              const wordsRemainingForGoal = Math.max(0, collectiveGoalTarget - totalGuildWords);
              const sortedGuildMembers = [...activeGuild.members].sort(
                (a, b) => (memberStats[b] || 0) - (memberStats[a] || 0)
              );
              const pendingAppsCount = activeGuild.pendingMemberIds?.length || 0;

              return (
                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 md:p-8">
                  <div className="max-w-5xl mx-auto space-y-6">

                    {/* 1 & 2. ESTANDARTE DA GUILDA (HERO CARD) + META COLETIVA */}
                    <div className="bg-gradient-to-br from-violet-50/95 via-indigo-50/75 to-emerald-50/90 rounded-[2rem] p-6 sm:p-8 shadow-md border border-indigo-200/80 ring-1 ring-white relative overflow-hidden">
                      {/* Ambient Watercolor Auras */}
                      <div className="absolute -top-24 -left-24 w-72 h-72 bg-violet-400/15 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute -top-20 right-1/4 w-64 h-64 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

                      <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 lg:gap-8">
                        {/* LEFT: Large Guild Emblem with Hover Change Overlay */}
                        <div className="relative group/heroEmblem flex-shrink-0">
                          <div className="w-28 h-28 sm:w-34 sm:h-34 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 shadow-xl ring-4 ring-white/90">
                            {(activeGuild.emblemBase64 || activeGuild.emblemUrl) ? (
                              <img
                                src={activeGuild.emblemBase64 || activeGuild.emblemUrl}
                                alt={activeGuild.name}
                                className={`w-full h-full rounded-full object-cover border-4 border-white transition-transform duration-300 group-hover/heroEmblem:scale-102 ${isUpdatingEmblem ? 'opacity-50' : ''}`}
                              />
                            ) : (
                              <div className={`w-full h-full rounded-full bg-gradient-to-br ${getAvatarGradient(activeGuild.name)} flex items-center justify-center text-white text-4xl sm:text-5xl font-black border-4 border-white`}>
                                {activeGuild.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {isUpdatingEmblem && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}

                          {isOwnerOrAdmin(activeGuild) && (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute inset-1 rounded-full bg-slate-900/60 text-white opacity-0 group-hover/heroEmblem:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer backdrop-blur-[2px]"
                              title={t('social.guilds.changeEmblem')}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 text-center leading-tight">
                                {t('social.guilds.changeEmblem')}
                              </span>
                            </button>
                          )}

                          {isOwnerOrAdmin(activeGuild) && (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white hover:bg-indigo-50 text-indigo-600 border-2 border-indigo-200 shadow-md flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                              title={t('social.guilds.changeEmblem')}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* CENTER: Guild Name, Editable Motto & Action Buttons */}
                        <div className="flex-1 min-w-0 text-center lg:text-left space-y-3">
                          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 text-indigo-700 border border-indigo-200/80 text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
                              <span>🛡️</span>
                              <span>Estandarte da Guilda</span>
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wider shadow-2xs ${rankInfo.badgeBg}`}>
                              <span>{rankInfo.icon}</span>
                              <span>Nv. {rankInfo.level} • {rankInfo.title}</span>
                            </span>
                          </div>

                          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                            {activeGuild.name}
                          </h2>

                          {/* Editable Motto / Description */}
                          {isEditingGuildDesc ? (
                            <div className="bg-white/90 p-3 rounded-2xl border border-indigo-200 shadow-xs space-y-2 max-w-xl mx-auto lg:mx-0">
                              <textarea
                                value={editedGuildDesc}
                                maxLength={500}
                                onChange={(e) => setEditedGuildDesc(e.target.value)}
                                placeholder="Defina o lema ou descrição inspiradora da sua guilda..."
                                className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-400 resize-none"
                                rows={2}
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setIsEditingGuildDesc(false)}
                                  className="px-3 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingGuildDesc}
                                  onClick={handleSaveGuildDescription}
                                  className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isSavingGuildDesc ? 'Salvando...' : '✓ Salvar Lema'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center lg:justify-start gap-2 group/desc">
                              <p className="text-slate-600 italic text-xs sm:text-sm leading-relaxed max-w-xl">
                                “{activeGuild.description || t('social.guilds.noDescription')}”
                              </p>
                              {isOwnerOrAdmin(activeGuild) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditedGuildDesc(activeGuild.description || '');
                                    setIsEditingGuildDesc(true);
                                  }}
                                  className="opacity-70 group-hover/desc:opacity-100 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 hover:bg-white text-indigo-600 border border-indigo-200/70 text-[10px] font-bold transition-all cursor-pointer flex-shrink-0"
                                  title="Editar lema/descrição da guilda"
                                >
                                  <span>✏️</span>
                                  <span className="hidden sm:inline">Editar lema</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Action Buttons Row */}
                          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-2">
                            <button
                              type="button"
                              onClick={() => setShowCreateChallenge(true)}
                              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-700 hover:via-violet-700 hover:to-purple-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-500/20 hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                            >
                              <span>⚔️</span>
                              <span>+ {t('social.guilds.proposeChallenge')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setGuildSubTab('agora')}
                              className="px-4 py-2.5 bg-white/90 hover:bg-white text-emerald-700 border border-emerald-200/90 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <span>🎙️</span>
                              <span>Ir para Ágora</span>
                            </button>

                            {/* Discreet Admin Secondary Control for Resetting Stats */}
                            {isOwnerOrAdmin(activeGuild) && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setShowAdminGearMenu(prev => !prev)}
                                  className="px-3 py-2.5 bg-white/75 hover:bg-white text-slate-500 hover:text-slate-700 border border-slate-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                  title="Opções administrativas da guilda"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span className="hidden sm:inline text-[11px]">Admin</span>
                                </button>

                                {showAdminGearMenu && (
                                  <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 animate-fade-in">
                                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2.5 py-1">
                                      Zona de Administração
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => handleResetStats(activeGuild.id)}
                                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer"
                                    >
                                      <span>⚠️</span>
                                      <span>{t('social.guilds.resetStats')}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* RIGHT: 3 Guild Mini-KPIs */}
                        <div className="grid grid-cols-3 lg:grid-cols-1 gap-2.5 w-full lg:w-56 flex-shrink-0">
                          {/* KPI 1: Total da Guilda */}
                          <div className="bg-white/85 backdrop-blur-xs border border-indigo-100/90 rounded-2xl p-3 shadow-2xs flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-base flex-shrink-0 font-bold">
                              ✍️
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                                Total da Guilda
                              </p>
                              <p className="text-sm sm:text-base font-black text-slate-800 truncate">
                                {totalGuildWords.toLocaleString('pt-BR')} <span className="text-[10px] font-semibold text-indigo-600">{t('social.guilds.words')}</span>
                              </p>
                            </div>
                          </div>

                          {/* KPI 2: Membros Ativos */}
                          <div className="bg-white/85 backdrop-blur-xs border border-emerald-100/90 rounded-2xl p-3 shadow-2xs flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base flex-shrink-0 font-bold">
                              👥
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                                Membros Ativos
                              </p>
                              <p className="text-sm sm:text-base font-black text-slate-800 truncate">
                                {activeGuild.members.length} <span className="text-[10px] font-semibold text-emerald-600">({onlineGuildMembersCount} online)</span>
                              </p>
                            </div>
                          </div>

                          {/* KPI 3: Nível / Patente da Guilda */}
                          <div className="bg-white/85 backdrop-blur-xs border border-purple-100/90 rounded-2xl p-3 shadow-2xs flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-base flex-shrink-0 font-bold">
                              {rankInfo.icon}
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                                Patente • Nv. {rankInfo.level}
                              </p>
                              <p className="text-xs sm:text-sm font-black text-purple-900 truncate" title={rankInfo.title}>
                                {rankInfo.title}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. BARRA DE "META COLETIVA DA GUILDA" (COOPERAÇÃO) */}
                      <div className="relative z-10 mt-6 pt-5 border-t border-indigo-200/60">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🤝</span>
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                              Meta Coletiva da Guilda
                            </span>
                            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                              {collectiveGoalPercent}%
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-500 mr-1">Marco:</span>
                            {[25000, 50000, 100000].map(milestone => {
                              const isActiveMilestone = collectiveGoalTarget === milestone;
                              return (
                                <button
                                  key={milestone}
                                  type="button"
                                  onClick={() => setCustomGuildGoalTarget(milestone)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                                    isActiveMilestone
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                      : 'bg-white/80 text-slate-600 border-slate-200 hover:border-indigo-300'
                                  }`}
                                >
                                  {(milestone / 1000)}k
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="w-full h-3.5 bg-white/90 rounded-full overflow-hidden p-0.5 border border-indigo-200/70 shadow-inner">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 transition-all duration-700 relative"
                            style={{ width: `${Math.max(2, collectiveGoalPercent)}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[11px]">
                          <span className="font-bold text-slate-700">
                            Progresso cooperativo: <strong className="text-indigo-700">{totalGuildWords.toLocaleString('pt-BR')}</strong> / {collectiveGoalTarget.toLocaleString('pt-BR')} {t('social.guilds.words')}
                          </span>
                          <span className="font-semibold text-slate-500">
                            {wordsRemainingForGoal > 0 ? (
                              <>🔥 Faltam <strong className="text-slate-700">{wordsRemainingForGoal.toLocaleString('pt-BR')}</strong> palavras para a guilda subir de patamar junta!</>
                            ) : (
                              <span className="text-emerald-700 font-bold">🎉 Marco coletivo alcançado! Selecione o próximo patamar acima.</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. OTIMIZAÇÃO INTELIGENTE DE "CANDIDATURAS PENDENTES (EXCLUSIVO ADMS)" */}
                    {isOwnerOrAdmin(activeGuild) && (
                      pendingAppsCount === 0 ? (
                        <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">🛡️</span>
                            <span className="text-xs font-bold text-slate-600">
                              Candidaturas à Guilda: <strong className="text-slate-800">0 pendentes</strong>
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">
                            Novas solicitações de entrada aparecerão destacadas aqui para aprovação dos Adms
                          </span>
                        </div>
                      ) : (
                        <div className="rounded-3xl p-5 sm:p-6 border bg-gradient-to-r from-amber-50/95 via-white to-purple-50/75 border-amber-300 shadow-sm transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black">
                                🛡️
                              </span>
                              <div>
                                <h3 className="font-black text-slate-800 uppercase tracking-tight text-xs sm:text-sm">
                                  Candidaturas Pendentes à Guilda (Exclusivo Adms)
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                  Novos candidatos só podem entrar e visualizar membros, ranking e salas após aprovação de um Adm.
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-2xs">
                              {pendingAppsCount} pendente{pendingAppsCount === 1 ? '' : 's'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {activeGuild.pendingMemberIds?.map(candidateId => {
                              const candName = getUserName(candidateId);
                              const candPhoto = getUserPhotoURL(candidateId);
                              return (
                                <div
                                  key={candidateId}
                                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {candPhoto ? (
                                      <img src={candPhoto} alt={candName} className="w-10 h-10 rounded-full object-cover border border-amber-200 flex-shrink-0" />
                                    ) : (
                                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(candName)} text-white flex items-center justify-center font-bold text-xs flex-shrink-0`}>
                                        {candName.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-bold text-sm text-slate-800 truncate">{candName}</p>
                                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                        Solicitou entrada na guilda
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                      onClick={() => handleApproveGuildMember(activeGuild.id, candidateId)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                                      title="Aprovar entrada na guilda"
                                    >
                                      ✓ Aceitar
                                    </button>
                                    <button
                                      onClick={() => handleRejectGuildMember(activeGuild.id, candidateId)}
                                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                      title="Recusar solicitação"
                                    >
                                      ✕ Recusar
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}

                    {/* 4 & 5. PRODUÇÃO DOS MEMBROS + FOGUEIRA DA GUILDA & DESAFIOS */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                      {/* 4. LEADERBOARD: PRODUÇÃO DOS MEMBROS RICA E MOTIVADORA */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🏆</span>
                            <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">
                              {t('social.guilds.memberProduction')}
                            </h3>
                          </div>
                          {activeGuild.statsResetDate && (
                            <span className="text-[10px] text-slate-400 font-bold italic">
                              {t('social.guilds.since')} {new Date(activeGuild.statsResetDate!).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/70 space-y-3.5">
                          {sortedGuildMembers.map((memberId, index) => {
                            const mName = getUserName(memberId);
                            const mPhoto = getUserPhotoURL(memberId);
                            const mWords = memberStats[memberId] || 0;
                            const mPercent = totalGuildWords > 0
                              ? Math.min(100, Math.round((mWords / totalGuildWords) * 100))
                              : 0;
                            const isMemberOnline = memberId === currentUser.id || checkUserOnline(allUsers.find(u => u.id === memberId));
                            const isCheered = Boolean(cheeredMembers[memberId]);
                            const sparkCount = memberSparks[memberId] || 0;

                            const getRankBadge = (pos: number) => {
                              if (pos === 0) {
                                return (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-black shadow-2xs w-12 flex-shrink-0">
                                    🥇 1º
                                  </span>
                                );
                              }
                              if (pos === 1) {
                                return (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-black shadow-2xs w-12 flex-shrink-0">
                                    🥈 2º
                                  </span>
                                );
                              }
                              if (pos === 2) {
                                return (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 border border-orange-300 text-[11px] font-black shadow-2xs w-12 flex-shrink-0">
                                    🥉 3º
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 border border-slate-200/70 text-[11px] font-extrabold w-12 flex-shrink-0">
                                  #{pos + 1}
                                </span>
                              );
                            };

                            return (
                              <div
                                key={memberId}
                                className={`p-3.5 rounded-2xl border transition-all group/member ${
                                  index === 0
                                    ? 'bg-gradient-to-r from-amber-50/40 via-white to-white border-amber-200/80 shadow-2xs'
                                    : 'bg-slate-50/40 hover:bg-white border-slate-100 hover:border-indigo-200/80'
                                }`}
                              >
                                <div className="flex items-center gap-3.5">
                                  {/* Position Badge */}
                                  {getRankBadge(index)}

                                  {/* Real Profile Photo or Vibrant Gradient Avatar */}
                                  <div className="relative flex-shrink-0">
                                    {mPhoto ? (
                                      <img
                                        src={mPhoto}
                                        alt={mName}
                                        className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm border border-slate-200"
                                      />
                                    ) : (
                                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(mName)} text-white flex items-center justify-center font-extrabold text-sm ring-2 ring-white shadow-sm`}>
                                        {mName.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span
                                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                        isMemberOnline ? 'bg-emerald-500' : 'bg-slate-300'
                                      }`}
                                      title={isMemberOnline ? 'Online' : 'Offline'}
                                    />
                                  </div>

                                  {/* Name, Words & Contribution Progress Bar */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate">
                                          {mName}
                                        </p>
                                        {memberId === activeGuild.adminId && (
                                          <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-md font-extrabold uppercase flex-shrink-0">
                                            👑 {t('social.guilds.leader')}
                                          </span>
                                        )}
                                        {memberId !== activeGuild.adminId && activeGuild.adminIds?.includes(memberId) && (
                                          <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded-md font-extrabold uppercase flex-shrink-0">
                                            🛡️ {t('social.guilds.admin')}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-xs font-black text-indigo-600">
                                          {mWords.toLocaleString('pt-BR')} <span className="text-[10px] font-semibold text-slate-400">{t('social.guilds.words')}</span>
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded-md border border-slate-200/70">
                                          {mPercent}%
                                        </span>
                                      </div>
                                    </div>

                                    {/* Proportional Contribution Progress Bar */}
                                    <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          index === 0
                                            ? 'bg-gradient-to-r from-amber-400 to-emerald-500'
                                            : 'bg-gradient-to-r from-indigo-500 to-teal-400'
                                        }`}
                                        style={{ width: `${mWords > 0 ? Math.max(4, mPercent) : 0}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Quick Micro-Interaction: Incentivar / Enviar Faísca + Admin Promote */}
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {memberId !== currentUser.id && (
                                      <button
                                        type="button"
                                        onClick={() => handleSendMemberSpark(memberId)}
                                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer border ${
                                          isCheered
                                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs scale-105'
                                            : 'bg-amber-50/80 hover:bg-amber-100 text-amber-800 border-amber-200/80'
                                        }`}
                                        title="Enviar faísca de incentivo literário"
                                      >
                                        <span>{isCheered ? '🔥' : '👏'}</span>
                                        <span className="hidden sm:inline">
                                          {isCheered ? 'Incentivado!' : 'Incentivar'}
                                        </span>
                                        {sparkCount > 0 && (
                                          <span className={`px-1 rounded-full text-[9px] ${isCheered ? 'bg-white/25 text-white' : 'bg-amber-200/70 text-amber-900'}`}>
                                            +{sparkCount}
                                          </span>
                                        )}
                                      </button>
                                    )}

                                    {isOwnerOrAdmin(activeGuild) && memberId !== currentUser.id && memberId !== activeGuild.adminId && !activeGuild.adminIds?.includes(memberId) && (
                                      <button
                                        type="button"
                                        onClick={() => handlePromoteAdmin(activeGuild.id, memberId)}
                                        className="opacity-0 group-hover/member:opacity-100 px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl text-[10px] font-extrabold uppercase tracking-tight transition-all cursor-pointer"
                                        title={t('social.guilds.makeAdmin')}
                                      >
                                        + Adm
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 5. RIGHT COLUMN: FOGUEIRA DA GUILDA (SPRINT) + COLUNA DE DESAFIOS */}
                      <div className="space-y-6">

                        {/* WIDGET: FOGUEIRA DA GUILDA (SPRINT DE ESCRITA) */}
                        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-amber-950 text-white rounded-3xl p-5 shadow-lg border border-amber-500/30 relative overflow-hidden">
                          <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

                          <div className="relative z-10 space-y-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-xl ${isCampfireActive ? 'animate-bounce' : ''}`}>🔥</span>
                                <div>
                                  <h4 className="font-black text-xs uppercase tracking-wider text-amber-300">
                                    Fogueira da Guilda
                                  </h4>
                                  <p className="text-[10px] text-slate-300">
                                    Sprint Rápido de Escrita em Grupo
                                  </p>
                                </div>
                              </div>

                              {/* Duration Selector Pills (15 or 25 min) */}
                              <div className="flex bg-white/10 p-0.5 rounded-xl border border-white/10">
                                {([15, 25] as const).map(mins => (
                                  <button
                                    key={mins}
                                    type="button"
                                    onClick={() => handleSelectCampfireDuration(mins)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                      campfireDurationMin === mins
                                        ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                        : 'text-slate-300 hover:text-white'
                                    }`}
                                  >
                                    {mins}m
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Countdown Display */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center space-y-2">
                              <div className="text-3xl font-black tracking-widest font-mono text-white">
                                {formatCampfireTime(campfireSecondsLeft)}
                              </div>
                              <p className="text-[11px] text-amber-200/90 font-medium">
                                {isCampfireActive
                                  ? '🔥 A fogueira está acesa! Mantenha o foco nas palavras...'
                                  : campfireCompletedCount > 0
                                  ? `✨ ${campfireCompletedCount} sprint${campfireCompletedCount > 1 ? 's' : ''} concluído${campfireCompletedCount > 1 ? 's' : ''} nesta sessão!`
                                  : `Concentre-se por ${campfireDurationMin} min em sintonia com a guilda`}
                              </p>
                            </div>

                            {/* Action Controls */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setIsCampfireActive(prev => !prev)}
                                className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                                  isCampfireActive
                                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950'
                                }`}
                              >
                                <span>{isCampfireActive ? '⏸️' : '🔥'}</span>
                                <span>
                                  {isCampfireActive ? 'Pausar Fogueira' : 'Sentar à Fogueira (Iniciar Sprint)'}
                                </span>
                              </button>

                              {(isCampfireActive || campfireSecondsLeft < campfireDurationMin * 60) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCampfireActive(false);
                                    setCampfireSecondsLeft(campfireDurationMin * 60);
                                  }}
                                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                                  title="Reiniciar cronômetro"
                                >
                                  🔄
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* CHALLENGES COLUMN */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">⚔️</span>
                              <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">
                                {t('social.guilds.challenges')}
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowCreateChallenge(true)}
                              className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              + Novo
                            </button>
                          </div>

                          <div className="space-y-3">
                            {activeGuild.challenges?.length ? activeGuild.challenges.map(challenge => {
                              const targetWords = Math.max(1, Number(challenge.target) || 1000);
                              const challengePercent = Math.min(100, Math.round((totalGuildWords / targetWords) * 100));
                              const createdMs = challenge.createdAt ? new Date(challenge.createdAt).getTime() : Date.now();
                              const endMs = createdMs + (Number(challenge.durationDays) || 7) * 86400000;
                              const daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / 86400000));
                              const isExpanded = expandedChallengeId === challenge.id;

                              return (
                                <div
                                  key={challenge.id}
                                  onClick={() => setExpandedChallengeId(isExpanded ? null : challenge.id)}
                                  className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white p-5 rounded-3xl shadow-md hover:shadow-xl relative overflow-hidden group cursor-pointer transition-all hover:-translate-y-0.5 border border-indigo-400/30"
                                >
                                  <div className="absolute top-0 right-0 p-3 opacity-15 transform translate-x-1 -translate-y-1 group-hover:scale-110 transition-transform pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                  </div>

                                  <div className="relative z-10 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-base">🏆</span>
                                        <h4 className="font-black text-sm uppercase tracking-tight leading-snug">
                                          {challenge.title}
                                        </h4>
                                      </div>
                                      <span className="text-[10px] font-extrabold bg-white/15 border border-white/20 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                        ⏳ {daysLeft > 0 ? `${daysLeft}d restantes` : `${challenge.durationDays} dias`}
                                      </span>
                                    </div>

                                    <p className={`text-xs text-indigo-100 leading-relaxed opacity-90 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                      {challenge.description}
                                    </p>

                                    {/* Challenge Visual Progress Bar */}
                                    <div className="space-y-1.5 pt-1">
                                      <div className="flex items-center justify-between text-[10px] font-extrabold">
                                        <span className="text-indigo-200 uppercase tracking-wider">
                                          Meta: {targetWords.toLocaleString('pt-BR')} {t('social.competitions.wordType')}
                                        </span>
                                        <span className="text-emerald-300">
                                          {challengePercent}%
                                        </span>
                                      </div>
                                      <div className="w-full h-2 bg-slate-950/40 rounded-full overflow-hidden p-0.2">
                                        <div
                                          className="h-full rounded-full bg-gradient-to-r from-amber-300 via-emerald-400 to-teal-300 transition-all duration-500"
                                          style={{ width: `${Math.max(4, challengePercent)}%` }}
                                        />
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[10px] text-indigo-100 animate-fade-in">
                                        <span>Volume atual da guilda: <strong>{totalGuildWords.toLocaleString('pt-BR')}</strong></span>
                                        <span className="underline font-bold">Recolher ↑</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }) : (
                              <div className="bg-white rounded-3xl p-6 border border-dashed border-slate-200 text-center shadow-2xs space-y-2">
                                <span className="text-2xl block">🎯</span>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                  {t('social.guilds.noActiveChallenges')}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setShowCreateChallenge(true)}
                                  className="mt-1 px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                  + Criar Primeiro Desafio
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>
                </div>
              );
            })()}

            {selectedChat.type === 'group' && guildSubTab === 'chat' && activeGuild && isGuildMember(activeGuild) && (
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/70 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:18px_18px]">
                {/* Collapsible 1-Line Guild Production Bar (Accordion) */}
                <div className="bg-white/95 backdrop-blur-xs border-b border-indigo-100/90 px-4 md:px-8 py-2.5 flex-shrink-0 shadow-2xs z-10">
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Guild Motto / Description */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xs flex-shrink-0">
                        📜
                      </span>
                      <p className="text-xs text-slate-600 italic truncate font-medium">
                        "{activeGuild.description || t('social.guilds.welcomeMessage')}"
                      </p>
                    </div>

                    {/* Center: Overlapping Mini-Avatars of Guild Members */}
                    <div className="hidden sm:flex items-center -space-x-2 flex-shrink-0">
                      {activeGuild.members.slice(0, 6).map(memberId => {
                        const photo = getUserPhotoURL(memberId);
                        const name = getUserName(memberId);
                        return photo ? (
                          <img
                            key={memberId}
                            src={photo}
                            alt={name}
                            title={`${name}: ${(memberStats[memberId] || 0).toLocaleString('pt-BR')} palavras`}
                            className="w-6 h-6 rounded-full object-cover ring-2 ring-white shadow-2xs"
                          />
                        ) : (
                          <div
                            key={memberId}
                            title={`${name}: ${(memberStats[memberId] || 0).toLocaleString('pt-BR')} palavras`}
                            className={`w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarGradient(name)} text-white flex items-center justify-center text-[10px] font-black ring-2 ring-white shadow-2xs`}
                          >
                            {name.charAt(0).toUpperCase()}
                          </div>
                        );
                      })}
                      {activeGuild.members.length > 6 && (
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] font-black ring-2 ring-white">
                          +{activeGuild.members.length - 6}
                        </div>
                      )}
                    </div>

                    {/* Right: Total Words Pill & Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowGuildChatProduction(prev => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-[11px] font-extrabold transition-all cursor-pointer flex-shrink-0 shadow-2xs"
                    >
                      <span>✍️ {Math.round(Object.values(memberStats).reduce((a, b) => a + b, 0)).toLocaleString('pt-BR')} Palavras Totais</span>
                      <span className="text-indigo-400">•</span>
                      <span className="underline decoration-indigo-300">
                        {showGuildChatProduction ? 'Ocultar Produção ▴' : 'Ver Produção ▾'}
                      </span>
                    </button>
                  </div>

                  {/* Expanded Member Production Cards */}
                  {showGuildChatProduction && (
                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 animate-fade-in">
                      {activeGuild.members.map(memberId => {
                        const mName = getUserName(memberId);
                        const mPhoto = getUserPhotoURL(memberId);
                        const mWords = Math.round(memberStats[memberId] || 0);
                        return (
                          <div key={memberId} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/90 border border-slate-200/70 shadow-2xs">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs ring-2 ring-white overflow-hidden flex-shrink-0">
                              {mPhoto ? (
                                <img src={mPhoto} alt={mName} className="w-full h-full object-cover" />
                              ) : (
                                mName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-700 truncate">{mName}</p>
                              <p className="text-[10px] font-extrabold text-indigo-600">
                                {mWords.toLocaleString('pt-BR')} <span className="text-slate-400 font-normal">{t('social.guilds.words')}</span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Scrollable Messages Area */}
                <div className="flex-1 overflow-y-auto px-6 md:px-12 py-5">
                  {renderChatMessagesList(messages, 'guild')}
                  <div ref={messagesEndRef} className="h-2" />
                </div>
              </div>
            )}

            {selectedChat.type === 'group' && guildSubTab === 'forum' && activeGuild && isGuildMember(activeGuild) && (
              <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
                {selectedGuildThread ? (
                  <div className="flex flex-col h-full bg-slate-50 overflow-hidden animate-slide-in">
                    {/* Top Bar Navigation */}
                    <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                      <button
                        onClick={() => setSelectedGuildThread(null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>{t('social.guilds.backToForum')}</span>
                      </button>

                      {activeGuild && (isOwnerOrAdmin(activeGuild) || selectedGuildThread.authorId === currentUser.id) && (
                        <button
                          onClick={() => handleDeleteGuildThread(selectedGuildThread.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Excluir Tópico</span>
                        </button>
                      )}
                    </div>

                    {/* Scrollable Feed */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                      <div className="max-w-3xl mx-auto space-y-6">

                        {/* ORIGINAL POST CARD */}
                        <article className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-200 shadow-xs flex-shrink-0 bg-indigo-50 flex items-center justify-center font-black text-indigo-700 text-sm">
                                {getUserPhotoURL(selectedGuildThread.authorId) ? (
                                  <img src={getUserPhotoURL(selectedGuildThread.authorId)} alt={getUserName(selectedGuildThread.authorId)} className="w-full h-full object-cover" />
                                ) : (
                                  getUserName(selectedGuildThread.authorId).charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold text-slate-800 text-base leading-tight">
                                    {getUserName(selectedGuildThread.authorId)}
                                  </h4>
                                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Autor
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {new Date(selectedGuildThread.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </div>

                          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                            {selectedGuildThread.title}
                          </h1>

                          <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-base font-normal select-text space-y-4">
                            {selectedGuildThread.content}
                          </div>
                        </article>

                        {/* REPLIES SECTION */}
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                              <span>💬</span>
                              <span>{t('social.forum.replies')} ({guildReplies.length})</span>
                            </h3>
                          </div>

                          {/* Replies List */}
                          {guildReplies.map(reply => {
                            const isAuthor = reply.authorId === selectedGuildThread.authorId;
                            return (
                              <div key={reply.id} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 relative group transition-all hover:border-slate-300">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                                      {getUserPhotoURL(reply.authorId) ? (
                                        <img src={getUserPhotoURL(reply.authorId)} alt={getUserName(reply.authorId)} className="w-full h-full object-cover" />
                                      ) : (
                                        getUserName(reply.authorId).charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-800">{getUserName(reply.authorId)}</span>
                                        {isAuthor && (
                                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            Autor
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-slate-400">
                                        {new Date(reply.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </span>
                                    </div>
                                  </div>

                                  {activeGuild && (isOwnerOrAdmin(activeGuild) || reply.authorId === currentUser.id) && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteGuildReply(reply.id); }}
                                      className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </div>

                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pl-12 font-normal">
                                  {reply.content}
                                </p>
                              </div>
                            );
                          })}

                          {guildReplies.length === 0 && (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
                              <span className="text-3xl block">💭</span>
                              <p className="text-sm font-bold text-slate-600">{t('social.forum.beTheFirst')}</p>
                              <p className="text-xs text-slate-400">Responda para compartilhar com os membros da guilda.</p>
                            </div>
                          )}

                          {/* GUILD REPLY INPUT BOX */}
                          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3 mt-6">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                                {(currentUser.photoBase64 || currentUser.photoURL) ? (
                                  <img src={currentUser.photoBase64 || currentUser.photoURL} alt={currentUser.name} className="w-full h-full object-cover" />
                                ) : (
                                  currentUser.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <span className="text-xs font-bold text-slate-700">Responder como <strong className="text-indigo-700">{currentUser.name}</strong></span>
                            </div>

                            <textarea
                              value={newReplyContent}
                              maxLength={3000}
                              onChange={(e) => setNewReplyContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && newReplyContent.trim()) {
                                  e.preventDefault();
                                  handleReplyGuildThread();
                                }
                              }}
                              placeholder={t('social.forum.addReplyPlaceholder')}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white rounded-2xl p-4 text-sm outline-none transition-all resize-y min-h-[100px] leading-relaxed text-slate-800"
                              rows={3}
                            />

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Pressione <strong>Ctrl + Enter</strong> para enviar ({newReplyContent.length}/3000)</span>
                              <button
                                onClick={handleReplyGuildThread}
                                disabled={!newReplyContent.trim() || isActionSubmitting || isCooldownActive}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer ml-auto"
                              >
                                <span>{isActionSubmitting ? 'Enviando...' : t('social.forum.replyButton')}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">{t('social.guilds.guildForum')}</h3>
                      <button onClick={() => setShowCreateGuildThread(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                        {t('social.guilds.newInternalThread')}
                      </button>
                    </div>

                    {showCreateGuildThread && (
                      <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-xl mb-8 animate-fade-in">
                        <input
                          type="text"
                          maxLength={80}
                          placeholder={t('social.forum.threadTitlePlaceholder')}
                          value={newThreadTitle}
                          onChange={(e) => setNewThreadTitle(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl mb-3 font-bold outline-none border border-transparent focus:border-indigo-200"
                        />
                        <textarea
                          maxLength={3000}
                          placeholder={t('social.forum.contentPlaceholder')}
                          value={newThreadContent}
                          onChange={(e) => setNewThreadContent(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl mb-4 outline-none border border-transparent focus:border-indigo-200"
                          rows={4}
                        />
                        {forumError && <p className="text-rose-500 text-[10px] mb-2 font-bold uppercase tracking-wider">{forumError}</p>}
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setShowCreateGuildThread(false)} className="px-4 py-2 text-slate-500 font-bold text-xs">{t('social.friends.cancel')}</button>
                          <button
                            onClick={handleCreateGuildThread}
                            disabled={isActionSubmitting || isCooldownActive || !newThreadTitle.trim() || !newThreadContent.trim()}
                            className="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl disabled:opacity-50"
                          >
                            {isActionSubmitting ? 'Publicando...' : t('social.forum.publishButton')}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {guildThreads.map(thread => (
                        <div key={thread.id} className="relative group/thread">
                          <button
                            onClick={() => handleSelectGuildThread(thread)}
                            className="w-full text-left p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all"
                          >
                            <h4 className="font-bold text-slate-800 group-hover/thread:text-indigo-600 transition-colors">{thread.title}</h4>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-indigo-100 overflow-hidden">
                                {getUserPhotoURL(thread.authorId) ? (
                                  <img src={getUserPhotoURL(thread.authorId)} alt={getUserName(thread.authorId)} className="w-full h-full object-cover" />
                                ) : (
                                  getUserName(thread.authorId).charAt(0)
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">{t('social.forum.by')} {getUserName(thread.authorId)} • {new Date(thread.createdAt).toLocaleDateString()}</span>
                            </div>
                          </button>
                          {selectedChat?.type === 'group' && activeGuild && (isOwnerOrAdmin(activeGuild) || thread.authorId === currentUser.id) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteGuildThread(thread.id); }}
                              className="absolute top-4 right-4 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover/thread:opacity-100 transition-opacity"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      {guildThreads.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                          <p className="text-slate-400 text-sm font-medium">{t('social.guilds.noForumThreads')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedChat.type === 'group' && guildSubTab === 'agora' && activeGuild && isGuildMember(activeGuild) && (
              <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col items-center justify-center p-6 md:p-10 text-center">
                <div className="max-w-2xl w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
                  {/* Animated Microphone Avatar / Level Ring */}
                  <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
                    {audioPermission === 'granted' && !isMuted && (
                      <div
                        className="absolute inset-0 rounded-full bg-emerald-400/25 transition-transform duration-75"
                        style={{ transform: `scale(${1 + (audioLevel / 100) * 0.45})` }}
                      />
                    )}
                    <div
                      className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-inner transition-colors ${
                        audioPermission === 'granted'
                          ? isMuted
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-emerald-100 text-emerald-600'
                          : 'bg-indigo-100 text-indigo-600'
                      }`}
                    >
                      {audioPermission === 'granted' && isMuted ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                      <span>🎙️</span>
                      <span>Sala de Voz da Guilda</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{t('social.guilds.guildAgora')}</h3>
                    <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mt-1 leading-relaxed">
                      {t('social.guilds.agoraDescription')}
                    </p>
                  </div>

                  {/* Live Microphone Level Bar when Connected */}
                  {audioPermission === 'granted' && (
                    <div className="max-w-xs mx-auto bg-slate-50 p-3 rounded-2xl border border-slate-200/70 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className={isMuted ? 'text-amber-600' : 'text-emerald-700'}>
                          {isMuted ? '🔇 Microfone Mutado' : '🟢 Microfone Ativo'}
                        </span>
                        <span className="text-slate-400">{audioLevel}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-75 ${
                            isMuted ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                          }`}
                          style={{ width: `${isMuted ? 0 : Math.max(4, audioLevel)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Connected Participants in Ágora */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                      Membros na Sala ({agoraParticipants.length})
                    </h4>
                    {agoraParticipants.length > 0 ? (
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {agoraParticipants.map(part => {
                          const isMe = part.userId === currentUser.id;
                          const speakingNow = isMe ? (!isMuted && audioLevel > 12) : !part.isMuted;
                          const isPeerConnected = !isMe && remoteAudioElementsRef.current.has(part.userId);
                          return (
                            <div
                              key={part.userId}
                              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white border transition-all ${
                                speakingNow
                                  ? 'border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                                  : 'border-slate-200/80'
                              }`}
                            >
                              <div className="relative">
                                {(part.photoURL || getUserPhotoURL(part.userId)) ? (
                                  <img src={part.photoURL || getUserPhotoURL(part.userId)} alt={part.name} className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(part.name)} text-white flex items-center justify-center text-xs font-bold`}>
                                    {part.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                    part.isMuted ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                />
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-800 leading-tight">
                                  {part.name} {isMe && <span className="text-[10px] text-indigo-600">(Você)</span>}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold">
                                  {part.isMuted
                                    ? '🔇 Mutado'
                                    : isPeerConnected
                                    ? '🔊 Áudio Conectado'
                                    : '🎙️ Na Sala'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2">
                        Nenhum membro conectado no momento. Clique abaixo para entrar na sala de voz!
                      </p>
                    )}
                  </div>

                  {/* Audio Controls */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    {audioPermission !== 'granted' ? (
                      <button
                        onClick={handleJoinAudio}
                        className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all flex items-center gap-2.5 cursor-pointer"
                      >
                        <span>🎙️</span>
                        <span>{t('social.guilds.joinRoom')}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleToggleMute}
                          className={`px-6 py-3 font-extrabold text-xs rounded-2xl transition-all flex items-center gap-2 cursor-pointer border ${
                            isMuted
                              ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          <span>{isMuted ? '🔇 Desmutar Microfone' : '🎙️ Mutar Microfone'}</span>
                        </button>

                        <button
                          onClick={handleStopAudio}
                          className="px-6 py-3 bg-rose-100 text-rose-600 font-bold rounded-2xl hover:bg-rose-200 transition-colors uppercase text-xs tracking-wider cursor-pointer"
                        >
                          {t('social.guilds.stopAudio')}
                        </button>
                      </>
                    )}
                  </div>

                  {audioPermission === 'denied' && (
                    <p className="text-xs text-rose-600 bg-rose-50 px-4 py-2 rounded-xl border border-rose-200 font-semibold">
                      Permissão de microfone negada no navegador. Verifique as configurações de áudio do seu navegador para participar da Ágora.
                    </p>
                  )}

                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {t('social.guilds.restrictedAccess')}
                  </p>
                </div>
              </div>
            )}

            {selectedChat.type === 'direct' && (
              <div className="flex-1 overflow-y-auto px-6 md:px-12 py-5 bg-slate-50/70 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:18px_18px]">
                {renderChatMessagesList(messages, 'direct')}
                <div ref={messagesEndRef} className="h-2" />
              </div>
            )}

            {(selectedChat.type === 'direct' || (selectedChat.type === 'group' && guildSubTab === 'chat' && activeGuild && isGuildMember(activeGuild))) && (
              <div className="px-4 md:px-10 pb-4 pt-2 bg-slate-50/80 border-t border-slate-200/60 flex-shrink-0 relative">
                {/* Popover Literary Emoji & Reaction Selector */}
                {showChatEmojiPicker && (
                  <div className="absolute bottom-full left-4 md:left-10 mb-2 bg-white rounded-2xl shadow-lg border border-slate-200/90 p-2.5 flex items-center gap-1.5 z-20 animate-fade-in">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 hidden sm:inline">
                      Reações Literárias:
                    </span>
                    {[
                      { emoji: '🔥', label: 'Chama Literária' },
                      { emoji: '👏', label: 'Aplausos' },
                      { emoji: '📚', label: 'Leitura & Escrita' },
                      { emoji: '☕', label: 'Café Criativo' },
                      { emoji: '✨', label: 'Inspiração' },
                      { emoji: '❤️', label: 'Apoio' }
                    ].map(item => (
                      <button
                        key={item.emoji}
                        type="button"
                        onClick={() => handleInsertChatEmoji(item.emoji)}
                        title={item.label}
                        className="w-9 h-9 rounded-xl hover:bg-slate-100 active:scale-95 flex items-center justify-center text-lg transition-all cursor-pointer"
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className={`rounded-2xl bg-white shadow-md border border-slate-200/80 p-2 flex items-center gap-2 transition-all ${
                    selectedChat.type === 'direct'
                      ? 'focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15'
                      : 'focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/15'
                  }`}
                >
                  {/* Left: Quick Literary Emoji Selector Button + Inline Quick Reactions on wider screens */}
                  <div className="flex items-center gap-1 pl-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowChatEmojiPicker(prev => !prev)}
                      title="Inserir reação literária"
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-colors cursor-pointer ${
                        showChatEmojiPicker
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-600'
                      }`}
                    >
                      😊
                    </button>
                    <div className="hidden lg:flex items-center gap-0.5 bg-slate-50 border border-slate-200/60 rounded-xl px-1.5 py-1">
                      {['🔥', '👏', '📚', '☕', '✨', '❤️'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleInsertChatEmoji(emoji)}
                          title={`Inserir ${emoji}`}
                          className="w-7 h-7 rounded-lg hover:bg-white hover:shadow-2xs flex items-center justify-center text-sm transition-all cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Center: Text Input */}
                  <input
                    ref={chatInputRef}
                    type="text"
                    maxLength={1000}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('social.chat.typeMessage')}
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none min-w-0"
                  />

                  {/* Right: Vibrant Send Button with Paper Plane Icon */}
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isActionSubmitting || isCooldownActive}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs md:text-sm font-extrabold transition-all cursor-pointer flex-shrink-0 ${
                      newMessage.trim() && !isActionSubmitting && !isCooldownActive
                        ? selectedChat.type === 'direct'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm'
                          : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{isActionSubmitting ? '...' : t('social.chat.send')}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 transform rotate-45 -mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {/* VIEW: THREAD */}
        {selectedThread && (
          <div className="flex flex-col h-full bg-slate-50 overflow-hidden animate-fade-in">
            {/* Top Bar Navigation */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedThread(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Voltar aos tópicos</span>
                </button>
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                  {selectedThread.category}
                </span>
              </div>

              {(currentUser.role === 'admin' || selectedThread.authorId === currentUser.id) && (
                <button
                  onClick={(e) => handleDeleteThread(e, selectedThread.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title={t('social.forum.deleteThread')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Excluir Tópico</span>
                </button>
              )}
            </div>

            {/* Scrollable Thread & Replies Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="max-w-3xl mx-auto space-y-6">

                {/* ORIGINAL POST (OP) CARD */}
                <article className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                  {/* Author Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-teal-200 shadow-xs flex-shrink-0 bg-slate-100 flex items-center justify-center font-black text-slate-600 text-sm">
                        {getUserPhotoURL(selectedThread.authorId) ? (
                          <img src={getUserPhotoURL(selectedThread.authorId)} alt={getUserName(selectedThread.authorId)} className="w-full h-full object-cover" />
                        ) : (
                          getUserName(selectedThread.authorId).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-800 text-base leading-tight">
                            {getUserName(selectedThread.authorId)}
                          </h4>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                            Autor
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Postado em {new Date(selectedThread.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                    {selectedThread.title}
                  </h1>

                  {/* Post Content */}
                  <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-base font-normal select-text space-y-4">
                    {selectedThread.content}
                  </div>

                  {/* Post Actions & Likes */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={(e) => handleToggleLike(e, selectedThread.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        selectedThread.likes?.includes(currentUser.id)
                          ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-xs scale-105'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-transparent'
                      }`}
                    >
                      <span>{selectedThread.likes?.includes(currentUser.id) ? '❤️' : '🤍'}</span>
                      <span>{selectedThread.likes?.length || 0}</span>
                      <span>{t('social.forum.like')}</span>
                    </button>

                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                      <span>💬</span>
                      <span>{threadReplies.length} {threadReplies.length === 1 ? 'resposta' : 'respostas'}</span>
                    </span>
                  </div>
                </article>

                {/* REPLIES SECTION */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <span>💬</span>
                      <span>{t('social.forum.replies')} ({threadReplies.length})</span>
                    </h3>
                  </div>

                  {/* Replies List */}
                  {threadReplies.map(reply => {
                    const isAuthor = reply.authorId === selectedThread.authorId;
                    return (
                      <div key={reply.id} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 relative group transition-all hover:border-slate-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                              {getUserPhotoURL(reply.authorId) ? (
                                <img src={getUserPhotoURL(reply.authorId)} alt={getUserName(reply.authorId)} className="w-full h-full object-cover" />
                              ) : (
                                getUserName(reply.authorId).charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-800">{getUserName(reply.authorId)}</span>
                                {isAuthor && (
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                                    Autor
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {new Date(reply.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          {(currentUser.role === 'admin' || reply.authorId === currentUser.id) && (
                            <button
                              onClick={() => handleDeleteReply(reply.id)}
                              className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                              title={t('social.forum.deleteReply')}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>

                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pl-12 font-normal">
                          {reply.content}
                        </p>
                      </div>
                    );
                  })}

                  {/* Empty Replies State */}
                  {threadReplies.length === 0 && (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
                      <span className="text-3xl block">💭</span>
                      <p className="text-sm font-bold text-slate-600">{t('social.forum.beTheFirst')}</p>
                      <p className="text-xs text-slate-400">Compartilhe suas ideias ou perguntas abaixo.</p>
                    </div>
                  )}

                  {/* REPLY INPUT BOX (IN-FLOW) */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3 mt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 bg-teal-100 flex items-center justify-center font-bold text-teal-700 text-xs">
                        {(currentUser.photoBase64 || currentUser.photoURL) ? (
                          <img src={currentUser.photoBase64 || currentUser.photoURL} alt={currentUser.name} className="w-full h-full object-cover" />
                        ) : (
                          currentUser.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-700">Responder como <strong className="text-teal-700">{currentUser.name}</strong></span>
                    </div>

                    <textarea
                      value={newReplyContent}
                      maxLength={3000}
                      onChange={(e) => setNewReplyContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && newReplyContent.trim()) {
                          e.preventDefault();
                          handleReplyThread();
                        }
                      }}
                      placeholder="Escreva sua resposta para este tópico... (Dica: Ctrl+Enter para enviar)"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-teal-400 focus:bg-white rounded-2xl p-4 text-sm outline-none transition-all resize-y min-h-[100px] leading-relaxed text-slate-800"
                      rows={3}
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Pressione <strong>Ctrl + Enter</strong> para enviar ({newReplyContent.length}/3000)</span>
                      <button
                        onClick={handleReplyThread}
                        disabled={!newReplyContent.trim() || isActionSubmitting || isCooldownActive}
                        className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer ml-auto"
                      >
                        <span>{isActionSubmitting ? 'Enviando...' : t('social.forum.replyButton')}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        )}

        {/* Empty State: Dynamic Community Hub */}
        {(!selectedChat && !selectedThread) && (
          <div className="flex-1 overflow-y-auto bg-slate-50/70 p-6 sm:p-10">
            <div className="max-w-4xl mx-auto w-full space-y-8 animate-fade-in">

              {/* Hero Welcome Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white p-8 sm:p-10 shadow-xl border border-emerald-500/20">
                <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold tracking-wide">
                      <span>✨</span>
                      <span>Hub da Comunidade ParnasoTec</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                      Bem-vindo à Comunidade Parnaso
                    </h2>
                    <p className="text-slate-300 text-sm sm:text-base leading-relaxed italic">
                      “A escrita pode nascer no silêncio, mas floresce quando compartilhada. Conecte-se com outros autores, troque inspirações e alcance novas metas literárias em conjunto.”
                    </p>
                  </div>

                  {/* Mini Community Stats */}
                  <div className="grid grid-cols-2 gap-2.5 flex-shrink-0">
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center">
                      <span className="block text-xl font-black text-emerald-300">{uniqueFriends.length}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Amigos</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center">
                      <span className="block text-xl font-black text-purple-300">{guilds.length}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Guildas</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center">
                      <span className="block text-xl font-black text-teal-300">{threads.length}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Tópicos</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center">
                      <span className="block text-xl font-black text-amber-300">{competitions.length}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Desafios</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Literary Challenges Showcase (Always visible when challenges exist or when on Competitions tab) */}
              {(activeTab === 'competitions' || competitions.length > 0) && (
                <div className="bg-white rounded-3xl p-6 border border-amber-200/80 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <span>🏆</span>
                        <span>Desafios Literários da Comunidade ({competitions.length})</span>
                      </h3>
                      <p className="text-xs text-slate-500">Participe de maratonas literárias ou lance uma nova meta para os escritores</p>
                    </div>
                    <button
                      onClick={() => { setCompError(null); setShowCreateComp(true); }}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🏆</span>
                      <span>+ Lançar Novo Desafio</span>
                    </button>
                  </div>

                  {competitions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {competitions.map(comp => {
                        const isParticipant = comp.participants.includes(currentUser.id);
                        return (
                          <div key={comp.id} className="p-4 rounded-2xl bg-amber-50/30 border border-amber-200/70 flex flex-col justify-between gap-3 relative group">
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                                  <span>🏆</span>
                                  <span>{comp.title}</span>
                                </h4>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                                    {comp.type === 'word_count' ? `${comp.target.toLocaleString('pt-BR')} palavras` : `${comp.target} dias`}
                                  </span>
                                  {(currentUser.role === 'admin' || comp.creatorId === currentUser.id) && (
                                    <button
                                      onClick={() => handleDeleteCompetition(comp.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                      title={t('social.competitions.deleteChallenge')}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed mb-3">{comp.description}</p>
                            </div>

                            {isParticipant ? (
                              <div className="space-y-2 bg-white p-3 rounded-xl border border-amber-100">
                                {comp.participants.map(pid => {
                                  const stat = compStats[comp.id]?.[pid] || { current: 0, percent: 0 };
                                  const pName = getUserName(pid);
                                  return (
                                    <div key={pid} className="text-xs">
                                      <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                                        <span className="truncate">{pName}</span>
                                        <span>{stat.current.toLocaleString('pt-BR')} / {comp.target.toLocaleString('pt-BR')} ({stat.percent}%)</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${stat.percent}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleJoinCompetition(comp.id)}
                                className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                              >
                                {t('social.competitions.joinChallenge')}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs font-bold text-slate-600 mb-1">Nenhum desafio literário ativo no momento</p>
                      <p className="text-[11px] text-slate-400">Clique em "+ Lançar Novo Desafio" para criar o primeiro desafio da comunidade!</p>
                    </div>
                  )}
                </div>
              )}

              {/* 3 Clickable Quick Action Cards */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 px-1">
                  Ações Rápidas da Comunidade
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                  {/* Card 1: Guilds */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('guilds');
                      setShowCreateGuild(true);
                    }}
                    className="group text-left bg-white hover:bg-gradient-to-b hover:from-white hover:to-purple-50/40 p-6 rounded-2xl border border-slate-200/80 hover:border-purple-300 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200/60 text-purple-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-2xs">
                        🛡️
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-base mb-1.5 group-hover:text-purple-700 transition-colors">
                        Explorar ou Fundar Guilda
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Forme alianças literárias com seus amigos, acompanhe o ranking de palavras e converse na Ágora.
                      </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600">
                      <span>Fundar ou ver guildas</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </button>

                  {/* Card 2: Forum */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('forum');
                      if (threads.length > 0) {
                        setSelectedThread(threads[0]);
                      } else {
                        setShowCreateThread(true);
                      }
                    }}
                    className="group text-left bg-white hover:bg-gradient-to-b hover:from-white hover:to-emerald-50/40 p-6 rounded-2xl border border-slate-200/80 hover:border-emerald-300 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                        💬
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-base mb-1.5 group-hover:text-emerald-700 transition-colors">
                        Debater no Fórum
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Participe das discussões da comunidade, tire dúvidas sobre bloqueio criativo e peça feedbacks.
                      </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600">
                      <span>Acessar discussões</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </button>

                  {/* Card 3: Literary Challenges */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('competitions');
                      setCompError(null);
                      setShowCreateComp(true);
                    }}
                    className="group text-left bg-white hover:bg-gradient-to-b hover:from-white hover:to-amber-50/40 p-6 rounded-2xl border border-slate-200/80 hover:border-amber-300 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-2xs">
                        🏆
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-base mb-1.5 group-hover:text-amber-600 transition-colors">
                        Lançar Desafio Literário
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Crie maratonas de contagem de palavras ou metas de ofensiva diária para engajar os escritores.
                      </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600">
                      <span>Criar novo desafio</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </button>

                </div>
              </div>

              {/* Recent Community Highlights */}
              {threads.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <span>🔥</span>
                      <span>Tópicos Recentes no Fórum</span>
                    </h4>
                    <button
                      onClick={() => { setActiveTab('forum'); setShowCreateThread(true); }}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      + Criar Tópico
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {threads.slice(0, 2).map(thread => (
                      <button
                        key={thread.id}
                        onClick={() => { setActiveTab('forum'); setSelectedThread(thread); setSelectedChat(null); }}
                        className="text-left p-3.5 rounded-xl bg-slate-50/70 hover:bg-emerald-50/40 border border-slate-200/60 hover:border-emerald-200 transition-all flex items-start justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className={`inline-block text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full border mb-1.5 ${getCategoryBadgeStyle(thread.category)}`}>
                            {thread.category}
                          </span>
                          <p className="font-bold text-slate-800 text-xs truncate">{thread.title}</p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">por {getUserName(thread.authorId)}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/70 flex items-center gap-1 flex-shrink-0">
                          ❤️ {thread.likes?.length || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* MODAL: CREATE GUILD */}
      {showCreateGuild && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            {/* Modal Header with Subtle Gradient */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50/60 to-emerald-50/50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xl shadow-md shadow-purple-500/20">
                  🛡️
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800 tracking-tight leading-tight">
                    {t('social.guilds.createGuildTitle')}
                  </h3>
                  <p className="text-xs text-slate-500">Crie uma irmandade literária com seus amigos</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateGuild(false)}
                className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-center">
                <ImagePicker
                  currentImage={newGuildEmblemBase64}
                  onImageSelected={setNewGuildEmblemBase64}
                  onImageRemoved={() => setNewGuildEmblemBase64('')}
                  label="Brasão da Guilda"
                  size="md"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  {t('social.guilds.guildName')}
                </label>
                <input
                  maxLength={80}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-800 transition-all"
                  placeholder={t('social.guilds.guildName')}
                  value={newGuildName}
                  onChange={(e) => setNewGuildName(e.target.value.slice(0, 80))}
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Descrição ou Lema
                </label>
                <textarea
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm h-20 resize-none text-slate-700 transition-all"
                  placeholder={t('social.guilds.guildDescription')}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value.slice(0, 500))}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    {t('social.guilds.selectFounders')}
                  </p>
                  {selectedGuildMembers.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {selectedGuildMembers.length} selecionado(s)
                    </span>
                  )}
                </div>
                <div className="max-h-44 overflow-y-auto border border-slate-200/80 rounded-xl p-2.5 bg-slate-50/60 space-y-2">
                  {uniqueFriends.map(({ user }) => {
                    const isChecked = selectedGuildMembers.includes(user.id);
                    const fAvatar = getUserAvatar(user);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleGuildMember(user.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'bg-emerald-50/90 border-emerald-400 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200/70'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {fAvatar ? (
                            <img src={fAvatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(user.name)} text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0`}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className={`text-sm font-bold truncate ${isChecked ? 'text-emerald-950' : 'text-slate-700'}`}>
                            {user.name}
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all flex-shrink-0 ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white border-slate-300 text-transparent'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                  {uniqueFriends.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">{t('social.guilds.needFriends')}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowCreateGuild(false)}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {t('social.friends.cancel')}
                </button>
                <button
                  onClick={handleCreateGuild}
                  disabled={!newGuildName.trim() || isActionSubmitting || isCooldownActive}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  🛡️ {t('social.guilds.foundButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE THREAD */}
      {showCreateThread && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
            {/* Modal Header with Subtle Gradient */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-500/20">
                  💬
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800 tracking-tight leading-tight">
                    {t('social.forum.newForumThread')}
                  </h3>
                  <p className="text-xs text-slate-500">Inicie uma discussão ou compartilhe ideias com a comunidade</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateThread(false)}
                className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Título da Discussão
                </label>
                <input
                  maxLength={80}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-800 transition-all"
                  placeholder={t('social.forum.threadTitlePlaceholder')}
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value.slice(0, 80))}
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Categoria
                </label>
                <select
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-700 transition-all"
                  value={newThreadCategory}
                  onChange={(e) => setNewThreadCategory(e.target.value as any)}
                >
                  <option>Geral</option>
                  <option>Dúvidas</option>
                  <option>Inspiração</option>
                  <option>Feedback</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Mensagem / Conteúdo
                </label>
                <textarea
                  maxLength={3000}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm h-32 resize-none text-slate-700 leading-relaxed transition-all"
                  placeholder={t('social.forum.contentPlaceholder')}
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value.slice(0, 3000))}
                />
              </div>

              {forumError && <p className="text-rose-500 text-xs font-bold bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">{forumError}</p>}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowCreateThread(false)}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {t('social.friends.cancel')}
                </button>
                <button
                  onClick={handleCreateThread}
                  disabled={isActionSubmitting || isCooldownActive}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  ✍️ {t('social.forum.publishButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE COMPETITION */}
      {showCreateComp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            {/* Modal Header with Subtle Gradient */}
            <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-emerald-50/40 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-xl shadow-md shadow-amber-500/20">
                  🏆
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800 tracking-tight leading-tight">
                    {t('social.competitions.createLiteraryChallenge')}
                  </h3>
                  <p className="text-xs text-slate-500">Desafie a comunidade a bater novas metas</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateComp(false)}
                className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Título do Desafio *
                </label>
                <input
                  maxLength={80}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-800 transition-all"
                  placeholder={t('social.competitions.challengeNamePlaceholder')}
                  value={newCompTitle}
                  onChange={(e) => { setNewCompTitle(e.target.value.slice(0, 80)); if (compError) setCompError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCompetition(); }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Regras & Descrição (opcional)
                </label>
                <textarea
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm text-slate-700 resize-none transition-all"
                  placeholder={t('social.competitions.rulesDescription')}
                  value={newCompDesc}
                  onChange={(e) => setNewCompDesc(e.target.value.slice(0, 500))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    {t('social.competitions.typeLabel')}
                  </label>
                  <select
                    className="w-full px-3 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-xs font-bold text-slate-700 transition-all"
                    value={newCompType}
                    onChange={(e) => setNewCompType(e.target.value as any)}
                  >
                    <option value="word_count">{t('social.competitions.wordCountOption')}</option>
                    <option value="days_streak">{t('social.competitions.streakOption')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    {t('social.competitions.durationDaysLabel')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-bold text-slate-800 transition-all"
                    value={newCompDuration}
                    onChange={(e) => setNewCompDuration(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  {t('social.competitions.targetLabel')} ({newCompType === 'word_count' ? t('social.competitions.wordType') : t('social.competitions.daysLabel')})
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-bold text-emerald-700 transition-all"
                  value={newCompTarget}
                  onChange={(e) => setNewCompTarget(Number(e.target.value))}
                />
              </div>

              {compError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 px-3.5 py-2 rounded-xl border border-rose-200">
                  {compError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowCreateComp(false)}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {t('social.friends.cancel')}
                </button>
                <button
                  onClick={handleCreateCompetition}
                  disabled={isSubmittingComp || isActionSubmitting || isCooldownActive}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingComp ? 'Lançando...' : t('social.competitions.launchChallenge')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE GUILD CHALLENGE */}
      {showCreateChallenge && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-fade-in border border-indigo-50">
            <h3 className="font-black text-2xl mb-6 text-indigo-900 uppercase tracking-tighter flex items-center gap-3">
              <span className="p-2 bg-indigo-100 rounded-xl text-xl">🎯</span> {t('social.guilds.createChallengeTitle')}
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('social.guilds.challengeNameLabel')} *</label>
                <input
                  maxLength={80}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-bold"
                  placeholder={t('social.guilds.challengeNamePlaceholder')}
                  value={newChallengeTitle}
                  onChange={(e) => { setNewChallengeTitle(e.target.value.slice(0, 80)); if (challengeError) setChallengeError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateChallenge(); }}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('social.guilds.shortDescriptionLabel')}</label>
                <textarea
                  maxLength={500}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm h-24 resize-none leading-relaxed"
                  placeholder={t('social.guilds.shortDescriptionPlaceholder')}
                  value={newChallengeDesc}
                  onChange={(e) => setNewChallengeDesc(e.target.value.slice(0, 500))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('social.guilds.wordTarget')}</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-black text-indigo-600"
                    value={newChallengeTarget}
                    onChange={(e) => setNewChallengeTarget(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('social.guilds.durationDays')}</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-black text-indigo-600"
                    value={newChallengeDuration}
                    onChange={(e) => setNewChallengeDuration(Number(e.target.value))}
                  />
                </div>
              </div>

              {challengeError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 px-3.5 py-2 rounded-xl border border-rose-200">
                  {challengeError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateChallenge(false)}
                className="flex-1 py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer"
              >
                {t('social.friends.cancel')}
              </button>
              <button
                onClick={handleCreateChallenge}
                disabled={isSubmittingChallenge || isActionSubmitting || isCooldownActive}
                className="flex-[2] py-3 bg-indigo-600 text-white font-black text-xs rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-widest disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingChallenge ? 'Lançando...' : t('social.guilds.launchChallenge')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
