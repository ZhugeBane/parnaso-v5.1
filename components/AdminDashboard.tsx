import React, { useState, useEffect } from 'react';
import { User, WritingSession, Project, UserSettings } from '../types';
import { getAllUsers, toggleUserBlock, deleteUser } from '../services/authService';
import { getGlobalStats } from '../services/sessionService';
import { Card } from './ui/Card';

interface AdminDashboardProps {
  currentUser: User;
  onExit: () => void;
  onInspectUser: (user: User, data: { sessions: WritingSession[], projects: Project[], settings: UserSettings }) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ totalWords: 0, totalSessions: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      const globalStats = await getGlobalStats();
      setStats(globalStats);
    } catch (e) {
      console.error("Erro ao carregar admin", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean | undefined) => {
    await toggleUserBlock(userId, !!currentStatus);
    loadData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm("Esta ação removerá o usuário (apenas no banco de dados).")) {
      await deleteUser(userId);
      loadData();
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Painel Administrativo</h1>
            <p className="text-slate-500 text-sm">Controle Geral (Servidor Supabase)</p>
          </div>
        </div>
        <button 
          onClick={onExit}
          className="flex items-center px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Voltar
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-400">Carregando dados do servidor...</div>
      ) : (
        <>
          {/* Global Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-l-4 border-indigo-500">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Usuários</span>
              <div className="text-3xl font-bold text-indigo-600 mt-1">{users.length}</div>
            </Card>
            <Card className="border-l-4 border-teal-500">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Palavras na Plataforma</span>
              <div className="text-3xl font-bold text-teal-600 mt-1">{stats.totalWords.toLocaleString('pt-BR')}</div>
            </Card>
            <Card className="border-l-4 border-amber-500">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sessões Registradas</span>
              <div className="text-3xl font-bold text-amber-600 mt-1">{stats.totalSessions}</div>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              className="block w-full max-w-md px-4 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Função</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold mr-4 ${user.role === 'admin' ? 'bg-slate-800' : 'bg-teal-500'}`}>
                          {(user.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">{user.name}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isBlocked ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-rose-100 text-rose-800">Bloqueado</span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">Ativo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user.role !== 'admin' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleToggleBlock(user.id, user.isBlocked)}
                            className="text-amber-600 hover:text-amber-900"
                          >
                            {user.isBlocked ? 'Desbloquear' : 'Bloquear'}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-rose-600 hover:text-rose-900"
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};