import React from 'react';
import { Feather, Hourglass, Flame } from 'lucide-react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Scriptus: Moeda de palavras (Roxa/Violeta)
 * Regra: 2 palavras = 1 Scriptus
 */
export const ScriptusIcon: React.FC<IconProps> = ({ className = "w-4 h-4", size }) => {
  return <Feather className={className} size={size} />;
};

/**
 * Kronus: Moeda de tempo (Laranja/Âmbar)
 * Regra: 2 minutos de sessão = 1 Kronus
 */
export const KronusIcon: React.FC<IconProps> = ({ className = "w-4 h-4", size }) => {
  return <Hourglass className={className} size={size} />;
};

/**
 * Hestius: Guardião da Chama / Bloqueio de Ofensiva (Vermelho-Rubi / Dourado)
 * Mãos em concha segurando a chama sagrada de Hestia.
 */
export const HestiusIcon: React.FC<IconProps> = ({ className = "w-4 h-4" }) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor">
      {/* Central Flame with Ruby-Golden gradient */}
      <path
        d="M12 2.5C12 2.5 15.5 6 15.5 9.2C15.5 11.5 13.8 13.2 12 13.2C10.2 13.2 8.5 11.5 8.5 9.2C8.5 6.8 10.5 4.5 12 2.5Z"
        fill="url(#hestius-flame-core)"
        stroke="#f59e0b"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Inner glowing flame heart */}
      <path
        d="M12 6.5C12 6.5 13.6 8.3 13.6 9.8C13.6 10.8 12.8 11.6 12 11.6C11.2 11.6 10.4 10.8 10.4 9.8C10.4 8.7 11.2 7.5 12 6.5Z"
        fill="#fef08a"
      />
      {/* Protective Cupped Hands */}
      <path
        d="M4.5 15C5.8 13.2 8 12.8 9.8 13.8L11 14.5C11.6 14.8 12.4 14.8 13 14.5L14.2 13.8C16 12.8 18.2 13.2 19.5 15C20.8 16.8 19.6 19.2 17.8 20.2C14.5 22 9.5 22 6.2 20.2C4.4 19.2 3.2 16.8 4.5 15Z"
        fill="none"
        stroke="#f43f5e"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner hand support arc */}
      <path
        d="M8.5 17.2C10.5 18.5 13.5 18.5 15.5 17.2"
        stroke="#fbbf24"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="hestius-flame-core" x1="12" y1="2.5" x2="12" y2="13.2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f43f5e" />
          <stop offset="0.5" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
    </svg>
  );
};

/**
 * 3 Flame Orbs representing Hestius charges (0/3 to 3/3)
 */
export const HestiusOrbs: React.FC<{ count: number; max?: number; size?: 'sm' | 'md' | 'lg' }> = ({
  count = 0,
  max = 3,
  size = 'sm'
}) => {
  const safeCount = Math.max(0, Math.min(max, count));
  const orbClass = size === 'md' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-3.5 h-3.5' : 'w-2 h-2';
  const unlitClass = size === 'md' ? 'w-2 h-2' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5';

  return (
    <div className="inline-flex items-center gap-1.5" title={`${safeCount}/${max} Hestius ativos`}>
      {Array.from({ length: max }).map((_, idx) => {
        const isLit = idx < safeCount;
        return (
          <span
            key={idx}
            className={`inline-block rounded-full transition-all duration-300 ${
              isLit
                ? `${orbClass} bg-gradient-to-tr from-rose-500 to-amber-400 shadow-[0_0_8px_rgba(244,63,94,0.85)] scale-110 animate-pulse`
                : `${unlitClass} bg-slate-600/50 border border-slate-500/40 opacity-40`
            }`}
          />
        );
      })}
    </div>
  );
};
