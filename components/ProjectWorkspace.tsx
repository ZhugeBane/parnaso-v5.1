import React, { useState, useEffect } from 'react';
import { Project, User, WritingSession } from '../types';
import { ConceptMapCanvas } from './ConceptMapCanvas';
import { CharactersFolder } from './CharactersFolder';
import { StorySkeletonView } from './StorySkeletonView';
import { PhysicalEnvironmentsGallery } from './PhysicalEnvironmentsGallery';
import { ProjectComments } from './ProjectComments';
import { ProjectDiaryView } from './ProjectDiaryView';
import { ScriptusIcon, KronusIcon } from './ui/GamificationIcons';
import { sessionToKronus, calculateSessionMinutes, formatMinutesToHours } from '../services/rewardService';
import {
  subscribeToStorySkeleton,
  subscribeToStoryEnvironments,
  subscribeToProjectDiaryEntries,
  getCharacters,
  getChapterConceptMaps
} from '../services/projectCreativeService';
import { ListTree, MapPin, Compass, Users, Brain, MessageSquare, BarChart3, BookHeart, Feather, Activity } from 'lucide-react';
import { ChapterXRayView } from './ChapterXRayView';

export type ProjectWorkspaceTab = 'concepts' | 'characters' | 'skeleton' | 'environments' | 'comments' | 'diary' | 'chapter_xray' | 'stats';

