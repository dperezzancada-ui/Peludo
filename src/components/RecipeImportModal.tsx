import React, { useState } from 'react';
import {
  CATEGORIES_CONFIG,
  DifficultyLevel,
  Recipe,
  RecipeCategory,
} from '../types/recipe';
import { ImportedRecipeDraft } from '../utils/recipeParser';
import { recipeImporterService } from '../services/recipeImporterService';
import { getCategoryIcon, SAMPLE_PRESET_IMAGES } from '../utils/categoryIcons';
import {
  X,
  Link2,
  FileText,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Clock,
  Users,
  Globe,
  ChefHat,
  ArrowLeft,
  SlidersHorizontal,
  Save,
} from 'lucide-react';

interface RecipeImportModalProps {
  onClose: () => void;
  onSaveDirectly: (recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
  onOpenInFullEditor: (draft: ImportedRecipeDraft) => void;
}

export const RecipeImportModal: React.FC<RecipeImportModalProps> = ({
  onClose,
  onSaveDirectly,
  onOpenInFullEditor,
}) => {
  const [mode, setMode] = useState<'url' | 'manual'>('url');
  const [manualFormat, setManualFormat] = useState<'smart' | 'sections'>('smart');

  // Input step states
  const [urlInput, setUrlInput] = useState('');
  const [manualSourceUrl, setManualSourceUrl] = useState('');
  const [smartText, setSmartText] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualIngredientsText, setManualIngredientsText] = useState('');
  const [manualStepsText, setManualStepsText] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [wasBlocked, setWasBlocked] = useState(false);

  // Editable preview state
  const [draft, setDraft] = useState<ImportedRecipeDraft | null>(null);

  const handleFetchUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setWasBlocked(false);

