import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showSubtitle = true, className = '' }) => {
  const iconSizes = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl',
    lg: 'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl',
    xl: 'w-16 h-16 sm:w-20 sm:h-20 rounded-3xl',
  };

  const titleSizes = {
    sm: 'text-sm sm:text-base font-bold',
    md: 'text-base sm:text-xl font-extrabold tracking-tight',
    lg: 'text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight',
    xl: 'text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight',
  };

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none shrink-0 ${className}`}>
      {/* Culinary Mascot Emblem: Peludo el Chef */}
      <div
        className={`${iconSizes[size]} relative bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 p-0.5 shadow-xs shadow-orange-950/20 flex items-center justify-center overflow-hidden shrink-0 transition-transform active:scale-95`}
      >
        <div className="w-full h-full rounded-[10px] sm:rounded-[14px] bg-gradient-to-b from-[#FFFDF9] to-[#FDF4EA] flex items-center justify-center relative p-0.5 sm:p-1">
          {/* Custom SVG of "Peludo" with chef hat & whisker charm */}
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-xs"
          >
            {/* Chef Hat Puffs */}
            <path
              d="M20 22C17 18 18 11 25 10C27 6 37 6 39 10C46 11 47 18 44 22Z"
              fill="#FFFFFF"
              stroke="#D97706"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 21H42V25H22V21Z"
              fill="#D97706"
              rx="1"
            />

            {/* Peludo's face / ears */}
            <path
              d="M16 28C14 23 11 25 10 32C9 38 14 40 18 36"
              fill="#C2410C"
            />
            <path
              d="M48 28C50 23 53 25 54 32C55 38 50 40 46 36"
              fill="#C2410C"
            />
            <ellipse cx="32" cy="38" rx="16" ry="14" fill="#EA580C" />
            <ellipse cx="32" cy="42" rx="11" ry="8" fill="#FDF3E7" />
            
            {/* Eyes */}
            <circle cx="26" cy="34" r="2.5" fill="#292524" />
            <circle cx="27" cy="33" r="0.8" fill="#FFFFFF" />
            <circle cx="38" cy="34" r="2.5" fill="#292524" />
            <circle cx="39" cy="33" r="0.8" fill="#FFFFFF" />

            {/* Nose */}
            <path
              d="M30 38C30.5 37 33.5 37 34 38C34.5 39.2 32.5 41 32 41C31.5 41 29.5 39.2 30 38Z"
              fill="#78350F"
            />
            
            {/* Smile */}
            <path
              d="M29 42C30.5 44 33.5 44 35 42"
              stroke="#78350F"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Whiskers */}
            <line x1="18" y1="39" x2="14" y2="38" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="18" y1="42" x2="13" y2="43" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="46" y1="39" x2="50" y2="38" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="46" y1="42" x2="51" y2="43" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />

            {/* Neckerchief */}
            <path
              d="M24 51L32 49L40 51L34 56L32 54L30 56Z"
              fill="#DC2626"
            />
          </svg>
        </div>
      </div>

      {/* Brand Text: Never awkward wrapping */}
      <div className="flex flex-col min-w-0">
        <span className={`font-display text-stone-900 leading-none truncate ${titleSizes[size]}`}>
          Las Recetas de <span className="text-amber-700 underline decoration-amber-400/60 decoration-wavy decoration-2">Peludo</span>
        </span>
        {showSubtitle && (
          <span className="hidden sm:flex text-xs font-medium text-stone-500 tracking-wide items-center gap-1.5 mt-1 truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></span>
            Cocina casera con alma y buen gusto
          </span>
        )}
      </div>
    </div>
  );
};

