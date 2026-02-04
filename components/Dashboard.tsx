
import React, { useState, useMemo } from 'react';
import { WritingSession, UserSettings, Project, User } from '../types';
import { Card } from './ui/Card';
import { Logo } from './ui/Logo';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardProps {
  user: User;
  sessions: WritingSession[];
  projects: Project[];
  settings: UserSettings;
  onNewSession: () => void;
  onFocusMode: () => void;
  onUpdateSettings: (settings: UserSettings) => void;
  onAddProject: (project: Project) => void;
  onResetData: () => void;
  onLogout: () => void;
  onAdminPanel?: () => void;
  onSocial?: () => void; // Added Prop
  readOnly?: boolean; 
}

// Default colors used for stats other than projects
const STAT_COLORS = ['#2dd4bf', '#f472b6', '#fbbf24', '#a78bfa', '#60a5fa'];
const DEFAULT_PROJECT_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', 
  '#22d3ee', '#818cf8', '#e879f9', '#f43f5e', '#64748b'
];

type DateFilterType = 'all' | '7days' | '30days' | '6months' | '1year';

// --- ICONS FOR TROPHIES ---
const Icons = {
  Fire: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  Medal: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
  ),
  Trophy: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
  ),
  Crown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
  )
};

// --- TROPHY DEFINITIONS ---
type TrophyType = {
  id: string;
  title: string;
  description: string;
  threshold: number;
  category: 'daily' | 'weekly' | 'monthly' | 'total' | 'streak';
  icon: keyof typeof Icons;
  color: string;
};

const TROPHIES: TrophyType[] = [
  // Daily
  { id: 'daily_500', title: 'Start Rápido', description: 'Escreva 500 palavras em um dia', threshold: 500, category: 'daily', icon: 'Shield', color: 'bg-emerald-100 text-emerald-600' },
  { id: 'daily_1000', title: 'Fluxo Intenso', description: 'Escreva 1.000 palavras em um dia', threshold: 1000, category: 'daily', icon: 'Shield', color: 'bg-teal-100 text-teal-600' },
  { id: 'daily_2000', title: 'Hiperfoco', description: 'Escreva 2.000 palavras em um dia', threshold: 2000, category: 'daily', icon: 'Shield', color: 'bg-cyan-100 text-cyan-600' },
  // Weekly
  { id: 'weekly_3000', title: 'Fim de Semana', description: '3.000 palavras em uma semana', threshold: 3000, category: 'weekly', icon: 'Medal', color: 'bg-indigo-100 text-indigo-600' },
  { id: 'weekly_7000', title: 'Maratonista', description: '7.000 palavras em uma semana', threshold: 7000, category: 'weekly', icon: 'Medal', color: 'bg-violet-100 text-violet-600' },
  // Monthly
  { id: 'monthly_10000', title: 'Romancista Jr', description: '10.000 palavras em um mês', threshold: 10000, category: 'monthly', icon: 'Trophy', color: 'bg-fuchsia-100 text-fuchsia-600' },
  { id: 'monthly_30000', title: 'Best Seller', description: '30.000 palavras em um mês', threshold: 30000, category: 'monthly', icon: 'Trophy', color: 'bg-pink-100 text-pink-600' },
  // Streak
  { id: 'streak_3', title: 'Faísca', description: '3 dias seguidos escrevendo', threshold: 3, category: 'streak', icon: 'Fire', color: 'bg-orange-100 text-orange-600' },
  { id: 'streak_7', title: 'Em Chamas', description: '7 dias seguidos escrevendo', threshold: 7, category: 'streak', icon: 'Fire', color: 'bg-red-100 text-red-600' },
  // Total
  { id: 'total_50000', title: 'O Grande Livro', description: '50.000 palavras no total', threshold: 50000, category: 'total', icon: 'Crown', color: 'bg-amber-100 text-amber-600' },
];


