import React from 'react';

interface AntLogoProps {
  className?: string;
  size?: number;
  variant?: 'shield' | 'icon' | 'badge';
  glowing?: boolean;
}

export const AntLogo: React.FC<AntLogoProps> = ({
  className = 'w-7 h-7',
  size,
  variant = 'shield',
  glowing = true,
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        {/* Core Shield & Body Gradient */}
        <linearGradient id="omniShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        {/* Armor Plate Gradient */}
        <linearGradient id="omniArmorGrad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Live Core Glow Gradient */}
        <linearGradient id="omniCoreGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        {/* Metallic Edge */}
        <linearGradient id="omniMetalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>

        {/* Subtle Glow Filter */}
        <filter id="omniGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Hex-Shield Outer Crest Armor */}
      {variant === 'shield' && (
        <>
          {/* Outer Shield Border */}
          <path
            d="M24 2 L42 8 V24 C42 34.5 34.5 43 24 46 C13.5 43 6 34.5 6 24 V8 L24 2 Z"
            fill="url(#omniShieldGrad)"
            fillOpacity="0.18"
            stroke="url(#omniShieldGrad)"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          {/* Inner Cyber Crest Accents */}
          <path
            d="M24 6 L38 11 V23 C38 31.8 32 38.8 24 41.5 C16 38.8 10 31.8 10 23 V11 L24 6 Z"
            stroke="#38bdf8"
            strokeWidth="0.8"
            strokeDasharray="2 2"
            strokeOpacity="0.4"
          />
          {/* Tech Angle Nodes */}
          <circle cx="24" cy="5" r="1.2" fill="#38bdf8" />
          <circle cx="40" cy="10" r="1" fill="#38bdf8" />
          <circle cx="8" cy="10" r="1" fill="#38bdf8" />
          <circle cx="24" cy="43" r="1.2" fill="#38bdf8" />
        </>
      )}

      {/* --- CYBER ANT GUARDIAN --- */}
      <g filter={glowing ? 'url(#omniGlow)' : undefined}>
        {/* Antennae with Cyber Sensors */}
        <path
          d="M20 12 C17 7 11 6 8 8"
          stroke="url(#omniArmorGrad)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="8" cy="8" r="1.4" fill="#38bdf8" />

        <path
          d="M28 12 C31 7 37 6 40 8"
          stroke="url(#omniArmorGrad)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="40" cy="8" r="1.4" fill="#38bdf8" />

        {/* Sharp Mandibles / Power Pincers */}
        <path
          d="M21 16.5 C18.5 15.5 17 14 17.5 12"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M27 16.5 C29.5 15.5 31 14 30.5 12"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Front Armored Cyber Legs */}
        <path
          d="M19 19 L11 15 L5 18"
          stroke="url(#omniShieldGrad)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M29 19 L37 15 L43 18"
          stroke="url(#omniShieldGrad)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Middle Cyber Legs */}
        <path
          d="M18 24 L10 24 L4 28"
          stroke="url(#omniShieldGrad)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M30 24 L38 24 L44 28"
          stroke="url(#omniShieldGrad)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Rear Cyber Legs */}
        <path
          d="M18 31 L11 34 L7 39"
          stroke="url(#omniShieldGrad)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M30 31 L37 34 L41 39"
          stroke="url(#omniShieldGrad)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Head Segment - Angular Cyber Armor */}
        <path
          d="M24 11 L28 14 L26.5 18 L21.5 18 L20 14 Z"
          fill="url(#omniArmorGrad)"
          stroke="#e0f2fe"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Optical Sensor Eyes */}
        <circle cx="21.5" cy="14" r="0.9" fill="#10b981" />
        <circle cx="26.5" cy="14" r="0.9" fill="#10b981" />

        {/* Thorax (Chest Armor with Hex Power Core) */}
        <path
          d="M24 19.5 L28.5 22 L27.5 27 L24 28.5 L20.5 27 L19.5 22 Z"
          fill="url(#omniArmorGrad)"
          stroke="#7dd3fc"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Core Reactor Pulse Line */}
        <line x1="24" y1="21" x2="24" y2="26" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Abdomen (Heavy Segmented Armored Carapace) */}
        <path
          d="M24 30 C28 30 31 33 30.5 37.5 C30 41 26.5 43.5 24 44 C21.5 43.5 18 41 17.5 37.5 C17 33 20 30 24 30 Z"
          fill="url(#omniCoreGlow)"
          fillOpacity="0.85"
          stroke="#38bdf8"
          strokeWidth="1.2"
        />
        {/* Segmented Armor Ribs */}
        <path d="M19 34 C21 33.2 27 33.2 29 34" stroke="#e0f2fe" strokeWidth="1" strokeLinecap="round" />
        <path d="M19.5 37.5 C21.5 36.8 26.5 36.8 28.5 37.5" stroke="#e0f2fe" strokeWidth="1" strokeLinecap="round" />
        <path d="M21 40.5 C22.5 40 25.5 40 27 40.5" stroke="#e0f2fe" strokeWidth="0.9" strokeLinecap="round" />

        {/* Central Pulse Beacon Node */}
        <circle cx="24" cy="37" r="1.5" fill="#ffffff" />
      </g>
    </svg>
  );
};
