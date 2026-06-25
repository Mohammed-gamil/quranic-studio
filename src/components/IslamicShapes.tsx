// FILE: src/components/IslamicShapes.tsx

import React from 'react';

/**
 * IslamicPatternBackground:
 * Renders an infinite repeating Islamic geometric star grid pattern.
 * Highly responsive, positioned absolutely within its parent containment context.
 */
export function IslamicPatternBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 opacity-[0.035]" style={{ mixBlendMode: 'multiply' }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="islamic_grid" width="160" height="160" patternUnits="userSpaceOnUse">
            {/* outer diamond structure */}
            <path d="M80 0 L160 80 L80 160 L0 80 Z" fill="none" stroke="currentColor" strokeWidth="0.75" />
            
            {/* diagonal grid lines */}
            <path d="M0 0 L160 160 M160 0 L0 160" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 3" />
            
            {/* main circular orbits */}
            <circle cx="80" cy="80" r="45" fill="none" stroke="currentColor" strokeWidth="0.75" />
            <circle cx="80" cy="80" r="25" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
            
            {/* Central Rub el Hizb 8-pointed star */}
            <g transform="translate(80, 80)">
              <rect x="-18" y="-18" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1" />
              <rect x="-18" y="-18" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1" transform="rotate(45)" />
              <circle cx="0" cy="0" r="8" fill="none" stroke="currentColor" strokeWidth="0.75" />
              <circle cx="0" cy="0" r="3" fill="currentColor" />
            </g>

            {/* Corner Rub el Hizb 8-pointed stars (overlapping to seamlessly tile) */}
            {[[0,0], [160,0], [0,160], [160,160]].map(([cx, cy], idx) => (
              <g key={idx} transform={`translate(${cx}, ${cy})`}>
                <rect x="-10" y="-10" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="0.75" />
                <rect x="-10" y="-10" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="0.75" transform="rotate(45)" />
                <circle cx="0" cy="0" r="3" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </g>
            ))}

            {/* Mid-edge interlocking circle segments */}
            {[[80,0], [160,80], [80,160], [0,80]].map(([cx, cy], idx) => (
              <circle key={idx} cx={cx} cy={cy} r="18" fill="none" stroke="currentColor" strokeWidth="0.5" />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#islamic_grid)" className="text-[#141414]" />
      </svg>
    </div>
  );
}

/**
 * IslamicStar:
 * A beautiful ornament featuring an intricate double Rub el Hizb 8-pointed star medallion.
 */
export function IslamicStar({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg 
      className={`pointer-events-none select-none ${className}`} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer framing circle */}
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
      <circle cx="50" cy="50" r="43" fill="none" stroke="currentColor" strokeWidth="0.75" />
      
      {/* Primary 8-point outer star */}
      <rect x="23" y="23" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="23" y="23" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(45 50 50)" />
      
      {/* Intermediate interlocking lines */}
      <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="0.75" />

      {/* Inner 8-point star */}
      <g transform="translate(50, 50)">
        <rect x="-13" y="-13" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1" />
        <rect x="-13" y="-13" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1" transform="rotate(45)" />
        <circle cx="0" cy="0" r="5" fill="none" stroke="currentColor" strokeWidth="0.75" />
        <circle cx="0" cy="0" r="2" fill="currentColor" />
      </g>
    </svg>
  );
}

/**
 * IslamicCornerOrnament:
 * An intricate arabesque lace corner ornament used to frame major layout tables and cards.
 */
export function IslamicCornerOrnament({ position = 'top-left', className = 'w-16 h-16' }: { position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right', className?: string }) {
  const rotationClass = {
    'top-left': 'rotate-0',
    'top-right': 'rotate-90',
    'bottom-right': 'rotate-180',
    'bottom-left': '-rotate-90',
  }[position];

  return (
    <div className={`absolute pointer-events-none select-none z-0 ${rotationClass} ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#141414] opacity-[0.06]">
        {/* Outlines of corner */}
        <path d="M 0 0 L 100 0 L 0 100 Z" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" />
        <path d="M 0 5 L 95 5 C 95 5, 45 45, 5 95 L 0 95 Z" fill="none" stroke="currentColor" strokeWidth="0.75" />
        
        {/* Star in the corner */}
        <g transform="translate(20, 20)">
          <rect x="-10" y="-10" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="0.75" />
          <rect x="-10" y="-10" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="0.75" transform="rotate(45)" />
          <circle cx="0" cy="0" r="4" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </g>

        {/* Dynamic sweeping arabesque vines */}
        <path d="M 0 0 Q 35 15, 60 60 Q 15 35, 0 0 Z" fill="none" stroke="currentColor" strokeWidth="0.75" />
        <path d="M 0 0 Q 50 5, 80 80 Q 5 50, 0 0 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
        
        {/* Secondary arc ornaments */}
        <circle cx="0" cy="0" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 2" />
        <circle cx="0" cy="0" r="55" fill="none" stroke="currentColor" strokeWidth="0.75" />
        <circle cx="0" cy="0" r="75" fill="none" stroke="currentColor" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

/**
 * IslamicDivider:
 * An elegant horizontal decorative component centering an Rub el Hizb medallion with flanking geometric lines.
 */
export function IslamicDivider({ className = 'my-6' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 w-full text-[#141414]/15 select-none pointer-events-none ${className}`}>
      <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#141414]/15 to-[#141414]/25"></div>
      
      {/* Symmetric geometrical diamond nodes */}
      <div className="flex items-center gap-1.5 shrink-0 text-[#141414]/25">
        <span className="w-1.5 h-1.5 rotate-45 border border-currentColor bg-transparent"></span>
        <span className="w-2.5 h-2.5 rotate-45 border border-currentColor bg-transparent"></span>
        
        {/* Centered Rub el Hizb Star */}
        <IslamicStar className="w-8 h-8 text-[#141414]/30" />
        
        <span className="w-2.5 h-2.5 rotate-45 border border-currentColor bg-transparent"></span>
        <span className="w-1.5 h-1.5 rotate-45 border border-currentColor bg-transparent"></span>
      </div>
      
      <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-[#141414]/15 to-[#141414]/25"></div>
    </div>
  );
}
