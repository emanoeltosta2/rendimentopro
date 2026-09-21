import React from 'react';

interface LogoIconProps {
  className?: string;
  size?: number | string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ className = 'w-full h-full', size }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="headerBgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#047857"/>
          <stop offset="45%" stopColor="#065f46"/>
          <stop offset="100%" stopColor="#022c22"/>
        </linearGradient>

        <linearGradient id="headerAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.45"/>
          <stop offset="70%" stopColor="#10b981" stopOpacity="0.1"/>
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
        </linearGradient>

        <linearGradient id="headerTrendGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#059669"/>
          <stop offset="40%" stopColor="#10b981"/>
          <stop offset="80%" stopColor="#34d399"/>
          <stop offset="100%" stopColor="#6ee7b7"/>
        </linearGradient>

        <linearGradient id="headerGoldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24"/>
          <stop offset="100%" stopColor="#d97706"/>
        </linearGradient>

        <linearGradient id="headerBorderGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.6"/>
          <stop offset="50%" stopColor="#059669" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#047857" stopOpacity="0.4"/>
        </linearGradient>

        <filter id="headerGlowShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#10b981" floodOpacity="0.45"/>
        </filter>
        <filter id="headerSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="14" floodColor="#000000" floodOpacity="0.5"/>
        </filter>
      </defs>

      {/* Base Squircle Background with Rich Border */}
      <rect x="8" y="8" width="496" height="496" rx="112" fill="url(#headerBgGrad)"/>
      <rect x="8" y="8" width="496" height="496" rx="112" fill="none" stroke="url(#headerBorderGrad)" strokeWidth="6"/>

      {/* Ambient Tech Grid Lines */}
      <g stroke="#ffffff" strokeOpacity="0.1" strokeWidth="2.5" strokeDasharray="6 6">
        <line x1="80" y1="160" x2="432" y2="160"/>
        <line x1="80" y1="240" x2="432" y2="240"/>
        <line x1="80" y1="320" x2="432" y2="320"/>
        <line x1="160" y1="110" x2="160" y2="390"/>
        <line x1="256" y1="110" x2="256" y2="390"/>
        <line x1="352" y1="110" x2="352" y2="390"/>
      </g>

      {/* Area Fill Under Exponential Curve */}
      <path d="M 96 360 C 180 355, 230 330, 280 270 C 330 210, 370 160, 420 135 L 420 376 L 96 376 Z" fill="url(#headerAreaGrad)"/>

      {/* Ascending Compounding Trend Curve with Glow */}
      <path d="M 96 360 C 180 355, 230 330, 280 270 C 330 210, 370 160, 420 135" fill="none" stroke="url(#headerTrendGrad)" strokeWidth="26" strokeLinecap="round" filter="url(#headerGlowShadow)"/>

      {/* Dynamic Arrow Peak */}
      <path d="M 370 135 L 420 135 L 420 185" fill="none" stroke="#6ee7b7" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" filter="url(#headerGlowShadow)"/>

      {/* Milestone Nodes */}
      <circle cx="96" cy="360" r="14" fill="#047857" stroke="#6ee7b7" strokeWidth="5"/>
      <circle cx="210" cy="336" r="12" fill="#10b981" stroke="#ecfdf5" strokeWidth="5"/>
      <circle cx="280" cy="270" r="15" fill="#34d399" stroke="#ffffff" strokeWidth="6" filter="url(#headerSoftShadow)"/>
      <circle cx="350" cy="195" r="16" fill="#6ee7b7" stroke="#ffffff" strokeWidth="6" filter="url(#headerSoftShadow)"/>

      {/* Floating Badge: R$ Real Currency Symbol */}
      <g transform="translate(86, 92)" filter="url(#headerSoftShadow)">
        <rect width="90" height="48" rx="24" fill="#064e3b" stroke="#34d399" strokeWidth="3" fillOpacity="0.9"/>
        <circle cx="24" cy="24" r="14" fill="url(#headerGoldGrad)"/>
        <text x="24" y="30" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="16" fontWeight="900" fill="#ffffff" textAnchor="middle">R$</text>
        <text x="58" y="30" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="14" fontWeight="800" fill="#6ee7b7" textAnchor="middle">PRO</text>
      </g>

      {/* Sparkle Accent */}
      <g transform="translate(400, 90)" fill="#fbbf24" opacity="0.95">
        <path d="M 0 -14 Q 0 0 14 0 Q 0 0 0 14 Q 0 0 -14 0 Q 0 0 0 -14 Z" />
      </g>
    </svg>
  );
};
