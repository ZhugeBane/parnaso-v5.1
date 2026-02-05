
import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12" }) => {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Elegant gradients for literary feel */}
        <linearGradient id="letterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="pageGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
        <linearGradient id="shadowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e293b" opacity="0.3" />
          <stop offset="100%" stopColor="#1e293b" opacity="0.05" />
        </linearGradient>
      </defs>

      {/* Book page turning effect - left page */}
      <path
        d="M 35 25 L 35 95 Q 35 100 40 100 L 60 100 L 60 25 Q 60 20 55 20 L 40 20 Q 35 20 35 25 Z"
        fill="url(#pageGradient)"
        opacity="0.4"
      />

      {/* Book page turning effect - right page (slightly turned) */}
      <path
        d="M 60 25 L 60 100 L 80 100 Q 85 100 85 95 L 85 25 Q 85 20 80 20 L 65 20 Q 60 20 60 25 Z"
        fill="url(#pageGradient)"
        opacity="0.5"
      />

      {/* Page shadow/spine */}
      <rect x="58" y="20" width="4" height="80" fill="url(#shadowGradient)" />

      {/* Stylized letter P - book-inspired */}
      <g>
        {/* Main vertical stem of P */}
        <path
          d="M 45 35 L 45 90 Q 45 92 47 92 L 52 92 Q 54 92 54 90 L 54 35 Q 54 33 52 33 L 47 33 Q 45 33 45 35 Z"
          fill="url(#letterGradient)"
        />

        {/* Upper bowl of P - elegant curve */}
        <path
          d="M 52 35 L 52 40 L 65 40 Q 75 40 75 50 Q 75 60 65 60 L 52 60 L 52 35 Z"
          fill="url(#letterGradient)"
        />

        {/* Inner counter of P (white space) */}
        <ellipse
          cx="65"
          cy="50"
          rx="6"
          ry="8"
          fill="white"
          opacity="0.25"
        />

        {/* Decorative serif at top */}
        <path
          d="M 42 33 L 42 36 L 57 36 L 57 33 Z"
          fill="url(#letterGradient)"
          opacity="0.9"
        />

        {/* Decorative serif at bottom */}
        <path
          d="M 42 90 L 42 93 L 57 93 L 57 90 Z"
          fill="url(#letterGradient)"
          opacity="0.9"
        />

        {/* Elegant flourish - book corner */}
        <path
          d="M 75 60 Q 78 62 80 65"
          stroke="#8b5cf6"
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
        />
      </g>

      {/* Subtle sparkle accents */}
      <circle cx="38" cy="30" r="1.5" fill="#a78bfa" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="82" cy="68" r="1.5" fill="#818cf8" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};
