import React, { useState } from 'react';
import { Recipe, RecipeCategory, DifficultyLevel, Ingredient, RecipeStep, CATEGORIES_CONFIG } from '../types/recipe';
import { SAMPLE_PRESET_IMAGES, getCategoryIcon } from '../utils/categoryIcons';
import { isSupabaseConfigured } from '../services/supabaseClient';
import {
  supabaseStorageService,
  compressRecipeImage,
  isPrivateStorageUri,
} from '../services/supabaseStorageService';
import {
  X,
  Upload,
  Camera,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  ChefHat,
  Clock,
  Users,
  Sparkles,
  Check,
  Lock,
  Loader2,
  Globe,
} from 'lucide-react';
import { ImportedRecipeDraft } from '../utils/recipeParser';

interface RecipeFormModalProps {
  recipeToEdit?: Recipe | null;
  initialDraft?: ImportedRecipeDraft | null;
  userId?: string;
  onClose: () => void;
  onSave: (recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onOpenImportModal?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const RecipeFormModal: React.FC<RecipeFormModalProps> = ({
  recipeToEdit,
  initialDraft,
  userId,
  onClose,
  onSave,
  onOpenImportModal,
}) => {
  const isEditing = !!recipeToEdit;
  const seed = recipeToEdit || initialDraft;

  // Form states
  const [title, setTitle] = useState(seed?.title || '');
  const [category, setCategory] = useState<RecipeCategory>(seed?.category || 'carnes');
  const [description, setDescription] = useState(seed?.description || '');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(seed?.prepTimeMinutes ?? 15);
  const [cookTimeMinutes, setCookTimeMinutes] = useState(seed?.cookTimeMinutes ?? 25);
  const [servings, setServings] = useState(seed?.servings ?? 4);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(seed?.difficulty || 'facil');
  const [sourceUrl, setSourceUrl] = useState(seed?.sourceUrl || '');

  const initialStoragePath =
    recipeToEdit?.imageStoragePath ||
    (isPrivateStorageUri(recipeToEdit?.imageUrl) ? recipeToEdit?.imageUrl : '') ||
    '';

  const [imageUrl, setImageUrl] = useState(
    seed?.imageUrl || SAMPLE_PRESET_IMAGES[0].url
  );
  const [imageStoragePath, setImageStoragePath] = useState<string>(initialStoragePath);

  // Upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [compressionSummary, setCompressionSummary] = useState<string | null>(null);

  // Ingredients state
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    seed?.ingredients && seed.ingredients.length > 0
      ? seed.ingredients
      : [
          { id: 'ing_1', name: '', amount: '1', unit: 'ud' },
          { id: 'ing_2', name: '', amount: '100', unit: 'g' },
        ]
  );

  // Steps state
  const [steps, setSteps] = useState<RecipeStep[]>(
    seed?.steps && seed.steps.length > 0
      ? seed.steps
      : [
          { id: 'step_1', stepNumber: 1, instruction: '', tip: '' },
          { id: 'step_2', stepNumber: 2, instruction: '', tip: '' },
        ]
  );

  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Handle local image file upload / mobile camera capture -> Private Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value so selecting the same file again still triggers onChange
    e.target.value = '';
    if (!file) return;

    setValidationError(null);
    setCompressionSummary(null);

    const useSupabaseStorage = isSupabaseConfigured() && Boolean(userId);

    if (useSupabaseStorage && userId) {
      setIsUploadingImage(true);
      setUploadProgress(5);
      setUploadStatusText('Preparando fotografía...');

      // Instant local object URL preview while uploading
      const tempLocalPreview = URL.createObjectURL(file);
      const previousUrl = imageUrl;
      const previousPath = imageStoragePath;
      setImageUrl(tempLocalPreview);

      const res = await supabaseStorageService.uploadRecipeImage(
        file,
        userId,
        (progress, status) => {
          setUploadProgress(progress);
          setUploadStatusText(status);
        }
      );

      URL.revokeObjectURL(tempLocalPreview);
      setIsUploadingImage(false);

      if (res.error || !res.storageUri) {
        setImageUrl(previousUrl);
        setImageStoragePath(previousPath);
        setUploadProgress(0);
        setUploadStatusText('');
        setValidationError(res.error || 'No se pudo subir la fotografía a Supabase Storage.');
        return;
      }

      // Guardamos internamente `storage://recipe-images/{userId}/{archivo}`
      // y mostramos la URL firmada en la vista previa
      setImageStoragePath(res.storageUri);
      setImageUrl(res.signedUrl || previousUrl);

      if (res.originalSize > res.compressedSize) {
        setCompressionSummary(
          `Optimizada: ${formatBytes(res.originalSize)} ➔ ${formatBytes(res.compressedSize)}`
        );
      } else {
        setCompressionSummary(`Tamaño: ${formatBytes(res.compressedSize)}`);
      }
      return;
    }

    // Fallback offline/local si no hay Supabase conectado
    try {
      setIsUploadingImage(true);
      setUploadProgress(20);
      setUploadStatusText('Comprimiendo fotografía...');
      const compressed = await compressRecipeImage(file, (p, s) => {
        setUploadProgress(p);
        setUploadStatusText(s);
      });
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageStoragePath('');
          setImageUrl(reader.result);
          setCompressionSummary(
            `Optimizada: ${formatBytes(compressed.originalSize)} ➔ ${formatBytes(compressed.compressedSize)}`
          );
        }
        setIsUploadingImage(false);
        setUploadProgress(100);
      };
      reader.readAsDataURL(compressed.blob);
    } catch (err: any) {
      setIsUploadingImage(false);
      setUploadProgress(0);
      setValidationError(err?.message || 'La imagen seleccionada no es válida o supera los 5 MB.');
    }
  };

  // Ingredient handlers
  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { id: 'ing_' + Date.now(), name: '', amount: '', unit: '' },
    ]);
  };

  const handleUpdateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveIngredient = (id: string) => {
    if (ingredients.length <= 1) return;
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  // Step handlers
  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        id: 'step_' + Date.now(),
        stepNumber: prev.length + 1,
        instruction: '',
        tip: '',
      },
    ]);
  };

  const handleUpdateStep = (id: string, field: 'instruction' | 'tip', value: string) => {
    setSteps((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveStep = (id: string) => {
    if (steps.length <= 1) return;
    setSteps((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      return filtered.map((st, idx) => ({ ...st, stepNumber: idx + 1 }));
    });
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    setSteps(newSteps.map((st, idx) => ({ ...st, stepNumber: idx + 1 })));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (isUploadingImage) {
      setValidationError('Espera un segundo a que termine de subirse la fotografía.');
      return;
    }

    if (!title.trim()) {
      setValidationError('Por favor, introduce un título para la receta.');
      return;
    }

    const cleanIngredients = ingredients.filter((ing) => ing.name.trim() !== '');
    if (cleanIngredients.length === 0) {
      setValidationError('Por favor, introduce al menos un ingrediente.');
      return;
    }

    const cleanSteps = steps
      .filter((st) => st.instruction.trim() !== '')
      .map((st, idx) => ({ ...st, stepNumber: idx + 1 }));

    if (cleanSteps.length === 0) {
      setValidationError('Por favor, detalla al menos un paso de preparación.');
      return;
    }

    onSave({
      title: title.trim(),
      category,
      description: description.trim(),
      prepTimeMinutes: Math.max(0, Number(prepTimeMinutes) || 0),
      cookTimeMinutes: Math.max(0, Number(cookTimeMinutes) || 0),
      servings: Math.max(1, Number(servings) || 1),
      difficulty,
      imageUrl: imageUrl.trim() || SAMPLE_PRESET_IMAGES[0].url,
      imageStoragePath: imageStoragePath || '',
      sourceUrl: sourceUrl.trim(),
      ingredients: cleanIngredients,
      steps: cleanSteps,
      isFavorite: recipeToEdit?.isFavorite || false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFAF7] w-full max-w-3xl min-h-full sm:min-h-0 sm:max-h-[92vh] sm:rounded-3xl shadow-2xl overflow-y-auto flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-[#FCFAF7]/95 backdrop-blur-md px-4 sm:px-6 py-3.5 sm:py-4 border-b border-stone-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-2xl font-bold text-stone-900 truncate">
                {isEditing ? 'Editar Receta' : 'Nueva Receta para Peludo'}
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500 truncate">
                {isEditing
                  ? 'Modifica los ingredientes y pasos de tu creación'
                  : 'Añade tu plato a la colección gastronómica'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-w-[42px] min-h-[42px] p-2 rounded-full hover:bg-stone-200 active:bg-stone-300 text-stone-500 hover:text-stone-800 transition-colors flex items-center justify-center shrink-0 active:scale-90"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 sm:space-y-8 flex-1">
          {validationError && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium">
              {validationError}
            </div>
          )}

          {!isEditing && !initialDraft && onOpenImportModal && (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-amber-900">
                <Globe className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  ¿Tienes la receta en una web? <strong>Impórtala en segundos con Schema.org</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenImportModal}
                className="px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-colors cursor-pointer min-h-[38px]"
              >
                Importar desde URL
              </button>
            </div>
          )}

          {/* Title & Category */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Título del plato <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Carrilleras al vino tinto con puré trufado"
                className="w-full px-4 py-3 rounded-xl bg-white border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-stone-900 text-base font-medium placeholder-stone-400 outline-none transition-all"
                required
              />
            </div>

            {/* Category Selector (6 requested categories) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Categoría gastronómica <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES_CONFIG.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all text-left ${
                        isSelected
                          ? 'bg-amber-700 text-white border-amber-800 shadow-md scale-[1.01]'
                          : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
                      }`}
                    >
                      <span className={isSelected ? 'text-amber-200' : 'text-stone-500'}>
                        {getCategoryIcon(cat.id, 'w-4 h-4')}
                      </span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Descripción o introducción breve
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Describe el sabor, el aroma o el recuerdo de este plato..."
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-stone-900 text-sm placeholder-stone-400 outline-none transition-all resize-none"
              />
            </div>

            {/* Original Source URL (for imported recipes) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Web de origen (opcional)
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://... (se guarda automáticamente al importar una web)"
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-stone-200 focus:border-amber-500 text-xs font-mono text-stone-700 placeholder-stone-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Times, Servings, Difficulty */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-100/70 p-4 rounded-2xl border border-stone-200/80">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Prep (min)
              </label>
              <input
                type="number"
                min="0"
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm font-bold text-stone-800 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-600" /> Cocción (min)
              </label>
              <input
                type="number"
                min="0"
                value={cookTimeMinutes}
                onChange={(e) => setCookTimeMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm font-bold text-stone-800 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-stone-600" /> Raciones
              </label>
              <input
                type="number"
                min="1"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm font-bold text-stone-800 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Dificultad
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-2.5 py-2 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm font-semibold text-stone-800 outline-none focus:border-amber-500"
              >
                <option value="facil">Fácil</option>
                <option value="media">Media</option>
                <option value="dificil">Avanzada</option>
              </select>
            </div>
          </div>

          {/* Image Selection & Private Supabase Storage Upload */}
          <div className="space-y-3.5 bg-white p-4 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>Fotografía del plato</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPresetPicker(!showPresetPicker)}
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold underline cursor-pointer"
              >
                {showPresetPicker ? 'Ocultar fotos de muestra' : 'Ver fotos de muestra listas'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3.5 sm:items-start">
              {/* Image Preview Thumbnail */}
              <div className="w-full sm:w-28 h-40 sm:h-28 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 relative">
                {imageUrl ? (
                  <img src={imageUrl} alt="Vista previa" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center text-white p-2">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400 mb-1" />
                    <span className="text-[11px] font-bold">{uploadProgress}%</span>
                  </div>
                )}
              </div>

              {/* Upload & URL Controls */}
              <div className="flex-1 space-y-2.5 min-w-0">
                {/* Mobile & Desktop Upload Buttons */}
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  <label
                    className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                      isUploadingImage ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Upload className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>{imageStoragePath ? 'Cambiar foto (Archivo)' : 'Elegir fotografía'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>

                  <label
                    className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-800 text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                      isUploadingImage ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Camera className="w-4 h-4 text-stone-700 shrink-0" />
                    <span>Hacer foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Upload Progress Bar */}
                {isUploadingImage && (
                  <div className="space-y-1.5 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900">
                      <span>{uploadStatusText || 'Subiendo fotografía...'}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-amber-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Private Storage Status Badge OR External URL Input */}
                {imageStoragePath ? (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold block truncate">Foto guardada en tu nube privada</span>
                        <span className="text-[11px] text-emerald-700 block truncate">
                          {compressionSummary || 'Acceso seguro por URL firmada (máx. 5 MB)'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImageStoragePath('');
                        setImageUrl('');
                        setCompressionSummary(null);
                      }}
                      className="text-[11px] font-bold text-emerald-800 hover:underline shrink-0 cursor-pointer"
                    >
                      Usar URL
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageStoragePath('');
                        setImageUrl(e.target.value);
                        setCompressionSummary(null);
                      }}
                      placeholder="O pega una URL externa (https://...)"
                      className="w-full px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono text-stone-700 outline-none focus:border-amber-500 min-h-[42px]"
                    />
                    <p className="text-[11px] text-stone-400">
                      Las fotos subidas se comprimen automáticamente (máx. 5 MB) en tu almacenamiento privado.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Presets Grid */}
            {showPresetPicker && (
              <div className="mt-3 pt-3 border-t border-stone-100">
                <span className="text-xs font-semibold text-stone-500 block mb-2">
                  Selecciona una foto sugerida para tu plato:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {SAMPLE_PRESET_IMAGES.map((preset, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setImageStoragePath('');
                        setImageUrl(preset.url);
                        setCompressionSummary(null);
                      }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-transform hover:scale-105 cursor-pointer ${
                        imageUrl === preset.url ? 'border-amber-600 ring-2 ring-amber-400/50' : 'border-transparent'
                      }`}
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      {imageUrl === preset.url && (
                        <div className="absolute inset-0 bg-amber-600/30 flex items-center justify-center text-white">
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-stone-900">Ingredientes</h3>
                <p className="text-xs text-stone-500">Indica cantidades y unidades de medida</p>
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Ingrediente</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {ingredients.map((ing, idx) => (
                <div key={ing.id} className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 bg-white p-2.5 sm:p-2 rounded-xl border border-stone-200">
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <input
                      type="text"
                      value={ing.amount}
                      onChange={(e) => handleUpdateIngredient(ing.id, 'amount', e.target.value)}
                      placeholder="Cant."
                      className="w-20 px-2.5 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm font-semibold text-stone-800 outline-none"
                    />
                    <input
                      type="text"
                      value={ing.unit || ''}
                      onChange={(e) => handleUpdateIngredient(ing.id, 'unit', e.target.value)}
                      placeholder="Unidad (g, ml)"
                      className="w-28 px-2.5 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-800 outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => handleUpdateIngredient(ing.id, 'name', e.target.value)}
                    placeholder="Nombre del ingrediente"
                    className="flex-1 min-w-[140px] px-2.5 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(ing.id)}
                    disabled={ingredients.length <= 1}
                    className="min-w-[38px] min-h-[38px] flex items-center justify-center text-stone-400 hover:text-red-600 disabled:opacity-30 rounded-lg transition-colors shrink-0"
                    title="Eliminar ingrediente"
                    aria-label="Eliminar ingrediente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-stone-900">Preparación Paso a Paso</h3>
                <p className="text-xs text-stone-500">Explica el proceso con claridad para que quede perfecto</p>
              </div>
              <button
                type="button"
                onClick={handleAddStep}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold transition-colors cursor-pointer min-h-[36px]"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Paso</span>
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {steps.map((st, idx) => (
                <div key={st.id} className="bg-white p-3 sm:p-4 rounded-xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 text-xs font-bold">
                      Paso {idx + 1}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 'up')}
                        disabled={idx === 0}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 active:scale-90"
                        title="Mover arriba"
                        aria-label="Mover arriba"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 'down')}
                        disabled={idx === steps.length - 1}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 active:scale-90"
                        title="Mover abajo"
                        aria-label="Mover abajo"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(st.id)}
                        disabled={steps.length <= 1}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1 text-stone-400 hover:text-red-600 disabled:opacity-20 ml-0.5 active:scale-90"
                        title="Eliminar paso"
                        aria-label="Eliminar paso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={st.instruction}
                    onChange={(e) => handleUpdateStep(st.id, 'instruction', e.target.value)}
                    placeholder="Instrucción detallada de este paso..."
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-800 outline-none focus:border-amber-500"
                  />

                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <input
                      type="text"
                      value={st.tip || ''}
                      onChange={(e) => handleUpdateStep(st.id, 'tip', e.target.value)}
                      placeholder="Consejo o truco opcional del Peludo..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-amber-50/50 border border-amber-200/60 text-xs text-amber-900 outline-none placeholder-amber-700/50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 pb-6 sm:pb-2 border-t border-stone-200 flex items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 active:scale-95 font-semibold text-sm transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploadingImage}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 text-white font-bold text-sm shadow-md shadow-amber-950/20 transition-all cursor-pointer flex items-center gap-2"
            >
              {isUploadingImage && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {isUploadingImage
                  ? 'Subiendo foto...'
                  : isEditing
                  ? 'Guardar Cambios'
                  : 'Crear Receta'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
