
import React, { useState, useEffect } from 'react';
import { WritingSession, Project } from '../types';
import { Card } from './ui/Card';

interface SessionFormProps {
  onSubmit: (session: WritingSession) => void;
  onCancel: () => void;
  initialValues?: Partial<WritingSession>;
  projects: Project[];
}

const MOTIVATIONAL_MESSAGES = [
  "A escrita é a pintura da voz. Ótimo trabalho!",
  "A inspiração existe, mas ela precisa te encontrar trabalhando.",
  "Mais um passo dado na sua jornada literária.",
  "O segredo é a constância. Continue assim!",
  "Você está construindo mundos, palavra por palavra.",
  "Nenhum dia sem uma linha. Parabéns pelo foco!",
  "Sua história está ganhando vida.",
  "Escrever é reescrever. Bom progresso!",
  "A disciplina é a mãe da criatividade.",
  "Cada palavra conta. Você foi longe hoje!"
];

// --- Helper Components ---

const RadioGroup = ({ label, value, onChange, options, minLabel, maxLabel }: any) => (
  <div className="mb-6">
    <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
    <div className="flex items-center justify-between space-x-2">
      {minLabel && <span className="text-xs text-slate-400 w-20 text-right">{minLabel}</span>}
      <div className="flex bg-slate-100 rounded-lg p-1">
        {options.map((opt: number) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`w-10 h-10 rounded-md text-sm font-medium transition-all ${
              value === opt
                ? 'bg-teal-500 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {maxLabel && <span className="text-xs text-slate-400 w-20 text-left">{maxLabel}</span>}
    </div>
  </div>
);

const Toggle = ({ label, checked, onChange, subLabel }: any) => (
  <div className="mb-4">
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-teal-500' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
    {subLabel && <p className="text-xs text-slate-500 mt-1">{subLabel}</p>}
  </div>
);

const InputField = ({ label, type = "text", value, onChange, placeholder, required }: any) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label} {required && '*'}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all"
    />
  </div>
);

// --- Main Component ---

export const SessionForm: React.FC<SessionFormProps> = ({ onSubmit, onCancel, initialValues, projects }) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingSession, setPendingSession] = useState<WritingSession | null>(null);
  const [randomMessage, setRandomMessage] = useState("");
  
  useEffect(() => {
    if (showSuccess && pendingSession) {
      const timer = setTimeout(() => {
        onSubmit(pendingSession);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, pendingSession, onSubmit]);

  const [formData, setFormData] = useState<Partial<WritingSession>>({
    date: new Date().toISOString(),
    projectId: '',
    stressLevel: 3,
    difficultyLevel: 1,
    autoCorrectionFrequency: 1,
    sessionRating: 3,
    usedSkeleton: false,
    usedDrafts: false,
    wasMultitasking: false,
    usedTimeStrategy: false,
    selfRewarded: false,
    startTime: '',
    endTime: '',
    wordCount: 0,
    specificDifficulties: '',
    multitaskingDescription: '',
    timeStrategyDescription: '',
    rewardDescription: '',
    content: '',
    ...initialValues
  });

  const handleChange = (key: keyof WritingSession, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startTime || !formData.endTime) {
      alert("Por favor, preencha os horários.");
      return;
    }
    
    const newSession: WritingSession = {
      id: Date.now().toString(),
      projectId: formData.projectId === '' ? undefined : formData.projectId,
      date: formData.date || new Date().toISOString(),
      startTime: formData.startTime!,
      endTime: formData.endTime!,
      wordCount: Number(formData.wordCount) || 0,
      content: formData.content || '',
      stressLevel: formData.stressLevel!,
      usedSkeleton: formData.usedSkeleton!,
      usedDrafts: formData.usedDrafts!,
      autoCorrectionFrequency: formData.autoCorrectionFrequency!,
      difficultyLevel: formData.difficultyLevel!,
      specificDifficulties: formData.specificDifficulties || '',
      wasMultitasking: formData.wasMultitasking!,
      multitaskingDescription: formData.multitaskingDescription || '',
      usedTimeStrategy: formData.usedTimeStrategy!,
      timeStrategyDescription: formData.timeStrategyDescription || '',
      selfRewarded: formData.selfRewarded!,
      rewardDescription: formData.rewardDescription || '',
      sessionRating: formData.sessionRating!
    };
    
    const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    setRandomMessage(msg);
    setPendingSession(newSession);
    setShowSuccess(true);
  };

  const getDateInputValue = (isoDate?: string) => {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleDateString('en-CA');
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Motivational Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-500">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center transform animate-[scaleIn_0.5s_ease-out]">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Sessão Salva no Firebase!</h3>
            <p className="text-lg text-slate-600 italic font-medium">"{randomMessage}"</p>
            <div className="mt-6 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
               <div className="bg-teal-500 h-1 rounded-full animate-[progress_2.5s_linear]"></div>
            </div>
          </div>
          <style>{`
            @keyframes scaleIn {
              from { transform: scale(0.9); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            @keyframes progress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Detalhes da Sessão</h2>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-700 text-sm">Cancelar</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Project Selection */}
        <Card>
           <div className="mb-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">A qual obra isso pertence?</label>
            <select
              value={formData.projectId || ''}
              onChange={(e) => handleChange('projectId', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-400 focus:border-teal-400 outline-none bg-white"
            >
              <option value="">Sem Obra Específica (Geral)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
           </div>
        </Card>

        {/* Content Capture */}
        <Card title="Rascunho da Sessão" subtitle="O que você escreveu hoje (opcional)">
           <textarea 
             className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400 outline-none text-slate-700 font-serif leading-relaxed"
             rows={8}
             placeholder="Se você usou o Modo Foco, seu texto aparecerá aqui. Caso contrário, você pode colar ou digitar aqui para salvar no banco de dados."
             value={formData.content}
             onChange={(e) => handleChange('content', e.target.value)}
           ></textarea>
           <p className="text-xs text-slate-500 mt-2 text-right">Este texto será criptografado e salvo no seu banco de dados.</p>
        </Card>

        {/* Section 1 */}
        <Card title="1. Métricas">
          <div className="mb-4">
             <InputField 
               label="Data da Sessão" 
               type="date" 
               value={getDateInputValue(formData.date)} 
               onChange={(v: string) => {
                 if (!v) return;
                 const d = new Date(v + 'T00:00:00');
                 if (!isNaN(d.getTime())) {
                   handleChange('date', d.toISOString());
                 }
               }}
               required 
             />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Início" type="time" value={formData.startTime} onChange={(v: string) => handleChange('startTime', v)} required />
            <InputField label="Fim" type="time" value={formData.endTime} onChange={(v: string) => handleChange('endTime', v)} required />
          </div>
          <InputField label="Quantas palavras escreveu?" type="number" value={formData.wordCount} onChange={(v: string) => handleChange('wordCount', v)} placeholder="Ex: 500" required />
        </Card>

        {/* Section 2 */}
        <Card title="2. Processo e Estado">
          <RadioGroup
            label="Nível de Estresse"
            value={formData.stressLevel}
            onChange={(v: number) => handleChange('stressLevel', v)}
            options={[1, 2, 3, 4, 5]}
            minLabel="Tranquilo"
            maxLabel="Estressante"
          />
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <Toggle label="Utilizou esqueleto/outline?" checked={formData.usedSkeleton} onChange={(v: boolean) => handleChange('usedSkeleton', v)} />
            <Toggle label="Utilizou rascunhos?" checked={formData.usedDrafts} onChange={(v: boolean) => handleChange('usedDrafts', v)} />
          </div>
        </Card>

        {/* Section 3 */}
        <Card title="3. Dificuldades e Correção">
          <RadioGroup
            label="Autocorreção Durante a Escrita"
            value={formData.autoCorrectionFrequency}
            onChange={(v: number) => handleChange('autoCorrectionFrequency', v)}
            options={[1, 2, 3, 4, 5]}
            minLabel="Não me autocorrigi"
            maxLabel="Tive uma intensa autocorreção"
          />
          
          <div className="pt-4 border-t border-slate-100">
            <RadioGroup
              label="Nível de Dificuldade Sentida"
              value={formData.difficultyLevel}
              onChange={(v: number) => handleChange('difficultyLevel', v)}
              options={[1, 2, 3, 4, 5]}
              minLabel="Nenhuma"
              maxLabel="Intensa"
            />
          </div>

          <div className="mt-4">
             <label className="block text-sm font-medium text-slate-700 mb-1">Em caso de dificuldades, quais foram?</label>
             <textarea 
               className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-400 focus:border-teal-400 outline-none"
               rows={3}
               value={formData.specificDifficulties}
               onChange={(e) => handleChange('specificDifficulties', e.target.value)}
               placeholder="Descreva brevemente..."
             />
          </div>
        </Card>

        {/* Section 4 */}
        <Card title="4. Gestão e Foco">
          <Toggle label="Estava realizando outra atividade (Multitasking)?" checked={formData.wasMultitasking} onChange={(v: boolean) => handleChange('wasMultitasking', v)} />
          {formData.wasMultitasking && (
             <InputField label="Qual atividade?" value={formData.multitaskingDescription} onChange={(v: string) => handleChange('multitaskingDescription', v)} />
          )}
          
          <div className="pt-4 border-t border-slate-100">
             <Toggle label="Utilizou estratégia de gestão de tempo?" checked={formData.usedTimeStrategy} onChange={(v: boolean) => handleChange('usedTimeStrategy', v)} />
             {formData.usedTimeStrategy && (
               <InputField label="Qual estratégia?" value={formData.timeStrategyDescription} onChange={(v: string) => handleChange('timeStrategyDescription', v)} placeholder="Ex: Pomodoro" />
             )}
          </div>
        </Card>

        {/* Section 5 */}
        <Card title="5. Conclusão">
          <Toggle label="Se autorecompensou ao final?" checked={formData.selfRewarded} onChange={(v: boolean) => handleChange('selfRewarded', v)} />
          {formData.selfRewarded && (
             <InputField label="Com o quê?" value={formData.rewardDescription} onChange={(v: string) => handleChange('rewardDescription', v)} placeholder="Ex: Chocolate, Descanso..." />
          )}
          
          <div className="pt-6 border-t border-slate-100">
             <RadioGroup
              label="Avaliação Geral da Sessão"
              value={formData.sessionRating}
              onChange={(v: number) => handleChange('sessionRating', v)}
              options={[1, 2, 3, 4, 5]}
              minLabel="Péssima"
              maxLabel="Excelente"
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl text-slate-600 bg-white border border-slate-200 font-medium hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-6 py-3 rounded-xl text-white bg-teal-500 font-medium hover:bg-teal-600 shadow-lg shadow-teal-200 transition-all transform active:scale-95">
            Salvar no Banco de Dados
          </button>
        </div>
      </form>
    </div>
  );
};