import React from 'react';
import { ChefHat, Sparkles, Clock, Heart, BookOpen, Globe } from 'lucide-react';

interface HeroBannerProps {
  totalRecipes: number;
  favoritesCount: number;
  quickMealsCount: number;
  onOpenNewRecipe: () => void;
  onOpenImportRecipe: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  totalRecipes,
  favoritesCount,
  quickMealsCount,
  onOpenNewRecipe,
  onOpenImportRecipe,
}) => {
  return (
    <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#291811] via-[#3D2319] to-[#1F130E] text-white p-4 sm:p-7 md:p-9 shadow-lg border border-amber-950/40 w-full">
      {/* Decorative culinary background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 sm:w-64 h-48 sm:h-64 rounded-full bg-amber-500/10 blur-2xl sm:blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-12 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-orange-600/10 blur-2xl sm:blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
        <div className="max-w-2xl space-y-2 sm:space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Recetario Gastronómico Familiar</span>
          </div>

          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-amber-50 leading-snug">
            El rincón donde cada plato cuenta una historia con sabor de hogar
          </h1>

          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed max-w-xl">
            Platos caseros, carnes, pescados, verduras de huerta y postres inolvidables seleccionados por el chef <strong>Peludo</strong>.
          </p>

          {/* Quick Stats Badges: Compact on mobile */}
          <div className="pt-1.5 flex items-center gap-2 sm:gap-3 flex-wrap text-xs font-semibold">
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-xl backdrop-blur-xs text-amber-200">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>{totalRecipes} Recetas</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-xl backdrop-blur-xs text-emerald-200">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{quickMealsCount} Rápidas (&lt;30m)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-xl backdrop-blur-xs text-rose-200">
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/40" />
              <span>{favoritesCount} Favoritas</span>
            </div>
          </div>
        </div>

        {/* Right CTA / Action Buttons */}
        <div className="shrink-0 pt-1 lg:pt-0 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onOpenImportRecipe}
            className="w-full sm:w-auto min-h-[46px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 border border-amber-400/30 text-amber-100 font-bold text-sm backdrop-blur-xs active:scale-95 transition-all cursor-pointer"
          >
            <Globe className="w-4 h-4 text-amber-300" />
            <span>Importar receta</span>
          </button>

          <button
            onClick={onOpenNewRecipe}
            className="w-full sm:w-auto min-h-[46px] flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <ChefHat className="w-5 h-5 text-stone-950 stroke-[2.5]" />
            <span>+ Añadir mi Receta</span>
          </button>
        </div>
      </div>
    </section>
  );
};
