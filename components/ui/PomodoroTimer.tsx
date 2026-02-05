import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface PomodoroTimerProps {
    onComplete?: (completedPomodoros: number) => void;
}

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroSettings {
    workDuration: number; // minutes
    shortBreakDuration: number;
    longBreakDuration: number;
    pomodorosUntilLongBreak: number;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    pomodorosUntilLongBreak: 4,
};

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onComplete }) => {
    const { t } = useLanguage();

    // Load settings from localStorage or use defaults
    const [settings] = useState<PomodoroSettings>(() => {
        const stored = localStorage.getItem('pomodoroSettings');
        return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    });

    const [mode, setMode] = useState<TimerMode>('work');
    const [timeRemaining, setTimeRemaining] = useState(settings.workDuration * 60); // in seconds
    const [isRunning, setIsRunning] = useState(false);
    const [completedPomodoros, setCompletedPomodoros] = useState(0);

    const intervalRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio (simple beep sound using Web Audio API)
    useEffect(() => {
        // Create a simple beep sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const createBeep = () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        };

        audioRef.current = { play: createBeep } as any;
    }, []);

    // Timer countdown logic
    useEffect(() => {
        if (isRunning && timeRemaining > 0) {
            intervalRef.current = window.setInterval(() => {
                setTimeRemaining(prev => prev - 1);
            }, 1000);
        } else if (timeRemaining === 0 && isRunning) {
            // Timer completed
            handleTimerComplete();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, timeRemaining]);

    const handleTimerComplete = () => {
        setIsRunning(false);

        // Play sound
        if (audioRef.current) {
            audioRef.current.play();
        }

        // Update mode and pomodoros
        if (mode === 'work') {
            const newCompletedPomodoros = completedPomodoros + 1;
            setCompletedPomodoros(newCompletedPomodoros);

            if (onComplete) {
                onComplete(newCompletedPomodoros);
            }

            // Determine next break type
            if (newCompletedPomodoros % settings.pomodorosUntilLongBreak === 0) {
                setMode('longBreak');
                setTimeRemaining(settings.longBreakDuration * 60);
            } else {
                setMode('shortBreak');
                setTimeRemaining(settings.shortBreakDuration * 60);
            }
        } else {
            // Break completed, return to work
            setMode('work');
            setTimeRemaining(settings.workDuration * 60);
        }
    };

    const toggleTimer = () => {
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setMode('work');
        setTimeRemaining(settings.workDuration * 60);
        setCompletedPomodoros(0);
    };

    const skipToNext = () => {
        setIsRunning(false);
        handleTimerComplete();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getModeColor = () => {
        switch (mode) {
            case 'work':
                return 'from-teal-500 to-cyan-600';
            case 'shortBreak':
                return 'from-amber-500 to-orange-600';
            case 'longBreak':
                return 'from-purple-500 to-pink-600';
        }
    };

    const getModeLabel = () => {
        switch (mode) {
            case 'work':
                return t('pomodoro.work');
            case 'shortBreak':
                return t('pomodoro.shortBreak');
            case 'longBreak':
                return t('pomodoro.longBreak');
        }
    };

    const progress = (() => {
        const totalTime = mode === 'work'
            ? settings.workDuration * 60
            : mode === 'shortBreak'
                ? settings.shortBreakDuration * 60
                : settings.longBreakDuration * 60;
        return ((totalTime - timeRemaining) / totalTime) * 100;
    })();

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 bg-gradient-to-br ${getModeColor()} rounded-lg`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{t('pomodoro.title')}</h3>
                        <p className="text-sm text-slate-500">{getModeLabel()}</p>
                    </div>
                </div>

                {/* Pomodoro Counter */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">{t('pomodoro.completed')}:</span>
                    <span className="text-2xl font-bold text-teal-600">{completedPomodoros}</span>
                    <span className="text-sm text-slate-400">🍅</span>
                </div>
            </div>

            {/* Timer Display */}
            <div className="relative mb-6">
                <div className="text-center">
                    <div className="text-7xl font-mono font-bold text-slate-800 tabular-nums mb-2">
                        {formatTime(timeRemaining)}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r ${getModeColor()} transition-all duration-1000`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={toggleTimer}
                    className={`flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all transform hover:scale-110 ${isRunning
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : `bg-gradient-to-br ${getModeColor()} text-white`
                        }`}
                >
                    {isRunning ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 pl-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>

                <button
                    onClick={skipToNext}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors flex items-center gap-2"
                    title={t('pomodoro.skip')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    {t('pomodoro.skip')}
                </button>

                <button
                    onClick={resetTimer}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors flex items-center gap-2"
                    title={t('pomodoro.reset')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t('pomodoro.reset')}
                </button>
            </div>

            {/* Mode Indicators */}
            <div className="mt-6 flex justify-center gap-2">
                {Array.from({ length: settings.pomodorosUntilLongBreak }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${i < completedPomodoros % settings.pomodorosUntilLongBreak
                                ? 'bg-teal-500'
                                : 'bg-slate-200'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};
