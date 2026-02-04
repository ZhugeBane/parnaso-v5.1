
import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12" }) => {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Circular background with gradient */}
      <defs>
        <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#bae6fd" />
        </radialGradient>
        <linearGradient id="owlGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="60" cy="60" r="58" fill="url(#bgGradient)" />

      {/* Stack of books at bottom */}
      <rect x="25" y="75" width="70" height="10" rx="1" fill="#a855f7" stroke="#7e22ce" strokeWidth="0.5" />
      <rect x="28" y="68" width="64" height="10" rx="1" fill="#c084fc" stroke="#9333ea" strokeWidth="0.5" />
      <rect x="32" y="61" width="56" height="10" rx="1" fill="#d8b4fe" stroke="#a855f7" strokeWidth="0.5" />

      {/* Book details - spines */}
      <line x1="45" y1="75" x2="45" y2="85" stroke="#7e22ce" strokeWidth="0.5" />
      <line x1="65" y1="75" x2="65" y2="85" stroke="#7e22ce" strokeWidth="0.5" />
      <line x1="50" y1="68" x2="50" y2="78" stroke="#9333ea" strokeWidth="0.5" />
      <line x1="70" y1="68" x2="70" y2="78" stroke="#9333ea" strokeWidth="0.5" />

      {/* Owl body - Asian brush stroke style */}
      <ellipse cx="60" cy="50" rx="22" ry="25" fill="url(#owlGradient)" opacity="0.9" />

      {/* Owl wings - flowing Asian style */}
      <path d="M38 45 Q32 50 38 58 Q40 52 38 45" fill="#5eead4" stroke="#14b8a6" strokeWidth="1" strokeLinecap="round" />
      <path d="M82 45 Q88 50 82 58 Q80 52 82 45" fill="#5eead4" stroke="#14b8a6" strokeWidth="1" strokeLinecap="round" />

      {/* Decorative feather patterns - Chinese brush style */}
      <path d="M52 48 Q50 52 52 56" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M68 48 Q70 52 68 56" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M60 52 Q58 56 60 60" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

      {/* Owl head with Asian aesthetic */}
      <circle cx="60" cy="38" r="16" fill="#5eead4" stroke="#14b8a6" strokeWidth="1" />

      {/* Ear tufts - elegant Asian style */}
      <path d="M48 28 Q46 22 50 26" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" />
      <path d="M72 28 Q74 22 70 26" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" />

      {/* Eyes - large and expressive */}
      <circle cx="53" cy="38" r="6" fill="white" stroke="#14b8a6" strokeWidth="1" />
      <circle cx="67" cy="38" r="6" fill="white" stroke="#14b8a6" strokeWidth="1" />
      <circle cx="53" cy="38" r="3" fill="#0f766e" />
      <circle cx="67" cy="38" r="3" fill="#0f766e" />

      {/* Beak - small and cute */}
      <path d="M58 42 L62 42 L60 46 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5" />

      {/* Scroll with calligraphy - left side */}
      <rect x="10" y="85" width="18" height="25" rx="2" fill="#fef3c7" stroke="#d97706" strokeWidth="0.8" />
      <line x1="13" y1="90" x2="25" y2="90" stroke="#92400e" strokeWidth="0.5" opacity="0.6" />
      <line x1="13" y1="95" x2="23" y2="95" stroke="#92400e" strokeWidth="0.5" opacity="0.6" />
      <line x1="13" y1="100" x2="25" y2="100" stroke="#92400e" strokeWidth="0.5" opacity="0.6" />

      {/* Quill pen - right side */}
      <line x1="95" y1="85" x2="100" y2="105" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
      <path d="M95 85 Q92 82 95 80" fill="#c084fc" stroke="#a855f7" strokeWidth="0.5" />

      {/* Ink bottle */}
      <rect x="92" y="100" width="8" height="10" rx="1" fill="#1e293b" stroke="#0f172a" strokeWidth="0.5" />
      <ellipse cx="96" cy="100" rx="4" ry="1.5" fill="#334155" />

      {/* Decorative Chinese-style clouds */}
      <path d="M15 25 Q18 23 20 25 Q22 23 25 25" fill="none" stroke="#bae6fd" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M95 30 Q98 28 100 30 Q102 28 105 30" fill="none" stroke="#bae6fd" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
};
