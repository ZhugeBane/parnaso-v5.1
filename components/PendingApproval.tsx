import React from 'react';
import { Logo } from './ui/Logo';

interface PendingApprovalProps {
    onBack: () => void;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans animate-fade-in">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8 text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                        <Logo className="w-12 h-12 text-teal-600" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-4">Cadastro Realizado!</h2>

                <p className="text-slate-600 mb-6 leading-relaxed">
                    Sua conta foi criada com sucesso e está <strong>aguardando aprovação</strong>.
                </p>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8 text-left">
                    <p className="text-sm text-amber-800 font-medium flex gap-2">
                        <span className="text-xl">⏳</span>
                        <span>
                            Para garantir a segurança da comunidade, novos membros precisam ser verificados por um administrador antes de acessar a plataforma.
                        </span>
                    </p>
                </div>

                <button
                    onClick={onBack}
                    className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                    Voltar ao Início
                </button>
            </div>
        </div>
    );
};
