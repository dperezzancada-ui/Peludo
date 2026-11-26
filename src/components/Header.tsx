import React from 'react';
import { User } from '@supabase/supabase-js';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';
import {
  Search,
  Plus,
  Heart,
  HardDrive,
  X,
  Globe,
} from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewRecipe: () => void;
  onOpenImportRecipe: () => void;
  onOpenBackup: () => void;
  onlyFavorites: boolean;
  onToggleOnlyFavorites: () => void;
  favoritesCount: number;
  user: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenConfig: () => void;
  onOpenMigration: () => void;
  hasLocalMigration: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenNewRecipe,
  onOpenImportRecipe,
  onOpenBackup,
  onlyFavorites,
  onToggleOnlyFavorites,
  favoritesCount,
  user,
  onOpenAuth,
  onSignOut,
  onOpenConfig,
  onOpenMigration,
  hasLocalMigration,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs w-full">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 sm:gap-3.5">
          
          {/* Top Row: Logo & Mobile Quick Action */}
          <div className="flex items-center justify-between gap-2">
            <Logo size="md" />

            {/* Mobile Header Actions: User menu & quick buttons */}
            <div className="flex items-center gap-1.5 md:hidden">
              <UserMenu
                user={user}
                onOpenAuth={onOpenAuth}
                onSignOut={onSignOut}
                onOpenConfig={onOpenConfig}
                onOpenMigration={onOpenMigration}
                hasLocalMigration={hasLocalMigration}
              />

              <button
                type="button"
                onClick={onOpenImportRecipe}
                className="min-w-[40px] min-h-[40px] px-2.5 py-2 rounded-xl border bg-amber-50 border-amber-200 text-amber-800 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer text-xs font-bold"
                title="Importar receta desde URL"
                aria-label="Importar receta"
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline">Importar</span>
              </button>

              <button
                type="button"
                onClick={onToggleOnlyFavorites}
                className={`min-w-[40px] min-h-[40px] p-2 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                  onlyFavorites
                    ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-xs'
                    : 'bg-white border-stone-200/90 text-stone-600'
                }`}
                title="Filtrar por favoritos"
                aria-label="Favoritos"
              >
                <Heart className={`w-4 h-4 ${onlyFavorites ? 'fill-current text-rose-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search bar & Desktop Buttons */}
          <div className="flex items-center gap-2.5 w-full md:max-w-xl md:justify-end">
            {/* Search Input: Adapts smoothly to 100% width on mobile */}
            <div className="relative w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar receta o ingrediente..."
                className="w-full pl-10 pr-10 py-2.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white border border-stone-200 text-sm font-medium text-stone-800 placeholder-stone-400 shadow-2xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 transition-all min-h-[44px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg active:scale-90 transition-transform"
                  title="Borrar búsqueda"
                  aria-label="Borrar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggleOnlyFavorites}
                className={`min-h-[44px] flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
                  onlyFavorites
                    ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                    : 'bg-white hover:bg-stone-50 border-stone-200/90 text-stone-700'
                }`}
                title="Filtrar por favoritos"
              >
                <Heart className={`w-4 h-4 text-rose-500 ${onlyFavorites ? 'fill-current' : ''}`} />
                <span className="hidden lg:inline">Favoritos</span>
                {favoritesCount > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      onlyFavorites ? 'bg-rose-200 text-rose-800' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {favoritesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenBackup}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-700 transition-colors cursor-pointer"
                title="Copia de seguridad y estado de base de datos"
                aria-label="Copia de seguridad"
              >
                <HardDrive className="w-4 h-4 text-stone-600" />
              </button>

              <button
                type="button"
                onClick={onOpenImportRecipe}
                className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-sm transition-all active:scale-95 cursor-pointer shrink-0"
                title="Importar receta desde una página web"
              >
                <Globe className="w-4 h-4 text-amber-700" />
                <span>Importar receta</span>
              </button>

              <button
                type="button"
                onClick={onOpenNewRecipe}
                className="min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm shadow-sm shadow-amber-900/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Nueva Receta</span>
              </button>

              <UserMenu
                user={user}
                onOpenAuth={onOpenAuth}
                onSignOut={onSignOut}
                onOpenConfig={onOpenConfig}
                onOpenMigration={onOpenMigration}
                hasLocalMigration={hasLocalMigration}
              />
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

