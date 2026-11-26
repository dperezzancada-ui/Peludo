import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { supabaseRecipeService } from '../services/supabaseRecipeService';

interface MigrationModalProps {
  onClose: () => void;
  userId: string;
  onMigrationComplete: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  onClose,
  userId,
  onMigrationComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    migratedCount: number;
    skippedCount: number;
    error?: string;
  } | null>(null);

  const localCount = supabaseRecipeService.hasLocalRecipesToMigrate();

  const handleStartMigration = async () => {
    setLoading(true);
    setResult(null);

    const res = await supabaseRecipeService.migrateLocalRecipes(userId);
    setLoading(false);
    setResult(res);

    if (!res.error) {
      onMigrationComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden relative my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer active:scale-95"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-6 h-6 text-white" />
          </div>

          <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            Migración a Supabase
          </h3>
          <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-xs mx-auto">
            Sube tus recetas de este dispositivo a la nube sin duplicados ni pérdidas.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {result ? (
            <div className="space-y-4 text-center py-2">
              {result.error ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Error durante la migración</p>
                    <p className="text-stone-700">{result.error}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-display text-lg font-bold text-stone-900">
                    ¡Migración completada con éxito!
                  </h4>
                  <div className="p-3.5 bg-stone-100 rounded-2xl text-xs text-stone-700 space-y-1 text-left">
                    <p>
                      ✨ <strong className="text-stone-900">{result.migratedCount}</strong> recetas nuevas subidas a tu proyecto Supabase.
                    </p>
                    {result.skippedCount > 0 && (
                      <p>
                        ℹ️ <strong className="text-stone-900">{result.skippedCount}</strong> recetas omitidas porque ya existían en la nube con el mismo título.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[46px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                Volver al Recetario
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-stone-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <ChefHat className="w-4 h-4 text-amber-700" />
                  <span>Se detectaron recetas en tu navegador</span>
                </div>
                <p>
                  Encontramos <strong className="text-stone-900">{localCount} recetas</strong> en el almacenamiento local de este dispositivo.
                </p>
                <p>
                  Al migrarlas a la nube, quedarán asociadas a tu usuario familiar y estarán disponibles al instante desde cualquier teléfono, tableta u ordenador.
                </p>
              </div>

              <div className="space-y-2 text-xs text-stone-500">
                <p className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Protección anti-duplicados: Si una receta ya existe en Supabase, no se duplicará.</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Las recetas originales permanecerán intactas.</span>
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer min-h-[44px]"
                >
                  Ahora no
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleStartMigration}
                  className="flex-1 min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-amber-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Subir a Supabase</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
