import React, { useState, useEffect } from 'react';
import { Recipe } from '../types/recipe';
import { getCategoryBadgeClasses, getCategoryIcon, getCategoryName } from '../utils/categoryIcons';
import { supabaseStorageService } from '../services/supabaseStorageService';
import { RecipeCookingMode } from './RecipeCookingMode';
import {
  X,
  Clock,
  Users,
  ChefHat,
  Heart,
  Pencil,
  Trash2,
  Check,
  PlayCircle,
  Plus,
  Minus,
  Sparkles,
  Share2,
  Printer,
  ExternalLink,
} from 'lucide-react';

interface RecipeDetailModalProps {
  recipe: Recipe;
  currentUserId?: string;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  onToggleFavorite: (recipeId: string) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  currentUserId,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [servingsMultiplier, setServingsMultiplier] = useState<number>(recipe.servings || 4);
  const [isCookingModeOpen, setIsCookingModeOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState(recipe.imageUrl);
  const [imageError, setImageError] = useState(false);
  const [retriedSign, setRetriedSign] = useState(false);

  useEffect(() => {
    setDisplayImageUrl(recipe.imageUrl);
    setImageError(false);
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

  const baseServings = recipe.servings || 4;
  const ratio = servingsMultiplier / baseServings;

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  const badgeClasses = getCategoryBadgeClasses(recipe.category);

  const difficultyLabels = {
    facil: { label: 'Fácil', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    media: { label: 'Dificultad Media', class: 'bg-amber-50 text-amber-800 border-amber-200' },
    dificil: { label: 'Avanzada / Experto', class: 'bg-orange-50 text-orange-800 border-orange-200' },
  };

  const diffInfo = (recipe.difficulty && difficultyLabels[recipe.difficulty]) || difficultyLabels.media;

  const toggleIngredientCheck = (id: string) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const scaleAmount = (rawAmount: string): string => {
    if (!rawAmount) return '';
    // Try to parse numbers or decimals
    const match = rawAmount.match(/^(\d+(?:[.,]\d+)?)/);
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(num)) {
        const scaled = (num * ratio).toFixed(1).replace(/\.0$/, '');
        return rawAmount.replace(match[1], scaled);
      }
    }
    return rawAmount;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${recipe.title} - Las Recetas de Peludo`,
        text: `¡Mira esta receta de ${recipe.title} en Las Recetas de Peludo!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
        <div className="bg-[#FCFAF7] w-full max-w-4xl min-h-full sm:min-h-0 sm:max-h-[92vh] sm:rounded-3xl shadow-2xl overflow-y-auto flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
          
          {/* Hero Header with culinary image */}
          <div className="relative aspect-[16/10] sm:aspect-[21/9] w-full bg-stone-900 shrink-0">
            {!imageError && displayImageUrl ? (
              <img
                src={displayImageUrl}
                alt={recipe.title}
                onError={handleImageError}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-stone-800 text-stone-500">
                <ChefHat className="w-16 h-16" />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-black/40 pointer-events-none" />

            {/* Floating Top Action Controls: 44px touch targets */}
            <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-md border ${badgeClasses.bg} ${badgeClasses.border}`}
              >
                {getCategoryIcon(recipe.category, 'w-3.5 h-3.5 shrink-0')}
                <span>{getCategoryName(recipe.category)}</span>
              </span>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(recipe.id)}
                  className={`min-w-[42px] min-h-[42px] p-2.5 rounded-full backdrop-blur-md flex items-center justify-center transition-all shadow-md active:scale-90 ${
                    recipe.isFavorite
                      ? 'bg-rose-500 text-white'
                      : 'bg-black/50 text-white/95 hover:bg-black/70'
                  }`}
                  title={recipe.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  aria-label="Favorito"
                >
                  <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${recipe.isFavorite ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={handleShare}
                  className="min-w-[42px] min-h-[42px] p-2.5 rounded-full bg-black/50 hover:bg-black/70 active:scale-90 text-white backdrop-blur-md flex items-center justify-center transition-all"
                  title="Compartir enlace"
                  aria-label="Compartir"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  onClick={handlePrint}
                  className="min-w-[42px] min-h-[42px] p-2.5 rounded-full bg-black/50 hover:bg-black/70 active:scale-90 text-white backdrop-blur-md hidden sm:flex items-center justify-center transition-all"
                  title="Imprimir receta"
                  aria-label="Imprimir"
                >
                  <Printer className="w-5 h-5" />
                </button>

                <button
                  onClick={onClose}
                  className="min-w-[42px] min-h-[42px] p-2.5 rounded-full bg-black/60 hover:bg-black/80 active:scale-90 text-white backdrop-blur-md flex items-center justify-center transition-all"
                  title="Cerrar"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Bottom Title on image with balanced line wrap */}
            <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-6 sm:left-6 sm:right-6 text-white">
              <h1 className="font-display text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-md leading-tight text-balance">
                {recipe.title}
              </h1>
            </div>
          </div>

          {/* Quick alert if copied link */}
          {copiedLink && (
            <div className="bg-amber-600 text-white text-xs font-semibold py-2 text-center animate-in fade-in">
              ¡Enlace de la receta copiado al portapapeles!
            </div>
          )}

          {/* Body Content */}
          <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 flex-1">
            {/* Meta summary card: Compact grid on mobile */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:gap-6 text-center sm:text-left">
                <div>
                  <span className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-wider font-semibold block">Prep</span>
                  <span className="font-bold text-stone-800 text-sm sm:text-base flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 hidden sm:inline" />
                    {recipe.prepTimeMinutes || 0}m
                  </span>
                </div>

                <div className="h-7 w-px bg-stone-200 hidden sm:block" />

                <div>
                  <span className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-wider font-semibold block">Cocción</span>
                  <span className="font-bold text-stone-800 text-sm sm:text-base flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-orange-600 hidden sm:inline" />
                    {recipe.cookTimeMinutes || 0}m
                  </span>
                </div>

                <div className="h-7 w-px bg-stone-200 hidden sm:block" />

                <div>
                  <span className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-wider font-semibold block">Total</span>
                  <span className="font-bold text-amber-700 text-sm sm:text-base mt-0.5 block">
                    {totalTime}m
                  </span>
                </div>

                <div className="h-7 w-px bg-stone-200 hidden sm:block" />

                <div>
                  <span className="text-[10px] sm:text-xs text-stone-500 uppercase tracking-wider font-semibold block">Nivel</span>
                  <span className={`inline-block px-1.5 sm:px-2.5 py-0.5 rounded-md text-[11px] sm:text-xs font-bold border mt-0.5 ${diffInfo.class}`}>
                    {diffInfo.label}
                  </span>
                </div>
              </div>

              {/* Cooking Mode Big Button: Large touch target */}
              <button
                onClick={() => setIsCookingModeOpen(true)}
                className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl sm:rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-sm shadow-md shadow-amber-900/20 transition-all cursor-pointer"
              >
                <PlayCircle className="w-5 h-5 text-amber-200" />
                <span>Modo Cocina Guiado</span>
              </button>
            </div>

            {/* Description */}
            {recipe.description && (
              <div className="text-stone-700 leading-relaxed text-sm sm:text-base italic font-serif bg-amber-50/60 p-3.5 sm:p-4 rounded-xl border-l-4 border-amber-500 text-balance">
                «{recipe.description}»
              </div>
            )}

            {/* Source URL Link (if imported from web) */}
            {recipe.sourceUrl && /^https?:\/\//i.test(recipe.sourceUrl) && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-600">
                <span className="truncate">
                  Receta original de:{' '}
                  <strong className="text-stone-800 font-mono">
                    {(() => {
                      try {
                        return new URL(recipe.sourceUrl).hostname.replace(/^www\./, '');
                      } catch {
                        return recipe.sourceUrl;
                      }
                    })()}
                  </strong>
                </span>
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-amber-700 hover:text-amber-800 hover:underline shrink-0"
                >
                  <span>Abrir web</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Ingredients & Servings Scaler */}
            <section className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200/90 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-stone-100 gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-stone-900">Ingredientes</h2>
                    <p className="text-[11px] sm:text-xs text-stone-500">Toca para tachar lo que tengas preparado</p>
                  </div>
                </div>

                {/* Servings Adjuster: 40px touch targets for effortless tapping */}
                <div className="flex items-center gap-2 bg-stone-50 p-1.5 rounded-xl border border-stone-200 self-start sm:self-auto">
                  <span className="text-xs font-semibold text-stone-600 px-1.5">Raciones:</span>
                  <button
                    onClick={() => setServingsMultiplier((prev) => Math.max(1, prev - 1))}
                    className="min-w-[38px] min-h-[38px] rounded-lg bg-white hover:bg-stone-100 active:scale-90 text-stone-800 font-bold border border-stone-200 flex items-center justify-center transition-all shadow-2xs"
                    title="Menos raciones"
                    aria-label="Menos raciones"
                  >
                    <Minus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <span className="font-bold text-stone-900 w-7 text-center text-sm">
                    {servingsMultiplier}
                  </span>
                  <button
                    onClick={() => setServingsMultiplier((prev) => prev + 1)}
                    className="min-w-[38px] min-h-[38px] rounded-lg bg-white hover:bg-stone-100 active:scale-90 text-stone-800 font-bold border border-stone-200 flex items-center justify-center transition-all shadow-2xs"
                    title="Más raciones"
                    aria-label="Más raciones"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Ingredients List: Large finger-friendly rows */}
              <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
                {recipe.ingredients?.map((ing) => {
                  const isChecked = !!checkedIngredients[ing.id];
                  const scaledAmount = scaleAmount(ing.amount);

                  return (
                    <div
                      key={ing.id}
                      onClick={() => toggleIngredientCheck(ing.id)}
                      className={`min-h-[44px] flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.99] ${
                        isChecked
                          ? 'bg-stone-50/70 border-stone-200 text-stone-400'
                          : 'bg-white hover:bg-amber-50/40 border-stone-200/80 text-stone-800'
                      }`}
                    >
                      <div
                        className={`mt-0.5 min-w-[20px] min-h-[20px] rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="flex-1 text-sm leading-snug">
                        <span className={`font-semibold ${isChecked ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                          {scaledAmount} {ing.unit}{' '}
                        </span>
                        <span className={isChecked ? 'line-through' : ''}>{ing.name}</span>
                        {ing.notes && (
                          <span className="block text-xs text-stone-500 mt-0.5 italic">
                            ({ing.notes})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Preparation Steps */}
            <section className="bg-white rounded-2xl p-4 sm:p-6 border border-stone-200/90 shadow-2xs">
              <div className="flex items-center gap-2 pb-3.5 border-b border-stone-100 mb-5">
                <div className="p-2 rounded-lg bg-orange-100 text-orange-800">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-stone-900">Preparación Paso a Paso</h2>
                  <p className="text-[11px] sm:text-xs text-stone-500">Sigue el orden de elaboración para un resultado impecable</p>
                </div>
              </div>

              <div className="space-y-5">
                {recipe.steps?.map((st, index) => (
                  <div key={st.id || index} className="flex items-start gap-3.5 group">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 text-amber-800 font-extrabold text-sm sm:text-base flex items-center justify-center shrink-0 border border-amber-500/20">
                      {st.stepNumber || index + 1}
                    </div>

                    <div className="flex-1 space-y-2">
                      <p className="text-stone-800 leading-relaxed text-sm sm:text-base">
                        {st.instruction}
                      </p>

                      {st.tip && (
                        <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs sm:text-sm text-amber-900 flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-800">Consejo del Peludo: </span>
                            {st.tip}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Action Bar Footer (Edit / Delete for Creator Only) */}
            {isCreator ? (
              <div className="pt-4 pb-6 sm:pb-0 border-t border-stone-200 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    onDelete(recipe);
                    onClose();
                  }}
                  className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 active:scale-95 text-sm font-semibold transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>

                <button
                  onClick={() => {
                    onEdit(recipe);
                    onClose();
                  }}
                  className="min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 text-amber-400 font-bold text-sm shadow-xs transition-all cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Editar receta</span>
                </button>
              </div>
            ) : (
              <div className="pt-4 pb-6 sm:pb-0 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span>Receta compartida en el recetario familiar de Supabase</span>
                </div>
                <span className="text-stone-400 italic">Solo el autor puede editar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cooking Mode Assistant Fullscreen Overlay */}
      {isCookingModeOpen && (
        <RecipeCookingMode
          recipe={recipe}
          onClose={() => setIsCookingModeOpen(false)}
        />
      )}
    </>
  );
};
