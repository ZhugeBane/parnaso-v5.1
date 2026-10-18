import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export interface HeatmapData {
    day: number; // 0-6 (Sunday-Saturday)
    hour: number; // 0-23
    wordCount: number;
    minutes?: number;
}

interface HeatmapChartProps {
    data: HeatmapData[];
    hideEarlyHours?: boolean;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({ data, hideEarlyHours = true }) => {
    const { t } = useLanguage();

    // Days of week labels
    const days = [
        t('days.sunday'),
        t('days.monday'),
        t('days.tuesday'),
        t('days.wednesday'),
        t('days.thursday'),
        t('days.friday'),
        t('days.saturday'),
    ];

    // Create a map for quick lookup
    const dataMap = new Map<string, { wordCount: number; minutes: number }>();
    data.forEach(item => {
        const key = `${item.day}-${item.hour}`;
        const prev = dataMap.get(key) || { wordCount: 0, minutes: 0 };
        dataMap.set(key, {
            wordCount: prev.wordCount + item.wordCount,
            minutes: prev.minutes + (item.minutes || 0)
        });
    });

    // Find max word count for color scaling
    const maxWordCount = Math.max(...Array.from(dataMap.values()).map(v => v.wordCount), 1);

    // Get color intensity based on word count
    const getColor = (wordCount: number) => {
        if (wordCount === 0) return 'bg-slate-100 dark:bg-slate-800';

        const intensity = Math.min(wordCount / maxWordCount, 1);

        if (intensity < 0.2) return 'bg-teal-100 dark:bg-teal-900/30';
        if (intensity < 0.4) return 'bg-teal-200 dark:bg-teal-800/40';
        if (intensity < 0.6) return 'bg-teal-300 dark:bg-teal-700/50';
        if (intensity < 0.8) return 'bg-teal-400 dark:bg-teal-600/60';
        return 'bg-teal-500 dark:bg-teal-500/70';
    };

    // Format hour (0-23 to 12h format or 24h)
    const formatHour = (hour: number) => {
        return `${hour.toString().padStart(2, '0')}h`;
    };

    // Hours to display (filtered 08h-23h if hideEarlyHours is true, otherwise 00h-23h)
    const hours = hideEarlyHours
        ? Array.from({ length: 16 }, (_, i) => i + 8)
        : Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="w-full overflow-x-auto">
            <div className="min-w-max">
                {/* Header with day labels */}
                <div className="flex mb-2">
                    <div className="w-12 flex-shrink-0"></div>
                    {days.map((day, index) => (
                        <div
                            key={index}
                            className="flex-1 text-center text-xs font-medium text-slate-600 dark:text-slate-400 px-1 min-w-[40px]"
                        >
                            {day.substring(0, 3)}
                        </div>
                    ))}
                </div>

                {/* Heatmap grid */}
                <div className="space-y-1">
                    {hours.map(hour => (
                        <div key={hour} className="flex items-center">
                            {/* Hour label */}
                            <div className="w-12 flex-shrink-0 text-xs text-slate-500 dark:text-slate-400 text-right pr-2">
                                {formatHour(hour)}
                            </div>

                            {/* Day cells */}
                            {Array.from({ length: 7 }, (_, day) => {
                                const key = `${day}-${hour}`;
                                const cellData = dataMap.get(key) || { wordCount: 0, minutes: 0 };
                                const wordCount = cellData.wordCount;
                                const minutes = cellData.minutes;
                                const colorClass = getColor(wordCount);

                                return (
                                    <div
                                        key={day}
                                        className="flex-1 px-0.5 min-w-[40px]"
                                    >
                                        <div
                                            className={`h-6 rounded-sm ${colorClass} transition-all hover:ring-2 hover:ring-teal-400 hover:scale-110 cursor-pointer relative group`}
                                        >
                                            {/* Rich Tooltip */}
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900/95 backdrop-blur-xs text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 shadow-xl border border-slate-700">
                                                <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-0.5">
                                                    <span>📅</span>
                                                    <span>{days[day]}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                                                    <span>⏰</span>
                                                    <span>{formatHour(hour)} às {formatHour((hour + 1) % 24)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-semibold border-t border-slate-700/80 pt-1 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                                                        <span className="text-teal-300 font-bold">{wordCount.toLocaleString('pt-BR')}</span>
                                                        <span className="text-slate-300">{t('dashboard.words')}</span>
                                                    </span>
                                                    <span className="text-slate-500">•</span>
                                                    <span className="text-amber-300 font-bold flex items-center gap-1">
                                                        <span>⏱️</span>
                                                        <span>{minutes > 0 ? `${minutes} min` : `${Math.round(wordCount / 20)} min`} de produção</span>
                                                    </span>
                                                </div>
                                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900/95"></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span>{t('dashboard.less')}</span>
                    <div className="flex gap-1">
                        <div className="w-4 h-4 rounded-sm bg-slate-100 dark:bg-slate-800"></div>
                        <div className="w-4 h-4 rounded-sm bg-teal-100 dark:bg-teal-900/30"></div>
                        <div className="w-4 h-4 rounded-sm bg-teal-200 dark:bg-teal-800/40"></div>
                        <div className="w-4 h-4 rounded-sm bg-teal-300 dark:bg-teal-700/50"></div>
                        <div className="w-4 h-4 rounded-sm bg-teal-400 dark:bg-teal-600/60"></div>
                        <div className="w-4 h-4 rounded-sm bg-teal-500 dark:bg-teal-500/70"></div>
                    </div>
                    <span>{t('dashboard.more')}</span>
                </div>
            </div>
        </div>
    );
};
