
import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12" }) => {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Clean gradient for the design */}
        <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#6b21a8" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect
        x="15"
        y="15"
        width="90"
        height="90"
        rx="18"
        fill="white"
        stroke="url(#purpleGradient)"
        strokeWidth="6"
      />

      {/* Outer circle */}
      <circle
        cx="60"
        cy="60"
        r="32"
        fill="none"
        stroke="url(#purpleGradient)"
        strokeWidth="4"
      />

      {/* Inner filled circle */}
      <circle
        cx="60"
        cy="60"
        r="24"
        fill="url(#purpleGradient)"
      />

      {/* Letter P - bold and centered */}
      <text
        x="60"
        y="60"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize="32"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        P
      </text>
    </svg>
  );
};