// Helper Component OUTSIDE Main
const Stat = ({ label, value, colorClass, subValue }: any) => (
  <div className="flex flex-col">
    <span className="text-sm text-slate-500 font-medium uppercase tracking-wider">{label}</span>
    <div className="flex items-baseline gap-2 mt-1">
      <span className={`text-3xl font-bold ${colorClass}`}>{value}</span>
      {subValue && <span className="text-sm text-slate-400">{subValue}</span>}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ user, sessions, projects, settings, onNewSession, onFocusMode, onUpdateSettings, onAddProject, onResetData, onLogout, onAdminPanel, onSocial, readOnly = false }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'projects' | 'achievements'>('general');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('7days');
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<UserSettings>(settings);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // New Project Modal State
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectGoal, setNewProjectGoal] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(DEFAULT_PROJECT_COLORS[Math.floor(Math.random() * DEFAULT_PROJECT_COLORS.length)]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newProjectName) return;

    const project: Project = {
      id: Date.now().toString(),
      name: newProjectName,
      description: newProjectDesc,
      targetWordCount: newProjectGoal ? Number(newProjectGoal) : undefined,
      color: newProjectColor,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    onAddProject(project);
    setShowNewProject(false);
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectGoal('');
    setNewProjectColor(DEFAULT_PROJECT_COLORS[Math.floor(Math.random() * DEFAULT_PROJECT_COLORS.length)]);
  };

  // --- Filtering Logic ---
  const filterSessionsByDate = (allSessions: WritingSession[], filter: DateFilterType) => {
    const now = new Date();
    // Normalize now to end of day to include all today's sessions
    now.setHours(23, 59, 59, 999);
    
    let cutoff = new Date(0); // Epoch for 'all'

    if (filter === '7days') {
      cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 7);
    } else if (filter === '30days') {
      cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 30);
    } else if (filter === '6months') {
      cutoff = new Date(now);
      cutoff.setMonth(now.getMonth() - 6);
    } else if (filter === '1year') {
      cutoff = new Date(now);
      cutoff.setFullYear(now.getFullYear() - 1);
    }
    
    // Reset cutoff hours to start of day
    if (filter !== 'all') {
      cutoff.setHours(0, 0, 0, 0);
    }

    return allSessions.filter(s => new Date(s.date) >= cutoff);
  };

  const projectFilteredSessions = selectedProjectId 
    ? sessions.filter(s => s.projectId === selectedProjectId)
    : sessions;
  
  const filteredSessions = filterSessionsByDate(projectFilteredSessions, dateFilter);

  // --- Statistics Logic ---
  const sortedSessions = [...filteredSessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Group data for Stacked Bar Chart
  const dateMap = new Map<string, any>();
  
  sortedSessions.forEach(s => {
    const dateStr = new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const existing = dateMap.get(dateStr) || { date: dateStr };
    
    // Project ID as key, wordCount as value. Handle 'General' sessions with key 'general'
    const key = s.projectId || 'general';
    existing[key] = (existing[key] || 0) + s.wordCount;
    existing.total = (existing.total || 0) + s.wordCount; // Keep track of total for tooltip if needed
    
    dateMap.set(dateStr, existing);
  });

  const wordsOverTime = Array.from(dateMap.values());

  const metricsData = sortedSessions.map(s => ({
    date: new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    estresse: s.stressLevel,
    dificuldade: s.difficultyLevel,
    avaliacao: s.sessionRating
  }));

  const strategyUsage = [
    { name: 'Esqueleto', value: filteredSessions.filter(s => s.usedSkeleton).length },
    { name: 'Rascunhos', value: filteredSessions.filter(s => s.usedDrafts).length },
    { name: 'Gestão Tempo', value: filteredSessions.filter(s => s.usedTimeStrategy).length },
    { name: 'Multitasking', value: filteredSessions.filter(s => s.wasMultitasking).length },
  ].filter(d => d.value > 0);

  // KPIs
  const totalWords = filteredSessions.reduce((acc, curr) => acc + curr.wordCount, 0);
  const avgStress = filteredSessions.length ? (filteredSessions.reduce((acc, curr) => acc + curr.stressLevel, 0) / filteredSessions.length).toFixed(1) : 0;
  const avgWords = filteredSessions.length ? Math.round(totalWords / filteredSessions.length) : 0;

  // Streak calculation
  const calculateStreak = () => {
    if (projectFilteredSessions.length === 0) return 0;
    const allSorted = [...projectFilteredSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const uniqueTimestamps = Array.from(new Set(allSorted.map(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })));
    
    const uniqueDates = uniqueTimestamps.map(ts => new Date(ts as number));
    if (uniqueDates.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWriteTime = uniqueDates[0].getTime();
    
    // If user hasn't written today or yesterday, streak is broken
    if (lastWriteTime !== today.getTime() && lastWriteTime !== yesterday.getTime()) return 0;
    
    let streak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const current = uniqueDates[i];
      const prev = uniqueDates[i + 1];
      const diffTime = Math.abs(current.getTime() - prev.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays === 1) streak++; else break;
    }
    return streak;
  };
  const currentStreak = calculateStreak();

  // Goals
  const today = new Date().toLocaleDateString('en-CA');
  const wordsToday = sessions
    .filter(s => new Date(s.date).toLocaleDateString('en-CA') === today)
    .reduce((acc, curr) => acc + curr.wordCount, 0);
  const dailyProgress = Math.min(100, Math.round((wordsToday / settings.dailyWordGoal) * 100));

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const wordsWeek = sessions
    .filter(s => new Date(s.date) >= oneWeekAgo)
    .reduce((acc, curr) => acc + curr.wordCount, 0);
  const weeklyProgress = Math.min(100, Math.round((wordsWeek / settings.weeklyWordGoal) * 100));

  // Project Specific Goal
  const activeProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
  const projectProgress = activeProject?.targetWordCount ? Math.min(100, Math.round((totalWords / activeProject.targetWordCount) * 100)) : 0;

  // Calendar
  const generateCalendarDays = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const checkDate = new Date(year, month, i).toLocaleDateString('en-CA');
      const hasSession = filteredSessions.some(s => new Date(s.date).toLocaleDateString('en-CA') === checkDate);
      days.push({ day: i, hasSession });
    }
    return days;
  };
  const calendarDays = generateCalendarDays();

  // --- TROPHY CALCULATIONS ---
  const achievementStats = useMemo(() => {
    // 1. Calculate stats needed for trophies
    const stats = {
      maxDailyWords: 0,
      maxWeeklyWords: 0,
      maxMonthlyWords: 0,
      totalWords: 0,
      maxStreak: 0,
    };

    if (sessions.length === 0) return stats;

    stats.totalWords = sessions.reduce((acc, s) => acc + s.wordCount, 0);

    // Group by Day
    const dailyMap = new Map<string, number>();
    sessions.forEach(s => {
      const d = new Date(s.date).toLocaleDateString('en-CA');
      dailyMap.set(d, (dailyMap.get(d) || 0) + s.wordCount);
    });
    stats.maxDailyWords = Math.max(0, ...Array.from(dailyMap.values()));

    // Group by Week (Simple approximation: Year-WeekNumber)
    const getWeekKey = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${d.getFullYear()}-W${weekNo}`;
    };
    const weeklyMap = new Map<string, number>();
    sessions.forEach(s => {
      const key = getWeekKey(new Date(s.date));
      weeklyMap.set(key, (weeklyMap.get(key) || 0) + s.wordCount);
    });
    stats.maxWeeklyWords = Math.max(0, ...Array.from(weeklyMap.values()));

    // Group by Month
    const monthlyMap = new Map<string, number>();
    sessions.forEach(s => {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + s.wordCount);
    });
    stats.maxMonthlyWords = Math.max(0, ...Array.from(monthlyMap.values()));

    // Calculate Max Streak (historical)
    // Get unique sorted dates
    const sortedDates = Array.from(dailyMap.keys()).sort().map(d => new Date(d));
    let currentStreak = 0;
    let maxStreak = 0;
    if (sortedDates.length > 0) {
      currentStreak = 1;
      maxStreak = 1;
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const curr = sortedDates[i].getTime();
        const next = sortedDates[i+1].getTime();
        const diffDays = Math.round(Math.abs((next - curr) / (1000 * 60 * 60 * 24)));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      }
    }
    stats.maxStreak = maxStreak;

    return stats;
  }, [sessions]);

  const saveSettings = () => {
    onUpdateSettings(tempSettings);
    setShowSettings(false);
    setDeleteConfirm(false);
  };

  const handleReset = () => {
    onResetData();
    setShowSettings(false);
    setDeleteConfirm(false);
    setActiveTab('general');
    setSelectedProjectId(null);
  }

  // --- Render Functions ---

  const renderKPIs = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="border-l-4 border-teal-400">
        <Stat label="Total de Palavras" value={totalWords.toLocaleString('pt-BR')} colorClass="text-teal-600" />
        {activeProject && activeProject.targetWordCount && (
           <div className="mt-2 text-xs text-slate-500">Meta: {activeProject.targetWordCount} ({projectProgress}%)</div>
        )}
      </Card>
      <Card className="border-l-4 border-purple-400">
        <Stat label="Média / Sessão" value={avgWords} subValue="palavras" colorClass="text-purple-600" />
      </Card>
      <Card className="border-l-4 border-amber-400">
        <Stat label="Sequência Atual" value={currentStreak} subValue="dias" colorClass="text-amber-500" />
      </Card>
      <Card className="border-l-4 border-rose-400">
        <Stat label="Média de Estresse" value={avgStress} colorClass="text-rose-500" />
      </Card>
    </div>
  );

  const renderCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
      <div className="lg:col-span-2 space-y-8">
        <Card title="Produção de Palavras" subtitle="Histórico de volume por sessão">
          <div className="mb-4 flex gap-2">
             <div className="bg-slate-100 rounded-lg p-1 flex text-xs font-medium">
                <button onClick={() => setDateFilter('7days')} className={`px-3 py-1 rounded-md transition-all ${dateFilter === '7days' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Semanal</button>
                <button onClick={() => setDateFilter('30days')} className={`px-3 py-1 rounded-md transition-all ${dateFilter === '30days' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Mensal</button>
                <button onClick={() => setDateFilter('6months')} className={`px-3 py-1 rounded-md transition-all ${dateFilter === '6months' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Semestral</button>
                <button onClick={() => setDateFilter('1year')} className={`px-3 py-1 rounded-md transition-all ${dateFilter === '1year' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Anual</button>
                <button onClick={() => setDateFilter('all')} className={`px-3 py-1 rounded-md transition-all ${dateFilter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Todos</button>
             </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wordsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <RechartsTooltip 
                  cursor={{fill: '#f8fafc', opacity: 0.8}}
                  contentStyle={{
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                    padding: '12px'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '15px'}} />
                {/* General/No-Project Bar */}
                <Bar 
                  dataKey="general" 
                  stackId="a" 
                  fill="#cbd5e1" 
                  name="Geral / Sem Obra" 
                  radius={[4, 4, 0, 0]} 
                />
                {/* Dynamic Bars for each Project */}
                {projects.map(p => (
                   <Bar 
                    key={p.id} 
                    dataKey={p.id} 
                    stackId="a" 
                    fill={p.color || '#2dd4bf'} 
                    name={p.name} 
                    radius={[4, 4, 0, 0]} 
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Indicadores de Qualidade" subtitle="Estresse, Dificuldade e Avaliação">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis domain={[0, 6]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <RechartsTooltip 
                  contentStyle={{
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '15px'}} />
                <Line 
                  type="monotone" 
                  dataKey="estresse" 
                  stroke="#f43f5e" 
                  strokeWidth={3} 
                  dot={{r: 4, strokeWidth: 2, fill: '#fff', stroke: '#f43f5e'}} 
                  activeDot={{r: 6, strokeWidth: 0, fill: '#f43f5e'}}
                  name="Estresse" 
                />
                <Line 
                  type="monotone" 
                  dataKey="dificuldade" 
                  stroke="#f59e0b" 
                  strokeWidth={3} 
                  dot={{r: 4, strokeWidth: 2, fill: '#fff', stroke: '#f59e0b'}} 
                  activeDot={{r: 6, strokeWidth: 0, fill: '#f59e0b'}}
                  name="Dificuldade" 
                />
                <Line 
                  type="monotone" 
                  dataKey="avaliacao" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{r: 4, strokeWidth: 2, fill: '#fff', stroke: '#10b981'}} 
                  activeDot={{r: 6, strokeWidth: 0, fill: '#10b981'}}
                  name="Avaliação" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="space-y-8">
         <Card title="Calendário" subtitle="Dias escritos neste mês">
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {['D','S','T','Q','Q','S','S'].map((d, i) => (
                <div key={i} className="text-slate-400 font-medium py-1">{d}</div>
              ))}
              {calendarDays.map((d, i) => (
                 <div key={i} className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all hover:scale-105 cursor-default ${
                    !d ? 'bg-transparent' : 
                    d.hasSession ? 'bg-teal-500 text-white shadow-lg shadow-teal-200' : 'bg-slate-50 text-slate-300'
                 }`}>
                   {d?.day}
                 </div>
              ))}
            </div>
         </Card>

         <Card title="Estratégias">
            <div className="h-64 w-full">
              {strategyUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={strategyUsage}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      cornerRadius={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {strategyUsage.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={STAT_COLORS[index % STAT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Dados insuficientes
                </div>
              )}
            </div>
         </Card>
      </div>
    </div>
  );

  const renderSessionList = () => (
    <Card title="Últimos Registros">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="uppercase tracking-wider border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Data</th>
              <th scope="col" className="px-4 py-3 font-medium">Obra</th>
              <th scope="col" className="px-4 py-3 font-medium">Palavras</th>
              <th scope="col" className="px-4 py-3 font-medium">Avaliação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedSessions.slice().reverse().slice(0, 5).map((session) => {
              const proj = projects.find(p => p.id === session.projectId);
              return (
              <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-600">{new Date(session.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-500 truncate max-w-[120px]">
                  {proj ? (
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }}></div>
                       {proj.name}
                    </div>
                  ) : <span className="text-slate-400 italic">Geral</span>}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{session.wordCount}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    session.sessionRating >= 4 ? 'bg-emerald-100 text-emerald-700' :
                    session.sessionRating >= 3 ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {session.sessionRating}/5
                  </span>
                </td>
              </tr>
            )})}
            {sortedSessions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum registro encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const renderAchievements = () => {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
           <h2 className="text-2xl font-bold text-slate-800">Galeria de Conquistas</h2>
           <p className="text-slate-500">Desbloqueie troféus atingindo suas metas de escrita.</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           {TROPHIES.map(trophy => {
             const Icon = Icons[trophy.icon];
             let unlocked = false;
             let currentValue = 0;

             switch (trophy.category) {
               case 'daily':
                 currentValue = achievementStats.maxDailyWords;
                 break;
               case 'weekly':
                 currentValue = achievementStats.maxWeeklyWords;
                 break;
               case 'monthly':
                 currentValue = achievementStats.maxMonthlyWords;
                 break;
               case 'total':
                 currentValue = achievementStats.totalWords;
                 break;
               case 'streak':
                 currentValue = achievementStats.maxStreak;
                 break;
             }
             
             unlocked = currentValue >= trophy.threshold;
             const progress = Math.min(100, (currentValue / trophy.threshold) * 100);

             return (
               <div 
                 key={trophy.id} 
                 className={`relative overflow-hidden rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 border ${
                    unlocked 
                      ? 'bg-white border-transparent shadow-lg shadow-slate-200 scale-100' 
                      : 'bg-slate-50 border-slate-200 opacity-60 grayscale hover:opacity-80 hover:scale-105 cursor-help'
                 }`}
               >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${unlocked ? trophy.color : 'bg-slate-200 text-slate-400'}`}>
                     <Icon />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1">{trophy.title}</h3>
                  <p className="text-xs text-slate-500 mb-4 h-8 flex items-center">{trophy.description}</p>
                  
                  {unlocked ? (
                    <div className="mt-auto">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider">Conquistado</span>
                    </div>
                  ) : (
                    <div className="w-full mt-auto">
                       <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase font-bold">
                          <span>Progresso</span>
                          <span>{Math.round(progress)}%</span>
                       </div>
                       <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-400 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                       </div>
                    </div>
                  )}
               </div>
             )
           })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
           {readOnly ? (
              <div className="flex items-center gap-2">
                 <div className="p-2 bg-slate-800 text-white rounded-lg">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                   </svg>
                 </div>
                 <div>
                    <h1 className="text-2xl font-bold text-slate-800">Inspecionando: {user.name}</h1>
                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Modo Leitura</span>
                 </div>
              </div>
           ) : (
             <div className="flex items-center gap-4">
               <div className="relative group">
                 <div className="absolute inset-0 bg-teal-400 rounded-full blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                 {/* Replaced img with Logo Component */}
                 <Logo className="relative w-20 h-20 drop-shadow-md transform transition-transform group-hover:scale-105" />
               </div>
               <div>
                 <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Projeto Parnaso</h1>
                 <p className="text-slate-500 mt-1 flex items-center gap-2">
                   Olá, <span className="font-semibold text-teal-600">{user.name}</span>. Vamos escrever?
                 </p>
               </div>
            </div>
           )}
        </div>
        
        <div className="flex gap-3">
          {user.role === 'admin' && !readOnly && (
             <button 
               onClick={onAdminPanel}
               className="flex items-center px-4 py-3 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition-colors shadow-lg shadow-slate-300"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>
               Painel Admin
             </button>
          )}

          {!readOnly && (
            <>
              {onSocial && (
                <button
                  onClick={onSocial}
                  className="flex items-center justify-center px-4 py-3 bg-white border border-slate-200 text-teal-600 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                  title="Comunidade e Chat"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                   </svg>
                   Comunidade
                </button>
              )}
              <button
                onClick={() => { setTempSettings(settings); setShowSettings(true); setDeleteConfirm(false); }}
                className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                title="Configurar Metas"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button onClick={onFocusMode} className="flex items-center justify-center px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl shadow-lg shadow-slate-300 transition-all hover:-translate-y-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Modo Foco
              </button>
              <button onClick={onNewSession} className="flex items-center justify-center px-5 py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl shadow-lg shadow-teal-200 transition-all hover:-translate-y-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Registrar
              </button>
              <button onClick={onLogout} className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors shadow-sm ml-2" title="Sair">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                 </svg>
              </button>
            </>
          )}

          {readOnly && (
             <button onClick={onAdminPanel} className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-300 transition-colors">
               Fechar Inspeção
             </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-200 mb-6 overflow-x-auto">
        <button 
          onClick={() => { setActiveTab('general'); setSelectedProjectId(null); }}
          className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'general' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Visão Geral
        </button>
        <button 
          onClick={() => setActiveTab('projects')}
          className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'projects' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Minhas Obras
        </button>
        <button 
          onClick={() => setActiveTab('achievements')}
          className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'achievements' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Conquistas
        </button>
      </div>

      {/* VIEW: PROJECTS LIST */}
      {activeTab === 'projects' && !selectedProjectId && (
        <div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* New Project Button */}
              {!readOnly && (
                <button 
                  onClick={() => setShowNewProject(true)}
                  className="flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                   </svg>
                   <span className="font-medium">Criar Nova Obra</span>
                </button>
              )}

              {projects.map(project => {
                 const projWords = sessions.filter(s => s.projectId === project.id).reduce((a,b) => a + b.wordCount, 0);
                 const percent = project.targetWordCount ? Math.min(100, Math.round((projWords / project.targetWordCount) * 100)) : 0;
                 return (
                  <div key={project.id} onClick={() => setSelectedProjectId(project.id)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                     {/* Color indicator strip */}
                     <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: project.color || '#ccc' }}></div>
                     
                     <div className="pl-4">
                       <h3 className="text-xl font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{project.name}</h3>
                       <p className="text-sm text-slate-500 mt-1 line-clamp-2 h-10">{project.description || "Sem descrição."}</p>
                       
                       <div className="mt-6">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                             <span>Progresso</span>
                             <span>{projWords} {project.targetWordCount ? `/ ${project.targetWordCount}` : 'palavras'}</span>
                          </div>
                          {project.targetWordCount && (
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div className="h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: project.color || '#2dd4bf' }}></div>
                            </div>
                          )}
                       </div>
                     </div>
                  </div>
                 )
              })}
           </div>
        </div>
      )}

      {/* VIEW: ACHIEVEMENTS */}
      {activeTab === 'achievements' && renderAchievements()}

      {/* VIEW: ACTIVE DASHBOARD (General or Specific Project) */}
      {(activeTab === 'general' || selectedProjectId) && (
        <>
          {selectedProjectId && (
            <div className="mb-6 flex items-center">
              <button onClick={() => setSelectedProjectId(null)} className="flex items-center text-slate-500 hover:text-teal-600 transition-colors mr-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                 </svg>
                 Voltar para Obras
              </button>
              <h2 className="text-2xl font-bold text-slate-800">
                {projects.find(p => p.id === selectedProjectId)?.name}
              </h2>
            </div>
          )}

          {activeTab === 'general' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
               <Card>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-semibold text-slate-700">Meta Diária</span>
                    <span className="text-sm text-slate-500">{wordsToday} / {settings.dailyWordGoal} palavras</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                     <div className="bg-teal-400 h-3 rounded-full transition-all duration-1000" style={{ width: `${dailyProgress}%` }}></div>
                  </div>
               </Card>
               <Card>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-semibold text-slate-700">Meta Semanal</span>
                    <span className="text-sm text-slate-500">{wordsWeek} / {settings.weeklyWordGoal} palavras</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                     <div className="bg-emerald-400 h-3 rounded-full transition-all duration-1000" style={{ width: `${weeklyProgress}%` }}></div>
                  </div>
               </Card>
            </div>
          )}

          {renderKPIs()}
          {renderCharts()}
          {renderSessionList()}
        </>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-fade-in overflow-y-auto max-h-[90vh]">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Configurar Metas Gerais</h2>
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Meta Diária (palavras)</label>
                    <input type="number" value={tempSettings.dailyWordGoal} onChange={(e) => setTempSettings({...tempSettings, dailyWordGoal: Number(e.target.value)})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-400 outline-none" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Meta Semanal (palavras)</label>
                    <input type="number" value={tempSettings.weeklyWordGoal} onChange={(e) => setTempSettings({...tempSettings, weeklyWordGoal: Number(e.target.value)})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-400 outline-none" />
                 </div>
              </div>

              {/* Danger Zone */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-2">Zona de Perigo</h3>
                <div className="bg-rose-50 rounded-lg p-4 border border-rose-100">
                  {!deleteConfirm ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-rose-800 font-medium">Zerar todos os dados do aplicativo?</span>
                      <button 
                        onClick={() => setDeleteConfirm(true)}
                        className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-white border border-rose-200 rounded hover:bg-rose-100 transition-colors"
                      >
                        Zerar Tudo
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-rose-800 mb-3 font-medium">Tem certeza? Isso apagará todas as obras e sessões permanentemente.</p>
                      <div className="flex gap-2 justify-center">
                        <button 
                          onClick={() => setDeleteConfirm(false)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleReset}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 rounded hover:bg-rose-700 transition-colors"
                        >
                          Sim, apagar tudo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                 <button onClick={() => {setShowSettings(false); setDeleteConfirm(false);}} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancelar</button>
                 <button onClick={saveSettings} className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600">Salvar</button>
              </div>
           </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Criar Nova Obra</h2>
              <form onSubmit={handleCreateProject} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Obra *</label>
                    <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-400 outline-none" placeholder="Ex: O Último Romance" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição Curta</label>
                    <textarea rows={2} value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-400 outline-none" placeholder="Sinopse ou notas..." />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Meta de Palavras</label>
                      <input type="number" value={newProjectGoal} onChange={(e) => setNewProjectGoal(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-400 outline-none" placeholder="Ex: 80000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Cor da Obra</label>
                      <div className="flex gap-2">
                        <input type="color" value={newProjectColor} onChange={(e) => setNewProjectColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-none p-0" />
                        <div className="flex-1 flex flex-wrap gap-1">
                          {DEFAULT_PROJECT_COLORS.slice(0, 5).map(c => (
                            <button 
                              key={c} 
                              type="button" 
                              onClick={() => setNewProjectColor(c)} 
                              style={{ backgroundColor: c }} 
                              className="w-4 h-4 rounded-full border border-white shadow-sm hover:scale-110 transition-transform"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                 </div>
                 <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={() => setShowNewProject(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600">Criar Obra</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
