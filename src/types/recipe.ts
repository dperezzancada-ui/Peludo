export type RecipeCategory = 
  | 'carnes'
  | 'pescados'
  | 'verduras'
  | 'postres'
  | 'entrantes'
  | 'otros';

export type DifficultyLevel = 'facil' | 'media' | 'dificil';

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit?: string;
  notes?: string;
}

export interface RecipeStep {
  id: string;
  stepNumber: number;
  instruction: string;
  tip?: string;
}

export interface Recipe {
  id: string;
  title: string;
  category: RecipeCategory;
  description: string;
  prepTimeMinutes: number;
  cookTimeMinutes?: number;
  servings: number;
  difficulty?: DifficultyLevel;
  imageUrl: string;
  imageStoragePath?: string;
  sourceUrl?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  instructions?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  createdByName?: string;
  isFavorite?: boolean;
  tags?: string[];
}

export interface SupabaseRecipeRow {
  id: string;
  title: string;
  category: string;
  description: string | null;
  ingredients: any;
  instructions: string | null;
  prep_time_minutes: number | null;
  servings: number | null;
  image_url: string | null;
  source_url: string | null;
  created_by: string;
  created_at: string;
}

export interface SupabaseFavoriteRow {
  recipe_id: string;
  user_id: string;
  created_at?: string;
}

export interface CategoryInfo {
  id: RecipeCategory;
  name: string;
  iconName: string;
  description: string;
  colorClass: string;
  bgLightClass: string;
  badgeClass: string;
}

export const CATEGORIES_CONFIG: CategoryInfo[] = [
  {
    id: 'carnes',
    name: 'Carnes',
    iconName: 'Beef',
    description: 'Aves, ternera, cerdo, guisos y asados',
    colorClass: 'text-amber-800',
    bgLightClass: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  {
    id: 'pescados',
    name: 'Pescados',
    iconName: 'Fish',
    description: 'Pescados de mar, río, mariscos y cazuelas',
    colorClass: 'text-sky-800',
    bgLightClass: 'bg-sky-50 hover:bg-sky-100 border-sky-200',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
  },
  {
    id: 'verduras',
    name: 'Verduras',
    iconName: 'Carrot',
    description: 'Huerta, ensaladas, salteados y cremas',
    colorClass: 'text-emerald-800',
    bgLightClass: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    id: 'postres',
    name: 'Postres',
    iconName: 'Cake',
    description: 'Dulces, tartas, bizcochos y repostería',
    colorClass: 'text-rose-800',
    bgLightClass: 'bg-rose-50 hover:bg-rose-100 border-rose-200',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
  },
  {
    id: 'entrantes',
    name: 'Entrantes',
    iconName: 'UtensilsCrossed',
    description: 'Tapas, aperitivos, tortillas y picoteo',
    colorClass: 'text-orange-800',
    bgLightClass: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  {
    id: 'otros',
    name: 'Otros',
    iconName: 'Soup',
    description: 'Arroces, pastas, panes y salsas caseras',
    colorClass: 'text-stone-700',
    bgLightClass: 'bg-stone-100 hover:bg-stone-200 border-stone-300',
    badgeClass: 'bg-stone-100 text-stone-800 border-stone-300',
  },
];
