import React from 'react';
import { WritingSession } from '../types';

interface SessionDetailsModalProps {
    session: WritingSession;
    onClose: () => void;
    isPrivateView?: boolean; // If true, hides sensitive content (for admin view)
}

const DetailItem = ({ label, value, icon }: { label: string, value: React.ReactNode, icon?: React.ReactNode }) => (
    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
        {icon && <div className="mt-0.5 text-slate-400">{icon}</div>}
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <div className="text-slate-700 font-medium">{value || '-'}</div>
        </div>
    </div>
);

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({ session, onClose, isPrivateView = false }) => {
    if (!session) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Detalhes da Sessão</h2>
                        <p className="text-sm text-slate-500">
                            {new Date(session.date).toLocaleDateString()} • {session.startTime} - {session.endTime}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">

                    {/* Main Key Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl text-center">
                            <div className="text-2xl font-bold text-teal-600">{session.wordCount}</div>
                            <div className="text-xs font-medium text-teal-800 uppercase tracking-wider">Palavras</div>
                        </div>
                        <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-center">
                            <div className="text-2xl font-bold text-purple-600">{session.sessionRating}/5</div>
                            <div className="text-xs font-medium text-purple-800 uppercase tracking-wider">Avaliação</div>
                        </div>
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-center">
                            <div className="text-2xl font-bold text-rose-600">{session.stressLevel}/5</div>
                            <div className="text-xs font-medium text-rose-800 uppercase tracking-wider">Estresse</div>
                        </div>
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                            <div className="text-2xl font-bold text-amber-600">{session.difficultyLevel}/5</div>
                            <div className="text-xs font-medium text-amber-800 uppercase tracking-wider">Dificuldade</div>
                        </div>
                    </div>

                    {/* Detailed Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <DetailItem
                            label="Estratégias Usadas"
                            value={
                                <div className="flex flex-wrap gap-2">
                                    {session.usedSkeleton && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Esqueleto</span>}
                                    {session.usedDrafts && <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">Rascunhos</span>}
                                    {session.usedTimeStrategy && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">Técnica de Tempo</span>}
                                    {!session.usedSkeleton && !session.usedDrafts && !session.usedTimeStrategy && <span className="text-slate-400 italic">Nenhuma</span>}
                                </div>
                            }
                        />

                        <DetailItem
                            label="Foco & Multitarefa"
                            value={session.wasMultitasking ? (
                                <div>
                                    <span className="text-rose-600 font-semibold">Sim</span>
                                    {session.multitaskingDescription && <span className="text-slate-500"> - {session.multitaskingDescription}</span>}
                                </div>
                            ) : <span className="text-emerald-600 font-semibold">Foco Total</span>}
                        />

                        <DetailItem
                            label="Dificuldades Específicas"
                            value={session.specificDifficulties || <span className="text-slate-400 italic">Nenhuma registrada</span>}
                        />

                        <DetailItem
                            label="Recompensa"
                            value={session.selfRewarded ? (
                                <span className="text-purple-600 font-semibold">{session.rewardDescription || 'Sim'}</span>
                            ) : <span className="text-slate-400 italic">Não houve</span>}
                        />
                    </div>

                    {/* Content Section - The Main Privacy Feature */}
                    <div className="border-t border-slate-200 pt-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Conteúdo Escrito
                        </h3>

                        <div className={`w-full min-h-[150px] p-4 rounded-xl border ${isPrivateView ? 'bg-slate-50 border-slate-200 flex items-center justify-center' : 'bg-white border-slate-200'}`}>

                            {isPrivateView ? (
                                <div className="text-center">
                                    <div className="mx-auto w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-slate-700">Conteúdo Protegido</h4>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Por privacidade, o texto escrito só é visível para o autor da sessão.
                                    </p>
                                </div>
                            ) : (
                                <div className="prose prose-slate max-w-none">
                                    {session.content ? (
                                        <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-serif">
                                            {session.content}
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 italic text-center py-8">
                                            Nenhum conteúdo textual salvo nesta sessão.
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors shadow-lg shadow-slate-300"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
