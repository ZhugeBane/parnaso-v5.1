
import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12" }) => {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Modern gradients */}
        <linearGradient id="owlBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="bookStack" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <radialGradient id="eyeShine">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fbbf24" />
        </radialGradient>
      </defs>

      {/* Books stack - modern geometric */}
      <g opacity="0.9">
        <rect x="30" y="85" width="60" height="7" rx="2" fill="#6366f1" opacity="0.7" />
        <rect x="25" y="92" width="70" height="7" rx="2" fill="#8b5cf6" opacity="0.8" />
        <rect x="20" y="99" width="80" height="8" rx="2" fill="#a855f7" opacity="0.9" />
      </g>

      {/* Owl body - sleek design */}
      <g>
        <ellipse cx="60" cy="55" rx="28" ry="32" fill="url(#owlBody)" opacity="0.95" />

        {/* Wing accents */}
        <path d="M 35 50 Q 25 55 30 65 L 35 60 Z" fill="#14b8a6" opacity="0.6" />
        <path d="M 85 50 Q 95 55 90 65 L 85 60 Z" fill="#14b8a6" opacity="0.6" />

        {/* Chest pattern */}
        <ellipse cx="60" cy="65" rx="15" ry="18" fill="white" opacity="0.3" />
        <circle cx="60" cy="60" r="3" fill="white" opacity="0.5" />
        <circle cx="60" cy="67" r="2.5" fill="white" opacity="0.5" />
        <circle cx="60" cy="73" r="2" fill="white" opacity="0.5" />
      </g>

      {/* Head */}
      <g>
        <circle cx="60" cy="35" r="22" fill="url(#owlBody)" opacity="0.95" />

        {/* Ear tufts */}
        <path d="M 45 18 L 42 12 L 48 15 Z" fill="#a855f7" opacity="0.8" />
        <path d="M 75 18 L 78 12 L 72 15 Z" fill="#a855f7" opacity="0.8" />

        {/* Eyes - large and glowing */}
        <circle cx="52" cy="35" r="8" fill="white" />
        <circle cx="68" cy="35" r="8" fill="white" />
        <circle cx="52" cy="35" r="6" fill="url(#eyeShine)" />
        <circle cx="68" cy="35" r="6" fill="url(#eyeShine)" />
        <circle cx="52" cy="35" r="4" fill="#1f2937" />
        <circle cx="68" cy="35" r="4" fill="#1f2937" />
        <circle cx="53" cy="34" r="1.5" fill="white" opacity="0.9" />
        <circle cx="69" cy="34" r="1.5" fill="white" opacity="0.9" />

        {/* Beak */}
        <path d="M 60 40 L 57 45 L 63 45 Z" fill="#f59e0b" />

        {/* Decorative patterns */}
        <path d="M 48 28 Q 52 26 56 28" stroke="#fbbf24" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M 64 28 Q 68 26 72 28" stroke="#fbbf24" strokeWidth="1.5" fill="none" opacity="0.6" />
      </g>

      {/* Quill pen */}
      <g transform="translate(85, 70) rotate(-25)">
        <path d="M 0 0 L 2 15 L 0 14 L -2 15 Z" fill="#ec4899" opacity="0.8" />
        <line x1="0" y1="0" x2="0" y2="-8" stroke="#a855f7" strokeWidth="1.5" opacity="0.7" />
        <path d="M -2 -8 Q 0 -12 2 -8" fill="#8b5cf6" opacity="0.6" />
      </g>

      {/* Sparkles */}
      <circle cx="25" cy="30" r="1.5" fill="#fbbf24" opacity="0.8" />
      <circle cx="95" cy="35" r="1.5" fill="#14b8a6" opacity="0.8" />
      <circle cx="40" cy="15" r="1" fill="#ec4899" opacity="0.7" />
      <circle cx="80" cy="20" r="1" fill="#a855f7" opacity="0.7" />
    </svg>
  );
};
