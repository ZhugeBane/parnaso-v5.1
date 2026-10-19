

import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { SessionForm } from './components/SessionForm';
import { FocusMode } from './components/FocusMode';
import { AuthPage } from './components/AuthPage';
import { PendingApproval } from './components/PendingApproval';
import { AdminDashboard } from './components/AdminDashboard';
import { SocialHub } from './components/SocialHub'; // CONNECTED SOCIAL HUB
import { HelpPage } from './components/HelpPage';
import { WritingSession, UserSettings, INITIAL_SETTINGS, Project, User } from './types';
import { getSessions, saveSession, getSettings, saveSettings, getProjects, saveProject, deleteProject, clearAllData, syncUserPublicWordStats, subscribeToSessions } from './services/sessionService';
import { getCurrentUser, logout, updateUserPresence, updateUserHestius, subscribeToUser } from './services/authService';
import { evaluateStreakWithHestius, checkHestiusConsistencyRecharge, syncAndMigrateLocalRewardsToFirestore } from './services/rewardService';
import { LanguageProvider } from './i18n/LanguageContext';


function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'focus' | 'admin' | 'social' | 'inspect' | 'help'>('dashboard');
  const [sessions, setSessions] = useState<WritingSession[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);

  // States to handle Async Loading
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [prefilledData, setPrefilledData] = useState<Partial<WritingSession>>({});

  // 1. Check Auth on Mount
  useEffect(() => {
    checkAuth();
  }, []);

  // 1.5 Real-time Presence Heartbeat
  useEffect(() => {
    if (!user?.id) return;
    updateUserPresence(user.id, true);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateUserPresence(user.id, true);
      }
    }, 45000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateUserPresence(user.id, true);
      }
    };

    const handleBeforeUnload = () => {
      updateUserPresence(user.id, false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);

  // 2. Real-time Cloud Synchronization (Single Source of Truth)
  useEffect(() => {
    if (!user?.id) return;

    // Escuta alterações em tempo real no documento do usuário (saldos, Hestius, recompensas, etc.)
    const unsubscribeUser = subscribeToUser(user.id, (freshUser) => {
      if (freshUser) {
        setUser(prev => {
          if (!prev) return freshUser;
          // Mescla garantindo que atualizações vindas de outros dispositivos (Desktop/Mobile) reflitam imediatamente
          return {
            ...prev,
            ...freshUser
          };
        });
      }
    });

    // Escuta alterações em tempo real nas sessões (adicionadas no celular ou no PC)
    const unsubscribeSessions = subscribeToSessions(user.id, (freshSessions) => {
      if (freshSessions) {
        setSessions(freshSessions);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeSessions();
    };
  }, [user?.id]);

  // 3. Sincronização e consumo automático de Hestius se houver dias falhados protegidos
  useEffect(() => {
    if (!user || !sessions || sessions.length === 0) return;

    const streakEval = evaluateStreakWithHestius(
      sessions,
      user.hestiusCount ?? 1,
      user.hestiusProtectedDates || []
    );

    if (streakEval.newlyConsumedDates && streakEval.newlyConsumedDates.length > 0) {
      const newCount = streakEval.effectiveHestius;
      const updatedProtectedDates = [
        ...(user.hestiusProtectedDates || []),
        ...streakEval.newlyConsumedDates
      ];
      const lastConsumed = streakEval.newlyConsumedDates[streakEval.newlyConsumedDates.length - 1];

      console.log('[App] 🔥 Consumindo Hestius para proteger dias falhados:', streakEval.newlyConsumedDates, 'Novo saldo:', newCount);

      updateUserHestius(user.id, newCount, {
        hestiusLastConsumedDate: lastConsumed,
        hestiusProtectedDates: updatedProtectedDates
      }).catch(err => console.warn('Erro ao atualizar Hestius no Firestore:', err));

      setUser(prev => prev ? {
        ...prev,
        hestiusCount: newCount,
        hestiusLastConsumedDate: lastConsumed,
        hestiusProtectedDates: updatedProtectedDates
      } : null);
    }
  }, [user?.id, sessions]);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // Migração e consolidação automática Nuvem/Firestore
        syncAndMigrateLocalRewardsToFirestore(currentUser.id).catch(() => {});
        await loadUserData(currentUser.id);
      }
    } catch (error) {
      console.error("Auth check failed", error);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loadUserData = async (userId: string) => {
    setIsLoadingData(true);
    try {
      const [fetchedSessions, fetchedProjects, fetchedSettings] = await Promise.all([
        getSessions(userId),
        getProjects(userId),
        getSettings(userId)
      ]);
      setSessions(fetchedSessions);
      setProjects(fetchedProjects);
      setSettings(fetchedSettings);
      // Sincroniza estatísticas públicas agregadas para as guildas
      syncUserPublicWordStats(userId).catch(() => {});
    } catch (e) {
      console.error("Failed to load user data", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLoginSuccess = async (loggedInUser: User) => {
    if (loggedInUser.status === 'pending') {
      alert("Sua conta aguarda aprovação.");
      await logout();
      return;
    }
    setUser(loggedInUser);
    syncAndMigrateLocalRewardsToFirestore(loggedInUser.id).catch(() => {});
    await loadUserData(loggedInUser.id);
    setView('dashboard');
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setSessions([]);
    setProjects([]);
  };

  const handleNewSession = (initialData?: Partial<WritingSession>) => {
    setPrefilledData(initialData || {});
    setView('form');
  };

  const handleFocusMode = () => {
    setView('focus');
  };

  const handleSocial = () => {
    setView('social');
  };

  const handleHelp = () => {
    setView('help');
  };

  const handleSaveSession = async (session: WritingSession) => {
    if (!user) return;

    try {
      console.log('[App] Salvando sessão...', session);

      // Optimistic Update (replace if editing existing session, prepend if new)
      setSessions(prev => {
        const exists = prev.some(s => s.id === session.id);
        if (exists) {
          return prev.map(s => (s.id === session.id ? session : s));
        }
        return [session, ...prev];
      });
      setPrefilledData({});
      setView('dashboard');

      // Actual Save to Firestore
      await saveSession(session, user.id);

      console.log('[App] ✅ Sessão salva com sucesso!');

      // Reload to ensure sync/IDs
      const freshSessions = await getSessions(user.id);
      setSessions(freshSessions);

      // Check consistency recharge for Hestius (recharges +1 every 2 consecutive days)
      const streakEval = evaluateStreakWithHestius(freshSessions, user.hestiusCount ?? 1, user.hestiusProtectedDates || []);
      const rechargeCheck = checkHestiusConsistencyRecharge(
        streakEval.currentStreak,
        user.hestiusLastRechargeDate,
        user.hestiusCount ?? 1
      );
      if (rechargeCheck.willRecharge) {
        const todayKey = new Date().toISOString().slice(0, 10);
        await updateUserHestius(user.id, rechargeCheck.newHestiusCount, {
          hestiusLastRechargeDate: todayKey
        });
        setUser(prev => prev ? {
          ...prev,
          hestiusCount: rechargeCheck.newHestiusCount,
          hestiusLastRechargeDate: todayKey
        } : null);
      }

      console.log('[App] Sessões recarregadas:', freshSessions.length);
    } catch (error: any) {
      console.error('[App] ❌ ERRO ao salvar sessão:', error);

      // Reverter atualização otimista
      const freshSessions = await getSessions(user.id);
      setSessions(freshSessions);

      // Mostrar erro ao usuário
      alert('Erro ao salvar sessão: ' + (error.message || 'Erro desconhecido. Verifique sua conexão e tente novamente.'));
    }
  };

  const handleSaveProject = async (project: Project): Promise<Project | undefined> => {
    if (!user) return undefined;

    try {
      console.log('[App] Salvando projeto...', project);
      const saved = await saveProject(project, user.id);
      console.log('[App] ✅ Projeto salvo com sucesso!', saved);

      // Reload projects
      const freshProjects = await getProjects(user.id);
      setProjects(freshProjects);
      console.log('[App] Projetos recarregados:', freshProjects.length);
      return saved;
    } catch (error: any) {
      console.error('[App] ❌ ERRO ao salvar projeto:', error);
      alert('Erro ao salvar projeto: ' + (error.message || 'Erro desconhecido. Verifique sua conexão e tente novamente.'));
      throw error;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user) return;

    try {
      console.log('[App] Excluindo projeto...', projectId);
      await deleteProject(projectId, user.id);
      console.log('[App] ✅ Projeto excluído com sucesso!');

      // Reload fresh projects and fresh sessions
      const freshProjects = await getProjects(user.id);
      setProjects(freshProjects);
      const freshSessions = await getSessions(user.id);
      setSessions(freshSessions);
      console.log('[App] Projetos e sessões recarregados após exclusão.');
    } catch (error: any) {
      console.error('[App] ❌ ERRO ao excluir projeto:', error);
      alert('Erro ao excluir obra: ' + (error.message || 'Erro desconhecido. Verifique sua conexão e tente novamente.'));
      throw error;
    }
  };

  const handleUpdateSettings = async (newSettings: UserSettings) => {
    if (!user) return;
    setSettings(newSettings);
    await saveSettings(newSettings, user.id);
  };

  const handleClearData = async () => {
    if (!user) return;
    await clearAllData(user.id);
    setSessions([]);
    setProjects([]);
    setSettings(INITIAL_SETTINGS);
  };

  const handleCancel = () => {
    setView('dashboard');
  };

  // Handle data coming back from Focus Mode
  const handleFocusExit = (sessionData?: { startTime: string; endTime: string; text: string; wordCount: number }) => {
    if (sessionData) {
      setPrefilledData({
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        content: sessionData.text, // Persist the text content
        wordCount: sessionData.wordCount, // Persist the word count
        wasMultitasking: false
      });
      setView('form'); // Go to form to verify and save to DB
    } else {
      setView('dashboard');
    }
  };

  const [inspectedUser, setInspectedUser] = useState<User | null>(null);
  const [inspectedData, setInspectedData] = useState<{ sessions: WritingSession[], projects: Project[], settings: UserSettings } | null>(null);

  // Admin Logic
  const handleAdminPanel = () => {
    setView('admin');
    setInspectedUser(null);
    setInspectedData(null);
  };

  const handleInspectUser = async (targetUser: User) => {
    try {
      // Carregar dados do usuário inspecionado
      const [userSessions, userProjects, userSettings] = await Promise.all([
        getSessions(targetUser.id),
        getProjects(targetUser.id),
        getSettings(targetUser.id)
      ]);

      setInspectedUser(targetUser);
      setInspectedData({
        sessions: userSessions,
        projects: userProjects,
        settings: userSettings
      });
      setView('inspect');
    } catch (error) {
      console.error("Erro ao inspecionar usuário", error);
      alert("Erro ao carregar dados do usuário");
    }
  };

  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Conectando...</div>;
  }

  if (!user) {
    return (
      <div className="relative">
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Defesa: se por acaso o usuário logado ainda estiver pendente (ex: trocou de aba e o status mudou, ou bug no login)
  if (user.status === 'pending') {
    return (
      <PendingApproval onBack={() => {
        logout();
        setUser(null);
      }} />
    );
  }

  // Inspect Mode (Admin viewing another user's data)
  if (view === 'inspect' && inspectedUser && inspectedData) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
        <Dashboard
          user={inspectedUser}
          sessions={inspectedData.sessions}
          projects={inspectedData.projects}
          settings={inspectedData.settings}
          onNewSession={() => { }}
          onFocusMode={() => { }}
          onUpdateSettings={() => { }}
          onAddProject={() => { }}
          onResetData={() => { }}
          onLogout={() => { }}
          onAdminPanel={handleAdminPanel}
          readOnly={true}
        />
      </div>
    );
  }

  // Admin Mode
  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
        <AdminDashboard
          currentUser={user}
          onExit={() => setView('dashboard')}
          onInspectUser={handleInspectUser}
        />
      </div>
    );
  }

  // Social Mode
  if (view === 'social') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
        <SocialHub currentUser={user} onExit={() => setView('dashboard')} />
      </div>
    )
  }

  // Help Mode
  if (view === 'help') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
        <HelpPage onExit={() => setView('dashboard')} />
      </div>
    )
  }

  // Normal User Views
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {isLoadingData && (
        <div className="fixed top-0 left-0 w-full h-1 bg-slate-200 z-50 pointer-events-none">
          <div className="h-full bg-teal-500 animate-pulse w-1/3"></div>
        </div>
      )}

      {view === 'dashboard' && (
        <Dashboard
          user={user}
          sessions={sessions}
          projects={projects}
          settings={settings}
          onNewSession={handleNewSession}
          onFocusMode={handleFocusMode}
          onUpdateSettings={handleUpdateSettings}
          onAddProject={handleSaveProject}
          onDeleteProject={handleDeleteProject}
          onResetData={handleClearData}
          onLogout={handleLogout}
          onAdminPanel={handleAdminPanel}
          onSocial={handleSocial}
          onHelp={handleHelp}
          onUpdateUser={(updated) => setUser(prev => prev ? { ...prev, ...updated } : null)}
        />
      )}

      {view === 'form' && (
        <div className="animate-fade-in">
          <SessionForm
            projects={projects}
            onSubmit={handleSaveSession}
            onCancel={handleCancel}
            onAddProject={handleSaveProject}
            initialValues={prefilledData}
            userHestius={user.hestiusCount ?? 1}
            sessions={sessions}
          />
        </div>
      )}

      {view === 'focus' && (
        <FocusMode onExit={handleFocusExit} />
      )}
    </div>
  );
}

const AppWithLanguage = () => (
  <LanguageProvider>
    <App />
  </LanguageProvider>
);

export default AppWithLanguage;