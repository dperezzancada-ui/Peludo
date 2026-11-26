import React, { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import {
  LogIn,
  LogOut,
  User as UserIcon,
  Database,
  UploadCloud,
  ChevronDown,
  CheckCircle2,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface UserMenuProps {
  user: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenConfig: () => void;
  onOpenMigration: () => void;
  hasLocalMigration: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  onOpenAuth,
  onSignOut,
  onOpenConfig,
  onOpenMigration,
  hasLocalMigration,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const configured = isSupabaseConfigured();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenAuth}
          className="min-h-[42px] px-3.5 py-1.5 rounded-xl sm:rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          title="Iniciar sesión en Supabase"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Acceder</span>
        </button>

        <button
          type="button"
          onClick={onOpenConfig}
          className="min-w-[40px] min-h-[40px] p-2 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 flex items-center justify-center transition-colors cursor-pointer"
          title="Configuración de conexión Supabase"
          aria-label="Configuración de conexión Supabase"
        >
          <Database className={`w-4 h-4 ${configured ? 'text-emerald-600' : 'text-stone-400'}`} />
        </button>
      </div>
    );
  }

  // Get user display initial or name
  const displayName =
    user.user_metadata?.display_name || user.email?.split('@')[0] || 'Familiar';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[42px] pl-2 pr-3 py-1.5 rounded-xl sm:rounded-2xl bg-white border border-stone-200 hover:border-amber-300 text-stone-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
        aria-label="Menú de usuario"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
          {initial}
        </div>
        <span className="hidden sm:inline max-w-[110px] truncate text-stone-800 font-bold">
          {displayName}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#FAF7F2] border border-stone-200 shadow-xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-2.5 border-b border-stone-200">
            <p className="font-bold text-stone-900 truncate">{displayName}</p>
            <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 w-fit">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Conectado a Supabase (RLS)</span>
            </div>
          </div>

          <div className="py-1">
            {hasLocalMigration && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenMigration();
                }}
                className="w-full text-left px-4 py-2 hover:bg-amber-50 text-amber-800 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-amber-600" />
                <span>Migrar recetas de este equipo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenConfig();
              }}
              className="w-full text-left px-4 py-2 hover:bg-stone-100 text-stone-700 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Database className="w-4 h-4 text-stone-500" />
              <span>Ajustes de Supabase</span>
            </button>
          </div>

          <div className="border-t border-stone-200 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
