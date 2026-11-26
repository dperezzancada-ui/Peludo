import React from 'react';
import { Home, Heart, Plus, HardDrive, Utensils } from 'lucide-react';

interface MobileNavProps {
  onGoHome: () => void;
  onOpenNewRecipe: () => void;
  onToggleFavorites: () => void;
  onlyFavorites: boolean;
  onOpenBackup: () => void;
  favoritesCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  onGoHome,
  onOpenNewRecipe,
  onToggleFavorites,
  onlyFavorites,
  onOpenBackup,
  favoritesCount,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-xl border-t border-stone-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] w-full select-none pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1.5 px-4">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {/* Home Button */}
        <button
          onClick={onGoHome}
          className={`min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all active:scale-95 ${
            !onlyFavorites ? 'text-amber-700' : 'text-stone-500 hover:text-stone-800'
          }`}
          aria-label="Inicio"
        >
          <Home className={`w-5 h-5 ${!onlyFavorites ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span>Inicio</span>
        </button>

        {/* Center Prominent Add Button */}
        <button
          onClick={onOpenNewRecipe}
          className="relative -top-4 w-13 h-13 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-500 text-white shadow-lg shadow-orange-900/35 border-2 border-white flex items-center justify-center active:scale-90 transition-transform"
          title="Añadir nueva receta"
          aria-label="Añadir nueva receta"
        >
          <Plus className="w-7 h-7 stroke-[2.8]" />
        </button>

        {/* Favorites Button */}
        <button
          onClick={onToggleFavorites}
          className={`min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-1 text-[11px] font-bold relative transition-all active:scale-95 ${
            onlyFavorites ? 'text-rose-600' : 'text-stone-500 hover:text-stone-800'
          }`}
          aria-label="Favoritos"
        >
          <div className="relative">
            <Heart className={`w-5 h-5 ${onlyFavorites ? 'fill-current stroke-[2.5]' : 'stroke-[1.8]'}`} />
            {favoritesCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[10px] font-extrabold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                {favoritesCount}
              </span>
            )}
          </div>
          <span>Favoritos</span>
        </button>

        {/* Backup / Database Button */}
        <button
          onClick={onOpenBackup}
          className="min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-stone-500 hover:text-stone-800 active:scale-95 transition-all"
          aria-label="Base de datos y respaldo"
        >
          <HardDrive className="w-5 h-5 stroke-[1.8]" />
          <span>Respaldo</span>
        </button>
      </div>
    </nav>
  );
};
