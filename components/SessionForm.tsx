import React, { useState, useEffect, useMemo } from 'react';
import { WritingSession, Project } from '../types';
import { Card } from './ui/Card';
import { useLanguage } from '../i18n/LanguageContext';

interface SessionFormProps {
  onSubmit: (session: WritingSession) => void;
  onCancel: () => void;
  initialValues?: Partial<WritingSession>;
  projects: Project[];
  onAddProject?: (project: Project) => void;
}

const DEFAULT_PROJECT_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399',
  '#22d3ee', '#818cf8', '#e879f9', '#f43f5e', '#64748b'
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

export const SessionForm: React.FC<SessionFormProps> = ({ onSubmit, onCancel, initialValues, projects, onAddProject }) => {
  const { t } = useLanguage();
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingSession, setPendingSession] = useState<WritingSession | null>(null);
  const [randomMessage, setRandomMessage] = useState("");

  // New Project State
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectGoal, setNewProjectGoal] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(DEFAULT_PROJECT_COLORS[Math.floor(Math.random() * DEFAULT_PROJECT_COLORS.length)]);

  const motivationalMessages = useMemo(() => [
    t('sessionForm.motivation1'),
    t('sessionForm.motivation2'),
    t('sessionForm.motivation3'),
    t('sessionForm.motivation4'),
    t('sessionForm.motivation5'),
    t('sessionForm.motivation6'),
    t('sessionForm.motivation7'),
    t('sessionForm.motivation8'),
    t('sessionForm.motivation9'),
    t('sessionForm.motivation10')
  ], [t]);
  
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
      alert(t('sessionForm.fillTimes'));
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
    
    const msg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    setRandomMessage(msg);
    setPendingSession(newSession);
    setShowSuccess(true);
  };

  const handleCreateProject = () => {
    if (!newProjectName || !onAddProject) return;

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
    handleChange('projectId', project.id);
    
    // Reset form
    setShowNewProjectForm(false);
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectGoal('');
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
            <h3 className="text-2xl font-bold text-slate-800 mb-2">{t('sessionForm.savedSuccess')}</h3>
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
        <h2 className="text-2xl font-bold text-slate-800">{t('sessionForm.details')}</h2>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-700 text-sm">{t('common.cancel')}</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Project Selection */}
        <Card>
           <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">{t('sessionForm.projectQuestion')}</label>
              {!showNewProjectForm && onAddProject && (
                <button 
                  type="button" 
                  onClick={() => setShowNewProjectForm(true)}
                  className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  {t('sessionForm.newProject')}
                </button>
              )}
            </div>
            
            {!showNewProjectForm ? (
              <select
                value={formData.projectId || ''}
                onChange={(e) => handleChange('projectId', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-400 focus:border-teal-400 outline-none bg-white transition-all"
              >
                <option value="">{t('sessionForm.noProject')}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField 
                    label={t('sessionForm.projectName')} 
                    value={newProjectName} 
                    onChange={setNewProjectName} 
                    required 
                  />
                  <InputField 
                    label={t('sessionForm.projectGoal')} 
                    type="number" 
                    value={newProjectGoal} 
                    onChange={setNewProjectGoal} 
                  />
                </div>
                <InputField 
                  label={t('sessionForm.projectDesc')} 
                  value={newProjectDesc} 
                  onChange={setNewProjectDesc} 
                />
                
                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-2">
                    {DEFAULT_PROJECT_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewProjectColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${newProjectColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setShowNewProjectForm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
                    >
                      {t('sessionForm.cancelNewProject')}
                    </button>
                    <button 
                      type="button" 
                      onClick={handleCreateProject}
                      disabled={!newProjectName}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('sessionForm.addProject')}
                    </button>
                  </div>
                </div>
              </div>
            )}
           </div>
        </Card>

        {/* Content Capture */}
        <Card title={t('sessionForm.draftTitle')} subtitle={t('sessionForm.draftSubtitle')}>
           <textarea 
             className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400 outline-none text-slate-700 font-serif leading-relaxed"
             rows={8}
             placeholder={t('sessionForm.draftPlaceholder')}
             value={formData.content}
             onChange={(e) => handleChange('content', e.target.value)}
           ></textarea>
           <p className="text-xs text-slate-500 mt-2 text-right">{t('sessionForm.draftWarning')}</p>
        </Card>

        {/* Section 1 */}
        <Card title={t('sessionForm.sectionMetrics')}>
          <div className="mb-4">
             <InputField 
               label={t('sessionForm.date')} 
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
            <InputField label={t('sessionForm.startTime')} type="time" value={formData.startTime} onChange={(v: string) => handleChange('startTime', v)} required />
            <InputField label={t('sessionForm.endTime')} type="time" value={formData.endTime} onChange={(v: string) => handleChange('endTime', v)} required />
          </div>
          <InputField label={t('sessionForm.wordsWritten')} type="number" value={formData.wordCount} onChange={(v: string) => handleChange('wordCount', v)} placeholder={t('sessionForm.exNumber')} required />
        </Card>

        {/* Section 2 */}
        <Card title={t('sessionForm.sectionProcess')}>
          <RadioGroup
            label={t('sessionForm.stressLevel')}
            value={formData.stressLevel}
            onChange={(v: number) => handleChange('stressLevel', v)}
            options={[1, 2, 3, 4, 5]}
            minLabel={t('sessionForm.levelCalm')}
            maxLabel={t('sessionForm.levelStressful')}
          />
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <Toggle label={t('sessionForm.usedSkeleton')} checked={formData.usedSkeleton} onChange={(v: boolean) => handleChange('usedSkeleton', v)} />
            <Toggle label={t('sessionForm.usedDrafts')} checked={formData.usedDrafts} onChange={(v: boolean) => handleChange('usedDrafts', v)} />
          </div>
        </Card>

        {/* Section 3 */}
        <Card title={t('sessionForm.sectionDifficulty')}>
          <RadioGroup
            label={t('sessionForm.autoCorrection')}
            value={formData.autoCorrectionFrequency}
            onChange={(v: number) => handleChange('autoCorrectionFrequency', v)}
            options={[1, 2, 3, 4, 5]}
            minLabel={t('sessionForm.noCorrection')}
            maxLabel={t('sessionForm.intenseCorrection')}
          />
          
          <div className="pt-4 border-t border-slate-100">
            <RadioGroup
              label={t('sessionForm.difficultyLevel')}
              value={formData.difficultyLevel}
              onChange={(v: number) => handleChange('difficultyLevel', v)}
              options={[1, 2, 3, 4, 5]}
              minLabel={t('sessionForm.none')}
              maxLabel={t('sessionForm.intense')}
            />
          </div>

          <div className="mt-4">
             <label className="block text-sm font-medium text-slate-700 mb-1">{t('sessionForm.difficultiesQuestion')}</label>
             <textarea 
               className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-400 focus:border-teal-400 outline-none"
               rows={3}
               value={formData.specificDifficulties}
               onChange={(e) => handleChange('specificDifficulties', e.target.value)}
               placeholder={t('sessionForm.describeBriefly')}
             />
          </div>
        </Card>

        {/* Section 4 */}
        <Card title={t('sessionForm.sectionFocus')}>
          <Toggle label={t('sessionForm.wasMultitasking')} checked={formData.wasMultitasking} onChange={(v: boolean) => handleChange('wasMultitasking', v)} />
          {formData.wasMultitasking && (
             <InputField label={t('sessionForm.whichActivity')} value={formData.multitaskingDescription} onChange={(v: string) => handleChange('multitaskingDescription', v)} />
          )}
          
          <div className="pt-4 border-t border-slate-100">
             <Toggle label={t('sessionForm.usedTimeStrategy')} checked={formData.usedTimeStrategy} onChange={(v: boolean) => handleChange('usedTimeStrategy', v)} />
             {formData.usedTimeStrategy && (
               <InputField label={t('sessionForm.whichStrategy')} value={formData.timeStrategyDescription} onChange={(v: string) => handleChange('timeStrategyDescription', v)} placeholder={t('sessionForm.exPomodoro')} />
             )}
          </div>
        </Card>

        {/* Section 5 */}
        <Card title={t('sessionForm.sectionConclusion')}>
          <Toggle label={t('sessionForm.selfRewarded')} checked={formData.selfRewarded} onChange={(v: boolean) => handleChange('selfRewarded', v)} />
          {formData.selfRewarded && (
             <InputField label={t('sessionForm.withWhat')} value={formData.rewardDescription} onChange={(v: string) => handleChange('rewardDescription', v)} placeholder={t('sessionForm.exReward')} />
          )}
          
          <div className="pt-6 border-t border-slate-100">
             <RadioGroup
              label={t('sessionForm.sessionRating')}
              value={formData.sessionRating}
              onChange={(v: number) => handleChange('sessionRating', v)}
              options={[1, 2, 3, 4, 5]}
              minLabel={t('sessionForm.ratingPoor')}
              maxLabel={t('sessionForm.ratingExcellent')}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl text-slate-600 bg-white border border-slate-200 font-medium hover:bg-slate-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button type="submit" className="px-6 py-3 rounded-xl text-white bg-teal-500 font-medium hover:bg-teal-600 shadow-lg shadow-teal-200 transition-all transform active:scale-95">
            {t('sessionForm.saveSession')}
          </button>
        </div>
      </form>
    </div>
  );
};