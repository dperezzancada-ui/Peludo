import { Recipe } from '../types/recipe';
import { INITIAL_RECIPES } from '../data/initialRecipes';

const STORAGE_KEY = 'las_recetas_de_peludo_v1';
const FAVORITES_KEY = 'las_recetas_de_peludo_favs';

export const storageService = {
  getRecipes(): Recipe[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        // Initialize with default recipes
        this.saveRecipes(INITIAL_RECIPES);
        return INITIAL_RECIPES;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.saveRecipes(INITIAL_RECIPES);
        return INITIAL_RECIPES;
      }
      return parsed;
    } catch (e) {
      console.error('Error reading recipes from storage:', e);
      return INITIAL_RECIPES;
    }
  },

  saveRecipes(recipes: Recipe[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
      window.dispatchEvent(new Event('peludo_recipes_updated'));
    } catch (e) {
      console.error('Error saving recipes to storage:', e);
    }
  },

  getRecipeById(id: string): Recipe | undefined {
    const list = this.getRecipes();
    return list.find((r) => r.id === id);
  },

  addRecipe(recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Recipe {
    const recipes = this.getRecipes();
    const newRecipe: Recipe = {
      ...recipeData,
      id: 'receta_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newRecipe, ...recipes];
    this.saveRecipes(updated);
    return newRecipe;
  },

  updateRecipe(id: string, updates: Partial<Omit<Recipe, 'id' | 'createdAt'>>): Recipe | null {
    const recipes = this.getRecipes();
    const index = recipes.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updatedRecipe: Recipe = {
      ...recipes[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    recipes[index] = updatedRecipe;
    this.saveRecipes(recipes);
    return updatedRecipe;
  },

  deleteRecipe(id: string): boolean {
    const recipes = this.getRecipes();
    const filtered = recipes.filter((r) => r.id !== id);
    if (filtered.length !== recipes.length) {
      this.saveRecipes(filtered);
      return true;
    }
    return false;
  },

  toggleFavorite(id: string): boolean {
    const recipes = this.getRecipes();
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return false;

    const newFav = !recipe.isFavorite;
    this.updateRecipe(id, { isFavorite: newFav });
    return newFav;
  },

  resetToDefault(): Recipe[] {
    this.saveRecipes(INITIAL_RECIPES);
    return INITIAL_RECIPES;
  },

  exportRecipesJSON(): void {
    const recipes = this.getRecipes();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(recipes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const date = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('download', `las-recetas-de-peludo-${date}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  importRecipesJSON(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return { success: false, count: 0, error: 'El archivo no contiene un listado de recetas válido.' };
      }

      // Basic validation
      const validRecipes: Recipe[] = parsed.filter(
        (item) => item && typeof item.title === 'string' && typeof item.category === 'string'
      );

      if (validRecipes.length === 0) {
        return { success: false, count: 0, error: 'No se encontraron recetas válidas en el archivo seleccionado.' };
      }

      this.saveRecipes(validRecipes);
      return { success: true, count: validRecipes.length };
    } catch (e: any) {
      return { success: false, count: 0, error: e?.message || 'Error al procesar el archivo JSON.' };
    }
  },
};
