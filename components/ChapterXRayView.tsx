import React, { useState, useEffect, useMemo } from 'react';
import { Project, User, WritingSession, StorySkeletonItem } from '../types';
import { getStorySkeleton, subscribeToStorySkeleton } from '../services/projectCreativeService';
import { calculateSessionMinutes, formatMinutesToHours } from '../services/rewardService';
import { getMetricsForChapter, ChapterMetrics } from './StorySkeletonView';
import { Activity, Flame, Waves, Edit3, Sparkles, BookOpen, Clock, Star, Brain, AlertCircle, ChevronRight, Layers } from 'lucide-react';

interface ChapterXRayViewProps {
  project: Project;
  user: User;
  sessions: WritingSession[];
  onOpenSkeleton?: () => void;
}

export const ChapterXRayView: React.FC<ChapterXRayViewProps> = ({
  project,
  user,
  sessions,
  onOpenSkeleton
}) => {
  const [chapters, setChapters] = useState<StorySkeletonItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter sessions that belong to this project
  const projSessions = useMemo(() => {
    return sessions.filter(s =>
      s.projectId === project.id ||
      (s.projectId && project.name && s.projectId.trim().toLowerCase() === project.name.trim().toLowerCase())
    );
  }, [sessions, project.id, project.name]);

  // Load chapters in real-time
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getStorySkeleton(project.id, user.id).then(cached => {
      if (isMounted) {
        setChapters(cached);
        setIsLoading(false);
      }
    });

    const unsubscribe = subscribeToStorySkeleton(project.id, user.id, (fresh) => {
      if (isMounted) {
        setChapters(fresh);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [project.id, user.id]);

  // Compute metrics for every chapter
  const chaptersWithMetrics = useMemo(() => {
    return chapters.map(ch => ({
      chapter: ch,
      metrics: getMetricsForChapter(ch, projSessions)
    }));
  }, [chapters, projSessions]);

  // Filter only chapters with recorded sessions for comparative analysis
  const activeChapters = useMemo(() => {
    return chaptersWithMetrics.filter(c => c.metrics.sessionCount > 0);
  }, [chaptersWithMetrics]);

  // Unassigned sessions (without specific chapter)
  const unassignedSessions = useMemo(() => {
    return projSessions.filter(s => {
      if (!s.chapterId && !s.chapterTitle) return true;
      // Also check if chapterId or chapterTitle doesn't match any existing chapter
      const hasMatch = chapters.some(ch =>
        s.chapterId === ch.id ||
        (s.chapterTitle && ch.title && s.chapterTitle.trim().toLowerCase() === ch.title.trim().toLowerCase())
      );
      return !hasMatch;
    });
  }, [projSessions, chapters]);

  const unassignedWords = unassignedSessions.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  const unassignedMinutes = unassignedSessions.reduce((sum, s) => sum + calculateSessionMinutes(s.startTime, s.endTime), 0);

  // 1. Destaque: Capítulo mais desafiador (Maior Estresse / Dificuldade)
  const mostChallengingChapter = useMemo(() => {
    if (activeChapters.length === 0) return null;
    return [...activeChapters].sort((a, b) => {
      const scoreA = (a.metrics.avgStress * 1.2) + a.metrics.avgDifficulty;
      const scoreB = (b.metrics.avgStress * 1.2) + b.metrics.avgDifficulty;
      return scoreB - scoreA;
    })[0];
  }, [activeChapters]);

  // 2. Destaque: Capítulo de maior Fluidez (Menor Dificuldade e Maior Ritmo/Avaliação)
  const mostFluidChapter = useMemo(() => {
    if (activeChapters.length === 0) return null;
    return [...activeChapters].sort((a, b) => {
      const scoreA = (a.metrics.paceWpm * 2) + (a.metrics.avgRating * 5) - (a.metrics.avgDifficulty * 3);
      const scoreB = (b.metrics.paceWpm * 2) + (b.metrics.avgRating * 5) - (b.metrics.avgDifficulty * 3);
      return scoreB - scoreA;
    })[0];
  }, [activeChapters]);

  // 3. Destaque: Capítulo com mais Autocorreção
  const mostAutoCorrectedChapter = useMemo(() => {
    if (activeChapters.length === 0) return null;
    const sorted = [...activeChapters].sort((a, b) => b.metrics.avgAutoCorrection - a.metrics.avgAutoCorrection);
    return sorted[0]?.metrics.avgAutoCorrection >= 2 ? sorted[0] : null;
  }, [activeChapters]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-violet-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-indigo-800/40">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wide uppercase">
              <Activity className="w-3.5 h-3.5" />
              <span>Raio-X de Produção e Termômetro Psicológico</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>📊</span>
              <span>Análise Detalhada por Capítulo</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Consolidação de volume, tempo dedicado e métricas subjetivas de estresse, dificuldade,
              autocorreção e avaliação calculadas a partir de todas as sessões vinculadas aos capítulos de <strong className="text-indigo-200">{project.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {onOpenSkeleton && (
              <button
                type="button"
                onClick={onOpenSkeleton}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Layers className="w-4 h-4 text-violet-400" />
                <span>Ver Esqueleto da Obra</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Destaques e Alertas Visuais da Obra (Requirement 2) */}
      {activeChapters.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Destaques Comportamentais entre os Capítulos</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              {activeChapters.length} de {chapters.length} {chapters.length === 1 ? 'capítulo analisado' : 'capítulos analisados'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Capítulo mais desafiador */}
            {mostChallengingChapter && (
              <div className="bg-gradient-to-br from-rose-50 to-orange-50/70 border border-rose-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                      <span>🔥</span>
                      <span>Mais Desafiador</span>
                    </span>
                    <span className="text-[11px] font-bold text-rose-700">
                      Cap. #{mostChallengingChapter.chapter.order}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-800 text-sm sm:text-base line-clamp-1 mb-1" title={mostChallengingChapter.chapter.title}>
                    {mostChallengingChapter.chapter.title}
                  </h4>
                  <p className="text-xs text-rose-900/80 leading-relaxed">
                    Maior índice conjunto de estresse e fricção criativa nas sessões registradas.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-rose-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Estresse</span>
                      <strong className="text-rose-700 font-extrabold">{mostChallengingChapter.metrics.avgStress}/5</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Dificuldade</span>
                      <strong className="text-orange-700 font-extrabold">{mostChallengingChapter.metrics.avgDifficulty}/5</strong>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold bg-white/70 px-2 py-0.5 rounded-md border border-rose-100">
                    {mostChallengingChapter.metrics.sessionCount} {mostChallengingChapter.metrics.sessionCount === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
              </div>
            )}

            {/* Card 2: Capítulo de maior Fluidez */}
            {mostFluidChapter && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <span>🌊</span>
                      <span>Maior Fluidez</span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      Cap. #{mostFluidChapter.chapter.order}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-800 text-sm sm:text-base line-clamp-1 mb-1" title={mostFluidChapter.chapter.title}>
                    {mostFluidChapter.chapter.title}
                  </h4>
                  <p className="text-xs text-emerald-900/80 leading-relaxed">
                    Melhor combinação de ritmo ágil de escrita e satisfação do autor com a cena.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Ritmo</span>
                      <strong className="text-emerald-700 font-extrabold">{mostFluidChapter.metrics.paceWpm} pal/min</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Avaliação</span>
                      <strong className="text-amber-700 font-extrabold">⭐ {mostFluidChapter.metrics.avgRating}/5</strong>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold bg-white/70 px-2 py-0.5 rounded-md border border-emerald-100">
                    {mostFluidChapter.metrics.totalWords.toLocaleString('pt-BR')} pal.
                  </span>
                </div>
              </div>
            )}

            {/* Card 3: Capítulo com mais Autocorreção */}
            {mostAutoCorrectedChapter ? (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50/70 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      <span>✏️</span>
                      <span>Mais Autocorreção</span>
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700">
                      Cap. #{mostAutoCorrectedChapter.chapter.order}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-800 text-sm sm:text-base line-clamp-1 mb-1" title={mostAutoCorrectedChapter.chapter.title}>
                    {mostAutoCorrectedChapter.chapter.title}
                  </h4>
                  <p className="text-xs text-indigo-900/80 leading-relaxed">
                    Maior frequência de pausas para reescrever e apagar trechos durante a sessão.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-200/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Autocorreção Média</span>
                    <strong className="text-indigo-700 font-extrabold">{mostAutoCorrectedChapter.metrics.avgAutoCorrection}/5</strong>
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold bg-white/70 px-2 py-0.5 rounded-md border border-indigo-100">
                    {mostAutoCorrectedChapter.metrics.sessionCount} {mostAutoCorrectedChapter.metrics.sessionCount === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-center text-center">
                <span className="text-2xl mb-1">🎯</span>
                <h4 className="font-bold text-xs text-slate-700">Fluxo Contínuo</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Nenhum capítulo apresentou nível crítico de autocorreção. Seu primeiro rascunho está fluindo livremente!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chapters Table / Breakdown Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">
              Quadro Comparativo dos Capítulos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Métricas consolidadas de volume e termômetro psicológico de cada capítulo.
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
            {chapters.length} {chapters.length === 1 ? 'capítulo cadastrado' : 'capítulos cadastrados'}
          </span>
        </div>

        {chapters.length === 0 ? (
          <div className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-2xl text-indigo-600">
              📖
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-base">Nenhum capítulo cadastrado nesta obra</h4>
              <p className="text-xs text-slate-500 mt-1">
                Adicione capítulos no <strong>Esqueleto da Obra</strong> ou diretamente ao registrar sua próxima sessão de escrita.
              </p>
            </div>
            {onOpenSkeleton && (
              <button
                type="button"
                onClick={onOpenSkeleton}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Ir para o Esqueleto da Obra
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {chaptersWithMetrics.map(({ chapter, metrics }) => {
              const hasData = metrics.sessionCount > 0;

              return (
                <div key={chapter.id} className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Chapter Identifier & Status */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center flex-shrink-0 shadow-2xs border border-indigo-200">
                        #{chapter.order}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-800 text-base">
                            {chapter.title}
                          </h4>
                          {chapter.status && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {chapter.status === 'completed' && '✅ Concluído'}
                              {chapter.status === 'writing' && '✍️ Escrevendo'}
                              {chapter.status === 'structured' && '📐 Estruturado'}
                              {chapter.status === 'draft' && '💡 Ideia Inicial'}
                            </span>
                          )}
                        </div>

                        {/* Volume and Production Time */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                            <span>📝</span>
                            <span>{metrics.totalWords.toLocaleString('pt-BR')} palavras</span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>{formatMinutesToHours(metrics.totalMinutes)}</span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-medium text-slate-600">
                            {metrics.sessionCount} {metrics.sessionCount === 1 ? 'sessão realizada' : 'sessões realizadas'}
                          </span>
                          {hasData && metrics.paceWpm > 0 && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                                ⚡ {metrics.paceWpm} pal/min
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Psychological Thermometer (Médias Subjetivas 1 a 5) */}
                    <div className="bg-slate-50/80 rounded-2xl p-3 sm:p-4 border border-slate-200/70 flex-shrink-0 min-w-[280px] sm:min-w-[340px]">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center justify-between">
                        <span>Termômetro Psicológico</span>
                        {hasData ? (
                          <span className="text-amber-700 font-black flex items-center gap-1">
                            <span>⭐</span>
                            <span>{metrics.avgRating}/5</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium normal-case">Sem sessões ainda</span>
                        )}
                      </div>

                      {hasData ? (
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {/* Estresse */}
                          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Estresse</span>
                            <div className="flex items-center justify-center gap-1 font-black text-xs text-rose-700">
                              <span>🧠</span>
                              <span>{metrics.avgStress}/5</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                              <div
                                className="bg-rose-500 h-1 rounded-full"
                                style={{ width: `${(metrics.avgStress / 5) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Dificuldade */}
                          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Dificuldade</span>
                            <div className="flex items-center justify-center gap-1 font-black text-xs text-orange-700">
                              <span>📐</span>
                              <span>{metrics.avgDifficulty}/5</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                              <div
                                className="bg-orange-500 h-1 rounded-full"
                                style={{ width: `${(metrics.avgDifficulty / 5) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Autocorreção */}
                          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Autocorr.</span>
                            <div className="flex items-center justify-center gap-1 font-black text-xs text-indigo-700">
                              <span>✏️</span>
                              <span>{metrics.avgAutoCorrection}/5</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-500 h-1 rounded-full"
                                style={{ width: `${(metrics.avgAutoCorrection / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic text-center py-2">
                          Selecione este capítulo ao registrar uma nova sessão para preencher o termômetro.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Unassigned Sessions Card (Geral / Sem capítulo específico) */}
            {unassignedSessions.length > 0 && (
              <div className="p-5 sm:p-6 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      📌
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-700 text-sm">
                        Geral / Sem capítulo específico nesta obra
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sessões antigas ou rascunhos livres que não foram vinculados a nenhum capítulo específico.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs self-end sm:self-auto flex-wrap">
                    <span className="font-bold text-slate-700 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      {unassignedWords.toLocaleString('pt-BR')} pal.
                    </span>
                    <span className="font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/60 shadow-2xs">
                      ⏱️ {formatMinutesToHours(unassignedMinutes)}
                    </span>
                    <span className="font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      {unassignedSessions.length} {unassignedSessions.length === 1 ? 'sessão' : 'sessões'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
