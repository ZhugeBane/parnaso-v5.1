
import React, { useState } from 'react';
import { register, login, resetPassword } from '../services/authService';
import { User } from '../types';
import { Logo } from './ui/Logo';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
}

type AuthMode = 'login' | 'register' | 'recovery';

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setSuccessMsg('');
  };

  const handleSwitchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await login(email, password);
        onLoginSuccess(user);
      } 
      else if (mode === 'register') {
        if (!name) throw new Error("Nome é obrigatório.");
        const user = await register(name, email, password);
        // Supabase registration usually auto-confirms or sends email depending on settings.
        // Assuming auto-confirm for simplicity in this demo config, or successful user return.
        onLoginSuccess(user);
      }
      else if (mode === 'recovery') {
        await resetPassword(email);
        setSuccessMsg("Se o e-mail existir, um link de recuperação foi enviado.");
        setMode('login');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'login') return "Login";
    if (mode === 'register') return "Criar Conta";
    if (mode === 'recovery') return "Recuperar Senha";
    return "";
  };

  const getButtonText = () => {
    if (loading) return "Processando...";
    if (mode === 'login') return "Entrar";
    if (mode === 'register') return "Cadastrar";
    if (mode === 'recovery') return "Enviar Link";
    return "";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] animate-fade-in">
        
        {/* Left Side - Brand */}
        <div className="md:w-1/2 bg-gradient-to-br from-slate-800 to-slate-900 p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
               <Logo className="w-12 h-12" />
               <span className="text-xl font-bold tracking-tight">Projeto Parnaso</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              {mode === 'login' ? "Bem-vindo de volta." : "Sua jornada começa aqui."}
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Servidor Cloud Ativo. Seus dados, em qualquer lugar.
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full max-w-sm mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">{getTitle()}</h2>

            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-sm flex items-center animate-fade-in">
                {successMsg}
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm flex items-center animate-fade-in">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Nome</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none"
                    placeholder="Seu nome"
                  />
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              {mode !== 'recovery' && (
                <div className="space-y-1">
                  <div className="flex justify-between">
                     <label className="text-sm font-medium text-slate-700">Senha</label>
                     {mode === 'login' && (
                       <button type="button" onClick={() => handleSwitchMode('recovery')} className="text-xs font-semibold text-teal-600 hover:underline">Esqueci a senha</button>
                     )}
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-4 rounded-xl text-white font-bold shadow-lg shadow-teal-100 transition-all transform active:scale-95 mt-4 ${
                  loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-teal-500 hover:bg-teal-600'
                }`}
              >
                {getButtonText()}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-slate-500">
              {mode === 'login' ? (
                <>Não tem conta? <button onClick={() => handleSwitchMode('register')} className="ml-2 font-bold text-teal-600 hover:underline">Cadastre-se</button></>
              ) : (
                <><button onClick={() => handleSwitchMode('login')} className="font-bold text-teal-600 hover:underline">Voltar ao Login</button></>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
