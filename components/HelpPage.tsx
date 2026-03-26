
import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Target, Users, Settings, Lightbulb, HelpCircle, Feather, Clock, BarChart3, Sparkles } from 'lucide-react';
import { Logo } from './ui/Logo';
import { useLanguage } from '../i18n/LanguageContext';

interface HelpPageProps {
    onExit: () => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({ onExit }) => {
    const { t } = useLanguage();
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-purple-50/20">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={onExit}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">{t('help.back')}</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <Logo className="w-10 h-10" />
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent">
                            {t('help.title')}
                        </h1>
                    </div>
                    <div className="w-24"></div> {/* Spacer for centering */}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Welcome Section */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-teal-100">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl">
                            <Feather className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">{t('help.welcomeTitle')}</h2>
                            <p className="text-lg text-slate-600">
                                {t('help.welcomeSubtitle')}
                            </p>
                        </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                        {t('help.description')}
                    </p>
                </div>

                {/* Features Section */}
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    {t('help.featuresTitle')}
                </h3>

                <div className="space-y-4 mb-12">
                    {/* Sessões de Escrita */}
                    <FeatureCard
                        icon={<Clock className="w-6 h-6" />}
                        title={t('help.sections.sessions.title')}
                        color="teal"
                        expanded={expandedSection === 'sessions'}
                        onToggle={() => toggleSection('sessions')}
                    >
                        <p className="text-slate-700 mb-3">
                            {t('help.sections.sessions.desc')}
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-teal-500 font-bold">•</span>
                                <span>{t('help.sections.sessions.item1')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-teal-500 font-bold">•</span>
                                <span>{t('help.sections.sessions.item2')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-teal-500 font-bold">•</span>
                                <span>{t('help.sections.sessions.item3')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-teal-500 font-bold">•</span>
                                <span>{t('help.sections.sessions.item4')}</span>
                            </li>
                        </ul>
                    </FeatureCard>

                    {/* Modo Foco */}
                    <FeatureCard
                        icon={<Target className="w-6 h-6" />}
                        title={t('help.sections.focus.title')}
                        color="purple"
                        expanded={expandedSection === 'focus'}
                        onToggle={() => toggleSection('focus')}
                    >
                        <p className="text-slate-700 mb-3">
                            {t('help.sections.focus.desc')}
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-purple-500 font-bold">•</span>
                                <span>{t('help.sections.focus.item1')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-500 font-bold">•</span>
                                <span>{t('help.sections.focus.item2')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-500 font-bold">•</span>
                                <span>{t('help.sections.focus.item3')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-500 font-bold">•</span>
                                <span>{t('help.sections.focus.item4')}</span>
                            </li>
                        </ul>
                    </FeatureCard>

                    {/* Projetos */}
                    <FeatureCard
                        icon={<BookOpen className="w-6 h-6" />}
                        title={t('help.sections.projects.title')}
                        color="indigo"
                        expanded={expandedSection === 'projects'}
                        onToggle={() => toggleSection('projects')}
                    >
                        <p className="text-slate-700 mb-3">
                            {t('help.sections.projects.desc')}
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span>{t('help.sections.projects.item1')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span>{t('help.sections.projects.item2')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span>{t('help.sections.projects.item3')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span>{t('help.sections.projects.item4')}</span>
                            </li>
                        </ul>
                    </FeatureCard>

                    {/* Social Hub */}
                    <FeatureCard
                        icon={<Users className="w-6 h-6" />}
                        title={t('help.sections.social.title')}
                        color="rose"
                        expanded={expandedSection === 'social'}
                        onToggle={() => toggleSection('social')}
                    >
                        <p className="text-slate-700 mb-3">
                            {t('help.sections.social.desc')}
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>{t('help.sections.social.item1')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>{t('help.sections.social.item2')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>{t('help.sections.social.item3')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>{t('help.sections.social.item4')}</span>
                            </li>
                        </ul>
                    </FeatureCard>

                    {/* Estatísticas */}
                    <FeatureCard
                        icon={<BarChart3 className="w-6 h-6" />}
                        title={t('help.sections.stats.title')}
                        color="emerald"
                        expanded={expandedSection === 'stats'}
                        onToggle={() => toggleSection('stats')}
                    >
                        <p className="text-slate-700 mb-3">
                            {t('help.sections.stats.desc')}
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{t('help.sections.stats.item1')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{t('help.sections.stats.item2')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{t('help.sections.stats.item3')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{t('help.sections.stats.item4')}</span>
                            </li>
                        </ul>
                    </FeatureCard>

                    {/* Configurações */}
                    <FeatureCard
                        icon={<Settings className="w-6 h-6" />}
                        title={t('help.sections.settings.title')}
                        color="slate"
                        expanded={expandedSection === 'settings'}
                        onToggle={() => toggleSection('settings')}
                    >
                        <p className="text-slate-700 mb-3">
                            {t('help.sections.settings.desc')}
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-slate-500 font-bold">•</span>
                                <span>{t('help.sections.settings.item1')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-slate-500 font-bold">•</span>
                                <span>{t('help.sections.settings.item2')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-slate-500 font-bold">•</span>
                                <span>{t('help.sections.settings.item3')}</span>
                            </li>
                        </ul>
                    </FeatureCard>
                </div>

                {/* Tips Section */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg p-8 mb-8 border border-amber-200">
                    <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Lightbulb className="w-6 h-6 text-amber-500" />
                        {t('help.tipsTitle')}
                    </h3>
                    <ul className="space-y-3 text-slate-700">
                        <li className="flex items-start gap-3">
                            <span className="text-2xl">✍️</span>
                            <span><strong>{t('help.tips.tip1Title')}</strong> {t('help.tips.tip1Desc')}</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-2xl">🎯</span>
                            <span><strong>{t('help.tips.tip2Title')}</strong> {t('help.tips.tip2Desc')}</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-2xl">📊</span>
                            <span><strong>{t('help.tips.tip3Title')}</strong> {t('help.tips.tip3Desc')}</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-2xl">🤝</span>
                            <span><strong>{t('help.tips.tip4Title')}</strong> {t('help.tips.tip4Desc')}</span>
                        </li>
                    </ul>
                </div>

                {/* FAQ Section */}
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <HelpCircle className="w-6 h-6 text-teal-500" />
                        {t('help.faqTitle')}
                    </h3>
                    <div className="space-y-4">
                        <FAQItem
                            question={t('help.faq.q1')}
                            answer={t('help.faq.a1')}
                        />
                        <FAQItem
                            question={t('help.faq.q2')}
                            answer={t('help.faq.a2')}
                        />
                        <FAQItem
                            question={t('help.faq.q3')}
                            answer={t('help.faq.a3')}
                        />
                        <FAQItem
                            question={t('help.faq.q4')}
                            answer={t('help.faq.a4')}
                        />
                        <FAQItem
                            question={t('help.faq.q5')}
                            answer={t('help.faq.a5')}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-slate-500">
                    <p className="mb-2">{t('help.footer1')}</p>
                    <p className="text-sm">{t('help.footer2')}</p>
                </div>
            </div>
        </div>
    );
};

// Helper Components
interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    color: 'teal' | 'purple' | 'indigo' | 'rose' | 'emerald' | 'slate';
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, color, expanded, onToggle, children }) => {
    const colorClasses = {
        teal: 'from-teal-500 to-teal-600 border-teal-200 bg-teal-50',
        purple: 'from-purple-500 to-purple-600 border-purple-200 bg-purple-50',
        indigo: 'from-indigo-500 to-indigo-600 border-indigo-200 bg-indigo-50',
        rose: 'from-rose-500 to-rose-600 border-rose-200 bg-rose-50',
        emerald: 'from-emerald-500 to-emerald-600 border-emerald-200 bg-emerald-50',
        slate: 'from-slate-500 to-slate-600 border-slate-200 bg-slate-50',
    };

    return (
        <div className={`bg-white rounded-xl shadow-md border ${colorClasses[color].split(' ')[1]} overflow-hidden transition-all`}>
            <button
                onClick={onToggle}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 bg-gradient-to-br ${colorClasses[color].split(' ')[0]} rounded-lg`}>
                        <div className="text-white">{icon}</div>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800">{title}</h4>
                </div>
                <div className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>
            {expanded && (
                <div className={`px-6 pb-6 ${colorClasses[color].split(' ')[2]}`}>
                    {children}
                </div>
            )}
        </div>
    );
};

interface FAQItemProps {
    question: string;
    answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
    return (
        <div className="border-l-4 border-teal-500 pl-4 py-2">
            <h5 className="font-semibold text-slate-800 mb-1">{question}</h5>
            <p className="text-slate-600">{answer}</p>
        </div>
    );
};
