


import React, { useState, useEffect, useRef } from 'react';
import { User, Message, Group, ForumThread, ForumReply, Competition, WritingSession } from '../types';
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
  joinCompetition
} from '../services/socialService';
import { getSessions } from '../services/sessionService';
import { getAllUsers } from '../services/authService';

interface SocialHubProps {
  currentUser: User;
  onExit: () => void;
}

export const SocialHub: React.FC<SocialHubProps> = ({ currentUser, onExit }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'groups' | 'forum' | 'competitions' | 'find'>('friends');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Friends Data
  const [friends, setFriends] = useState<{ user: User, friendshipId: string }[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Group Data
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  
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
  const [newCompType, setNewCompType] = useState<'word_count'|'days_streak'>('word_count');
  const [newCompTarget, setNewCompTarget] = useState(1000);
  const [newCompDuration, setNewCompDuration] = useState(7);

  // Chat State (Direct & Group)
  const [selectedChat, setSelectedChat] = useState<{ type: 'direct'|'group', target: User | Group } | null>(null);
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
    const interval = setInterval(refreshChatIfActive, 3000);
    return () => clearInterval(interval);
  }, [selectedChat, selectedThread]);

  const refreshData = async () => {
    setFriends(await getFriendsList(currentUser.id));
    setRequests(await getPendingRequests(currentUser.id));
    setAvailableUsers(await getAvailableUsers(currentUser.id));
    setGroups(await getUserGroups(currentUser.id));
    setThreads(await getForumThreads());
    
    const comps = await getCompetitions();
    setCompetitions(comps);

    // Calculate stats asynchronously
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
          const group = selectedChat.target as Group;
          convo = await getGroupMessages(group.id);
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
          const group = selectedChat.target as Group;
          const convo = await getGroupMessages(group.id);
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
      const group = selectedChat.target as Group;
      await sendGroupMessage(currentUser.id, group.id, newMessage);
      setMessages(await getGroupMessages(group.id));
    }
    setNewMessage('');
  };

  // --- Handlers: Groups ---
  const handleCreateGroup = async () => {
    if (!newGroupName || selectedGroupMembers.length === 0) return;
    await createGroup(newGroupName, currentUser.id, selectedGroupMembers);
    setShowCreateGroup(false);
    setNewGroupName('');
    setSelectedGroupMembers([]);
    await refreshData();
  };

  const toggleGroupMember = (userId: string) => {
    setSelectedGroupMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // --- Handlers: Forum ---
  const handleCreateThread = async () => {
    if (!newThreadTitle || !newThreadContent) return;
    await createForumThread(currentUser.id, newThreadTitle, newThreadContent, newThreadCategory);
    setShowCreateThread(false);
    setNewThreadTitle('');
    setNewThreadContent('');
    await refreshData();
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

  const handleJoinCompetition = async (compId: string) => {
    await joinCompetition(compId, currentUser.id);
    await refreshData();
  };

  // Helper to get User Name
  const getUserName = (id: string) => {
    if (id === currentUser.id) return 'Você';
    return allUsers.find(u => u.id === id)?.name || 'Desconhecido';
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
             <button onClick={() => {setActiveTab('friends'); setSelectedChat(null); setSelectedThread(null);}} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'friends' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Amigos</button>
             <button onClick={() => {setActiveTab('groups'); setSelectedChat(null); setSelectedThread(null);}} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'groups' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Grupos</button>
             <button onClick={() => {setActiveTab('forum'); setSelectedChat(null); setSelectedThread(null);}} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'forum' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Fórum</button>
             <button onClick={() => {setActiveTab('competitions'); setSelectedChat(null); setSelectedThread(null);}} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'competitions' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Desafios</button>
             <button onClick={() => {setActiveTab('find'); setSelectedChat(null); setSelectedThread(null);}} className={`py-1.5 text-[10px] font-bold rounded-md transition-all ${activeTab === 'find' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Buscar</button>
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
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mr-3">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{user.name}</div>
                    <div className="text-xs text-slate-500 truncate">Clique para conversar</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* TAB: GROUPS */}
          {activeTab === 'groups' && (
            <div className="space-y-2">
               <button onClick={() => setShowCreateGroup(true)} className="w-full text-left px-3 py-2 text-xs text-teal-600 hover:bg-teal-50 rounded-lg border border-dashed border-teal-200 flex items-center justify-center">
                  + Criar Novo Grupo
               </button>
               {groups.map(group => (
                  <button
                  key={group.id}
                  onClick={() => { setSelectedChat({ type: 'group', target: group }); setSelectedThread(null); }}
                  className={`w-full flex items-center p-3 rounded-xl transition-colors ${selectedChat?.target.id === group.id ? 'bg-purple-50 border border-purple-100' : 'hover:bg-slate-50'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold mr-3">
                    G
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{group.name}</div>
                    <div className="text-xs text-slate-500 truncate">{group.members.length} membros</div>
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
                  <button
                    key={thread.id}
                    onClick={() => { setSelectedThread(thread); setSelectedChat(null); }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${selectedThread?.id === thread.id ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                  >
                     <span className="text-[10px] uppercase font-bold text-slate-400">{thread.category}</span>
                     <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">{thread.title}</h3>
                     <p className="text-xs text-slate-500 truncate">por {getUserName(thread.authorId)}</p>
                  </button>
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
                   <div key={comp.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                         <h3 className="font-bold text-slate-800 text-sm">{comp.title}</h3>
                         <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 uppercase">{comp.type === 'word_count' ? 'Palavras' : 'Streak'}</span>
                      </div>
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
            <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between flex-shrink-0">
               <div className="flex items-center">
                  <button onClick={() => setSelectedChat(null)} className="md:hidden mr-3 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className={`w-10 h-10 rounded-full ${selectedChat.type === 'direct' ? 'bg-teal-500' : 'bg-purple-500'} text-white flex items-center justify-center font-bold text-lg mr-3 shadow-sm`}>
                    {selectedChat.type === 'direct' 
                       ? (selectedChat.target as User).name.charAt(0).toUpperCase() 
                       : 'G'}
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-800">
                        {selectedChat.type === 'direct' ? (selectedChat.target as User).name : (selectedChat.target as Group).name}
                     </h3>
                     {selectedChat.type === 'direct' && (
                        <span className="text-xs text-green-500 flex items-center gap-1">Online</span>
                     )}
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
               {messages.map((msg) => {
                 const isMe = msg.senderId === currentUser.id;
                 return (
                   <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && selectedChat.type === 'group' && (
                         <div className="text-[10px] text-slate-400 mr-2 self-end mb-1">{getUserName(msg.senderId)}</div>
                      )}
                      <div className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-3 shadow-sm ${
                        isMe 
                          ? 'bg-teal-500 text-white rounded-tr-none' 
                          : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                      }`}>
                         <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                         <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-teal-100' : 'text-slate-400'}`}>
                           {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </p>
                      </div>
                   </div>
                 );
               })}
               <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
               <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-slate-100 border-transparent focus:bg-white border focus:border-teal-400 rounded-xl px-4 py-3 outline-none transition-all"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl px-5 py-3 font-medium transition-colors disabled:opacity-50">
                    Enviar
                  </button>
               </form>
            </div>
          </>
        )}

        {/* VIEW: THREAD */}
        {selectedThread && (
           <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-200 bg-white">
                 <button onClick={() => setSelectedThread(null)} className="md:hidden text-xs text-slate-500 mb-2">← Voltar</button>
                 <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">{selectedThread.category}</span>
                 <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedThread.title}</h2>
                 <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{getUserName(selectedThread.authorId).charAt(0)}</div>
                    <span className="text-xs text-slate-500">Postado por {getUserName(selectedThread.authorId)} em {new Date(selectedThread.createdAt).toLocaleDateString()}</span>
                 </div>
                 <p className="text-slate-700 leading-relaxed whitespace-pre-wrap p-4 bg-slate-50 rounded-lg">{selectedThread.content}</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                 <h3 className="text-sm font-bold text-slate-400 uppercase">Respostas</h3>
                 {threadReplies.map(reply => (
                    <div key={reply.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                       <div className="flex justify-between mb-2">
                          <span className="font-bold text-sm text-slate-700">{getUserName(reply.authorId)}</span>
                          <span className="text-xs text-slate-400">{new Date(reply.createdAt).toLocaleDateString()}</span>
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

      {/* MODAL: CREATE GROUP */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
              <h3 className="font-bold text-lg mb-4">Criar Grupo</h3>
              <input 
                className="w-full mb-4 px-3 py-2 border rounded-lg"
                placeholder="Nome do Grupo"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <p className="text-xs font-bold text-slate-500 mb-2">Selecionar Membros:</p>
              <div className="max-h-40 overflow-y-auto mb-4 border rounded-lg p-2">
                 {friends.map(({user}) => (
                    <div key={user.id} className="flex items-center gap-2 mb-2">
                       <input 
                         type="checkbox" 
                         checked={selectedGroupMembers.includes(user.id)}
                         onChange={() => toggleGroupMember(user.id)}
                       />
                       <span className="text-sm">{user.name}</span>
                    </div>
                 ))}
              </div>
              <div className="flex justify-end gap-2">
                 <button onClick={() => setShowCreateGroup(false)} className="px-3 py-1.5 text-slate-500">Cancelar</button>
                 <button onClick={handleCreateGroup} className="px-3 py-1.5 bg-teal-500 text-white rounded-lg">Criar</button>
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

    </div>
  );
};
