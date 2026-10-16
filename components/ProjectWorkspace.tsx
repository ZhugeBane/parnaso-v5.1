import React, { useState } from 'react';
import { Project, User, WritingSession } from '../types';
import { ConceptMapCanvas } from './ConceptMapCanvas';
import { CharactersFolder } from './CharactersFolder';
import { ProjectComments } from './ProjectComments';

interface ProjectWorkspaceProps {
  project: Project;
  user: User;
  sessions: WritingSession[];
  onBackToProjects: () => void;
  renderAutomonitoring: () => React.ReactNode;
  onDeleteRequested?: () => void;
  readOnly?: boolean;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  user,
  sessions,
  onBackToProjects,
  renderAutomonitoring,
  onDeleteRequested,
  readOnly = false
}) => {
  const [activeTab, setActiveTab] = useState<'concepts' | 'characters' | 'comments' | 'stats'>('concepts');

  const projWords = sessions.filter(s => s.projectId === project.id).reduce((a, b) => a + b.wordCount, 0);
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
                {projWords} {project.targetWordCount ? `/ ${project.targetWordCount}` : 'palavras'}
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
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>{sessions.filter(s => s.projectId === project.id).length} sessões</span>
              {project.targetWordCount ? <span>{percent}% da meta</span> : null}
            </div>
          </div>
        </div>

        {/* Project Workspace Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 -mb-5 sm:-mb-6 overflow-x-auto text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('concepts')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'concepts'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🧠</span>
            <span>Ideias & Mapas Conceituais</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('characters')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'characters'
                ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>👥</span>
            <span>Pasta de Personagens</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'comments'
                ? 'border-amber-500 text-amber-700 bg-amber-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>💬</span>
            <span>Comentários</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'stats'
                ? 'border-teal-600 text-teal-700 bg-teal-50/40 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📊</span>
            <span>Automonitoramento & Métricas</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'concepts' && (
        <ConceptMapCanvas
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
