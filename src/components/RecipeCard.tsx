import React, { useState, useEffect } from 'react';
import { Recipe } from '../types/recipe';
import { getCategoryBadgeClasses, getCategoryIcon, getCategoryName } from '../utils/categoryIcons';
import { supabaseStorageService } from '../services/supabaseStorageService';
import { Clock, Users, Heart, Pencil, Trash2, ChefHat } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  currentUserId?: string;
  onView: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  currentUserId,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState(recipe.imageUrl);
  const [retriedSign, setRetriedSign] = useState(false);

  useEffect(() => {
    setDisplayImageUrl(recipe.imageUrl);
    setImageError(false);
    setImageLoaded(false);
    setRetriedSign(false);

    if (!recipe.imageUrl && recipe.imageStoragePath) {
      supabaseStorageService.getSignedImageUrl(recipe.imageStoragePath).then((signed) => {
        if (signed) setDisplayImageUrl(signed);
      });
    }
  }, [recipe.imageUrl, recipe.imageStoragePath]);

  const handleImageError = async () => {
    if (recipe.imageStoragePath && !retriedSign) {
      setRetriedSign(true);
      const freshUrl = await supabaseStorageService.getSignedImageUrl(recipe.imageStoragePath, true);
      if (freshUrl) {
        setDisplayImageUrl(freshUrl);
        setImageError(false);
        return;
      }
    }
    setImageError(true);
  };

  const isCreator = !recipe.createdBy || recipe.createdBy === currentUserId;

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  const badgeClasses = getCategoryBadgeClasses(recipe.category);

  const difficultyLabels = {
    facil: { label: 'Fácil', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    media: { label: 'Media', class: 'bg-amber-50 text-amber-800 border-amber-200' },
    dificil: { label: 'Avanzada', class: 'bg-orange-50 text-orange-800 border-orange-200' },
  };

  const diffInfo = (recipe.difficulty && difficultyLabels[recipe.difficulty]) || difficultyLabels.media;

  return (
    <article
      onClick={() => onView(recipe)}
      className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/90 shadow-2xs hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99] flex flex-col cursor-pointer w-full select-none"
    >
      {/* Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
        {!imageError && displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt={recipe.title}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 text-stone-400 p-4">
            <ChefHat className="w-10 h-10 text-stone-300 mb-1" />
            <span className="text-xs font-medium text-stone-500 text-center line-clamp-1">{recipe.title}</span>
          </div>
        )}

        {/* Gradient shadow overlay for badge readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-900/10 to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {/* Category Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-xs border ${badgeClasses.bg} ${badgeClasses.border}`}
          >
            {getCategoryIcon(recipe.category, 'w-3.5 h-3.5 shrink-0')}
            <span>{getCategoryName(recipe.category)}</span>
          </span>

          {/* Large touch-friendly favorite button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(recipe.id);
            }}
            className={`pointer-events-auto min-w-[40px] min-h-[40px] p-2 rounded-full backdrop-blur-md flex items-center justify-center transition-all shadow-xs active:scale-90 ${
              recipe.isFavorite
                ? 'bg-rose-500 text-white shadow-rose-900/30'
                : 'bg-black/35 text-white/95 hover:bg-black/55'
            }`}
            title={recipe.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            aria-label="Favorito"
          >
            <Heart className={`w-4 h-4 ${recipe.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Bottom image overlay with metadata */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px] sm:text-xs font-semibold drop-shadow-sm pointer-events-none">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
              <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>{totalTime}m</span>
            </span>
            <span className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
              <Users className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>{recipe.servings}r</span>
            </span>
          </div>

          <span className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border ${diffInfo.class}`}>
            {diffInfo.label}
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        <div>
          <h3 className="font-display text-base sm:text-lg font-bold text-stone-900 line-clamp-1 group-hover:text-amber-800 transition-colors">
            {recipe.title}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed">
            {recipe.description || 'Una deliciosa receta tradicional preparada con ingredientes frescos.'}
          </p>
        </div>

        {/* Ingredients & Steps preview indicator with comfortable touch buttons */}
        <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span className="font-medium text-stone-600 truncate max-w-[170px]">
            {recipe.ingredients?.length || 0} ing. • {recipe.steps?.length || 0} pasos
          </span>

          {/* Action buttons: Only creator can edit or delete their recipes */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {isCreator ? (
              <>
                <button
                  onClick={() => onEdit(recipe)}
                  className="min-w-[38px] min-h-[38px] flex items-center justify-center p-2 text-stone-500 hover:text-amber-700 hover:bg-amber-50 active:bg-amber-100 rounded-xl transition-colors cursor-pointer"
                  title="Editar mi receta"
                  aria-label="Editar receta"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(recipe)}
                  className="min-w-[38px] min-h-[38px] flex items-center justify-center p-2 text-stone-500 hover:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors cursor-pointer"
                  title="Eliminar mi receta"
                  aria-label="Eliminar receta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md font-semibold">
                Familiar
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
