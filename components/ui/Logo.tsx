
import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12" }) => {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Gradients for modern look */}
        <linearGradient id="keyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="paperGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {/* Paper/Document background */}
      <rect x="25" y="20" width="70" height="80" rx="4" fill="url(#paperGradient)" opacity="0.3" />

      {/* Text lines on paper */}
      <line x1="35" y1="35" x2="85" y2="35" stroke="#94a3b8" strokeWidth="1.5" opacity="0.4" />
      <line x1="35" y1="45" x2="80" y2="45" stroke="#94a3b8" strokeWidth="1.5" opacity="0.4" />
      <line x1="35" y1="55" x2="85" y2="55" stroke="#94a3b8" strokeWidth="1.5" opacity="0.4" />

      {/* Main typewriter key - centered */}
      <g transform="translate(60, 70)">
        {/* Key shadow */}
        <rect x="-18" y="2" width="36" height="36" rx="6" fill="#1e293b" opacity="0.2" />

        {/* Key body */}
        <rect x="-18" y="0" width="36" height="36" rx="6" fill="url(#keyGradient)" />

        {/* Key highlight */}
        <rect x="-16" y="2" width="32" height="4" rx="2" fill="white" opacity="0.3" />

        {/* Letter P */}
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="24"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          P
        </text>
      </g>

      {/* Cursor/typing indicator */}
      <rect x="88" y="53" width="2" height="6" fill="#8b5cf6" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.2s" repeatCount="indefinite" />
      </rect>

      {/* Small accent dots */}
      <circle cx="30" cy="25" r="1.5" fill="#8b5cf6" opacity="0.6" />
      <circle cx="90" cy="28" r="1.5" fill="#6366f1" opacity="0.6" />
    </svg>
  );
};
