
import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Target, Users, Settings, Lightbulb, HelpCircle, Feather, Clock, BarChart3, Sparkles } from 'lucide-react';
import { Logo } from './ui/Logo';

interface HelpPageProps {
    onExit: () => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({ onExit }) => {
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
                        <span className="font-medium">Voltar</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <Logo className="w-10 h-10" />
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent">
                            Ajuda & Sobre
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
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">Bem-vindo ao Parnaso</h2>
                            <p className="text-lg text-slate-600">
                                Seu companheiro para uma jornada de escrita mais produtiva e inspiradora
                            </p>
                        </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                        O <strong>Parnaso</strong> é uma plataforma completa para escritores que desejam acompanhar seu progresso,
                        manter o foco e se conectar com outros apaixonados pela escrita. Aqui você encontra ferramentas para
                        registrar suas sessões, organizar projetos e cultivar o hábito da escrita criativa.
                    </p>
                </div>

                {/* Features Section */}
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    Funcionalidades Principais
                </h3>

                <div className="space-y-4 mb-12">
                    {/* Sessões de Escrita */}
                    <FeatureCard
                        icon={<Clock className="w-6 h-6" />}
                        title="📝 Sessões de Escrita"
                        color="teal"
                        expanded={expandedSection === 'sessions'}
                        onToggle={() => toggleSection('sessions')}
                    >
                        <p className="text-slate-700 mb-3">
                            Registre cada momento que você dedica à escrita. Acompanhe seu tempo, palavras escritas e progresso ao longo do tempo.
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-teal-500 font-bold">•</span>
                                <span>Registre horário de início e fim de cada sessão</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-teal-500 font-bold">•</span>
                                <span>Conte palavras automaticamente</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-teal-500 font-bold">•</span>
                                <span>Adicione notas e reflexões sobre cada sessão</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-teal-500 font-bold">•</span>
                                <span>Vincule sessões a projetos específicos</span>
                            </li>
                        </ul>
                    </FeatureCard>

                    {/* Modo Foco */}
                    <FeatureCard
                        icon={<Target className="w-6 h-6" />}
                        title="🎯 Modo Foco"
                        color="purple"
                        expanded={expandedSection === 'focus'}
                        onToggle={() => toggleSection('focus')}
                    >
                        <p className="text-slate-700 mb-3">
                            Um ambiente minimalista e sem distrações para você se concentrar apenas na escrita.
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-purple-500 font-bold">•</span>
                                <span>Interface limpa e sem distrações</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-500 font-bold">•</span>
                                <span>Contador de palavras em tempo real</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-500 font-bold">•</span>
                                <span>Timer automático de sessão</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-500 font-bold">•</span>
                                <span>Salve seu progresso ao finalizar</span>
                            </li>
                        </ul>
                    </FeatureCard>

                    {/* Projetos */}
                    <FeatureCard
                        icon={<BookOpen className="w-6 h-6" />}
                        title="📚 Projetos"
                        color="indigo"
                        expanded={expandedSection === 'projects'}
                        onToggle={() => toggleSection('projects')}
                    >
                        <p className="text-slate-700 mb-3">
                            Organize suas obras literárias e acompanhe o progresso de cada projeto.
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span>Crie projetos para romances, contos, poemas, etc.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span>Defina metas de palavras para cada projeto</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span>Visualize estatísticas e progresso</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span>Associe sessões de escrita aos seus projetos</span>
                            </li>
                        </ul>
                    </FeatureCard>

                    {/* Social Hub */}
                    <FeatureCard
                        icon={<Users className="w-6 h-6" />}
                        title="👥 Social Hub"
                        color="rose"
                        expanded={expandedSection === 'social'}
                        onToggle={() => toggleSection('social')}
                    >
                        <p className="text-slate-700 mb-3">
                            Conecte-se com outros escritores, compartilhe seu progresso e encontre inspiração.
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>Compartilhe suas conquistas e marcos</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>Veja o que outros escritores estão criando</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>Interaja através de curtidas e comentários</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>Encontre motivação na comunidade</span>
                            </li>
                        </ul>
                    </FeatureCard>

                    {/* Estatísticas */}
                    <FeatureCard
                        icon={<BarChart3 className="w-6 h-6" />}
                        title="📊 Estatísticas"
                        color="emerald"
                        expanded={expandedSection === 'stats'}
                        onToggle={() => toggleSection('stats')}
                    >
                        <p className="text-slate-700 mb-3">
                            Visualize seu progresso através de gráficos e métricas detalhadas.
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>Total de palavras escritas</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>Tempo total dedicado à escrita</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>Média de palavras por sessão</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>Sequência de dias escrevendo</span>
                            </li>
                        </ul>
                    </FeatureCard>

                    {/* Configurações */}
                    <FeatureCard
                        icon={<Settings className="w-6 h-6" />}
                        title="⚙️ Configurações"
                        color="slate"
                        expanded={expandedSection === 'settings'}
                        onToggle={() => toggleSection('settings')}
                    >
                        <p className="text-slate-700 mb-3">
                            Personalize sua experiência no Parnaso de acordo com suas preferências.
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="text-slate-500 font-bold">•</span>
                                <span>Defina sua meta diária de palavras</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-slate-500 font-bold">•</span>
                                <span>Configure notificações e lembretes</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-slate-500 font-bold">•</span>
                                <span>Ajuste preferências de privacidade</span>
                            </li>
                        </ul>
                    </FeatureCard>
                </div>

                {/* Tips Section */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg p-8 mb-8 border border-amber-200">
                    <h3 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Lightbulb className="w-6 h-6 text-amber-500" />
                        Dicas para Aproveitar ao Máximo
                    </h3>
                    <ul className="space-y-3 text-slate-700">
                        <li className="flex items-start gap-3">
                            <span className="text-2xl">✍️</span>
                            <span><strong>Escreva todos os dias:</strong> Mesmo que por poucos minutos, a consistência é fundamental para desenvolver o hábito da escrita.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-2xl">🎯</span>
                            <span><strong>Use o Modo Foco:</strong> Quando precisar de concentração total, ative o Modo Foco para eliminar distrações.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-2xl">📊</span>
                            <span><strong>Acompanhe seu progresso:</strong> Revise suas estatísticas regularmente para ver o quanto você evoluiu.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-2xl">🤝</span>
                            <span><strong>Conecte-se com a comunidade:</strong> Compartilhe suas conquistas e inspire-se com outros escritores.</span>
                        </li>
                    </ul>
                </div>

                {/* FAQ Section */}
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <HelpCircle className="w-6 h-6 text-teal-500" />
                        Perguntas Frequentes
                    </h3>
                    <div className="space-y-4">
                        <FAQItem
                            question="Como faço para registrar uma sessão de escrita?"
                            answer="Clique no botão 'Nova Sessão' no Dashboard. Você pode usar o Modo Foco para escrever e o sistema registrará automaticamente o tempo e contagem de palavras, ou pode registrar manualmente uma sessão já concluída."
                        />
                        <FAQItem
                            question="Posso editar ou excluir sessões antigas?"
                            answer="Atualmente, as sessões são registradas de forma permanente para manter a integridade do seu histórico. Se precisar fazer correções, entre em contato com o suporte."
                        />
                        <FAQItem
                            question="Como funciona o Social Hub?"
                            answer="No Social Hub, você pode compartilhar suas conquistas, ver posts de outros escritores e interagir através de curtidas e comentários. É uma forma de se manter motivado e conectado com a comunidade."
                        />
                        <FAQItem
                            question="Meus dados estão seguros?"
                            answer="Sim! Todos os seus dados são armazenados de forma segura no Firebase/Firestore com autenticação e regras de segurança. Apenas você tem acesso às suas sessões e projetos privados."
                        />
                        <FAQItem
                            question="Como defino metas para meus projetos?"
                            answer="Ao criar ou editar um projeto, você pode definir uma meta de palavras. O sistema acompanhará automaticamente seu progresso conforme você registra sessões vinculadas a esse projeto."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-slate-500">
                    <p className="mb-2">Feito com 💜 para escritores apaixonados</p>
                    <p className="text-sm">Parnaso - Sua jornada literária começa aqui</p>
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
