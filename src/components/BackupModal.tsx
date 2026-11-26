import React, { useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { storageService } from '../services/storageService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import {
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Check,
  AlertCircle,
  X,
  FileJson,
  Sparkles,
  HardDrive,
  Database,
  UploadCloud,
} from 'lucide-react';

interface BackupModalProps {
  onClose: () => void;
  recipesCount: number;
  onRefresh: () => void;
  onOpenConfig?: () => void;
  onOpenMigration?: () => void;
  user?: User | null;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  onClose,
  recipesCount,
  onRefresh,
  onOpenConfig,
  onOpenMigration,
  user,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const configured = isSupabaseConfigured();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleExport = () => {
    storageService.exportRecipesJSON();
    setFeedback({
      type: 'success',
      message: '¡Copia de seguridad descargada con éxito en tu dispositivo!',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = storageService.importRecipesJSON(content);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `¡Se han importado ${res.count} recetas correctamente!`,
        });
        onRefresh();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'No se pudo importar el archivo.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        '¿Deseas restaurar el recetario a las recetas originales de muestra? Se sustituirán las recetas actuales.'
      )
    ) {
      storageService.resetToDefault();
      setFeedback({
        type: 'success',
        message: '¡Recetas originales restauradas con éxito!',
      });
      onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5 text-stone-900">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold">Base de Datos y Respaldo</h3>
              <p className="text-[11px] sm:text-xs text-stone-500">Guardado permanente 100% gratuito sin suscripciones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 active:scale-90"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`my-3 sm:my-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
          {/* Supabase Cloud Status Card */}
          <div
            className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border flex items-start justify-between gap-3 ${
              configured
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <Database className={`w-5 h-5 shrink-0 mt-0.5 ${configured ? 'text-emerald-700' : 'text-amber-700'}`} />
              <div className="text-xs leading-relaxed">
                <span className="font-bold block text-sm mb-0.5">
                  {configured ? 'Conectado a la Nube (Supabase)' : 'Almacenamiento Local Activo'}
                </span>
                {configured ? (
                  <p>
                    Tu proyecto Supabase está vinculado. Las recetas se guardan en la tabla <code className="font-mono bg-black/10 px-1 rounded">public.recipes</code> y son accesibles desde cualquier dispositivo.
                    {user ? ` Sesión activa como: ${user.email}` : ' (Inicia sesión para sincronizar)'}
                  </p>
                ) : (
                  <p>
                    Actualmente guardas en la memoria local de este navegador. Puedes conectar tu proyecto Supabase para sincronizar con tu familia en cualquier teléfono o PC.
                  </p>
                )}
              </div>
            </div>

            {onOpenConfig && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenConfig();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-[11px] font-bold text-stone-700 shrink-0 cursor-pointer shadow-2xs"
              >
                Ajustes
              </button>
            )}
          </div>

          {/* Action cards: Mobile-friendly buttons */}
          <div className="space-y-2 sm:space-y-2.5">
            {/* Export */}
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-stone-200 flex items-center justify-center text-stone-700 shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-800 truncate">Descargar copia (.JSON)</h4>
                  <p className="text-[11px] sm:text-xs text-stone-500 truncate">Guarda un archivo con tus recetas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="min-h-[38px] px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Descargar
              </button>
            </div>

            {/* Import */}
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-stone-200 flex items-center justify-center text-stone-700 shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-800 truncate">Restaurar copia (.JSON)</h4>
                  <p className="text-[11px] sm:text-xs text-stone-500 truncate">Carga un archivo de respaldo previo</p>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[38px] px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Cargar
              </button>
            </div>

            {/* Reset to starter recipes */}
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-stone-200 flex items-center justify-center text-stone-700 shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-800 truncate">Restaurar de muestra</h4>
                  <p className="text-[11px] sm:text-xs text-stone-500 truncate">Vuelve al recetario inicial</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="min-h-[38px] px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-200 active:scale-95 text-stone-700 text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-stone-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 text-sm font-semibold transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
