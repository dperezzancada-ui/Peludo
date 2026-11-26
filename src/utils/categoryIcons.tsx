import React from 'react';
import {
  Drumstick,
  Fish,
  Carrot,
  Cake,
  UtensilsCrossed,
  Soup,
  Sparkles,
  ChefHat,
  Flame,
  Salad,
} from 'lucide-react';
import { RecipeCategory } from '../types/recipe';

export function getCategoryIcon(category: RecipeCategory, className = 'w-4 h-4'): React.ReactNode {
  switch (category) {
    case 'carnes':
      return <Drumstick className={className} />;
    case 'pescados':
      return <Fish className={className} />;
    case 'verduras':
      return <Carrot className={className} />;
    case 'postres':
      return <Cake className={className} />;
    case 'entrantes':
      return <UtensilsCrossed className={className} />;
    case 'otros':
      return <Soup className={className} />;
    default:
      return <ChefHat className={className} />;
  }
}

export function getCategoryBadgeClasses(category: RecipeCategory): { bg: string; text: string; border: string } {
  switch (category) {
    case 'carnes':
      return { bg: 'bg-amber-100/90 text-amber-900', text: 'text-amber-800', border: 'border-amber-300' };
    case 'pescados':
      return { bg: 'bg-sky-100/90 text-sky-900', text: 'text-sky-800', border: 'border-sky-300' };
    case 'verduras':
      return { bg: 'bg-emerald-100/90 text-emerald-900', text: 'text-emerald-800', border: 'border-emerald-300' };
    case 'postres':
      return { bg: 'bg-rose-100/90 text-rose-900', text: 'text-rose-800', border: 'border-rose-300' };
    case 'entrantes':
      return { bg: 'bg-orange-100/90 text-orange-900', text: 'text-orange-800', border: 'border-orange-300' };
    case 'otros':
      return { bg: 'bg-stone-200/90 text-stone-900', text: 'text-stone-800', border: 'border-stone-400' };
    default:
      return { bg: 'bg-amber-100/90 text-amber-900', text: 'text-amber-800', border: 'border-amber-300' };
  }
}

export function getCategoryName(category: RecipeCategory): string {
  switch (category) {
    case 'carnes':
      return 'Carnes';
    case 'pescados':
      return 'Pescados';
    case 'verduras':
      return 'Verduras';
    case 'postres':
      return 'Postres';
    case 'entrantes':
      return 'Entrantes';
    case 'otros':
      return 'Otros';
    default:
      return category;
  }
}

export const SAMPLE_PRESET_IMAGES: { label: string; url: string; category: RecipeCategory }[] = [
  {
    label: 'Carne asada o guiso',
    category: 'carnes',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Pollo crujiente o asado',
    category: 'carnes',
    url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Hamburguesa artesana',
    category: 'carnes',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Pescado fresco o marisco',
    category: 'pescados',
    url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Salmón o atún a la plancha',
    category: 'pescados',
    url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Salteado de verduras o pisto',
    category: 'verduras',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Ensalada gourmet o huerta',
    category: 'verduras',
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Tarta de queso o repostería',
    category: 'postres',
    url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Chocolate y brownie dulce',
    category: 'postres',
    url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Croquetas caseras o tapas',
    category: 'entrantes',
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Tortilla de patatas o canapés',
    category: 'entrantes',
    url: 'https://images.unsplash.com/photo-1547496502-affa22d38842?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Paella o arroz marinero',
    category: 'otros',
    url: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=1000&q=80',
  },
  {
    label: 'Pasta italiana o salsa casera',
    category: 'otros',
    url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=1000&q=80',
  },
];
