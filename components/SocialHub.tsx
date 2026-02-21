


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
  updateGuildEmblem,
  getGuildThreads,
  createGuildThread,
  getGuildReplies,
  replyToGuildThread,
  promoteMemberToAdmin,
  resetGuildStats,
  createGuildChallenge,
  deleteGuildForumThread,
  deleteGuildForumReply
} from '../services/socialService';
import { getSessions } from '../services/sessionService';
import { getAllUsers } from '../services/authService';

interface SocialHubProps {
  currentUser: User;
  onExit: () => void;
}

export const SocialHub: React.FC<SocialHubProps> = ({ currentUser, onExit }) => {
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
  const [selectedGuildMembers, setSelectedGuildMembers] = useState<string[]>([]);
  const [guildSubTab, setGuildSubTab] = useState<'home' | 'chat' | 'forum' | 'audio'>('home');
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
      alert("Solicitação enviada!");
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

  // --- Handlers: Chat ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    if (selectedChat.type === 'direct') {
      const user = selectedChat.target as User;
      await sendMessage(currentUser.id, user.id, newMessage);
      setMessages(await getConversation(currentUser.id, user.id));
    } else {
      const guild = selectedChat.target as Guild;
      await sendGroupMessage(currentUser.id, guild.id, newMessage);
      setMessages(await getGroupMessages(guild.id));
    }
    setNewMessage('');
  };

  // --- Handlers: Guilds ---
  const handleCreateGuild = async () => {
    if (!newGuildName.trim() || selectedGuildMembers.length === 0) return;
    await createGuild(newGuildName, currentUser.id, selectedGuildMembers, newGroupDesc);
    setShowCreateGuild(false);
    setNewGuildName('');
    setNewGroupDesc('');
    setSelectedGuildMembers([]);
    await refreshData();
  };

  const handleUpdateEmblem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedChat?.type === 'group') {
      try {
        setIsUpdatingEmblem(true);
        const guild = selectedChat.target as Guild;
        const downloadURL = await updateGuildEmblem(guild.id, file);

        // Update local state immediately
        const updatedGuild = { ...guild, emblemUrl: downloadURL };
        setGuilds(prev => prev.map(g => g.id === guild.id ? updatedGuild : g));
        setSelectedChat({ ...selectedChat, target: updatedGuild });

        await refreshData();
      } catch (error) {
        console.error("Erro ao atualizar brasão:", error);
        alert("Erro ao enviar brasão. Tente novamente.");
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
    if (selectedChat?.type === 'group' && newThreadTitle.trim()) {
      try {
        setForumError(null);
        const guild = selectedChat.target as Guild;
        await createGuildThread(guild.id, currentUser.id, newThreadTitle, newThreadContent);
        setNewThreadTitle('');
        setNewThreadContent('');
        setShowCreateGuildThread(false);
        await fetchGuildThreadData(guild.id);
        await refreshData();
      } catch (error) {
        setForumError("Erro ao publicar no fórum.");
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
      setForumError("Título e conteúdo são obrigatórios.");
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
      setForumError("Erro ao criar tópico no fórum.");
    }
  };

  const handleJoinAudio = async () => {
    try {
      setAudioPermission('pending');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
      setAudioPermission('granted');
      alert("Microfone autorizado! Conectando à sala...");
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      setAudioPermission('denied');
      alert("Erro ao acessar microfone. Certifique-se de dar permissão no navegador.");
    }
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
    if (confirm("Tem certeza que deseja zerar as estatísticas da guilda? Isso não apagará as sessões individuais, mas a contagem da guilda recomeçará de hoje.")) {
      await resetGuildStats(guildId);
      await refreshData();
    }
  };

  const handlePromoteAdmin = async (guildId: string, userId: string) => {
    await promoteMemberToAdmin(guildId, userId);
    await refreshData();
    alert("Membro promovido a administrador!");
  };

  const handleCreateChallenge = async () => {
    if (!newChallengeTitle.trim() || !selectedChat || selectedChat.type !== 'group') return;
    const guild = selectedChat.target as Guild;
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
    if (confirm("Excluir este tópico permanentemente?")) {
      await deleteGuildForumThread(threadId);
      if (selectedChat?.type === 'group') {
        const guild = selectedChat.target as Guild;
        await fetchGuildThreadData(guild.id);
      }
    }
  };

  const handleDeleteGuildReply = async (replyId: string) => {
    if (confirm("Excluir esta resposta?")) {
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
    if (confirm("Tem certeza que deseja excluir este tópico?")) {
      await deleteForumThread(threadId);
      if (selectedThread?.id === threadId) setSelectedThread(null);
      await refreshData();
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (confirm("Tem certeza que deseja excluir esta resposta?")) {
      await deleteForumReply(replyId);
      if (selectedThread) {
        setThreadReplies(await getForumReplies(selectedThread.id));
      }
    }
  };

  const handleDeleteCompetition = async (compId: string) => {
    if (confirm("Tem certeza que deseja excluir este desafio?")) {
      await deleteCompetition(compId);
      await refreshData();
    }
  };

  // Helper to get User Name
  const getUserName = (userId: string) => {
    return allUsers.find(u => u.id === userId)?.name || 'Usuário';
  };

  const getUserPhotoURL = (userId: string) => {
    return allUsers.find(u => u.id === userId)?.photoURL;
  };

  const filteredAvailable = availableUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden animate-fade-in">

      {/* LEFT SIDEBAR: Navigation & Lists */}
      <div className={`${(selectedChat || selectedThread) ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 bg-white border-r border-slate-200 h-full`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Comunidade
            </h2>
            <button onClick={onExit} className="text-xs text-slate-500 hover:text-slate-800 font-medium">Voltar</button>
          </div>

          <div className="grid grid-cols-5 bg-slate-200 rounded-lg p-1 gap-1">
            <button onClick={() => { setActiveTab('friends'); setSelectedChat(null); setSelectedThread(null); }} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'friends' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Amigos</button>
            <button onClick={() => { setActiveTab('guilds'); setSelectedChat(null); setSelectedThread(null); }} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'guilds' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Guildas</button>
            <button onClick={() => { setActiveTab('forum'); setSelectedChat(null); setSelectedThread(null); }} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'forum' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Fórum</button>
            <button onClick={() => { setActiveTab('competitions'); setSelectedChat(null); setSelectedThread(null); }} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'competitions' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Desafios</button>
            <button onClick={() => { setActiveTab('find'); setSelectedChat(null); setSelectedThread(null); }} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'find' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Buscar</button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-2">

          {/* TAB: FRIENDS */}
          {activeTab === 'friends' && (
            <div className="space-y-1">
              <div className="mb-2">
                <button onClick={() => setActiveTab('find')} className="w-full text-left px-3 py-2 text-xs text-teal-600 hover:bg-teal-50 rounded-lg border border-dashed border-teal-200 flex items-center justify-center">
                  + Adicionar Amigo
                </button>
                {requests.length > 0 && (
                  <div className="mt-2 text-xs bg-indigo-50 text-indigo-700 p-2 rounded-lg cursor-pointer" onClick={() => setActiveTab('find')}>
                    {requests.length} Solicitações Pendentes (Ver em Buscar)
                  </div>
                )}
              </div>
              {friends.map(({ user }) => (
                <button
                  key={user.id}
                  onClick={() => { setSelectedChat({ type: 'direct', target: user }); setSelectedThread(null); }}
                  className={`w-full flex items-center p-3 rounded-xl transition-colors ${selectedChat?.target.id === user.id ? 'bg-teal-50 border border-teal-100' : 'hover:bg-slate-50'}`}
                >
                  <div className={`w-10 h-10 rounded-full ${user.photoURL ? '' : 'bg-slate-200'} flex items-center justify-center text-slate-600 font-bold mr-3 overflow-hidden border border-slate-100`}>
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{user.name}</div>
                    <div className="text-xs text-slate-500 truncate">Clique para conversar</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* TAB: GUILDS */}
          {activeTab === 'guilds' && (
            <div className="space-y-2">
              <button onClick={() => setShowCreateGuild(true)} className="w-full text-left px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg border border-dashed border-indigo-200 flex items-center justify-center">
                + Fundar Nova Guilda
              </button>
              {guilds.map(guild => (
                <button
                  key={guild.id}
                  onClick={() => {
                    setSelectedChat({ type: 'group', target: guild });
                    setSelectedThread(null);
                    setGuildSubTab('chat');
                    fetchGuildThreadData(guild.id);
                  }}
                  className={`w-full flex items-center p-3 rounded-xl transition-colors ${selectedChat?.target.id === guild.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}`}
                >
                  {guild.emblemUrl ? (
                    <img src={guild.emblemUrl} alt="Emblem" className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-indigo-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mr-3 border-2 border-white shadow-sm">
                      {guild.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{guild.name}</div>
                    <div className="text-xs text-slate-500 truncate">{guild.members.length} membros</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* TAB: FORUM */}
          {activeTab === 'forum' && (
            <div className="space-y-2">
              <button onClick={() => setShowCreateThread(true)} className="w-full text-left px-3 py-2 text-xs text-teal-600 hover:bg-teal-50 rounded-lg border border-dashed border-teal-200 flex items-center justify-center">
                + Novo Tópico
              </button>
              {threads.map(thread => (
                <div key={thread.id} className="relative group">
                  <button
                    onClick={() => { setSelectedThread(thread); setSelectedChat(null); }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${selectedThread?.id === thread.id ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400">{thread.category}</span>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">{thread.title}</h3>
                    <p className="text-xs text-slate-500 truncate">por {getUserName(thread.authorId)}</p>
                  </button>
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={(e) => handleDeleteThread(e, thread.id)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Excluir Tópico"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB: COMPETITIONS */}
          {activeTab === 'competitions' && (
            <div className="space-y-3">
              <button onClick={() => setShowCreateComp(true)} className="w-full text-left px-3 py-2 text-xs text-teal-600 hover:bg-teal-50 rounded-lg border border-dashed border-teal-200 flex items-center justify-center">
                + Criar Novo Desafio
              </button>
              {competitions.map(comp => {
                const isParticipant = comp.participants.includes(currentUser.id);
                return (
                  <div key={comp.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative group">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800 text-sm pr-6">{comp.title}</h3>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase">{comp.type === 'word_count' ? 'Palavras' : 'Streak'}</span>
                    </div>
                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteCompetition(comp.id)}
                        className="absolute top-3 right-12 p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Excluir Desafio"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    <p className="text-xs text-slate-500 mb-3">{comp.description}</p>

                    {isParticipant ? (
                      <div className="space-y-2">
                        {comp.participants.map(pid => {
                          const stat = compStats[comp.id]?.[pid] || { current: 0, percent: 0 };
                          const { current, percent } = stat;
                          return (
                            <div key={pid} className="text-xs">
                              <div className="flex justify-between mb-1">
                                <span>{getUserName(pid)}</span>
                                <span>{current} / {comp.target}</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-400" style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <button onClick={() => handleJoinCompetition(comp.id)} className="w-full py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900">
                        Entrar no Desafio
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* TAB: FIND */}
          {activeTab === 'find' && (
            <div className="p-2">

              {/* Pending Requests Section */}
              {requests.length > 0 && (
                <div className="mb-4 space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase">Solicitações ({requests.length})</h3>
                  {requests.map(({ user, friendshipId, type }) => (
                    <div key={user.id} className="bg-white border border-slate-200 p-2 rounded-lg shadow-sm flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">{user.name} <span className="text-xs font-normal text-slate-400">({type === 'received' ? 'recebido' : 'enviado'})</span></span>
                      {type === 'received' ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleAccept(friendshipId)} className="p-1 bg-teal-100 text-teal-700 rounded text-xs">Aceitar</button>
                          <button onClick={() => handleReject(friendshipId)} className="p-1 bg-slate-100 text-slate-700 rounded text-xs">X</button>
                        </div>
                      ) : (
                        <button onClick={() => handleReject(friendshipId)} className="text-xs text-rose-500">Cancelar</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <input
                type="text"
                placeholder="Buscar escritor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-200 mb-4"
              />

              <div className="space-y-2">
                {filteredAvailable.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold mr-3">
                        {user.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{user.name}</span>
                    </div>
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="p-1.5 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100"
                      title="Adicionar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
                {filteredAvailable.length === 0 && (
                  <p className="text-center text-slate-400 text-xs mt-4">Nenhum escritor encontrado.</p>
                )}
              </div>
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
                {selectedChat.type === 'group' && (selectedChat.target as Guild).emblemUrl ? (
                  <div className="relative group/emblem">
                    <img
                      src={(selectedChat.target as Guild).emblemUrl}
                      alt="Emblem"
                      className={`w-20 h-20 rounded-full object-cover mr-3 border-4 border-white shadow-xl transform transition-transform group-hover/emblem:scale-105 ${isUpdatingEmblem ? 'opacity-50' : ''}`}
                    />
                    {isUpdatingEmblem && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                ) : selectedChat.type === 'direct' && (selectedChat.target as User).photoURL ? (
                  <img src={(selectedChat.target as User).photoURL} alt={(selectedChat.target as User).name} className="w-12 h-12 rounded-full object-cover mr-3 border-2 border-teal-200 shadow-sm" />
                ) : (
                  <div className={`w-12 h-12 rounded-full ${selectedChat.type === 'direct' ? 'bg-teal-500' : 'bg-indigo-600'} text-white flex items-center justify-center font-bold text-xl mr-3 shadow-md border-2 border-white`}>
                    {selectedChat.type === 'direct'
                      ? (selectedChat.target as User).name.charAt(0).toUpperCase()
                      : (selectedChat.target as Guild).name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {selectedChat.type === 'direct' ? (selectedChat.target as User).name : (selectedChat.target as Guild).name}
                  </h3>
                  {selectedChat.type === 'direct' ? (
                    <span className="text-xs text-green-500 flex items-center gap-1 font-medium">Online</span>
                  ) : (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Guilda</span>
                      {(selectedChat.target as Guild).adminId === currentUser.id && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] text-slate-400 hover:text-indigo-600 underline"
                        >
                          Mudar Brasão
                        </button>
                      )}
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpdateEmblem} />
                    </div>
                  )}
                </div>
              </div>

              {selectedChat.type === 'group' && (
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                  <button onClick={() => setGuildSubTab('home')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${guildSubTab === 'home' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Home</button>
                  <button onClick={() => setGuildSubTab('chat')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${guildSubTab === 'chat' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Chat</button>
                  <button onClick={() => { setGuildSubTab('forum'); fetchGuildThreadData((selectedChat.target as Guild).id); }} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${guildSubTab === 'forum' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Fórum</button>
                  <button onClick={() => setGuildSubTab('audio')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${guildSubTab === 'audio' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Áudio</button>
                </div>
              )}
            </div>

            {selectedChat.type === 'group' && guildSubTab === 'home' && (
              <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10">
                <div className="max-w-4xl mx-auto space-y-8">

                  {/* HERO SECTION */}
                  <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60"></div>

                    <div className="relative">
                      {(selectedChat.target as Guild).emblemUrl ? (
                        <img
                          src={(selectedChat.target as Guild).emblemUrl}
                          alt="Emblem"
                          className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-8 border-white shadow-2xl"
                        />
                      ) : (
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-indigo-600 flex items-center justify-center text-white text-5xl font-black shadow-2xl border-8 border-white">
                          {(selectedChat.target as Guild).name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center md:text-left relative">
                      <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-2 leading-tight">{(selectedChat.target as Guild).name}</h2>
                      <p className="text-slate-500 italic mb-6">{(selectedChat.target as Guild).description || "Nenhuma descrição definida para esta guilda."}</p>

                      {isOwnerOrAdmin(selectedChat.target as Guild) && (
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                          <button
                            onClick={() => handleResetStats((selectedChat.target as Guild).id)}
                            className="px-4 py-2 bg-rose-50 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-100 transition-colors uppercase tracking-wider"
                          >
                            Zerar Estatísticas
                          </button>
                          <button
                            onClick={() => setShowCreateChallenge(true)}
                            className="px-4 py-2 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-200 transition-colors uppercase tracking-wider"
                          >
                            Propor Desafio
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
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Produção dos Membros</h3>
                        {(selectedChat.target as Guild).statsResetDate && (
                          <span className="text-[10px] text-slate-400 font-bold italic">Desde: {new Date((selectedChat.target as Guild).statsResetDate!).toLocaleDateString()}</span>
                        )}
                      </div>

                      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                        {(selectedChat.target as Guild).members.map((memberId, index) => (
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
                              <p className="text-xs text-indigo-500 font-bold italic">{memberStats[memberId]?.toLocaleString() || 0} palavras</p>
                            </div>

                            {isOwnerOrAdmin(selectedChat.target as Guild) && memberId !== currentUser.id && memberId !== (selectedChat.target as Guild).adminId && !(selectedChat.target as Guild).adminIds?.includes(memberId) && (
                              <button
                                onClick={() => handlePromoteAdmin((selectedChat.target as Guild).id, memberId)}
                                className="opacity-0 group-hover/member:opacity-100 px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-opacity"
                              >
                                Tornar Admin
                              </button>
                            )}
                            {(selectedChat.target as Guild).adminIds?.includes(memberId) && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">Admin</span>
                            )}
                            {memberId === (selectedChat.target as Guild).adminId && (
                              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold uppercase">Líder</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CHALLENGES */}
                    <div className="space-y-4">
                      <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm px-2 text-center md:text-left">Desafios</h3>
                      <div className="space-y-3">
                        {(selectedChat.target as Guild).challenges?.length ? (selectedChat.target as Guild).challenges?.map(challenge => (
                          <div key={challenge.id} className="bg-indigo-600 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-20 transform translate-x-1 translate-y--1 group-hover:scale-110 transition-transform">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <h4 className="font-black text-sm mb-1 uppercase tracking-tight">{challenge.title}</h4>
                            <p className="text-[10px] text-indigo-100 mb-3 leading-tight opacity-80">{challenge.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg">{challenge.target.toLocaleString()} PALAVRAS</span>
                              <span className="text-[10px] font-bold text-indigo-200">{challenge.durationDays} dias</span>
                            </div>
                          </div>
                        )) : (
                          <div className="bg-white rounded-3xl p-6 border border-slate-100 text-center shadow-sm">
                            <span className="text-2xl mb-2 block">🎯</span>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhum desafio ativo</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            )}

            {selectedChat.type === 'group' && guildSubTab === 'chat' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                {/* Guild Summary & Members Production */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl overflow-hidden mb-6 shadow-sm">
                  <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest">Produção da Guilda</h3>
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      {Math.round(Object.values(memberStats).reduce((a, b) => a + b, 0)).toLocaleString()} Palavras Totais
                    </span>
                  </div>

                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-white">
                    {(selectedChat.target as Guild).members.map(memberId => (
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
                            {memberStats[memberId]?.toLocaleString() || 0} <span className="text-slate-400 font-normal">palavras</span>
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
                      {(selectedChat.target as Guild).description || "Bem-vindos à nossa guilda! Juntos somos mais fortes."}
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
                  <div className="flex flex-col h-full bg-white animate-slide-in">
                    <div className="p-6 border-b border-slate-100">
                      <button onClick={() => setSelectedGuildThread(null)} className="text-xs text-indigo-600 font-bold mb-4 flex items-center gap-1">
                        ← Voltar para o Fórum da Guilda
                      </button>
                      <h3 className="text-xl font-black text-slate-800 mb-2">{selectedGuildThread.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                        {selectedGuildThread.content}
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {guildReplies.map(reply => (
                        <div key={reply.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative group">
                          {selectedChat?.type === 'group' && isOwnerOrAdmin(selectedChat.target as Guild) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteGuildReply(reply.id); }}
                              className="absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                          <div className="flex justify-between mb-1">
                            <span className="font-bold text-xs text-slate-700">{getUserName(reply.authorId)}</span>
                            <span className="text-[10px] text-slate-400">{new Date(reply.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-slate-600">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t border-slate-100">
                      <div className="flex gap-2">
                        <textarea
                          placeholder="Sua resposta..."
                          value={newReplyContent}
                          onChange={(e) => setNewReplyContent(e.target.value)}
                          className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white border border-transparent focus:border-indigo-200"
                          rows={1}
                        />
                        <button onClick={handleReplyGuildThread} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Responder</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">Fórum da Guilda</h3>
                      <button onClick={() => setShowCreateGuildThread(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                        + Novo Tópico Interno
                      </button>
                    </div>

                    {showCreateGuildThread && (
                      <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-xl mb-8 animate-fade-in">
                        <input
                          type="text"
                          placeholder="Título do Tópico"
                          value={newThreadTitle}
                          onChange={(e) => setNewThreadTitle(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl mb-3 font-bold outline-none border border-transparent focus:border-indigo-200"
                        />
                        <textarea
                          placeholder="Conteúdo..."
                          value={newThreadContent}
                          onChange={(e) => setNewThreadContent(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl mb-4 outline-none border border-transparent focus:border-indigo-200"
                          rows={4}
                        />
                        {forumError && <p className="text-rose-500 text-[10px] mb-2 font-bold uppercase tracking-wider">{forumError}</p>}
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setShowCreateGuildThread(false)} className="px-4 py-2 text-slate-500 font-bold text-xs">Cancelar</button>
                          <button onClick={handleCreateGuildThread} className="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl">Publicar</button>
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
                              <span className="text-[10px] text-slate-400">por {getUserName(thread.authorId)} • {new Date(thread.createdAt).toLocaleDateString()}</span>
                            </div>
                          </button>
                          {selectedChat?.type === 'group' && isOwnerOrAdmin(selectedChat.target as Guild) && (
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
                          <p className="text-slate-400 text-sm font-medium">Nenhum tópico no fórum da guilda ainda.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedChat.type === 'group' && guildSubTab === 'audio' && (
              <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
                <div className="w-32 h-32 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Sala de Voz da Guilda</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                  Conecte-se com seus companheiros de guilda em tempo real para discutir estratégias de escrita.
                </p>
                <button
                  onClick={handleJoinAudio}
                  className={`px-8 py-3 ${audioPermission === 'granted' ? 'bg-emerald-600' : 'bg-indigo-600'} text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:scale-105 transition-transform flex items-center gap-3`}
                >
                  {audioPermission === 'granted' ? (
                    <>
                      <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                      CONECTADO
                    </>
                  ) : 'ENTRAR NA SALA'}
                </button>
                <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Acesso restrito aos membros da guilda</p>
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

            {guildSubTab === 'chat' && (
              <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-slate-100 border-transparent focus:bg-white border focus:border-indigo-400 rounded-xl px-4 py-3 outline-none transition-all"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className={`${selectedChat.type === 'direct' ? 'bg-teal-500 hover:bg-teal-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-xl px-5 py-3 font-medium transition-colors disabled:opacity-50 shadow-md shadow-slate-100`}>
                    Enviar
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {/* VIEW: THREAD */}
        {selectedThread && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-200 bg-white">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <button onClick={() => setSelectedThread(null)} className="md:hidden text-xs text-slate-500 mb-2">← Voltar</button>
                  <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">{selectedThread.category}</span>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedThread.title}</h2>
                </div>
                {currentUser.role === 'admin' && (
                  <button
                    onClick={(e) => handleDeleteThread(e, selectedThread.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Excluir Tópico"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{getUserName(selectedThread.authorId).charAt(0)}</div>
                <span className="text-xs text-slate-500">Postado por {getUserName(selectedThread.authorId)} em {new Date(selectedThread.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="max-h-60 overflow-y-auto pr-2">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap p-4 bg-slate-50 rounded-lg">{selectedThread.content}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase">Respostas</h3>
              {threadReplies.map(reply => (
                <div key={reply.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative group">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-sm text-slate-700">{getUserName(reply.authorId)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{new Date(reply.createdAt).toLocaleDateString()}</span>
                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteReply(reply.id)}
                          className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Excluir Resposta"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{reply.content}</p>
                </div>
              ))}
              {threadReplies.length === 0 && <p className="text-slate-400 text-sm italic">Seja o primeiro a responder.</p>}
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex gap-2">
                <textarea
                  value={newReplyContent}
                  onChange={(e) => setNewReplyContent(e.target.value)}
                  placeholder="Adicionar uma resposta..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-teal-200 outline-none resize-none"
                  rows={2}
                />
                <button onClick={handleReplyThread} disabled={!newReplyContent.trim()} className="bg-slate-800 text-white px-4 rounded-lg text-sm font-bold hover:bg-slate-900 disabled:opacity-50">
                  Responder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!selectedChat && !selectedThread) && (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-8">
            <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-slate-600 mb-2">Hub Social</h3>
            <p className="max-w-md text-center">Selecione uma categoria ao lado para interagir.</p>
          </div>
        )}
      </div>

      {/* MODAL: CREATE GUILD */}
      {showCreateGuild && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-fade-in border-2 border-indigo-100">
            <h3 className="font-black text-xl mb-4 text-indigo-900 uppercase tracking-tight">Fundar Guilda</h3>
            <input
              className="w-full mb-3 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none border-slate-200"
              placeholder="Nome da Guilda"
              value={newGuildName}
              onChange={(e) => setNewGuildName(e.target.value)}
            />
            <textarea
              className="w-full mb-4 px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none border-slate-200 text-sm h-24 resize-none"
              placeholder="Descrição da Guilda..."
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
            />
            <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Selecionar Fundadores:</p>
            <div className="max-h-40 overflow-y-auto mb-6 border rounded-xl p-3 bg-slate-50 space-y-2">
              {friends.map(({ user }) => (
                <div key={user.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    checked={selectedGuildMembers.includes(user.id)}
                    onChange={() => toggleGuildMember(user.id)}
                  />
                  <span className="text-sm font-medium text-slate-700">{user.name}</span>
                </div>
              ))}
              {friends.length === 0 && <p className="text-[10px] text-slate-400 italic">Você precisa de amigos para fundar uma guilda.</p>}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreateGuild(false)} className="px-4 py-2 text-slate-500 font-bold text-xs uppercase transition-colors hover:text-slate-800">Cancelar</button>
              <button onClick={handleCreateGuild} className="px-6 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Fundar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE THREAD */}
      {showCreateThread && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4">Novo Tópico no Fórum</h3>
            <input
              className="w-full mb-3 px-3 py-2 border rounded-lg"
              placeholder="Título do Tópico"
              value={newThreadTitle}
              onChange={(e) => setNewThreadTitle(e.target.value)}
            />
            <select
              className="w-full mb-3 px-3 py-2 border rounded-lg bg-white"
              value={newThreadCategory}
              onChange={(e) => setNewThreadCategory(e.target.value as any)}
            >
              <option>Geral</option>
              <option>Dúvidas</option>
              <option>Inspiração</option>
              <option>Feedback</option>
            </select>
            <textarea
              className="w-full mb-4 px-3 py-2 border rounded-lg h-32 resize-none"
              placeholder="Conteúdo..."
              value={newThreadContent}
              onChange={(e) => setNewThreadContent(e.target.value)}
            />
            {forumError && <p className="text-rose-500 text-xs mb-3 font-bold">{forumError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateThread(false)} className="px-3 py-1.5 text-slate-500">Cancelar</button>
              <button onClick={handleCreateThread} className="px-3 py-1.5 bg-teal-500 text-white rounded-lg">Publicar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE COMPETITION */}
      {showCreateComp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span className="text-xl">🏆</span> Criar Desafio Literário
            </h3>
            <input
              className="w-full mb-3 px-3 py-2 border rounded-lg"
              placeholder="Nome do Desafio"
              value={newCompTitle}
              onChange={(e) => setNewCompTitle(e.target.value)}
            />
            <textarea
              className="w-full mb-3 px-3 py-2 border rounded-lg"
              placeholder="Regras / Descrição"
              value={newCompDesc}
              onChange={(e) => setNewCompDesc(e.target.value)}
              rows={2}
            />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-slate-500">Tipo</label>
                <select className="w-full border rounded-lg p-2" value={newCompType} onChange={(e) => setNewCompType(e.target.value as any)}>
                  <option value="word_count">Contagem de Palavras</option>
                  <option value="days_streak">Dias de Frequência</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Duração (Dias)</label>
                <input type="number" className="w-full border rounded-lg p-2" value={newCompDuration} onChange={(e) => setNewCompDuration(Number(e.target.value))} />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500">Meta ({newCompType === 'word_count' ? 'Palavras' : 'Dias'})</label>
              <input type="number" className="w-full border rounded-lg p-2" value={newCompTarget} onChange={(e) => setNewCompTarget(Number(e.target.value))} />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateComp(false)} className="px-3 py-1.5 text-slate-500">Cancelar</button>
              <button onClick={handleCreateCompetition} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg">Lançar Desafio</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE GUILD CHALLENGE */}
      {showCreateChallenge && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-fade-in border border-indigo-50">
            <h3 className="font-black text-2xl mb-6 text-indigo-900 uppercase tracking-tighter flex items-center gap-3">
              <span className="p-2 bg-indigo-100 rounded-xl text-xl">🎯</span> Propor Desafio
            </h3>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nome do Desafio</label>
                <input
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-bold"
                  placeholder="Ex: Maratona de Inverno"
                  value={newChallengeTitle}
                  onChange={(e) => setNewChallengeTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Descrição Curta</label>
                <textarea
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm h-24 resize-none leading-relaxed"
                  placeholder="Explique o que os membros devem fazer..."
                  value={newChallengeDesc}
                  onChange={(e) => setNewChallengeDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Meta de Palavras</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-black text-indigo-600"
                    value={newChallengeTarget}
                    onChange={(e) => setNewChallengeTarget(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Duração (Dias)</label>
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
                Cancelar
              </button>
              <button
                onClick={handleCreateChallenge}
                className="flex-[2] py-3 bg-indigo-600 text-white font-black text-xs rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-widest"
              >
                Lançar Desafio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
