import React, { useState, useEffect } from 'react';
import { WritingSession, Project } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { decryptSessionText, isEncryptedText } from '../utils/cryptoUtils';
import { auth } from '../lib/firebase';

interface SessionDetailsModalProps {
    session: WritingSession;
    projects?: Project[];
    onClose: () => void;
    onEdit?: (session: WritingSession) => void;
    isPrivateView?: boolean; // If true, hides sensitive content (for admin view)
}

const calculateDurationInMinutes = (startStr?: string, endStr?: string): number => {
    if (!startStr || !endStr) return 0;
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60; // crossed midnight
    return diff;
};

const formatDuration = (totalMinutes: number): string => {
    if (totalMinutes <= 0) return '—';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
};

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
    session,
    projects = [],
    onClose,
    onEdit,
    isPrivateView = false
}) => {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);
    const [decryptedContent, setDecryptedContent] = useState<string>(
        session?.content && !isEncryptedText(session.content) ? session.content : ''
    );

    useEffect(() => {
        let active = true;
        if (!session?.content) {
            setDecryptedContent('');
            return;
        }
        if (!isEncryptedText(session.content)) {
            setDecryptedContent(session.content);
            return;
        }
        const uid = (session as any).userId || auth.currentUser?.uid || '';
        decryptSessionText(session.content, uid).then((plain) => {
            if (active) setDecryptedContent(plain);
        });
        return () => {
            active = false;
        };
    }, [session]);

    if (!session) return null;

    // Resolve associated project
    const project = projects.find(p => 
        p.id === session.projectId || 
        (p.name && session.projectId && p.name.trim().toLowerCase() === session.projectId.trim().toLowerCase())
    );

    // Duration calculation
    const durationMinutes = calculateDurationInMinutes(session.startTime, session.endTime);
    const formattedDuration = formatDuration(durationMinutes);

    // Text & Word statistics (using decrypted content)
    const displayContent = decryptedContent;
    const textWordCount = displayContent
        ? displayContent.trim().split(/\s+/).filter(Boolean).length
        : 0;
    const finalWordCount = session.wordCount > 0 ? session.wordCount : textWordCount;
    const isCountFromText = session.wordCount === 0 && textWordCount > 0;
    const charCountWithSpaces = displayContent ? displayContent.length : 0;
    const paragraphCount = displayContent
        ? displayContent.split(/\n+/).filter(p => p.trim().length > 0).length
        : 0;

    // Writing pace calculation
    const wordsPerHour = durationMinutes > 0 && finalWordCount > 0
        ? Math.round((finalWordCount / durationMinutes) * 60)
        : null;

    // Formatted date string
    const sessionDate = new Date(session.date);
    const formattedDate = !isNaN(sessionDate.getTime())
        ? sessionDate.toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
        : session.date;

    const handleCopyContent = () => {
        if (!displayContent) return;
        navigator.clipboard.writeText(displayContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Helper descriptions for scales 1-5
    const getStressLabel = (val: number) => {
        switch (val) {
            case 1: return t('sessionDetails.stress1');
            case 2: return t('sessionDetails.stress2');
            case 3: return t('sessionDetails.stress3');
            case 4: return t('sessionDetails.stress4');
            case 5: return t('sessionDetails.stress5');
            default: return `${val}/5`;
        }
    };

    const getDifficultyLabel = (val: number) => {
        switch (val) {
            case 1: return t('sessionDetails.diff1');
            case 2: return t('sessionDetails.diff2');
            case 3: return t('sessionDetails.diff3');
            case 4: return t('sessionDetails.diff4');
            case 5: return t('sessionDetails.diff5');
            default: return `${val}/5`;
        }
    };

    const getRatingLabel = (val: number) => {
        switch (val) {
            case 1: return t('sessionDetails.rating1');
            case 2: return t('sessionDetails.rating2');
            case 3: return t('sessionDetails.rating3');
            case 4: return t('sessionDetails.rating4');
            case 5: return t('sessionDetails.rating5');
            default: return `${val}/5`;
        }
    };

    const getAutoCorrectionLabel = (val: number) => {
        switch (val) {
            case 1: return t('sessionDetails.autoCorr1');
            case 2: return t('sessionDetails.autoCorr2');
            case 3: return t('sessionDetails.autoCorr3');
            case 4: return t('sessionDetails.autoCorr4');
            case 5: return t('sessionDetails.autoCorr5');
            default: return `${val}/5`;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/80 flex-shrink-0">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                {t('sessionDetails.title')}
                            </h2>
                            {project ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs">
                                    <span>📖</span>
                                    <span>{project.name}</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-500 bg-slate-200/60 border border-slate-200">
                                    <span>📄</span>
                                    <span>{t('sessionDetails.noProject')}</span>
                                </span>
                            )}
                            {session.chapterTitle && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-violet-50 text-violet-800 border border-violet-200 shadow-2xs">
                                    <span>📑</span>
                                    <span>{session.chapterTitle}</span>
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 capitalize">
                            <span className="font-semibold text-slate-600">{formattedDate}</span>
                            <span className="text-slate-300">•</span>
                            <span className="lowercase font-medium">{session.startTime} às {session.endTime}</span>
                            {durationMinutes > 0 && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold lowercase">
                                        ⏱️ {formattedDuration}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isPrivateView && onEdit && (
                            <button
                                type="button"
                                onClick={() => onEdit({ ...session, content: displayContent })}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
                                title="Editar informações desta sessão"
                            >
                                <span>✏️</span>
                                <span>Editar Sessão</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200/80 rounded-xl transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                            title={t('common.close')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* 4 Main Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        {/* Word Count */}
                        <div className="p-4 bg-teal-50/70 border border-teal-100 rounded-2xl flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 block mb-1">
                                    {t('sessionDetails.words')}
                                </span>
                                <div className="text-3xl font-black text-teal-800 leading-none">
                                    {finalWordCount.toLocaleString()}
                                </div>
                            </div>
                            <div className="mt-2.5">
                                {isCountFromText ? (
                                    <span className="inline-block text-[10px] font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
                                        {t('sessionDetails.wordsInText')}
                                    </span>
                                ) : wordsPerHour ? (
                                    <span className="text-[11px] font-semibold text-teal-600">
                                        ⚡ ~{wordsPerHour} pal/h
                                    </span>
                                ) : (
                                    <span className="text-[11px] text-teal-600/70">
                                        Total registrado
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Rating */}
                        <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700 block mb-1">
                                    {t('sessionDetails.rating')}
                                </span>
                                <div className="text-3xl font-black text-purple-800 leading-none">
                                    {session.sessionRating || 0}<span className="text-lg font-bold text-purple-400">/5</span>
                                </div>
                            </div>
                            <div className="mt-2.5">
                                <span className="text-[11px] font-bold text-purple-700 block leading-tight">
                                    {getRatingLabel(session.sessionRating)}
                                </span>
                            </div>
                        </div>

                        {/* Stress Level */}
                        <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-2xl flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 block mb-1">
                                    {t('sessionDetails.stress')}
                                </span>
                                <div className="text-3xl font-black text-rose-800 leading-none">
                                    {session.stressLevel || 0}<span className="text-lg font-bold text-rose-400">/5</span>
                                </div>
                            </div>
                            <div className="mt-2.5">
                                <span className="text-[11px] font-bold text-rose-700 block leading-tight">
                                    {getStressLabel(session.stressLevel)}
                                </span>
                            </div>
                        </div>

                        {/* Difficulty Level */}
                        <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-2xl flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 block mb-1">
                                    {t('sessionDetails.difficulty')}
                                </span>
                                <div className="text-3xl font-black text-amber-800 leading-none">
                                    {session.difficultyLevel || 0}<span className="text-lg font-bold text-amber-400">/5</span>
                                </div>
                            </div>
                            <div className="mt-2.5">
                                <span className="text-[11px] font-bold text-amber-700 block leading-tight">
                                    {getDifficultyLabel(session.difficultyLevel)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Metadata & Creative Strategies */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Strategies Used */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                                🛠️ {t('sessionDetails.strategiesUsed')}
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {session.usedSkeleton && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold">
                                        <span>🦴</span>
                                        <span>{t('sessionDetails.strategySkeleton')}</span>
                                    </span>
                                )}
                                {session.usedDrafts && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold">
                                        <span>📝</span>
                                        <span>{t('sessionDetails.strategyDrafts')}</span>
                                    </span>
                                )}
                                {session.usedTimeStrategy && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                                        <span>⏱️</span>
                                        <span>{t('sessionDetails.strategyTime')}</span>
                                    </span>
                                )}
                                {!session.usedSkeleton && !session.usedDrafts && !session.usedTimeStrategy && (
                                    <span className="text-xs text-slate-400 italic">
                                        {t('sessionDetails.none')}
                                    </span>
                                )}
                            </div>
                            {session.usedTimeStrategy && session.timeStrategyDescription && (
                                <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 italic">
                                    "{session.timeStrategyDescription}"
                                </p>
                            )}
                        </div>

                        {/* Focus & Multitasking */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                                🎯 {t('sessionDetails.focusMultitasking')}
                            </span>
                            {session.wasMultitasking ? (
                                <div className="space-y-1.5">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold">
                                        <span>⚠️</span>
                                        <span>{t('sessionDetails.wasMultitasking')}</span>
                                    </div>
                                    {session.multitaskingDescription && (
                                        <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                                            {session.multitaskingDescription}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
                                    <span>✅</span>
                                    <span>{t('sessionDetails.totalFocus')}</span>
                                </div>
                            )}
                        </div>

                        {/* Self-Correction Frequency */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                                ✏️ {t('sessionDetails.autoCorrection')}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-800">
                                    {session.autoCorrectionFrequency ? `${session.autoCorrectionFrequency}/5` : '—'}
                                </span>
                                {session.autoCorrectionFrequency && (
                                    <span className="text-xs font-medium text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                        {getAutoCorrectionLabel(session.autoCorrectionFrequency)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Personal Reward */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                                🎁 {t('sessionDetails.reward')}
                            </span>
                            {session.selfRewarded ? (
                                <div className="text-xs font-bold text-purple-700 bg-purple-50 p-2.5 rounded-xl border border-purple-100 flex items-center gap-2">
                                    <span>🎉</span>
                                    <span>{session.rewardDescription || t('common.yes')}</span>
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400 italic">
                                    {t('sessionDetails.noReward')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Specific Difficulties (if reported) */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                            💬 {t('sessionDetails.specificDifficulties')}
                        </span>
                        {session.specificDifficulties?.trim() ? (
                            <p className="text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 leading-relaxed italic whitespace-pre-wrap">
                                "{session.specificDifficulties.trim()}"
                            </p>
                        ) : (
                            <span className="text-xs text-slate-400 italic">
                                {t('sessionDetails.noneRegistered')}
                            </span>
                        )}
                    </div>

                    {/* Written Content Section */}
                    <div className="border-t border-slate-200 pt-6 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>{t('sessionDetails.writtenContent')}</span>
                                </h3>
                                {displayContent && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        🔒 AES-GCM Protegido
                                    </span>
                                )}
                            </div>

                            {!isPrivateView && displayContent && (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                                        {charCountWithSpaces.toLocaleString()} {t('sessionDetails.characters').toLowerCase()} • {paragraphCount} {t('sessionDetails.paragraphs').toLowerCase()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyContent}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                    >
                                        {copied ? (
                                            <>
                                                <span className="text-emerald-600">✓</span>
                                                <span className="text-emerald-700">{t('sessionDetails.copied')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                <span>{t('sessionDetails.copyText')}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className={`w-full rounded-2xl border ${isPrivateView ? 'bg-slate-50 border-slate-200 p-8 flex items-center justify-center' : 'bg-slate-50/50 border-slate-200 p-5'}`}>
                            {isPrivateView ? (
                                <div className="text-center max-w-sm">
                                    <div className="mx-auto w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-slate-700">{t('sessionDetails.protectedContent')}</h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {t('sessionDetails.privacyMessage')}
                                    </p>
                                </div>
                            ) : displayContent?.trim() ? (
                                <div className="max-h-96 overflow-y-auto whitespace-pre-wrap text-slate-800 leading-relaxed font-serif text-sm bg-white p-5 rounded-xl border border-slate-200 shadow-2xs select-text">
                                    {displayContent}
                                </div>
                            ) : (
                                <div className="text-slate-400 italic text-center py-8 text-xs">
                                    {t('sessionDetails.noContentSaved')}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 flex-shrink-0">
                    {!isPrivateView && onEdit && (
                        <button
                            type="button"
                            onClick={() => onEdit({ ...session, content: displayContent })}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-teal-500/20 cursor-pointer"
                        >
                            <span>✏️</span>
                            <span>Editar Informações da Sessão</span>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 transition-colors shadow-md shadow-slate-200 cursor-pointer"
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};