interface ProjectWorkspaceProps {
  project: Project;
  user: User;
  sessions: WritingSession[];
  onBackToProjects: () => void;
  renderAutomonitoring: () => React.ReactNode;
  onDeleteRequested?: () => void;
  initialTab?: ProjectWorkspaceTab;
  readOnly?: boolean;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  user,
  sessions,
  onBackToProjects,
  renderAutomonitoring,
  onDeleteRequested,
  initialTab = 'skeleton',
  readOnly = false
}) => {
  const [activeTab, setActiveTab] = useState<ProjectWorkspaceTab>(initialTab);

  // Creative Item Counters
  const [skeletonCount, setSkeletonCount] = useState<number>(0);
  const [environmentsCount, setEnvironmentsCount] = useState<number>(0);
  const [charactersCount, setCharactersCount] = useState<number>(0);
  const [mapsCount, setMapsCount] = useState<number>(0);
  const [diaryCount, setDiaryCount] = useState<number>(0);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    let isMounted = true;

    // Real-time listener for skeleton ideas
    const unsubSkeleton = subscribeToStorySkeleton(project.id, user.id, (items) => {
      if (isMounted) setSkeletonCount(items.length);
    });

    // Real-time listener for environments
    const unsubEnvs = subscribeToStoryEnvironments(project.id, user.id, (envs) => {
      if (isMounted) setEnvironmentsCount(envs.length);
    });

    // Real-time listener for diary pages
    const unsubDiary = subscribeToProjectDiaryEntries(project.id, user.id, (pages) => {
      if (isMounted) setDiaryCount(pages.length);
    });

    // Characters count
    getCharacters(project.id, user.id).then(chars => {
      if (isMounted) setCharactersCount(chars.length);
    });

    // Maps count
    getChapterConceptMaps(project.id, user.id).then(maps => {
      if (isMounted) setMapsCount(maps.length);
    });

    return () => {
      isMounted = false;
      unsubSkeleton();
      unsubEnvs();
      unsubDiary();
    };
  }, [project.id, user.id]);

  const projSessions = sessions
    .filter(s => s.projectId === project.id || (s.projectId && s.projectId.trim().toLowerCase() === project.name.trim().toLowerCase()));
  const projWords = projSessions.reduce((a, b) => a + b.wordCount, 0);
  const projMinutes = projSessions.reduce((a, b) => a + calculateSessionMinutes(b.startTime, b.endTime), 0);
  const projKronus = projSessions.reduce((a, b) => a + sessionToKronus(b.startTime, b.endTime), 0);
  const projScriptus = Math.floor(projWords / 2);
  const percent = project.targetWordCount ? Math.min(100, Math.round((projWords / project.targetWordCount) * 100)) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/90 relative overflow-hidden">
        {/* Color accent strip */}
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: project.color || '#2dd4bf' }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onBackToProjects}
                className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-teal-600 transition-colors mb-1 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Voltar para Minhas Obras
              </button>

              {!readOnly && onDeleteRequested && (
                <button
                  type="button"
                  onClick={onDeleteRequested}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Excluir Obra
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color || '#2dd4bf' }}
              />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                {project.name}
              </h2>
            </div>

            {project.description && (
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
                {project.description}
              </p>
            )}
          </div>

          {/* Quick Stats & Progress */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[220px]">
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
              <span>Progresso da Obra</span>
              <span className="font-bold text-slate-800">
                {projWords.toLocaleString('pt-BR')} {project.targetWordCount ? `/ ${project.targetWordCount.toLocaleString('pt-BR')}` : 'palavras'}
              </span>
            </div>
            {project.targetWordCount ? (
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${percent}%`, backgroundColor: project.color || '#2dd4bf' }}
                />
              </div>
            ) : null}
            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2 flex-wrap gap-1">
              <span>{projSessions.length} sessões</span>
              <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 inline-flex items-center gap-1">
                ⏱️ {formatMinutesToHours(projMinutes)} dedicadas
              </span>
              {project.targetWordCount ? <span>{percent}% da meta</span> : null}
            </div>

            {/* Gamification Badges: Scriptus & Kronus */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/70 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between bg-violet-50/80 border border-violet-100/90 px-3 py-1.5 rounded-xl text-violet-900">
                <span className="flex items-center gap-1.5 font-semibold truncate">
                  <ScriptusIcon className="w-4 h-4 text-violet-600 flex-shrink-0" />
                  <span className="truncate">Scriptus:</span>
                </span>
                <span className="font-extrabold text-violet-800 bg-violet-200/70 px-2 py-0.5 rounded-md text-[11px] ml-1">
                  +{projScriptus.toLocaleString('pt-BR')}
                </span>
              </div>

              <div className="flex items-center justify-between bg-amber-50/80 border border-amber-100/90 px-3 py-1.5 rounded-xl text-amber-900">
                <span className="flex items-center gap-1.5 font-semibold truncate">
                  <KronusIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="truncate">Kronus:</span>
                </span>
                <span className="font-extrabold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md text-[11px] ml-1">
                  +{projKronus.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Workspace Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 -mb-5 sm:-mb-6 overflow-x-auto text-sm font-bold scrollbar-thin">
          {/* TAB 1: SKELETON */}
          <button
            type="button"
            onClick={() => setActiveTab('skeleton')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'skeleton'
                ? 'border-violet-600 text-violet-700 bg-violet-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListTree className="w-4 h-4 text-violet-600 flex-shrink-0" />
            <span>🦴 Esqueleto da Obra</span>
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
              activeTab === 'skeleton' ? 'bg-violet-200 text-violet-800' : 'bg-slate-100 text-slate-500'
            }`}>
              {skeletonCount} {skeletonCount === 1 ? 'ideia' : 'ideias'}
            </span>
          </button>

          {/* TAB 2: ENVIRONMENTS */}
          <button
            type="button"
            onClick={() => setActiveTab('environments')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'environments'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Compass className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>🏛️ Ambientes Físicos</span>
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
              activeTab === 'environments' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'
            }`}>
              {environmentsCount} {environmentsCount === 1 ? 'local' : 'locais'}
            </span>
          </button>

          {/* TAB 3: CHARACTERS */}
          <button
            type="button"
            onClick={() => setActiveTab('characters')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'characters'
                ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>👥 Personagens</span>
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
              activeTab === 'characters' ? 'bg-teal-200 text-teal-800' : 'bg-slate-100 text-slate-500'
            }`}>
              {charactersCount}
            </span>
          </button>

          {/* TAB 4: CONCEPTS & MAPS */}
          <button
            type="button"
            onClick={() => setActiveTab('concepts')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'concepts'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Brain className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>🧠 Mapas Conceituais</span>
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
              activeTab === 'concepts' ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500'
            }`}>
              {mapsCount}
            </span>
          </button>

          {/* TAB 5: DIARY */}
          <button
            type="button"
            onClick={() => setActiveTab('diary')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'diary'
                ? 'border-amber-600 text-amber-800 bg-amber-50/60 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookHeart className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>📓 Diário da Obra</span>
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
              activeTab === 'diary' ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-500'
            }`}>
              {diaryCount} {diaryCount === 1 ? 'página' : 'páginas'}
            </span>
          </button>

          {/* TAB 6: COMMENTS */}
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'comments'
                ? 'border-amber-500 text-amber-700 bg-amber-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>💬 Comentários</span>
          </button>

          {/* TAB 7: CHAPTER X-RAY (Raio-X dos Capítulos) */}
          <button
            type="button"
            onClick={() => setActiveTab('chapter_xray')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'chapter_xray'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>📊 Raio-X dos Capítulos</span>
          </button>

          {/* TAB 8: STATS */}
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'stats'
                ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>📊 Automonitoramento</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'skeleton' && (
        <StorySkeletonView
          projectId={project.id}
          user={user}
          readOnly={readOnly}
          sessions={projSessions}
        />
      )}

      {activeTab === 'chapter_xray' && (
        <ChapterXRayView
          project={project}
          user={user}
          sessions={projSessions}
          onOpenSkeleton={() => setActiveTab('skeleton')}
        />
      )}

      {activeTab === 'environments' && (
        <PhysicalEnvironmentsGallery
          projectId={project.id}
          user={user}
          readOnly={readOnly}
        />
      )}

      {activeTab === 'characters' && (
        <CharactersFolder
          projectId={project.id}
          user={user}
          readOnly={readOnly}
        />
      )}

      {activeTab === 'concepts' && (
        <ConceptMapCanvas
          projectId={project.id}
          user={user}
          readOnly={readOnly}
        />
      )}

      {activeTab === 'diary' && (
        <ProjectDiaryView
          projectId={project.id}
          user={user}
          readOnly={readOnly}
        />
      )}

      {activeTab === 'comments' && (
        <ProjectComments
          projectId={project.id}
          user={user}
          readOnly={readOnly}
        />
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          {renderAutomonitoring()}
        </div>
      )}
    </div>
  );
};
