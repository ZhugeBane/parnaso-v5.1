import React, { useState } from 'react';
import { updateSupabaseConfig } from '../lib/supabase';

export const SetupPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && key) {
      updateSupabaseConfig(url, key);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans animate-fade-in">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 translate-x-10 -translate-y-10"></div>
           <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
             <span className="text-2xl">🔌</span> Conectar Servidor
           </h1>
           <p className="text-slate-300 text-sm">
             Para utilizar o aplicativo na nuvem, precisamos conectar ao seu banco de dados Supabase.
           </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Project URL</label>
              <input 
                type="url" 
                placeholder="https://xyz.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-700"
                required
              />
              <p className="text-xs text-slate-400 mt-1">Encontrado em Settings {'>'} API</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Project API Key (Anon / Public)</label>
              <input 
                type="text" 
                placeholder="eyJh..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-slate-700 font-mono text-sm"
                required
              />
              <p className="text-xs text-slate-400 mt-1">Use a chave marcada como <code>anon</code> e <code>public</code>.</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
               <strong>Atenção:</strong> Não utilize chaves <code>service_role</code> ou Tokens Pessoais (começam com <code>sbp_</code>). O aplicativo precisa da chave pública (JWT).
            </div>

            <button 
              type="submit" 
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-100 transition-all transform active:scale-95"
            >
              Salvar e Conectar
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <button 
              onClick={() => setIsHelpOpen(!isHelpOpen)}
              className="text-sm text-slate-500 hover:text-teal-600 font-medium flex items-center justify-center w-full"
            >
              Onde encontro esses dados? {isHelpOpen ? '▲' : '▼'}
            </button>
            
            {isHelpOpen && (
              <div className="mt-4 text-sm text-slate-600 space-y-2 bg-slate-50 p-4 rounded-xl">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Acesse seu painel em <a href="https://supabase.com/dashboard" target="_blank" className="text-teal-600 underline">supabase.com</a>.</li>
                  <li>Selecione seu projeto.</li>
                  <li>No menu lateral, clique em <strong>Project Settings</strong> (ícone de engrenagem).</li>
                  <li>Clique na aba <strong>API</strong>.</li>
                  <li>Copie a <strong>Project URL</strong>.</li>
                  <li>Copie a chave <strong>anon</strong> / <strong>public</strong>.</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};