    let normalized = urlInput.trim();
    if (!normalized) {
      setErrorMsg('Pega la dirección web (URL) de la receta que quieres importar.');
      return;
    }
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
      setUrlInput(normalized);
    }

    setLoading(true);
    const result = await recipeImporterService.importFromUrl(normalized);
    setLoading(false);

    if (!result.success || !result.recipe) {
      setErrorMsg(result.error || 'No se pudo importar la receta desde esta URL.');
      setWasBlocked(Boolean(result.blocked));
      setManualSourceUrl(normalized);
      return;
    }

    setDraft(result.recipe);
  };

  const handleProcessManual = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (manualFormat === 'smart' && !smartText.trim()) {
      setErrorMsg('Pega el texto o HTML de la receta para poder extraerla.');
      return;
    }
    if (
      manualFormat === 'sections' &&
      !manualTitle.trim() &&
      !manualIngredientsText.trim() &&
      !manualStepsText.trim()
    ) {
      setErrorMsg('Introduce al menos el título, ingredientes o pasos de la receta.');
      return;
    }

    const parsed = recipeImporterService.parseManualContent({
      rawText: manualFormat === 'smart' ? smartText : '',
      customTitle: manualFormat === 'sections' ? manualTitle : '',
      customIngredientsText: manualFormat === 'sections' ? manualIngredientsText : '',
      customStepsText: manualFormat === 'sections' ? manualStepsText : '',
      sourceUrl: manualSourceUrl.trim() || urlInput.trim(),
    });

    setDraft(parsed);
  };

  const handleUpdateDraftField = <K extends keyof ImportedRecipeDraft>(
    field: K,
    value: ImportedRecipeDraft[K]
  ) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSavePreview = async () => {
    if (!draft) return;
    setErrorMsg(null);

    if (!draft.title.trim()) {
      setErrorMsg('La receta necesita un título antes de guardarse.');
      return;
    }

    const cleanIngredients = draft.ingredients.filter((i) => i.name.trim() !== '');
    if (cleanIngredients.length === 0) {
      setErrorMsg('Añade al menos un ingrediente válido.');
      return;
    }

    const cleanSteps = draft.steps
      .filter((s) => s.instruction.trim() !== '')
      .map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    if (cleanSteps.length === 0) {
      setErrorMsg('Añade al menos un paso de elaboración.');
      return;
    }

    setSaving(true);
    try {
      await onSaveDirectly({
        title: draft.title.trim(),
        category: draft.category,
        description: draft.description.trim(),
        prepTimeMinutes: Math.max(0, Number(draft.prepTimeMinutes) || 0),
        cookTimeMinutes: Math.max(0, Number(draft.cookTimeMinutes) || 0),
        servings: Math.max(1, Number(draft.servings) || 1),
        difficulty: draft.difficulty,
        imageUrl: draft.imageUrl.trim() || SAMPLE_PRESET_IMAGES[0].url,
        sourceUrl: draft.sourceUrl.trim(),
        ingredients: cleanIngredients,
        steps: cleanSteps,
        isFavorite: false,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFAF7] w-full max-w-3xl min-h-full sm:min-h-0 sm:max-h-[92vh] sm:rounded-3xl shadow-2xl overflow-y-auto flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-[#FCFAF7]/95 backdrop-blur-md px-4 sm:px-6 py-3.5 sm:py-4 border-b border-stone-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-2xl font-bold text-stone-900 truncate">
                {draft ? 'Vista Previa Editable' : 'Importar Receta de Internet'}
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500 truncate">
                {draft
                  ? 'Revisa y ajusta los datos antes de guardarla en tu recetario'
                  : 'Extrae automáticamente Schema.org o pega el texto de cualquier web'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[42px] min-h-[42px] p-2 rounded-full hover:bg-stone-200 active:bg-stone-300 text-stone-500 hover:text-stone-800 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
              {wasBlocked && !draft && mode === 'url' && (
                <button
                  type="button"
                  onClick={() => {
                    setManualSourceUrl(urlInput.trim());
                    setMode('manual');
                    setErrorMsg(null);
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ir a Pegar Contenido Manualmente</span>
                </button>
              )}
            </div>
          )}

          {!draft ? (
            <>
              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-stone-200/70 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode('url');
                    setErrorMsg(null);
                  }}
                  className={`min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    mode === 'url'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Link2 className="w-4 h-4 text-amber-600" />
                  <span>Desde URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('manual');
                    setErrorMsg(null);
                  }}
                  className={`min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    mode === 'manual'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Pegar contenido</span>
                </button>
              </div>

              {mode === 'url' ? (
                <form onSubmit={handleFetchUrl} className="space-y-4">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-3">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Dirección web (URL) de la receta
                    </label>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://www.ejemplo.com/receta-paella-valenciana"
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm font-mono text-stone-800 outline-none min-h-[46px]"
                      required
                    />
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Nuestro servidor consultará la web de forma segura buscando datos estructurados{' '}
                      <strong className="text-stone-700">Schema.org/Recipe (JSON-LD)</strong> para extraer título, foto, ingredientes, tiempos e instrucciones.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="min-h-[46px] px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 font-semibold text-sm cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="min-h-[46px] px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-amber-950/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analizando receta...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Extraer receta</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleProcessManual} className="space-y-4">
                  <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                        Formato de pegado
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setManualFormat('smart')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            manualFormat === 'smart'
                              ? 'bg-amber-100 border-amber-300 text-amber-900'
                              : 'bg-stone-50 border-stone-200 text-stone-600'
                          }`}
                        >
                          Texto completo / HTML
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualFormat('sections')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            manualFormat === 'sections'
                              ? 'bg-amber-100 border-amber-300 text-amber-900'
                              : 'bg-stone-50 border-stone-200 text-stone-600'
                          }`}
                        >
                          Por apartados
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        URL original (opcional, se guardará en la receta)
                      </label>
                      <input
                        type="text"
                        value={manualSourceUrl}
                        onChange={(e) => setManualSourceUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono text-stone-700 outline-none focus:border-amber-500 min-h-[42px]"
                      />
                    </div>

                    {manualFormat === 'smart' ? (
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Pega el contenido de la receta (título, ingredientes y pasos)
                        </label>
                        <textarea
                          rows={8}
                          value={smartText}
                          onChange={(e) => setSmartText(e.target.value)}
                          placeholder={`Ejemplo:\nLentejas con chorizo\n\nIngredientes:\n300 g lentejas\n1 chorizo\n2 zanahorias\n\nPreparación:\n1. Poner las lentejas en una olla con agua fría.\n2. Añadir la verdura picada y cocinar 40 minutos.`}
                          className="w-full px-3.5 py-3 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-800 outline-none focus:border-amber-500"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Título del plato
                          </label>
                          <input
                            type="text"
                            value={manualTitle}
                            onChange={(e) => setManualTitle(e.target.value)}
                            placeholder="Ej. Bizcocho de yogur"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-800 outline-none focus:border-amber-500 min-h-[42px]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Ingredientes (uno por línea)
                          </label>
                          <textarea
                            rows={4}
                            value={manualIngredientsText}
                            onChange={(e) => setManualIngredientsText(e.target.value)}
                            placeholder={`200 g de harina\n3 huevos\n1 yogur natural`}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-800 outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Instrucciones (un paso por línea)
                          </label>
                          <textarea
                            rows={4}
                            value={manualStepsText}
                            onChange={(e) => setManualStepsText(e.target.value)}
                            placeholder={`Batir los huevos con el yogur.\nIncorporar la harina y hornear 35 min a 180ºC.`}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm text-stone-800 outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="min-h-[46px] px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 font-semibold text-sm cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="min-h-[46px] px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm shadow-md shadow-amber-950/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Procesar y Previsualizar</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* Editable Preview Step */
            <div className="space-y-5">
              {/* Origin Banner */}
              <div className="flex items-center justify-between gap-2 flex-wrap bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 rounded-2xl text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">
                    {draft.extractedFrom === 'schema_org' && 'Receta extraída con Schema.org/Recipe'}
                    {draft.extractedFrom === 'html_fallback' && 'Receta extraída desde el contenido web'}
                    {draft.extractedFrom === 'manual_text' && 'Contenido procesado listo para revisar'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Probar otra fuente</span>
                </button>
              </div>

              {/* Title & Category */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => handleUpdateDraftField('title', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-base font-bold text-stone-900 outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Categoría
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORIES_CONFIG.map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => handleUpdateDraftField('category', cat.id as RecipeCategory)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          draft.category === cat.id
                            ? 'bg-amber-700 text-white border-amber-800'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {getCategoryIcon(cat.id, 'w-3.5 h-3.5')}
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> Prep (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={draft.prepTimeMinutes}
                      onChange={(e) => handleUpdateDraftField('prepTimeMinutes', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold text-stone-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-orange-600" /> Cocción (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={draft.cookTimeMinutes}
                      onChange={(e) => handleUpdateDraftField('cookTimeMinutes', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold text-stone-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3 text-stone-600" /> Raciones
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={draft.servings}
                      onChange={(e) => handleUpdateDraftField('servings', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-sm font-bold text-stone-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Dificultad
                    </label>
                    <select
                      value={draft.difficulty}
                      onChange={(e) => handleUpdateDraftField('difficulty', e.target.value as DifficultyLevel)}
                      className="w-full px-2.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 outline-none"
                    >
                      <option value="facil">Fácil</option>
                      <option value="media">Media</option>
                      <option value="dificil">Avanzada</option>
                    </select>
                  </div>
                </div>

                {/* Image + Source URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Imagen detectada (URL)
                    </label>
                    <div className="flex items-center gap-2">
                      {draft.imageUrl && (
                        <img
                          src={draft.imageUrl}
                          alt="Preview"
                          className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                        />
                      )}
                      <input
                        type="text"
                        value={draft.imageUrl}
                        onChange={(e) => handleUpdateDraftField('imageUrl', e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono text-stone-700 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Fuente original (source_url)
                    </label>
                    <input
                      type="text"
                      value={draft.sourceUrl}
                      onChange={(e) => handleUpdateDraftField('sourceUrl', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono text-stone-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Editable Ingredients */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-stone-900">
                    Ingredientes ({draft.ingredients.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateDraftField('ingredients', [
                        ...draft.ingredients,
                        { id: `ing_${Date.now()}`, amount: '', unit: '', name: '' },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {draft.ingredients.map((ing, idx) => (
                    <div key={ing.id || idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={ing.amount}
                        onChange={(e) => {
                          const next = [...draft.ingredients];
                          next[idx] = { ...ing, amount: e.target.value };
                          handleUpdateDraftField('ingredients', next);
                        }}
                        placeholder="Cant."
                        className="w-16 px-2 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-800"
                      />
                      <input
                        type="text"
                        value={ing.unit || ''}
                        onChange={(e) => {
                          const next = [...draft.ingredients];
                          next[idx] = { ...ing, unit: e.target.value };
                          handleUpdateDraftField('ingredients', next);
                        }}
                        placeholder="Ud."
                        className="w-16 px-2 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800"
                      />
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => {
                          const next = [...draft.ingredients];
                          next[idx] = { ...ing, name: e.target.value };
                          handleUpdateDraftField('ingredients', next);
                        }}
                        placeholder="Ingrediente"
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (draft.ingredients.length <= 1) return;
                          handleUpdateDraftField(
                            'ingredients',
                            draft.ingredients.filter((_, i) => i !== idx)
                          );
                        }}
                        disabled={draft.ingredients.length <= 1}
                        className="p-1.5 text-stone-400 hover:text-red-600 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editable Steps */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-stone-900">
                    Elaboración ({draft.steps.length} pasos)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateDraftField('steps', [
                        ...draft.steps,
                        {
                          id: `step_${Date.now()}`,
                          stepNumber: draft.steps.length + 1,
                          instruction: '',
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir paso</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {draft.steps.map((st, idx) => (
                    <div key={st.id || idx} className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 mt-1">
                        {idx + 1}
                      </span>
                      <textarea
                        rows={2}
                        value={st.instruction}
                        onChange={(e) => {
                          const next = [...draft.steps];
                          next[idx] = { ...st, instruction: e.target.value };
                          handleUpdateDraftField('steps', next);
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (draft.steps.length <= 1) return;
                          handleUpdateDraftField(
                            'steps',
                            draft.steps
                              .filter((_, i) => i !== idx)
                              .map((s, newIdx) => ({ ...s, stepNumber: newIdx + 1 }))
                          );
                        }}
                        disabled={draft.steps.length <= 1}
                        className="p-1.5 text-stone-400 hover:text-red-600 disabled:opacity-30 cursor-pointer mt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 pb-4 sm:pb-0 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenInFullEditor(draft)}
                  className="min-h-[46px] px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-amber-700" />
                  <span>Abrir en editor completo</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSavePreview}
                  className="min-h-[46px] px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-amber-950/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saving ? 'Guardando...' : 'Guardar receta ahora'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
