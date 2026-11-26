import {
  ImportedRecipeDraft,
  parseRecipeFromManualText,
} from '../utils/recipeParser';

export interface ImportUrlResponse {
  success: boolean;
  recipe?: ImportedRecipeDraft;
  blocked?: boolean;
  error?: string;
}

export const recipeImporterService = {
  async importFromUrl(url: string): Promise<ImportUrlResponse> {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      return { success: false, error: 'Introduce una URL válida.' };
    }

    try {
      const res = await fetch('/api/import-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          blocked: Boolean(data?.blocked),
          error:
            data?.error ||
            'No pudimos leer esta web automáticamente. Puedes pegar el contenido manualmente.',
        };
      }

      return {
        success: true,
        recipe: data.recipe as ImportedRecipeDraft,
      };
    } catch {
      return {
        success: false,
        blocked: true,
        error:
          'No se pudo conectar con el servidor de importación. Prueba a pegar el contenido manualmente.',
      };
    }
  },

  parseManualContent(params: {
    rawText: string;
    customTitle?: string;
    customIngredientsText?: string;
    customStepsText?: string;
    sourceUrl?: string;
  }): ImportedRecipeDraft {
    return parseRecipeFromManualText(params);
  },
};
