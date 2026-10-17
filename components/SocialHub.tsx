


import React, { useState, useEffect, useRef } from 'react';
import { User, Message, Guild, GuildForumThread, GuildForumReply, Competition, WritingSession, ForumThread, ForumReply } from '../types';
import {
  getFriendsList,
  getPendingRequests,
  getAvailableUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  getConversation,
  sendMessage,
  markAsRead,
  getUserGuilds,
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
  createGuildChallenge,
  toggleForumThreadLike,
  updateGuildEmblemBase64
} from '../services/socialService';
import { compressImage, resizeImageToBase64 } from '../utils/imageProcessor';
import { ImagePicker } from './ui/ImagePicker';
import { useLanguage } from '../i18n/LanguageContext';
import { getSessions } from '../services/sessionService';
import { getAllUsers } from '../services/authService';

interface SocialHubProps {
  currentUser: User;
  onExit: () => void;
}

export const SocialHub: React.FC<SocialHubProps> = ({ currentUser, onExit }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'friends' | 'guilds' | 'forum' | 'competitions' | 'find'>('friends');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Friends Data
  const [friends, setFriends] = useState<{ user: User, friendshipId: string }[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Guild Data
  const [guilds, setGuilds] = useState<Guild[]>([]);
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

  // Guild Forum State
  const [guildThreads, setGuildThreads] = useState<GuildForumThread[]>([]);
  const [selectedGuildThread, setSelectedGuildThread] = useState<GuildForumThread | null>(null);
  const [guildReplies, setGuildReplies] = useState<GuildForumReply[]>([]);
  const [showCreateGuildThread, setShowCreateGuildThread] = useState(false);
  const [isUpdatingEmblem, setIsUpdatingEmblem] = useState(false);
  const [forumError, setForumError] = useState<string | null>(null);
  const [audioPermission, setAudioPermission] = useState<'pending' | 'granted' | 'denied'>('pending');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

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

  // Chat State (Direct & Group)
  const [selectedChat, setSelectedChat] = useState<{ type: 'direct' | 'group', target: User | Guild } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active guild dynamically synced from guilds array
  const activeGuild: Guild | null = selectedChat?.type === 'group'
    ? (guilds.find(g => g.id === selectedChat.target.id) || (selectedChat.target as Guild))
    : null;

  // Cleanup audio tracks on unmount
  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      await refreshData();
      const users = await getAllUsers();
      setAllUsers(users);
    };
    init();

    // Simulate real-time by refreshing every 3 seconds
    const interval = setInterval(() => {
      refreshData();
      refreshChatIfActive();
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedChat, selectedThread]);

  const refreshData = async () => {
    setFriends(await getFriendsList(currentUser.id));
    setRequests(await getPendingRequests(currentUser.id));
    setAvailableUsers(await getAvailableUsers(currentUser.id));
    setGuilds(await getUserGuilds(currentUser.id));
    setThreads(await getForumThreads());

    const comps = await getCompetitions();
    setCompetitions(comps);

    // Calculate guild member stats
    const allGuilds = await getUserGuilds(currentUser.id);
    const uniqueMemberIds = Array.from(new Set(allGuilds.flatMap(g => g.members)));
    const newMemberStats: Record<string, number> = {};

    for (const memberId of uniqueMemberIds) {
      const userSessions = await getSessions(memberId);
      // Filter sessions by guild reset date if applicable
      const guildWithMember = allGuilds.find(g => g.members.includes(memberId));
      const resetTime = guildWithMember?.statsResetDate ? new Date(guildWithMember.statsResetDate).getTime() : 0;

      const total = userSessions
        .filter(s => new Date(s.date).getTime() >= resetTime)
        .reduce((acc, s) => acc + s.wordCount, 0);
      newMemberStats[memberId] = total;
    }
    setMemberStats(newMemberStats);

    // Calculate stats asynchronously for competitions
    const newStats: Record<string, Record<string, { current: number, percent: number }>> = {};
    for (const comp of comps) {
      newStats[comp.id] = {};
      for (const pid of comp.participants) {
        const sessions = await getSessions(pid);
        newStats[comp.id][pid] = calculateProgress(comp, sessions);
      }
    }
    setCompStats(newStats);
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

    const percent = Math.min(100, Math.round((current / comp.target) * 100));
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
    // Refresh others for background updates
    setRequests(await getPendingRequests(currentUser.id));
    setThreads(await getForumThreads());
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Handlers: Friends ---
  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(currentUser.id, userId);
      await refreshData();
      alert(t('social.friends.requestSent'));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAccept = async (id: string) => {
    await acceptFriendRequest(id);
    await refreshData();
  };

  const handleReject = async (id: string) => {
    await removeFriendship(id);
    await refreshData();
  };

  const handleRemoveFriend = async (e: React.MouseEvent, friendshipId: string) => {
    e.stopPropagation();
    if (confirm(t('social.friends.confirmRemoveFriend'))) {
      await removeFriendship(friendshipId);
      if (selectedChat?.type === 'direct') {
        const friendObj = friends.find(f => f.friendshipId === friendshipId);
        if (friendObj && friendObj.user.id === selectedChat.target.id) {
          setSelectedChat(null);
        }
      }
      await refreshData();
    }
  };

  // --- Handlers: Chat ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    if (selectedChat.type === 'direct') {
      const user = selectedChat.target as User;
      await sendMessage(currentUser.id, user.id, newMessage);
      setMessages(await getConversation(currentUser.id, user.id));
    } else {
      const guild = activeGuild || (selectedChat.target as Guild);
      await sendGroupMessage(currentUser.id, guild.id, newMessage);
      setMessages(await getGroupMessages(guild.id));
    }
    setNewMessage('');
  };

  // --- Handlers: Guilds ---
  const handleCreateGuild = async () => {
    if (!newGuildName.trim()) return;
    await createGuild(newGuildName, currentUser.id, selectedGuildMembers, newGroupDesc, newGuildEmblemBase64);
    setShowCreateGuild(false);
    setNewGuildName('');
    setNewGroupDesc('');
    setNewGuildEmblemBase64('');
    setSelectedGuildMembers([]);
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
    if (selectedChat?.type === 'group' && activeGuild && newThreadTitle.trim()) {
      try {
        setForumError(null);
        const guild = activeGuild;
        await createGuildThread(guild.id, currentUser.id, newThreadTitle, newThreadContent);
        setNewThreadTitle('');
        setNewThreadContent('');
        setShowCreateGuildThread(false);
        await fetchGuildThreadData(guild.id);
        await refreshData();
      } catch (error) {
        setForumError(t('social.forum.errorPublish'));
      }
    }
  };

  const handleSelectGuildThread = async (thread: GuildForumThread) => {
    setSelectedGuildThread(thread);
    setGuildReplies(await getGuildReplies(thread.id));
  };

  const handleReplyGuildThread = async () => {
    if (selectedGuildThread && newReplyContent.trim()) {
      await replyToGuildThread(currentUser.id, selectedGuildThread.id, newReplyContent);
      setNewReplyContent('');
      setGuildReplies(await getGuildReplies(selectedGuildThread.id));
    }
  };

  const toggleGuildMember = (userId: string) => {
    setSelectedGuildMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // --- Handlers: Forum ---
  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !newThreadContent.trim()) {
      setForumError(t('social.forum.titleContentRequired'));
      return;
    }
    try {
      setForumError(null);
      await createForumThread(currentUser.id, newThreadTitle, newThreadContent, newThreadCategory);
      setShowCreateThread(false);
      setNewThreadTitle('');
      setNewThreadContent('');
      await refreshData();
    } catch (error) {
      console.error("Erro ao criar tópico:", error);
      setForumError(t('social.forum.errorCreateThread'));
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
      setAudioPermission('pending');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setAudioPermission('granted');
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      setAudioPermission('denied');
      alert(t('social.forum.errorMicrophone'));
    }
  };

  const handleStopAudio = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    setAudioPermission('pending');
  };

  const handleReplyThread = async () => {
    if (!selectedThread || !newReplyContent) return;
    await replyToThread(currentUser.id, selectedThread.id, newReplyContent);
    setThreadReplies(await getForumReplies(selectedThread.id));
    setNewReplyContent('');
  };

  // --- Handlers: Competitions ---
  const handleCreateCompetition = async () => {
    if (!newCompTitle || !newCompDesc) return;
    await createCompetition(currentUser.id, newCompTitle, newCompDesc, newCompType, newCompTarget, newCompDuration);
    setShowCreateComp(false);
    setNewCompTitle('');
    setNewCompDesc('');
    await refreshData();
  };

  const isOwnerOrAdmin = (guild: Guild) => {
    return guild.adminId === currentUser.id || (guild.adminIds || []).includes(currentUser.id);
  };

  const handleResetStats = async (guildId: string) => {
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
    if (!newChallengeTitle.trim() || !selectedChat || selectedChat.type !== 'group' || !activeGuild) return;
    const guild = activeGuild;
    await createGuildChallenge(guild.id, {
      title: newChallengeTitle,
      description: newChallengeDesc,
      type: 'word_count', // Simplified for now
      target: newChallengeTarget,
      durationDays: newChallengeDuration
    });
    setNewChallengeTitle('');
    setNewChallengeDesc('');
    setShowCreateChallenge(false);
    await refreshData();
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
      await refreshData();
    }
  };

  // Helper to get User Name
  const getUserName = (userId: string) => {
    return allUsers.find(u => u.id === userId)?.name || 'Usuário';
  };

  const getUserAvatar = (u?: User | null) => {
    if (!u) return undefined;
    return u.photoBase64 || u.photoURL || (u as any).avatarBase64;
  };

  const getUserPhotoURL = (userId: string) => {
    const u = allUsers.find(u => u.id === userId);
    return getUserAvatar(u);
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
        map.set(item.user.id, item);
      }
    });
    return Array.from(map.values());
  }, [friends]);

  const trimmedSearch = searchTerm.trim();
  const hasValidSearch = trimmedSearch.length >= 2;

  const filteredAvailable = hasValidSearch
    ? availableUsers.filter(u =>
        u.name.toLowerCase().includes(trimmedSearch.toLowerCase())
      )
    : [];

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

          {/* Modern 5 Sub-Tabs Pill Bar */}
          <div className="grid grid-cols-5 bg-slate-100/90 p-1 rounded-xl gap-1 border border-slate-200/60">
            <button
              onClick={() => { setActiveTab('friends'); setSelectedChat(null); setSelectedThread(null); }}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer gap-0.5 ${
                activeTab === 'friends'
                  ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-500/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <span className="text-xs leading-none">👥</span>
              <span className="truncate max-w-full">{t('social.tabs.friends')}</span>
            </button>

            <button
              onClick={() => { setActiveTab('guilds'); setSelectedChat(null); setSelectedThread(null); }}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer gap-0.5 ${
                activeTab === 'guilds'
                  ? 'bg-white text-purple-700 shadow-xs ring-1 ring-purple-500/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <span className="text-xs leading-none">🛡️</span>
              <span className="truncate max-w-full">{t('social.tabs.guilds')}</span>
            </button>

            <button
              onClick={() => { setActiveTab('forum'); setSelectedChat(null); setSelectedThread(null); }}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer gap-0.5 ${
                activeTab === 'forum'
                  ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-500/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <span className="text-xs leading-none">💬</span>
              <span className="truncate max-w-full">{t('social.tabs.forum')}</span>
            </button>

            <button
              onClick={() => { setActiveTab('competitions'); setSelectedChat(null); setSelectedThread(null); }}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer gap-0.5 ${
                activeTab === 'competitions'
                  ? 'bg-white text-amber-700 shadow-xs ring-1 ring-amber-500/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <span className="text-xs leading-none">🏆</span>
              <span className="truncate max-w-full">{t('social.tabs.competitions')}</span>
            </button>

            <button
              onClick={() => { setActiveTab('find'); setSelectedChat(null); setSelectedThread(null); }}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer gap-0.5 ${
                activeTab === 'find'
                  ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-500/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <span className="text-xs leading-none">🔍</span>
              <span className="truncate max-w-full">{t('social.tabs.find')}</span>
              {requests.length > 0 && (
                <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3">

          {/* TAB: FRIENDS */}
          {activeTab === 'friends' && (
            <div className="space-y-2">
              <div className="mb-3">
                <button
                  onClick={() => setActiveTab('find')}
                  className="w-full px-3.5 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50/60 hover:bg-emerald-50 rounded-xl border border-dashed border-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <span>🔍</span>
                  <span>{t('social.friends.addFriend')}</span>
                </button>
                {requests.length > 0 && (
                  <div
                    className="mt-2 text-xs bg-purple-50 border border-purple-200 text-purple-700 px-3 py-2 rounded-xl cursor-pointer font-bold flex items-center justify-between hover:bg-purple-100/70 transition-colors"
                    onClick={() => setActiveTab('find')}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                      {requests.length} {t('social.friends.pendingRequests')}
                    </span>
                    <span>→</span>
                  </div>
                )}
              </div>

              {uniqueFriends.map(({ user, friendshipId }) => {
                const avatar = getUserAvatar(user);
                const isSelected = selectedChat?.type === 'direct' && selectedChat.target.id === user.id;
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
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className={`font-bold text-sm truncate ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                          {user.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                          <span>💬</span>
                          <span>{t('social.friends.clickToChat')}</span>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleRemoveFriend(e, friendshipId)}
                      className="opacity-0 group-hover/friend:opacity-100 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-xl cursor-pointer"
                      title={t('social.friends.removeFriend')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
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
            </div>
          )}

          {/* TAB: GUILDS */}
          {activeTab === 'guilds' && (
            <div className="space-y-2.5">
              <button
                onClick={() => setShowCreateGuild(true)}
                className="w-full px-3.5 py-2.5 text-xs font-bold text-purple-700 bg-purple-50/60 hover:bg-purple-50 rounded-xl border border-dashed border-purple-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <span>🛡️</span>
                <span>{t('social.guilds.foundNewGuild')}</span>
              </button>

              {guilds.map(guild => {
                const isSelected = selectedChat?.target.id === guild.id;
                return (
                  <button
                    key={guild.id}
                    onClick={() => {
                      setSelectedChat({ type: 'group', target: guild });
                      setSelectedThread(null);
                      setGuildSubTab('home');
                      fetchGuildThreadData(guild.id);
                    }}
                    className={`w-full flex items-center p-3 rounded-2xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-purple-50/90 border-purple-200 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {(guild.emblemBase64 || guild.emblemUrl) ? (
                      <img
                        src={guild.emblemBase64 || guild.emblemUrl}
                        alt="Emblem"
                        className="w-11 h-11 rounded-full object-cover mr-3 border-2 border-purple-200 shadow-xs flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(guild.name)} flex items-center justify-center text-white font-extrabold text-sm mr-3 border-2 border-white shadow-sm flex-shrink-0`}>
                        {guild.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate ${isSelected ? 'text-purple-950' : 'text-slate-800'}`}>
                        {guild.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-purple-50 text-purple-700 font-semibold text-[10px]">
                          {guild.members.length} {t('social.guilds.members')}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {guilds.length === 0 && (
                <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2.5 text-xl">
                    🛡️
                  </div>
                  <p className="text-xs font-bold text-slate-600 mb-1">Nenhuma guilda ainda</p>
                  <p className="text-[11px] text-slate-400">Funde uma nova guilda literária e convide seus amigos!</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: FORUM */}
          {activeTab === 'forum' && (
            <div className="space-y-2.5">
              <button
                onClick={() => setShowCreateThread(true)}
                className="w-full px-3.5 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50/60 hover:bg-emerald-50 rounded-xl border border-dashed border-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <span>✍️</span>
                <span>{t('social.forum.newThread')}</span>
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
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                          : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2 pr-5">
                        <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${getCategoryBadgeStyle(thread.category)}`}>
                          {thread.category}
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
                      <h3 className="font-bold text-slate-800 text-sm leading-snug mb-2.5 line-clamp-2">{thread.title}</h3>
                      <div className="flex items-center gap-2">
                        {authorAvatar ? (
                          <img src={authorAvatar} alt={authorName} className="w-5 h-5 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                        ) : (
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${getAvatarGradient(authorName)} text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0`}>
                            {authorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <p className="text-[11px] text-slate-500 truncate">
                          {t('social.forum.by')} <strong className="font-semibold text-slate-700">{authorName}</strong>
                        </p>
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
              <button
                onClick={() => setShowCreateComp(true)}
                className="w-full px-3.5 py-2.5 text-xs font-bold text-amber-700 bg-amber-50/70 hover:bg-amber-50 rounded-xl border border-dashed border-amber-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <span>🏆</span>
                <span>{t('social.competitions.createNewChallenge')}</span>
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
                    {currentUser.role === 'admin' && (
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
            </div>
          )}

          {/* TAB: FIND */}
          {activeTab === 'find' && (
            <div className="space-y-3">

              {/* Pending Requests Section */}
              {requests.length > 0 && (
                <div className="mb-4 space-y-2 bg-purple-50/50 p-3 rounded-2xl border border-purple-100">
                  <h3 className="text-[11px] font-extrabold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📬</span>
                    <span>{t('social.friends.requests')} ({requests.length})</span>
                  </h3>
                  {requests.map(({ user, friendshipId, type }) => {
                    const reqAvatar = getUserAvatar(user);
                    return (
                      <div key={friendshipId || user.id} className="bg-white border border-slate-200/80 p-2.5 rounded-xl shadow-2xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {reqAvatar ? (
                            <img src={reqAvatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(user.name)} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {type === 'received' ? t('social.friends.received') : t('social.friends.sent')}
                            </p>
                          </div>
                        </div>
                        {type === 'received' ? (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => handleAccept(friendshipId)} className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer">
                              {t('social.friends.accept')}
                            </button>
                            <button onClick={() => handleReject(friendshipId)} className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-bold rounded-lg text-[11px] transition-colors cursor-pointer">
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleReject(friendshipId)} className="text-[11px] font-bold text-rose-500 hover:underline px-2 py-1 cursor-pointer">
                            {t('social.friends.cancel')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

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
                  {filteredAvailable.map(user => {
                    const uAvatar = getUserAvatar(user);
                    return (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 hover:border-emerald-200 rounded-2xl shadow-2xs transition-all">
                        <div className="flex items-center min-w-0 mr-2">
                          {uAvatar ? (
                            <img src={uAvatar} alt={user.name} className="w-10 h-10 rounded-full object-cover mr-3 border border-slate-200 flex-shrink-0" />
                          ) : (
                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(user.name)} text-white flex items-center justify-center text-sm font-extrabold mr-3 shadow-2xs flex-shrink-0`}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-slate-800 block truncate">{user.name}</span>
                            <span className="text-[10px] text-slate-400">Escritor da Comunidade</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSendRequest(user.id)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer border border-emerald-200/80"
                          title={t('social.friends.add')}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          <span>Adicionar</span>
                        </button>
                      </div>
                    );
                  })}
                  {filteredAvailable.length === 0 && (
                    <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-500 font-semibold text-xs">{t('social.friends.noWritersFound')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* RIGHT SIDE: Content (Chat or Thread) */}
      <div className={`${(!selectedChat && !selectedThread) ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-slate-50 relative border-l border-slate-200`}>

        {/* VIEW: CHAT (DIRECT OR GROUP) */}
        {selectedChat && (
          <>
            <div className="h-20 bg-white border-b border-slate-200 flex items-center px-6 justify-between flex-shrink-0">
              <div className="flex items-center">
                <button onClick={() => setSelectedChat(null)} className="md:hidden mr-3 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {selectedChat.type === 'group' && (activeGuild?.emblemBase64 || activeGuild?.emblemUrl || (selectedChat.target as Guild).emblemBase64 || (selectedChat.target as Guild).emblemUrl) ? (
                  <div className="relative group/emblem">
                    <img
                      src={activeGuild?.emblemBase64 || activeGuild?.emblemUrl || (selectedChat.target as Guild).emblemBase64 || (selectedChat.target as Guild).emblemUrl}
                      alt="Emblem"
                      className={`w-20 h-20 rounded-full object-cover mr-3 border-4 border-white shadow-xl transform transition-transform group-hover/emblem:scale-105 ${isUpdatingEmblem ? 'opacity-50' : ''}`}
                    />
                    {isUpdatingEmblem && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                ) : selectedChat.type === 'direct' && ((selectedChat.target as User).photoBase64 || (selectedChat.target as User).photoURL) ? (
                  <img src={(selectedChat.target as User).photoBase64 || (selectedChat.target as User).photoURL} alt={(selectedChat.target as User).name} className="w-12 h-12 rounded-full object-cover mr-3 border-2 border-teal-200 shadow-sm" />
                ) : (
                  <div className={`w-12 h-12 rounded-full ${selectedChat.type === 'direct' ? 'bg-teal-500' : 'bg-indigo-600'} text-white flex items-center justify-center font-bold text-xl mr-3 shadow-md border-2 border-white`}>
                    {selectedChat.type === 'direct'
                      ? (selectedChat.target as User).name.charAt(0).toUpperCase()
                      : (activeGuild?.name || (selectedChat.target as Guild).name).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {selectedChat.type === 'direct' ? (selectedChat.target as User).name : (activeGuild?.name || (selectedChat.target as Guild).name)}
                  </h3>
                  {selectedChat.type === 'direct' ? (
                    <span className="text-xs text-green-500 flex items-center gap-1 font-medium">{t('social.chat.online')}</span>
                  ) : (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Guilda</span>
                      {activeGuild && isOwnerOrAdmin(activeGuild) && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] text-slate-400 hover:text-indigo-600 underline"
                        >
                          {t('social.guilds.changeEmblem')}
                        </button>
                      )}
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleUpdateEmblem} />
                    </div>
                  )}
                </div>
              </div>

              {selectedChat.type === 'group' && (
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                  <button onClick={() => setGuildSubTab('home')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${guildSubTab === 'home' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>{t('social.tabs.home')}</button>
                  <button onClick={() => setGuildSubTab('chat')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${guildSubTab === 'chat' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>{t('social.tabs.chat')}</button>
                  <button onClick={() => { setGuildSubTab('forum'); if (activeGuild) fetchGuildThreadData(activeGuild.id); }} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${guildSubTab === 'forum' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>{t('social.tabs.forum')}</button>
                  <button onClick={() => setGuildSubTab('agora')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${guildSubTab === 'agora' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>{t('social.tabs.agora')}</button>
                </div>
              )}
            </div>

            {selectedChat.type === 'group' && guildSubTab === 'home' && activeGuild && (
              <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10">
                <div className="max-w-4xl mx-auto space-y-8">

                  {/* HERO SECTION */}
                  <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60"></div>

                    <div className="relative">
                      {(activeGuild.emblemBase64 || activeGuild.emblemUrl) ? (
                        <img
                          src={activeGuild.emblemBase64 || activeGuild.emblemUrl}
                          alt="Emblem"
                          className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-8 border-white shadow-2xl"
                        />
                      ) : (
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-indigo-600 flex items-center justify-center text-white text-5xl font-black shadow-2xl border-8 border-white">
                          {activeGuild.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center md:text-left relative">
                      <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-2 leading-tight">{activeGuild.name}</h2>
                      <p className="text-slate-500 italic mb-6">{activeGuild.description || t('social.guilds.noDescription')}</p>

                      {isOwnerOrAdmin(activeGuild) && (
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                          <button
                            onClick={() => handleResetStats(activeGuild.id)}
                            className="px-4 py-2 bg-rose-50 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-100 transition-colors uppercase tracking-wider"
                          >
                            {t('social.guilds.resetStats')}
                          </button>
                          <button
                            onClick={() => setShowCreateChallenge(true)}
                            className="px-4 py-2 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-200 transition-colors uppercase tracking-wider"
                          >
                            {t('social.guilds.proposeChallenge')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STATS & MEMBERS */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEADERBOARD */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">{t('social.guilds.memberProduction')}</h3>
                        {activeGuild.statsResetDate && (
                          <span className="text-[10px] text-slate-400 font-bold italic">{t('social.guilds.since')} {new Date(activeGuild.statsResetDate!).toLocaleDateString()}</span>
                        )}
                      </div>

                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                        {activeGuild.members.map((memberId, index) => (
                          <div key={memberId} className="flex items-center gap-4 group/member">
                            <span className="text-xs font-black text-slate-300 w-4">{index + 1}</span>
                            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden ring-2 ring-white shadow-sm flex-shrink-0">
                              {getUserPhotoURL(memberId) ? (
                                <img src={getUserPhotoURL(memberId)} alt={getUserName(memberId)} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-xs">
                                  {getUserName(memberId).charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-700 text-sm truncate">{getUserName(memberId)}</p>
                              <p className="text-xs text-indigo-500 font-bold italic">{memberStats[memberId]?.toLocaleString() || 0} {t('social.guilds.words')}</p>
                            </div>

                            {isOwnerOrAdmin(activeGuild) && memberId !== currentUser.id && memberId !== activeGuild.adminId && !activeGuild.adminIds?.includes(memberId) && (
                              <button
                                onClick={() => handlePromoteAdmin(activeGuild.id, memberId)}
                                className="opacity-0 group-hover/member:opacity-100 px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-opacity"
                              >
                                {t('social.guilds.makeAdmin')}
                              </button>
                            )}
                            {activeGuild.adminIds?.includes(memberId) && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">{t('social.guilds.admin')}</span>
                            )}
                            {memberId === activeGuild.adminId && (
                              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold uppercase">{t('social.guilds.leader')}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CHALLENGES */}
                    <div className="space-y-4">
                      <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm px-2 text-center md:text-left">{t('social.guilds.challenges')}</h3>
                      <div className="space-y-3">
                        {activeGuild.challenges?.length ? activeGuild.challenges?.map(challenge => (
                          <div key={challenge.id} className="bg-indigo-600 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-20 transform translate-x-1 translate-y--1 group-hover:scale-110 transition-transform">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <h4 className="font-black text-sm mb-1 uppercase tracking-tight">{challenge.title}</h4>
                            <p className="text-[10px] text-indigo-100 mb-3 leading-tight opacity-80">{challenge.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg">{challenge.target.toLocaleString()} {t('social.competitions.wordType').toUpperCase()}</span>
                              <span className="text-[10px] font-bold text-indigo-200">{challenge.durationDays} {t('social.competitions.daysLabel').toLowerCase()}</span>
                            </div>
                          </div>
                        )) : (
                          <div className="bg-white rounded-3xl p-6 border border-slate-100 text-center shadow-sm">
                            <span className="text-2xl mb-2 block">🎯</span>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t('social.guilds.noActiveChallenges')}</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            )}

            {selectedChat.type === 'group' && guildSubTab === 'chat' && activeGuild && (
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                {/* Guild Summary & Members Production */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl overflow-hidden mb-6 shadow-sm">
                  <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest">{t('social.guilds.guildProduction')}</h3>
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      {Math.round(Object.values(memberStats).reduce((a, b) => a + b, 0)).toLocaleString()} {t('social.guilds.totalWords')}
                    </span>
                  </div>

                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-white">
                    {activeGuild.members.map(memberId => (
                      <div key={memberId} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs ring-2 ring-white overflow-hidden">
                          {getUserPhotoURL(memberId) ? (
                            <img src={getUserPhotoURL(memberId)} alt={getUserName(memberId)} className="w-full h-full object-cover" />
                          ) : (
                            getUserName(memberId).charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-700 truncate">{getUserName(memberId)}</p>
                          <p className="text-[10px] font-medium text-indigo-600">
                            {memberStats[memberId]?.toLocaleString() || 0} <span className="text-slate-400 font-normal">{t('social.guilds.words')}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="px-4 py-2 bg-indigo-50/50 flex items-center gap-2">
                    <div className="p-1 bg-white rounded shadow-xs text-indigo-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-[10px] text-indigo-700 leading-tight italic truncate">
                      {activeGuild.description || t('social.guilds.welcomeMessage')}
                    </p>
                  </div>
                </div>
                {messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        <div className="text-[10px] text-slate-400 mr-2 self-end mb-1 font-medium">{getUserName(msg.senderId)}</div>
                      )}
                      <div className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-3 shadow-sm ${isMe
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                        }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}

            {selectedChat.type === 'group' && guildSubTab === 'forum' && (
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
                              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Pressione <strong>Ctrl + Enter</strong> para enviar</span>
                              <button
                                onClick={handleReplyGuildThread}
                                disabled={!newReplyContent.trim()}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer ml-auto"
                              >
                                <span>{t('social.forum.replyButton')}</span>
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
                          placeholder={t('social.forum.threadTitlePlaceholder')}
                          value={newThreadTitle}
                          onChange={(e) => setNewThreadTitle(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl mb-3 font-bold outline-none border border-transparent focus:border-indigo-200"
                        />
                        <textarea
                          placeholder={t('social.forum.contentPlaceholder')}
                          value={newThreadContent}
                          onChange={(e) => setNewThreadContent(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl mb-4 outline-none border border-transparent focus:border-indigo-200"
                          rows={4}
                        />
                        {forumError && <p className="text-rose-500 text-[10px] mb-2 font-bold uppercase tracking-wider">{forumError}</p>}
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setShowCreateGuildThread(false)} className="px-4 py-2 text-slate-500 font-bold text-xs">{t('social.friends.cancel')}</button>
                          <button onClick={handleCreateGuildThread} className="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl">{t('social.forum.publishButton')}</button>
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

            {selectedChat.type === 'group' && guildSubTab === 'agora' && (
              <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
                <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">{t('social.guilds.guildAgora')}</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                  {t('social.guilds.agoraDescription')}
                </p>
                <div className="flex flex-col gap-4">
                  <button
                    onClick={handleJoinAudio}
                    className={`px-8 py-3 ${audioPermission === 'granted' ? 'bg-emerald-600' : 'bg-indigo-600'} text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:scale-105 transition-transform flex items-center gap-3`}
                  >
                    {audioPermission === 'granted' ? (
                      <>
                        <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                        {t('social.guilds.connected')}
                      </>
                    ) : t('social.guilds.joinRoom')}
                  </button>

                  {audioPermission === 'granted' && (
                    <button
                      onClick={handleStopAudio}
                      className="px-8 py-3 bg-rose-100 text-rose-600 font-bold rounded-2xl hover:bg-rose-200 transition-colors uppercase text-xs tracking-widest"
                    >
                      {t('social.guilds.stopAudio')}
                    </button>
                  )}
                </div>
                <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('social.guilds.restrictedAccess')}</p>
              </div>
            )}

            {selectedChat.type === 'direct' && (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                  {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-3 shadow-sm ${isMe
                          ? 'bg-teal-500 text-white rounded-tr-none'
                          : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                          }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-teal-100' : 'text-slate-400'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </>
            )}

            {(selectedChat.type === 'direct' || (selectedChat.type === 'group' && guildSubTab === 'chat')) && (
              <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('social.chat.typeMessage')}
                    className="flex-1 bg-slate-100 border-transparent focus:bg-white border focus:border-indigo-400 rounded-xl px-4 py-3 outline-none transition-all"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className={`${selectedChat.type === 'direct' ? 'bg-teal-500 hover:bg-teal-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-xl px-5 py-3 font-medium transition-colors disabled:opacity-50 shadow-md shadow-slate-100`}>
                    {t('social.chat.send')}
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
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Pressione <strong>Ctrl + Enter</strong> para enviar</span>
                      <button
                        onClick={handleReplyThread}
                        disabled={!newReplyContent.trim()}
                        className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer ml-auto"
                      >
                        <span>{t('social.forum.replyButton')}</span>
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
          <div className="flex-1 overflow-y-auto bg-slate-50/70 p-6 sm:p-10 flex flex-col justify-center">
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
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-800 transition-all"
                  placeholder={t('social.guilds.guildName')}
                  value={newGuildName}
                  onChange={(e) => setNewGuildName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Descrição ou Lema
                </label>
                <textarea
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm h-20 resize-none text-slate-700 transition-all"
                  placeholder={t('social.guilds.guildDescription')}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
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
                  disabled={!newGuildName.trim()}
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
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-800 transition-all"
                  placeholder={t('social.forum.threadTitlePlaceholder')}
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
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
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm h-32 resize-none text-slate-700 leading-relaxed transition-all"
                  placeholder={t('social.forum.contentPlaceholder')}
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
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
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
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
                  Título do Desafio
                </label>
                <input
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-semibold text-slate-800 transition-all"
                  placeholder={t('social.competitions.challengeNamePlaceholder')}
                  value={newCompTitle}
                  onChange={(e) => setNewCompTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Regras & Descrição
                </label>
                <textarea
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm text-slate-700 resize-none transition-all"
                  placeholder={t('social.competitions.rulesDescription')}
                  value={newCompDesc}
                  onChange={(e) => setNewCompDesc(e.target.value)}
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
                  className="w-full px-3.5 py-2.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-bold text-emerald-700 transition-all"
                  value={newCompTarget}
                  onChange={(e) => setNewCompTarget(Number(e.target.value))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowCreateComp(false)}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {t('social.friends.cancel')}
                </button>
                <button
                  onClick={handleCreateCompetition}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                >
                  {t('social.competitions.launchChallenge')}
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

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('social.guilds.challengeNameLabel')}</label>
                <input
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-bold"
                  placeholder={t('social.guilds.challengeNamePlaceholder')}
                  value={newChallengeTitle}
                  onChange={(e) => setNewChallengeTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('social.guilds.shortDescriptionLabel')}</label>
                <textarea
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm h-24 resize-none leading-relaxed"
                  placeholder={t('social.guilds.shortDescriptionPlaceholder')}
                  value={newChallengeDesc}
                  onChange={(e) => setNewChallengeDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('social.guilds.wordTarget')}</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-black text-indigo-600"
                    value={newChallengeTarget}
                    onChange={(e) => setNewChallengeTarget(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('social.guilds.durationDays')}</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-black text-indigo-600"
                    value={newChallengeDuration}
                    onChange={(e) => setNewChallengeDuration(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateChallenge(false)}
                className="flex-1 py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors"
              >
                {t('social.friends.cancel')}
              </button>
              <button
                onClick={handleCreateChallenge}
                className="flex-[2] py-3 bg-indigo-600 text-white font-black text-xs rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-widest"
              >
                {t('social.guilds.launchChallenge')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
