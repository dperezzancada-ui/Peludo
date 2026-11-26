import { getSupabase } from './supabaseClient';
import { Recipe, RecipeStep, Ingredient, SupabaseRecipeRow, RecipeCategory } from '../types/recipe';
import {
  supabaseStorageService,
  isPrivateStorageUri,
  normalizeImageForPersistence,
} from './supabaseStorageService';

/**
 * Helper to parse instructions from the TEXT column.
 * Handles both JSON-serialized steps and newline/numbered plain text.
 */
export function parseInstructionsToSteps(rawInstructions: string | null | undefined): RecipeStep[] {
  if (!rawInstructions || !rawInstructions.trim()) {
    return [
      {
        id: 'step_1',
        stepNumber: 1,
        instruction: 'Preparar los ingredientes según se indica y cocinar al gusto con mimo.',
      },
    ];
  }

  const trimmed = rawInstructions.trim();

  // 1. Try parsing as JSON array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          id: item.id || `step_${idx + 1}`,
          stepNumber: item.stepNumber || idx + 1,
          instruction: item.instruction || String(item),
          tip: item.tip,
        }));
      }
    } catch {
      // Fall through to text splitting
    }
  }

  // 2. Parse plain text (split by newlines or numbered lines)
  const lines = trimmed
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return [
      {
        id: 'step_1',
        stepNumber: 1,
        instruction: trimmed,
      },
    ];
  }

  return lines.map((line, idx) => {
    // Clean leading numbers e.g. "1. ", "1 - ", "Paso 1: "
    const cleaned = line.replace(/^(paso\s*\d+[:.-]?|\d+[\.\-\)]\s*)/i, '').trim();
    return {
      id: `step_${idx + 1}`,
      stepNumber: idx + 1,
      instruction: cleaned || line,
    };
  });
}

/**
 * Serialize recipe steps into a format suitable for the TEXT column.
 * We store as JSON string so stepNumber, tips and instruction are preserved.
 */
export function serializeStepsToInstructions(steps: RecipeStep[]): string {
  if (!steps || steps.length === 0) return '';
  return JSON.stringify(steps);
}

/**
 * Normalizes ingredients from JSONB into Ingredient[]
 */
export function parseIngredients(rawIngredients: any): Ingredient[] {
  if (!rawIngredients) return [];
  if (Array.isArray(rawIngredients)) {
    return rawIngredients.map((item, idx) => ({
      id: item.id || `ing_${idx + 1}`,
      name: item.name || String(item),
      amount: item.amount !== undefined ? String(item.amount) : '',
      unit: item.unit || '',
      notes: item.notes || '',
    }));
  }
  if (typeof rawIngredients === 'string') {
    try {
      const parsed = JSON.parse(rawIngredients);
      return parseIngredients(parsed);
    } catch {
      return [
        {
          id: 'ing_1',
          name: rawIngredients,
          amount: 'Al gusto',
        },
      ];
    }
  }
  return [];
}

/**
 * Maps a database row into the app's Recipe interface
 */
export function mapRowToRecipe(
  row: SupabaseRecipeRow,
  userFavoritesSet: Set<string>,
  signedUrlMap: Record<string, string> = {}
): Recipe {
  const steps = parseInstructionsToSteps(row.instructions);
  const ingredients = parseIngredients(row.ingredients);

  const rawImage = row.image_url || '';
  const isPrivate = isPrivateStorageUri(rawImage);
  const resolvedImageUrl = isPrivate
    ? signedUrlMap[rawImage] || ''
    : rawImage ||
      'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1200&q=80';

  return {
    id: row.id,
    title: row.title || 'Receta sin título',
    category: (row.category?.toLowerCase() || 'otros') as RecipeCategory,
    description: row.description || '',
    prepTimeMinutes: row.prep_time_minutes || 20,
    cookTimeMinutes: 0,
    servings: row.servings || 4,
    imageUrl: resolvedImageUrl,
    imageStoragePath: isPrivate ? normalizeImageForPersistence(rawImage) : undefined,
    sourceUrl: row.source_url || '',
    ingredients,
    steps,
    instructions: row.instructions || '',
    createdAt: row.created_at,
    createdBy: row.created_by,
    isFavorite: userFavoritesSet.has(row.id),
  };
}

