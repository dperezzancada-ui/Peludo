import React from 'react';
import { RecipeCategory, CATEGORIES_CONFIG } from '../types/recipe';
import { getCategoryIcon } from '../utils/categoryIcons';
import { Sparkles } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: RecipeCategory | 'todas';
  onSelectCategory: (category: RecipeCategory | 'todas') => void;
  categoryCounts: Record<string, number>;
  totalCount: number;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  totalCount,
}) => {
  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar touch-pan-x">
        {/* All button */}
        <button
          onClick={() => onSelectCategory('todas')}
          className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-xl sm:rounded-2xl text-sm font-semibold transition-all shrink-0 cursor-pointer active:scale-95 whitespace-nowrap ${
            selectedCategory === 'todas'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25 ring-2 ring-amber-500/30'
              : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200/90 shadow-2xs'
          }`}
        >
          <Sparkles className={`w-4 h-4 shrink-0 ${selectedCategory === 'todas' ? 'text-amber-200' : 'text-amber-500'}`} />
          <span>Todas</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ml-0.5 ${
              selectedCategory === 'todas' ? 'bg-amber-700/80 text-amber-100' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {/* 6 requested categories */}
        {CATEGORIES_CONFIG.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`min-h-[44px] flex items-center gap-2 px-3.5 py-2.5 rounded-xl sm:rounded-2xl text-sm font-semibold transition-all shrink-0 cursor-pointer active:scale-95 whitespace-nowrap ${
                isSelected
                  ? 'bg-stone-900 text-amber-300 shadow-md shadow-stone-950/25 ring-2 ring-stone-800'
                  : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200/90 shadow-2xs'
              }`}
            >
              <span className={`shrink-0 ${isSelected ? 'text-amber-400' : 'text-stone-500'}`}>
                {getCategoryIcon(cat.id, 'w-4 h-4')}
              </span>
              <span>{cat.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ml-0.5 ${
                  isSelected ? 'bg-stone-800 text-amber-200' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
