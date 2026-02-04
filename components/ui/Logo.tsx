
import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12" }) => {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background Circle (Optional glow effect) */}
      <circle cx="50" cy="50" r="48" className="fill-white/10" />
      
      {/* --- OWL BODY (Purple) --- */}
      {/* Ears */}
      <path d="M30 30 L20 15 L40 25 Z" fill="#a855f7" stroke="#7e22ce" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M70 30 L80 15 L60 25 Z" fill="#a855f7" stroke="#7e22ce" strokeWidth="2" strokeLinejoin="round"/>
      
      {/* Head/Body Base */}
      <ellipse cx="50" cy="50" rx="35" ry="40" fill="#a855f7" stroke="#7e22ce" strokeWidth="2" />
      
      {/* Belly (Lighter Purple) */}
      <ellipse cx="50" cy="65" rx="20" ry="22" fill="#d8b4fe" />

      {/* --- FACE --- */}
      {/* Eyes (White & Black) */}
      <circle cx="38" cy="40" r="10" fill="white" stroke="#7e22ce" strokeWidth="1"/>
      <circle cx="62" cy="40" r="10" fill="white" stroke="#7e22ce" strokeWidth="1"/>
      <circle cx="38" cy="40" r="4" fill="#1e293b"/>
      <circle cx="62" cy="40" r="4" fill="#1e293b"/>
      
      {/* Beak (Orange) */}
      <path d="M47 50 L53 50 L50 56 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="1" strokeLinejoin="round"/>

      {/* --- NOTEBOOK (Turquoise) --- */}
      {/* Back Cover */}
      <rect x="20" y="65" width="60" height="30" rx="4" fill="#2dd4bf" stroke="#0f766e" strokeWidth="2" />
      
      {/* Paper Pages (White) */}
      <rect x="23" y="62" width="54" height="28" rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
      
      {/* Text Lines (Cartoon style) */}
      <path d="M28 68 H72" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 74 H65" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 80 H70" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      
      {/* Wings holding the book (Purple) */}
      <path d="M15 55 Q10 65 25 75" fill="none" stroke="#a855f7" strokeWidth="6" strokeLinecap="round" />
      <path d="M85 55 Q90 65 75 75" fill="none" stroke="#a855f7" strokeWidth="6" strokeLinecap="round" />

      {/* Glasses (Optional Geeky Touch) */}
      <path d="M28 40 A10 10 0 0 1 48 40" fill="none" stroke="#334155" strokeWidth="1.5" />
      <path d="M52 40 A10 10 0 0 1 72 40" fill="none" stroke="#334155" strokeWidth="1.5" />
      <path d="M48 40 L52 40" stroke="#334155" strokeWidth="1.5" />

    </svg>
  );
};