export const supabaseRecipeService = {
  /**
   * Fetch all recipes from public.recipes and favorite status from recipe_favorites
   */
  async getRecipes(userId?: string): Promise<{ recipes: Recipe[]; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { recipes: [], error: 'Supabase no está configurado.' };
    }

    try {
      // 1. Fetch all recipes
      const { data: recipeRows, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (recipesError) {
        console.error('Error fetching recipes from Supabase:', recipesError);
        return { recipes: [], error: recipesError.message };
      }

      const rows = (recipeRows || []) as SupabaseRecipeRow[];

      // 2. Fetch favorites for current user & resolve private storage signed URLs in parallel
      const userFavoritesSet = new Set<string>();
      const [, signedUrlMap] = await Promise.all([
        (async () => {
          if (!userId) return;
          try {
            const { data, error } = await supabase
              .from('recipe_favorites')
              .select('recipe_id')
              .eq('user_id', userId);
            if (!error && data) {
              data.forEach((f: { recipe_id: string }) => userFavoritesSet.add(f.recipe_id));
            }
          } catch (fErr) {
            console.warn('Could not load recipe_favorites:', fErr);
          }
        })(),
        (async (): Promise<Record<string, string>> => {
          if (!userId) return {};
          return supabaseStorageService.resolveSignedImageUrls(rows.map((r) => r.image_url));
        })(),
      ]);

      const recipes = rows.map((row) =>
        mapRowToRecipe(row, userFavoritesSet, signedUrlMap)
      );

      return { recipes };
    } catch (err: any) {
      console.error('Unexpected error in getRecipes:', err);
      return { recipes: [], error: err?.message || 'Error al obtener recetas de Supabase.' };
    }
  },

  /**
   * Create a new recipe in public.recipes
   */
  async addRecipe(
    recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<{ recipe: Recipe | null; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { recipe: null, error: 'Supabase no está configurado.' };
    if (!userId) return { recipe: null, error: 'Debes iniciar sesión para añadir una receta.' };

    try {
      const instructions = serializeStepsToInstructions(recipeData.steps);
      const persistedImage = normalizeImageForPersistence(
        recipeData.imageStoragePath || recipeData.imageUrl
      );

      const rowToInsert = {
        title: recipeData.title.trim(),
        category: recipeData.category,
        description: recipeData.description || '',
        ingredients: recipeData.ingredients,
        instructions: instructions,
        prep_time_minutes: Number(recipeData.prepTimeMinutes) || 0,
        servings: Number(recipeData.servings) || 4,
        image_url: persistedImage,
        source_url: recipeData.sourceUrl || '',
        created_by: userId,
      };

      const { data, error } = await supabase
        .from('recipes')
        .insert([rowToInsert])
        .select()
        .single();

      if (error) {
        console.error('Error adding recipe to Supabase:', error);
        return { recipe: null, error: error.message };
      }

      const insertedRow = data as SupabaseRecipeRow;
      const signedMap = insertedRow.image_url
        ? await supabaseStorageService.resolveSignedImageUrls([insertedRow.image_url])
        : {};

      const created = mapRowToRecipe(insertedRow, new Set(), signedMap);
      return { recipe: created };
    } catch (err: any) {
      console.error('Unexpected error adding recipe:', err);
      return { recipe: null, error: err?.message || 'Error inesperado al crear la receta.' };
    }
  },

  /**
   * Update an existing recipe in public.recipes (Only if user is creator)
   */
  async updateRecipe(
    id: string,
    updates: Partial<Omit<Recipe, 'id' | 'createdAt'>>,
    userId: string
  ): Promise<{ recipe: Recipe | null; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { recipe: null, error: 'Supabase no está configurado.' };
    if (!userId) return { recipe: null, error: 'Debes iniciar sesión para editar una receta.' };

    try {
      const rowUpdates: any = {};
      if (updates.title !== undefined) rowUpdates.title = updates.title.trim();
      if (updates.category !== undefined) rowUpdates.category = updates.category;
      if (updates.description !== undefined) rowUpdates.description = updates.description;
      if (updates.ingredients !== undefined) rowUpdates.ingredients = updates.ingredients;
      if (updates.steps !== undefined) rowUpdates.instructions = serializeStepsToInstructions(updates.steps);
      if (updates.prepTimeMinutes !== undefined) rowUpdates.prep_time_minutes = Number(updates.prepTimeMinutes);
      if (updates.servings !== undefined) rowUpdates.servings = Number(updates.servings);
      if (updates.imageStoragePath !== undefined || updates.imageUrl !== undefined) {
        rowUpdates.image_url = normalizeImageForPersistence(
          updates.imageStoragePath || updates.imageUrl
        );
      }
      if (updates.sourceUrl !== undefined) rowUpdates.source_url = updates.sourceUrl;

      const { data, error } = await supabase
        .from('recipes')
        .update(rowUpdates)
        .eq('id', id)
        .eq('created_by', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating recipe in Supabase:', error);
        return { recipe: null, error: error.message };
      }

      // Check favorite state
      const isFav = updates.isFavorite ?? false;
      const favSet = new Set<string>();
      if (isFav) favSet.add(id);

      const updatedRow = data as SupabaseRecipeRow;
      const signedMap = updatedRow.image_url
        ? await supabaseStorageService.resolveSignedImageUrls([updatedRow.image_url])
        : {};

      const updated = mapRowToRecipe(updatedRow, favSet, signedMap);
      return { recipe: updated };
    } catch (err: any) {
      console.error('Unexpected error updating recipe:', err);
      return { recipe: null, error: err?.message || 'Error inesperado al actualizar la receta.' };
    }
  },

  /**
   * Delete a recipe from public.recipes (Only if user is creator)
   */
  async deleteRecipe(id: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Supabase no está configurado.' };
    if (!userId) return { success: false, error: 'Debes iniciar sesión para eliminar una receta.' };

    try {
      // First clean from recipe_favorites if cascades aren't automatic
      try {
        await supabase.from('recipe_favorites').delete().eq('recipe_id', id);
      } catch {
        // Continue even if favorites delete fails
      }

      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)
        .eq('created_by', userId);

      if (error) {
        console.error('Error deleting recipe from Supabase:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Unexpected error deleting recipe:', err);
      return { success: false, error: err?.message || 'Error inesperado al eliminar la receta.' };
    }
  },

  /**
   * Toggle favorite in recipe_favorites table
   */
  async toggleFavorite(
    recipeId: string,
    userId: string,
    currentlyFav: boolean
  ): Promise<{ isFavorite: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { isFavorite: currentlyFav, error: 'Supabase no está configurado.' };
    if (!userId) return { isFavorite: currentlyFav, error: 'Inicia sesión para guardar favoritos.' };

    try {
      if (currentlyFav) {
        // Remove from favorites
        const { error } = await supabase
          .from('recipe_favorites')
          .delete()
          .eq('recipe_id', recipeId)
          .eq('user_id', userId);

        if (error) {
          console.error('Error removing favorite:', error);
          return { isFavorite: currentlyFav, error: error.message };
        }
        return { isFavorite: false };
      } else {
        // Insert into favorites
        const { error } = await supabase
          .from('recipe_favorites')
          .insert([{ recipe_id: recipeId, user_id: userId }]);

        if (error) {
          console.error('Error adding favorite:', error);
          return { isFavorite: currentlyFav, error: error.message };
        }
        return { isFavorite: true };
      }
    } catch (err: any) {
      console.error('Unexpected error toggling favorite:', err);
      return { isFavorite: currentlyFav, error: err?.message || 'Error al actualizar favoritos.' };
    }
  },

  /**
   * Migrate recipes from localStorage into Supabase without duplicating or losing data
   */
  async migrateLocalRecipes(userId: string): Promise<{
    migratedCount: number;
    skippedCount: number;
    error?: string;
  }> {
    const supabase = getSupabase();
    if (!supabase) return { migratedCount: 0, skippedCount: 0, error: 'Supabase no configurado.' };
    if (!userId) return { migratedCount: 0, skippedCount: 0, error: 'Inicia sesión para migrar recetas.' };

    try {
      const localData = localStorage.getItem('las_recetas_de_peludo_v1');
      if (!localData) {
        return { migratedCount: 0, skippedCount: 0 };
      }

      const localList: Recipe[] = JSON.parse(localData);
      if (!Array.isArray(localList) || localList.length === 0) {
        return { migratedCount: 0, skippedCount: 0 };
      }

      // Check existing recipes in Supabase to avoid duplicates (compare lowercased title)
      const { data: existingRows } = await supabase.from('recipes').select('title');
      const existingTitlesSet = new Set(
        (existingRows || []).map((r: { title: string }) => r.title.trim().toLowerCase())
      );

      const toInsert: any[] = [];
      let skippedCount = 0;

      for (const item of localList) {
        const cleanTitle = (item.title || '').trim().toLowerCase();
        if (cleanTitle && existingTitlesSet.has(cleanTitle)) {
          skippedCount++;
        } else {
          toInsert.push({
            title: item.title,
            category: item.category || 'otros',
            description: item.description || '',
            ingredients: item.ingredients || [],
            instructions: serializeStepsToInstructions(item.steps),
            prep_time_minutes: Number(item.prepTimeMinutes) || 0,
            servings: Number(item.servings) || 4,
            image_url: item.imageUrl || '',
            source_url: item.sourceUrl || '',
            created_by: userId,
          });
          existingTitlesSet.add(cleanTitle);
        }
      }

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('recipes').insert(toInsert);
        if (insertError) {
          console.error('Error inserting migrated recipes:', insertError);
          return { migratedCount: 0, skippedCount, error: insertError.message };
        }
      }

      // Mark migration as completed in localStorage so banner disappears
      localStorage.setItem('peludo_recipes_migrated', 'true');

      return {
        migratedCount: toInsert.length,
        skippedCount,
      };
    } catch (err: any) {
      console.error('Migration error:', err);
      return { migratedCount: 0, skippedCount: 0, error: err?.message || 'Error al migrar.' };
    }
  },

  /**
   * Checks if there are local recipes pending migration
   */
  hasLocalRecipesToMigrate(): number {
    try {
      if (typeof window === 'undefined') return 0;
      if (localStorage.getItem('peludo_recipes_migrated') === 'true') return 0;
      const localData = localStorage.getItem('las_recetas_de_peludo_v1');
      if (!localData) return 0;
      const list = JSON.parse(localData);
      return Array.isArray(list) ? list.length : 0;
    } catch {
      return 0;
    }
  },
};
