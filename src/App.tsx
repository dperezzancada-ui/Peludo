import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Recipe, RecipeCategory } from './types/recipe';
import { storageService } from './services/storageService';
import { supabaseRecipeService } from './services/supabaseRecipeService';
import { authService } from './services/authService';
import { isSupabaseConfigured } from './services/supabaseClient';

import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryFilter } from './components/CategoryFilter';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { RecipeFormModal } from './components/RecipeFormModal';
import { RecipeImportModal } from './components/RecipeImportModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { BackupModal } from './components/BackupModal';
import { AuthModal } from './components/AuthModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { MigrationModal } from './components/MigrationModal';
import { MobileNav } from './components/MobileNav';
import { Logo } from './components/Logo';
import { ImportedRecipeDraft } from './utils/recipeParser';

import {
  ChefHat,
  Search,
  Plus,
  Heart,
  Clock,
  Sparkles,
  Filter,
  SlidersHorizontal,
  X,
  RotateCcw,
  Database,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  LogIn,
  KeyRound,
} from 'lucide-react';

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'todas'>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [maxMinutesFilter, setMaxMinutesFilter] = useState<number | null>(null);

  // Authentication & Supabase state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);
  const [hasLocalMigration, setHasLocalMigration] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modals state
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importDraft, setImportDraft] = useState<ImportedRecipeDraft | null>(null);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Load recipes from Supabase (primary) or local storage (fallback)
  const loadRecipes = useCallback(async () => {
    setLoading(true);
    const configured = isSupabaseConfigured();

    if (configured) {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      const res = await supabaseRecipeService.getRecipes(currentUser?.id);

      if (!res.error && res.recipes) {
        setRecipes(res.recipes);
      } else {
        // If error (such as RLS requiring authenticated user and user is not logged in yet)
        if (!currentUser) {
          // Keep whatever local fallback recipes exist or show initial starter
          const local = storageService.getRecipes();
          setRecipes(local);
        } else {
          showToast('error', `Error al cargar de Supabase: ${res.error}`);
        }
      }

      // Check if local migration is pending
      const pendingCount = supabaseRecipeService.hasLocalRecipesToMigrate();
      setHasLocalMigration(pendingCount);
    } else {
      // Use local storage
      const local = storageService.getRecipes();
      setRecipes(local);
    }
    setLoading(false);
  }, []);

  // Initialize auth and listeners
  useEffect(() => {
    loadRecipes();

    // Listen to Supabase auth state change
    const { unsubscribe } = authService.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      setUser(nextUser);
      loadRecipes();
    });

    const handleConfigChanged = () => {
      loadRecipes();
    };

    window.addEventListener('peludo_supabase_config_changed', handleConfigChanged);
    window.addEventListener('peludo_recipes_updated', loadRecipes);

    return () => {
      unsubscribe();
      window.removeEventListener('peludo_supabase_config_changed', handleConfigChanged);
      window.removeEventListener('peludo_recipes_updated', loadRecipes);
    };
  }, [loadRecipes]);

  // Update selectedRecipe when recipes state updates
  useEffect(() => {
    if (selectedRecipe) {
      const updated = recipes.find((r) => r.id === selectedRecipe.id);
      if (updated) {
        setSelectedRecipe(updated);
      }
    }
  }, [recipes, selectedRecipe]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      carnes: 0,
      pescados: 0,
      verduras: 0,
      postres: 0,
      entrantes: 0,
      otros: 0,
    };
    recipes.forEach((r) => {
      if (counts[r.category] !== undefined) {
        counts[r.category]++;
      }
    });
    return counts;
  }, [recipes]);

  const favoritesCount = useMemo(() => {
    return recipes.filter((r) => r.isFavorite).length;
  }, [recipes]);

  const quickMealsCount = useMemo(() => {
    return recipes.filter((r) => (r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0) <= 30).length;
  }, [recipes]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      if (selectedCategory !== 'todas' && recipe.category !== selectedCategory) {
        return false;
      }
      if (onlyFavorites && !recipe.isFavorite) {
        return false;
      }
      if (maxMinutesFilter !== null) {
        const total = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
        if (total > maxMinutesFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = recipe.title.toLowerCase().includes(q);
        const matchesDesc = (recipe.description || '').toLowerCase().includes(q);
        const matchesIngredients = recipe.ingredients?.some((ing) =>
          ing.name.toLowerCase().includes(q)
        );
        const matchesTags = recipe.tags?.some((t) => t.toLowerCase().includes(q));

        if (!matchesTitle && !matchesDesc && !matchesIngredients && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [recipes, selectedCategory, onlyFavorites, maxMinutesFilter, searchQuery]);

  // Handlers for Add/Import/Edit/Delete
  const handleOpenNewRecipe = () => {
    if (isSupabaseConfigured() && !user) {
      setIsAuthOpen(true);
      showToast('info', 'Inicia sesión con correo y contraseña para crear recetas en Supabase.');
      return;
    }
    setRecipeToEdit(null);
    setImportDraft(null);
    setIsFormOpen(true);
  };

  const handleOpenImportRecipe = () => {
    if (isSupabaseConfigured() && !user) {
      setIsAuthOpen(true);
      showToast('info', 'Inicia sesión con correo y contraseña para importar recetas a Supabase.');
      return;
    }
    setIsImportOpen(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    if (isSupabaseConfigured()) {
      if (!user) {
        setIsAuthOpen(true);
        showToast('info', 'Inicia sesión para editar tus recetas.');
        return;
      }
      if (recipe.createdBy && recipe.createdBy !== user.id) {
        showToast('error', 'Solo el creador puede editar esta receta.');
        return;
      }
    }
    setImportDraft(null);
    setRecipeToEdit(recipe);
    setIsFormOpen(true);
  };

  const handleSaveRecipe = async (
    recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const configured = isSupabaseConfigured();

    if (configured && user) {
      if (recipeToEdit) {
        const previousPath = recipeToEdit.imageStoragePath;
        const nextPath = recipeData.imageStoragePath;

        // Updating
        const res = await supabaseRecipeService.updateRecipe(
          recipeToEdit.id,
          recipeData,
          user.id
        );
        if (res.error) {
          showToast('error', `Error al actualizar: ${res.error}`);
          return;
        }

        // Si el usuario cambió la foto privada de su carpeta, limpiamos la antigua de Storage
        if (previousPath && previousPath !== nextPath) {
          const { supabaseStorageService } = await import('./services/supabaseStorageService');
          await supabaseStorageService.deleteRecipeImage(previousPath, user.id);
        }

        showToast('success', '¡Receta actualizada con éxito en Supabase!');
      } else {
        // Creating
        const res = await supabaseRecipeService.addRecipe(recipeData, user.id);
        if (res.error) {
          showToast('error', `Error al crear: ${res.error}`);
          return;
        }
        showToast('success', '¡Receta guardada en la nube para toda la familia!');
      }
      await loadRecipes();
    } else {
      // Local fallback
      if (recipeToEdit) {
        storageService.updateRecipe(recipeToEdit.id, recipeData);
      } else {
        storageService.addRecipe(recipeData);
      }
      loadRecipes();
      showToast('success', 'Receta guardada localmente.');
    }

    setIsFormOpen(false);
    setIsImportOpen(false);
    setImportDraft(null);
    setRecipeToEdit(null);
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    if (isSupabaseConfigured()) {
      if (!user) {
        setIsAuthOpen(true);
        return;
      }
      if (recipe.createdBy && recipe.createdBy !== user.id) {
        showToast('error', 'Solo el creador puede eliminar esta receta.');
        return;
      }
    }
    setRecipeToDelete(recipe);
  };

  const handleConfirmDelete = async () => {
    if (!recipeToDelete) return;

    const configured = isSupabaseConfigured();
    if (configured && user) {
      const storagePathToDelete = recipeToDelete.imageStoragePath;
      const res = await supabaseRecipeService.deleteRecipe(recipeToDelete.id, user.id);
      if (res.error) {
        showToast('error', `Error al eliminar: ${res.error}`);
      } else {
        if (storagePathToDelete) {
          const { supabaseStorageService } = await import('./services/supabaseStorageService');
          await supabaseStorageService.deleteRecipeImage(storagePathToDelete, user.id);
        }
        showToast('success', 'Receta eliminada del recetario familiar.');
        await loadRecipes();
      }
    } else {
      storageService.deleteRecipe(recipeToDelete.id);
      loadRecipes();
      showToast('success', 'Receta eliminada.');
    }

    if (selectedRecipe?.id === recipeToDelete.id) {
      setSelectedRecipe(null);
    }
    setRecipeToDelete(null);
  };

  const handleToggleFavorite = async (recipeId: string) => {
    const configured = isSupabaseConfigured();

    if (configured) {
      if (!user) {
        setIsAuthOpen(true);
        showToast('info', 'Inicia sesión para guardar tus favoritos en Supabase.');
        return;
      }

      const target = recipes.find((r) => r.id === recipeId);
      const currentlyFav = target?.isFavorite ?? false;

      // Optimistic UI update
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, isFavorite: !currentlyFav } : r))
      );

      const res = await supabaseRecipeService.toggleFavorite(recipeId, user.id, currentlyFav);
      if (res.error) {
        // Revert
        setRecipes((prev) =>
          prev.map((r) => (r.id === recipeId ? { ...r, isFavorite: currentlyFav } : r))
        );
        showToast('error', `Error en favoritos: ${res.error}`);
      }
    } else {
      storageService.toggleFavorite(recipeId);
      loadRecipes();
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setUser(null);
    showToast('info', 'Sesión cerrada correctamente.');
    loadRecipes();
  };

  const handleClearFilters = () => {
    setSelectedCategory('todas');
    setSearchQuery('');
    setOnlyFavorites(false);
    setMaxMinutesFilter(null);
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-800 flex flex-col font-sans pb-32 sm:pb-28 md:pb-12 w-full overflow-x-hidden">
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewRecipe={handleOpenNewRecipe}
        onOpenImportRecipe={handleOpenImportRecipe}
        onOpenBackup={() => setIsBackupOpen(true)}
        onlyFavorites={onlyFavorites}
        onToggleOnlyFavorites={() => setOnlyFavorites(!onlyFavorites)}
        favoritesCount={favoritesCount}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenMigration={() => setIsMigrationOpen(true)}
        hasLocalMigration={hasLocalMigration > 0}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm animate-in slide-in-from-top duration-200">
          <div
            className={`p-3.5 rounded-2xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 text-emerald-900 border-emerald-300'
                : toast.type === 'error'
                ? 'bg-rose-50/95 text-rose-900 border-rose-300'
                : 'bg-amber-50/95 text-amber-900 border-amber-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {toast.type === 'info' && <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 w-full">
        {/* Banner: Supabase not configured */}
        {!configured && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-stone-900 block sm:inline mr-1">
                  ¿Quieres sincronizar con tu base de datos Supabase?
                </span>
                <span className="text-stone-600">
                  Introduce tu Project URL y Anon Key para guardar tus recetas en la nube.
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Conectar Supabase</span>
            </button>
          </div>
        )}

        {/* Banner: Supabase Configured but User NOT Logged In (RLS prompt) */}
        {configured && !user && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <LogIn className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-emerald-950 block sm:inline mr-1">
                  Conectado a Supabase:
                </span>
                <span className="text-emerald-800">
                  Inicia sesión con correo y contraseña para acceder al recetario compartido de tu familia y guardar tus favoritos.
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
          </div>
        )}

        {/* Banner: Local Recipes Available for Migration */}
        {configured && user && hasLocalMigration > 0 && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 shadow-2xs flex items-center justify-between gap-3 flex-wrap animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center shrink-0">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-stone-900 block sm:inline mr-1">
                  Recetas locales detectadas ({hasLocalMigration}):
                </span>
                <span className="text-stone-600">
                  ¿Deseas subirlas a tu cuenta de Supabase para que no se pierdan?
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsMigrationOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Migrar a Supabase</span>
            </button>
          </div>
        )}

        {/* Hero Banner with Welcome and Stats */}
        {!searchQuery && selectedCategory === 'todas' && !onlyFavorites && (
          <HeroBanner
            totalRecipes={recipes.length}
            favoritesCount={favoritesCount}
            quickMealsCount={quickMealsCount}
            onOpenNewRecipe={handleOpenNewRecipe}
            onOpenImportRecipe={handleOpenImportRecipe}
          />
        )}

        {/* Categories Bar & Quick Filters */}
        <section className="space-y-2.5 sm:space-y-3 pt-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Categorías</span>
            </h2>

            {/* Quick time filters pills: minimum 36px touch height */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-stone-400 hidden sm:inline mr-1">Tiempo máx:</span>
              <button
                onClick={() => setMaxMinutesFilter(maxMinutesFilter === 30 ? null : 30)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl border transition-colors cursor-pointer active:scale-95 ${
                  maxMinutesFilter === 30
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300'
                }`}
              >
                ≤ 30 min
              </button>
              <button
                onClick={() => setMaxMinutesFilter(maxMinutesFilter === 60 ? null : 60)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl border transition-colors cursor-pointer active:scale-95 ${
                  maxMinutesFilter === 60
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300'
                }`}
              >
                ≤ 60 min
              </button>

              {(selectedCategory !== 'todas' || searchQuery || onlyFavorites || maxMinutesFilter !== null) && (
                <button
                  onClick={handleClearFilters}
                  className="min-h-[36px] flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-700 text-xs font-bold transition-colors ml-1 active:scale-95 cursor-pointer"
                  title="Restablecer filtros"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Chips Bar */}
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            categoryCounts={categoryCounts}
            totalCount={recipes.length}
          />
        </section>

        {/* Section title & count */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-2">
            <h3 className="font-display text-lg sm:text-2xl font-bold text-stone-900 truncate">
              {onlyFavorites
                ? 'Tus Recetas Favoritas'
                : selectedCategory === 'todas'
                ? 'Todas las Recetas'
                : `Recetas de ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}`}
            </h3>
            <span className="text-xs sm:text-sm font-semibold text-stone-500 whitespace-nowrap">
              ({filteredRecipes.length})
            </span>
          </div>

          {configured && user && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sincronizado en Supabase</span>
            </div>
          )}
        </div>

        {/* Recipe Cards Grid: 1 col on mobile, 2 on tablet, 3 on desktop, 4 on xl */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-medium text-stone-500">Cargando las recetas de Peludo...</p>
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                currentUserId={user?.id}
                onView={(r) => setSelectedRecipe(r)}
                onEdit={(r) => handleEditRecipe(r)}
                onDelete={(r) => handleDeleteRecipe(r)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto border border-stone-200/90 shadow-sm space-y-4 my-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center mx-auto">
              <ChefHat className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="font-display text-xl font-bold text-stone-900">
                No encontramos recetas que coincidan
              </h4>
              <p className="text-sm text-stone-500 leading-relaxed">
                {searchQuery
                  ? `No hay platos con el término «${searchQuery}». Intenta buscar por otro ingrediente o categoría.`
                  : onlyFavorites
                  ? 'Aún no has marcado ninguna receta como favorita en tu cuenta. Pulsa el corazón en cualquier tarjeta para guardarla.'
                  : 'No hay recetas en esta categoría actualmente.'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
              {(searchQuery || selectedCategory !== 'todas' || onlyFavorites || maxMinutesFilter !== null) && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Ver todas las recetas
                </button>
              )}
              <button
                onClick={handleOpenNewRecipe}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md shadow-amber-900/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear receta nueva</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-stone-200/80 bg-white/60 py-8 px-4 text-center text-xs text-stone-500 space-y-3">
        <div className="flex items-center justify-center">
          <Logo size="sm" showSubtitle={false} />
        </div>
        <p className="text-stone-600">
          «Las Recetas de Peludo» • Cocina casera con alma, sabor y pasión por el buen comer.
        </p>
        <p className="text-stone-400">
          Conectado con Supabase <code className="font-mono text-stone-500">public.recipes</code> • Seguridad RLS
        </p>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        onGoHome={handleClearFilters}
        onOpenNewRecipe={handleOpenNewRecipe}
        onToggleFavorites={() => setOnlyFavorites(!onlyFavorites)}
        onlyFavorites={onlyFavorites}
        onOpenBackup={() => setIsBackupOpen(true)}
        favoritesCount={favoritesCount}
      />

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          currentUserId={user?.id}
          onClose={() => setSelectedRecipe(null)}
          onEdit={(r) => handleEditRecipe(r)}
          onDelete={(r) => handleDeleteRecipe(r)}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* Recipe Create/Edit Form Modal */}
      {isFormOpen && (
        <RecipeFormModal
          recipeToEdit={recipeToEdit}
          initialDraft={importDraft}
          userId={user?.id}
          onClose={() => {
            setIsFormOpen(false);
            setRecipeToEdit(null);
            setImportDraft(null);
          }}
          onSave={handleSaveRecipe}
          onOpenImportModal={() => {
            setIsFormOpen(false);
            setIsImportOpen(true);
          }}
        />
      )}

      {/* Recipe Web/Manual Importer Modal */}
      {isImportOpen && (
        <RecipeImportModal
          onClose={() => setIsImportOpen(false)}
          onSaveDirectly={handleSaveRecipe}
          onOpenInFullEditor={(draft) => {
            setIsImportOpen(false);
            setRecipeToEdit(null);
            setImportDraft(draft);
            setIsFormOpen(true);
          }}
        />
      )}

      {/* Recipe Delete Confirmation Modal */}
      {recipeToDelete && (
        <DeleteConfirmModal
          recipe={recipeToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setRecipeToDelete(null)}
        />
      )}

      {/* Backup & Persistence Modal */}
      {isBackupOpen && (
        <BackupModal
          onClose={() => setIsBackupOpen(false)}
          recipesCount={recipes.length}
          onRefresh={loadRecipes}
          onOpenConfig={() => setIsConfigOpen(true)}
          onOpenMigration={() => setIsMigrationOpen(true)}
          user={user}
        />
      )}

      {/* Auth Modal (Login / Sign Up / Forgot Password) */}
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onSuccess={() => {
            showToast('success', '¡Sesión iniciada con éxito!');
            loadRecipes();
          }}
          onOpenConfig={() => setIsConfigOpen(true)}
        />
      )}

      {/* Supabase Connection Config Modal */}
      {isConfigOpen && (
        <SupabaseConfigModal
          onClose={() => setIsConfigOpen(false)}
          onSaved={() => {
            showToast('success', 'Credenciales de Supabase actualizadas.');
            loadRecipes();
          }}
        />
      )}

      {/* Migration Modal */}
      {isMigrationOpen && user && (
        <MigrationModal
          userId={user.id}
          onClose={() => setIsMigrationOpen(false)}
          onMigrationComplete={() => {
            showToast('success', '¡Recetas locales migradas a Supabase con éxito!');
            setHasLocalMigration(0);
            loadRecipes();
          }}
        />
      )}
    </div>
  );
}
