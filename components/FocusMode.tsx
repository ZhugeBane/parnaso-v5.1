
import React, { useState, useEffect, useRef } from 'react';
import { Logo } from './ui/Logo';
import { PomodoroTimer } from './ui/PomodoroTimer';
import { useLanguage } from '../i18n/LanguageContext';
import { ScriptusIcon, KronusIcon } from './ui/GamificationIcons';
import { Project, User, StorySkeletonItem } from '../types';
import { getStorySkeleton, subscribeToStorySkeleton, createQuickChapter } from '../services/projectCreativeService';
import { auth } from '../lib/firebase';

interface FocusModeProps {
  onExit: (sessionData?: {
    startTime: string;
    endTime: string;
    text: string;
    wordCount: number;
    projectId?: string;
    chapterId?: string;
    chapterTitle?: string;
  }) => void;
  projects?: Project[];
  user?: User;
}

export const FocusMode: React.FC<FocusModeProps> = ({ onExit, projects = [], user }) => {
  const { t } = useLanguage();
  const effectiveUserId = user?.id || auth.currentUser?.uid || '';

  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [text, setText] = useState('');
  const [timerMode, setTimerMode] = useState<'free' | 'pomodoro'>('free');
  const [pomodoros, setPomodoros] = useState(0);

  // Project & Chapter Selection in Focus Mode (Requirement 1)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [selectedChapterTitle, setSelectedChapterTitle] = useState<string>('');
  const [chapters, setChapters] = useState<StorySkeletonItem[]>([]);
  const [showNewChapterInput, setShowNewChapterInput] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);

  // Load and sync chapters when selected project changes
  useEffect(() => {
    if (!selectedProjectId || !effectiveUserId) {
      setChapters([]);
      setSelectedChapterId('');
      setSelectedChapterTitle('');
      return;
    }
    let isMounted = true;
    getStorySkeleton(selectedProjectId, effectiveUserId).then(items => {
      if (isMounted) {
        setChapters(items);
      }
    });

    const unsubscribe = subscribeToStorySkeleton(selectedProjectId, effectiveUserId, (items) => {
      if (isMounted) {
        setChapters(items);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [selectedProjectId, effectiveUserId]);

  const handleCreateQuickChapterInFocus = async () => {
    if (!newChapterTitle.trim() || !selectedProjectId || !effectiveUserId) return;
    setIsCreatingChapter(true);
    try {
      const created = await createQuickChapter(selectedProjectId, effectiveUserId, newChapterTitle.trim());
      setChapters(prev => {
        const next = [...prev, created];
        next.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return next;
      });
      setSelectedChapterId(created.id);
      setSelectedChapterTitle(created.title);
      setShowNewChapterInput(false);
      setNewChapterTitle('');
    } catch (e) {
      console.error('Erro ao criar capítulo no Modo Foco:', e);
      alert('Erro ao criar capítulo.');
    } finally {
      setIsCreatingChapter(false);
    }
  };

  // Ref for interval to clear it properly
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      if (!startTime) setStartTime(new Date());
      intervalRef.current = window.setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, startTime]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const endTime = new Date();
    const locale = t('common.save') === 'Salvar' ? 'pt-BR' : 'en-US';
    const formattedStart = startTime
      ? startTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const formattedEnd = endTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    // Calculate simple word count
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    onExit({
      startTime: formattedStart,
      endTime: formattedEnd,
      text,
      wordCount,
      projectId: selectedProjectId || undefined,
      chapterId: selectedChapterId || undefined,
      chapterTitle: selectedChapterTitle || undefined
    });
  };

  const handlePomodoroComplete = (count: number) => {
    setPomodoros(count);
  };

  const liveWords = text.trim() ? text.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const liveScriptus = Math.floor(liveWords / 2);
  const liveMinutes = Math.floor(seconds / 60);
  const liveKronus = Math.floor(liveMinutes / 2);


  return (
    <div className="fixed inset-0 bg-slate-900 text-slate-100 z-50 flex flex-col animate-fade-in">
      {/* Minimal Header */}
      <div className="flex justify-between items-center p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Logo className="w-8 h-8 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
          <h2 className="text-xl font-light tracking-widest uppercase text-slate-400">{t('focusMode.title')}</h2>
        </div>
        <button
          onClick={() => onExit()}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center overflow-auto p-4 py-8">

        {/* Timer Display */}
        <div className="mb-6 text-center w-full max-w-md mx-auto">
          {/* Mode Toggle */}
          <div className="flex justify-center mb-6 bg-slate-800 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setTimerMode('free')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${timerMode === 'free' ? 'bg-slate-700 text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t('pomodoro.freeMode')}
            </button>
            <button
              onClick={() => setTimerMode('pomodoro')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${timerMode === 'pomodoro' ? 'bg-slate-700 text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t('pomodoro.pomodoroMode')}
            </button>
          </div>

          {timerMode === 'free' ? (
            <>
              <div className="text-6xl md:text-8xl font-mono font-bold tracking-tighter text-teal-300 tabular-nums">
                {formatTime(seconds)}
              </div>
              <p className="text-slate-500 mt-2 text-sm uppercase tracking-wide">{t('focusMode.writingTime')}</p>
            </>
          ) : (
            <PomodoroTimer onComplete={handlePomodoroComplete} />
          )}
        </div>

        {/* Project & Chapter Context Bar in Focus Mode (Requirement 1) */}
        <div className="w-full max-w-4xl mb-3 flex items-center justify-between gap-3 flex-wrap bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 text-xs">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <span>📚</span>
              <span>Obra:</span>
            </span>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedChapterId('');
                setSelectedChapterTitle('');
              }}
              className="bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 font-medium text-xs outline-none focus:border-teal-400 transition-colors cursor-pointer max-w-[200px]"
            >
              <option value="">{t('sessionForm.noProject')}</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {selectedProjectId && (
              <>
                <span className="text-slate-400 font-bold flex items-center gap-1 ml-2">
                  <span>📖</span>
                  <span>Capítulo:</span>
                </span>
                {!showNewChapterInput ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={selectedChapterId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        if (!cid) {
                          setSelectedChapterId('');
                          setSelectedChapterTitle('');
                        } else {
                          const ch = chapters.find(c => c.id === cid);
                          setSelectedChapterId(cid);
                          setSelectedChapterTitle(ch ? ch.title : '');
                        }
                      }}
                      className="bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 font-medium text-xs outline-none focus:border-violet-400 transition-colors cursor-pointer max-w-[220px]"
                    >
                      <option value="">📌 Geral / Sem capítulo</option>
                      {chapters.map(ch => (
                        <option key={ch.id} value={ch.id}>
                          #{ch.order} - {ch.title}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setShowNewChapterInput(true)}
                      className="text-violet-400 hover:text-violet-300 font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>+</span>
                      <span>Novo Capítulo</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateQuickChapterInFocus();
                        }
                      }}
                      placeholder="Nome do capítulo..."
                      className="bg-slate-900 text-slate-200 border border-violet-500 rounded-xl px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-violet-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCreateQuickChapterInFocus}
                      disabled={!newChapterTitle.trim() || isCreatingChapter}
                      className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      {isCreatingChapter ? '...' : 'Criar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewChapterInput(false);
                        setNewChapterTitle('');
                      }}
                      className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Writing Area */}
        <div className="w-full max-w-4xl h-80 md:h-96 bg-slate-800 rounded-xl p-1 border border-slate-700 relative group shadow-2xl">
          <textarea
            className="w-full h-full bg-slate-800/50 rounded-lg p-6 border-none outline-none resize-none text-slate-200 text-lg leading-relaxed font-serif placeholder-slate-600 focus:bg-slate-800 transition-colors"
            placeholder={t('focusMode.placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          ></textarea>
          <div className="absolute bottom-4 right-4 text-xs text-slate-500 pointer-events-none">
            {text.length > 0 ? `${text.trim().split(/\s+/).filter(w => w.length > 0).length} ${t('dashboard.words')}` : t('focusMode.startWritingPrompt')}
          </div>
        </div>

        {/* Live Gamification Bar: Scriptus & Kronus */}
        <div className="w-full max-w-4xl mt-3 flex items-center justify-between text-xs px-2 flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Live Scriptus */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-950/70 border border-violet-500/40 text-violet-300 backdrop-blur-sm shadow-xs">
              <ScriptusIcon className="w-3.5 h-3.5 text-violet-400" />
              <span className="font-extrabold text-violet-100">+{liveScriptus}</span>
              <span className="opacity-80">Scriptus</span>
            </div>

            {/* Live Kronus */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 backdrop-blur-sm shadow-xs">
              <KronusIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-extrabold text-amber-100">+{liveKronus}</span>
              <span className="opacity-80">Kronus</span>
            </div>
          </div>

          <div className="text-slate-400 text-xs font-medium">
            {liveWords} {t('dashboard.words')} • {liveMinutes} min
          </div>
        </div>

        {/* Controls (Only for Free Mode) */}
        {timerMode === 'free' && (
          <div className="mt-6 mb-8 flex items-center gap-6">
            <button
              onClick={toggleTimer}
              className={`h-16 w-16 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-lg ${isActive
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                : 'bg-teal-500 hover:bg-teal-600 text-white'
                }`}
            >
              {isActive ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 pl-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {(seconds > 0 || text.length > 0) && (
              <button
                onClick={handleFinish}
                className="px-6 py-3 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white font-medium transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {t('sessionForm.saveSession')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
