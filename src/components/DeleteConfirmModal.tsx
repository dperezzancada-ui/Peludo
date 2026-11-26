import React from 'react';
import { Recipe } from '../types/recipe';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  recipe: Recipe | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  recipe,
  onConfirm,
  onCancel,
}) => {
  if (!recipe) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5 text-red-700">
            <div className="p-2 rounded-xl bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold">¿Eliminar receta?</h3>
          </div>
          <button
            onClick={onCancel}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 active:scale-90"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-2">
          <p className="text-sm text-stone-700 leading-relaxed text-balance">
            Estás a punto de borrar la receta{' '}
            <strong className="text-stone-900 font-bold">«{recipe.title}»</strong>.
          </p>
          <p className="text-xs text-stone-500 leading-relaxed">
            Esta acción no se puede deshacer a menos que tengas una copia de seguridad descargada.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 active:scale-95 text-sm font-semibold transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-bold shadow-md shadow-red-900/20 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Sí, eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
