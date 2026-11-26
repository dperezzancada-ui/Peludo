import type {
  DifficultyLevel,
  Ingredient,
  RecipeCategory,
  RecipeStep,
} from '../types/recipe.ts';

export interface ImportedRecipeDraft {
  title: string;
  category: RecipeCategory;
  description: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: DifficultyLevel;
  imageUrl: string;
  sourceUrl: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  extractedFrom: 'schema_org' | 'html_fallback' | 'manual_text';
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  aacute: 'á',
  Aacute: 'Á',
  eacute: 'é',
  Eacute: 'É',
  iacute: 'í',
  Iacute: 'Í',
  oacute: 'ó',
  Oacute: 'Ó',
  uacute: 'ú',
  Uacute: 'Ú',
  ntilde: 'ñ',
  Ntilde: 'Ñ',
  uuml: 'ü',
  Uuml: 'Ü',
  iquest: '¿',
  iexcl: '¡',
  laquo: '«',
  raquo: '»',
  deg: '°',
  ordm: 'º',
  ordf: 'ª',
  frac12: '1/2',
  frac14: '1/4',
  frac34: '3/4',
  ndash: '-',
  mdash: '-',
  hellip: '...',
};

export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isNaN(code) ? _ : String.fromCodePoint(code);
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isNaN(code) ? _ : String.fromCodePoint(code);
    })
    .replace(/&([a-zA-Z0-9]+);/g, (full, name) => NAMED_ENTITIES[name] ?? full);
}

export function cleanText(input: unknown): string {
  if (typeof input !== 'string') {
    if (typeof input === 'number') return String(input);
    return '';
  }
  const withoutTags = input.replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(withoutTags)
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseIsoDurationMinutes(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value !== 'string' || !value.trim()) return 0;

  const raw = value.trim();

  // Formato ISO-8601: P0DT1H30M, PT45M, PT1H, etc.
  const isoMatch = raw.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i
  );
  if (isoMatch) {
    const days = parseInt(isoMatch[1] || '0', 10);
    const hours = parseInt(isoMatch[2] || '0', 10);
    const minutes = parseInt(isoMatch[3] || '0', 10);
    const seconds = parseInt(isoMatch[4] || '0', 10);
    const total = days * 1440 + hours * 60 + minutes + Math.round(seconds / 60);
    if (total > 0) return total;
  }

  // Formato texto: "1 h 20 min", "45 minutos"
  let totalMinutes = 0;
  const hourMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hora|horas)\b/i);
  const minMatch = raw.match(/(\d+)\s*(?:m|min|mins|minuto|minutos)\b/i);
  if (hourMatch) {
    totalMinutes += Math.round(parseFloat(hourMatch[1].replace(',', '.')) * 60);
  }
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1], 10);
  }
  if (totalMinutes > 0) return totalMinutes;

  const plainNum = parseInt(raw, 10);
  return Number.isFinite(plainNum) && plainNum > 0 ? plainNum : 0;
}

export function parseServings(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = parseServings(item);
      if (parsed > 0) return parsed;
    }
  }
  if (typeof value === 'string') {
    const match = value.match(/(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > 0 && n <= 100) return n;
    }
  }
  return 4;
}

const KNOWN_UNITS = new Set([
  'g', 'gr', 'grs', 'gramo', 'gramos',
  'kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos',
  'mg',
  'ml', 'cl', 'dl', 'l', 'lt', 'litro', 'litros',
  'cda', 'cdas', 'cucharada', 'cucharadas', 'cucharada sopera', 'cucharadas soperas',
  'cdta', 'cdtas', 'cucharadita', 'cucharaditas',
  'taza', 'tazas', 'vaso', 'vasos', 'copa', 'copas',
  'pizca', 'pizcas', 'puñado', 'puñados',
  'diente', 'dientes', 'cabeza', 'cabezas',
  'hoja', 'hojas', 'rama', 'ramas', 'ramita', 'ramitas',
  'lata', 'latas', 'bote', 'botes', 'paquete', 'paquetes', 'sobre', 'sobres', 'bolsa', 'bolsas',
  'rebanada', 'rebanadas', 'rodaja', 'rodajas', 'loncha', 'lonchas', 'trozo', 'trozos',
  'chorro', 'chorrito', 'gota', 'gotas',
  'ud', 'uds', 'unidad', 'unidades', 'pieza', 'piezas',
  'tbsp', 'tsp', 'cup', 'cups', 'oz', 'lb', 'lbs',
]);

function normalizeUnit(rawUnit: string): string {
  const u = rawUnit.toLowerCase().trim();
  if (u === 'gr' || u === 'grs' || u === 'gramo' || u === 'gramos') return 'g';
  if (u === 'kilo' || u === 'kilos' || u === 'kilogramo' || u === 'kilogramos') return 'kg';
  if (u === 'litro' || u === 'litros' || u === 'lt') return 'l';
  if (u === 'cucharada' || u === 'cucharadas' || u === 'cdas') return 'cda';
  if (u === 'cucharadita' || u === 'cucharaditas' || u === 'cdtas') return 'cdta';
  if (u === 'unidad' || u === 'unidades' || u === 'uds') return 'ud';
  return rawUnit.trim();
}

export function parseIngredientLine(rawLine: string, index: number): Ingredient {
  let text = cleanText(rawLine)
    .replace(/^[\-\*\u2022\u25AA\u25CF]+\s*/, '')
    .trim();

  // Extraer notas entre paréntesis al final o en medio si aporta detalle
  let notes = '';
  const parenMatch = text.match(/\(([^)]+)\)\s*$/);
  if (parenMatch) {
    notes = parenMatch[1].trim();
    text = text.slice(0, parenMatch.index).trim();
  }

  // Detectar expresiones tipo "Sal al gusto", "Pimienta al gusto"
  if (/\b(al gusto|a gusto|a ojo|opcional)\b/i.test(text) && !/^\d/.test(text)) {
    const cleanName = text.replace(/\b(al gusto|a gusto|a ojo)\b/i, '').replace(/[,-]\s*$/, '').trim();
    return {
      id: `ing_${Date.now()}_${index}`,
      amount: 'Al gusto',
      unit: '',
      name: cleanName || text,
      notes: notes || undefined,
    };
  }

  // Reemplazar fracciones Unicode al principio
  text = text
    .replace(/^½\s*/, '1/2 ')
    .replace(/^¼\s*/, '1/4 ')
    .replace(/^¾\s*/, '3/4 ')
    .replace(/^⅓\s*/, '1/3 ')
    .replace(/^⅔\s*/, '2/3 ');

  // Buscar cantidad al principio: "200", "1.5", "1,5", "1/2", "1 1/2", "2-3"
  const qtyRegex = /^(\d+(?:\s+\d+\/\d+|\/\d+|[.,]\d+|\s*[-–]\s*\d+)?)\s*(.*)$/;
  const qtyMatch = text.match(qtyRegex);

  if (!qtyMatch) {
    return {
      id: `ing_${Date.now()}_${index}`,
      amount: '',
      unit: '',
      name: text,
      notes: notes || undefined,
    };
  }

  const amount = qtyMatch[1].replace(/\s+/g, ' ').trim();
  let rest = qtyMatch[2].trim();

  // Caso pegado sin espacio: "200g de harina"
  const attachedUnitMatch = text.match(/^(\d+(?:[.,]\d+)?)\s*(kg|grs|gr|g|mg|ml|cl|dl|l|oz|lb)\b\s*(.*)$/i);
  if (attachedUnitMatch) {
    const u = normalizeUnit(attachedUnitMatch[2]);
    let namePart = attachedUnitMatch[3].replace(/^(?:de|del|d')\s+/i, '').trim();
    return {
      id: `ing_${Date.now()}_${index}`,
      amount: attachedUnitMatch[1].trim(),
      unit: u,
      name: namePart || text,
      notes: notes || undefined,
    };
  }

  // Comprobar si la primera palabra (o dos palabras ej. "cucharadas soperas") es una unidad conocida
  const twoWordUnitMatch = rest.match(/^(cucharadas?\s+soperas?|cucharaditas?\s+de\s+postre)\b\s*(.*)$/i);
  if (twoWordUnitMatch) {
    const u = twoWordUnitMatch[1].toLowerCase().includes('cucharadita') ? 'cdta' : 'cda';
    const namePart = twoWordUnitMatch[2].replace(/^(?:de|del|d')\s+/i, '').trim();
    return {
      id: `ing_${Date.now()}_${index}`,
      amount,
      unit: u,
      name: namePart || rest,
      notes: notes || undefined,
    };
  }

  const firstWordMatch = rest.match(/^([^\s,.;:]+)\s*(.*)$/);
  if (firstWordMatch) {
    const candidate = firstWordMatch[1].toLowerCase().replace(/\.$/, '');
    if (KNOWN_UNITS.has(candidate)) {
      const unit = normalizeUnit(firstWordMatch[1].replace(/\.$/, ''));
      const namePart = firstWordMatch[2].replace(/^(?:de|del|d')\s+/i, '').trim();
      return {
        id: `ing_${Date.now()}_${index}`,
        amount,
        unit,
        name: namePart || rest,
        notes: notes || undefined,
      };
    }
  }

  // Si hay cantidad pero no unidad explícita ("3 huevos"), limpiamos "de" inicial si existiera
  const finalName = rest.replace(/^(?:de|del)\s+/i, '').trim();
  return {
    id: `ing_${Date.now()}_${index}`,
    amount,
    unit: 'ud',
    name: finalName || text,
    notes: notes || undefined,
  };
}

export function inferCategory(
  rawCategory: unknown,
  keywords: unknown,
  title: string
): RecipeCategory {
  const combined = [
    Array.isArray(rawCategory) ? rawCategory.join(' ') : String(rawCategory || ''),
    Array.isArray(keywords) ? keywords.join(' ') : String(keywords || ''),
    title,
  ]
    .join(' ')
    .toLowerCase();

  if (/(postre|tarta|bizcocho|dulce|pastel|galleta|flan|helado|brownie|natilla|mousse|magdalena|torrija|dessert|cake|sweet|cookie|pastry)/i.test(combined)) {
    return 'postres';
  }
  if (/(pescado|marisco|salm[oó]n|merluza|bacalao|at[uú]n|lubina|dorada|gamba|langostino|calamar|pulpo|mejill[oó]n|fish|seafood|salmon)/i.test(combined)) {
    return 'pescados';
  }
  if (/(carne|pollo|ternera|cerdo|cordero|pavo|lomo|solomillo|carrillera|alb[oó]ndiga|hamburguesa|estofado|meat|beef|chicken|pork|lamb)/i.test(combined)) {
    return 'carnes';
  }
  if (/(entrante|tapa|aperitivo|picoteo|croqueta|tortilla|gazpacho|salmorejo|canap[eé]|empanadilla|starter|appetizer|snack)/i.test(combined)) {
    return 'entrantes';
  }
  if (/(verdura|ensalada|crema de|huerta|vegano|vegetariano|espinaca|calabac[ií]n|berenjena|br[oó]coli|pisto|menestra|salad|vegetable|veggie)/i.test(combined)) {
    return 'verduras';
  }
  return 'otros';
}

export function inferDifficulty(
  keywords: unknown,
  description: string,
  totalMinutes: number,
  stepsCount: number
): DifficultyLevel {
  const text = `${String(keywords || '')} ${description}`.toLowerCase();
  if (/(dif[ií]cil|avanzad[ao]|experto|alta cocina|complex|hard)/i.test(text)) {
    return 'dificil';
  }
  if (/(f[aá]cil|sencill[ao]|r[aá]pid[ao]|principiante|easy|simple)/i.test(text)) {
    return 'facil';
  }
  if (totalMinutes > 90 || stepsCount >= 9) return 'dificil';
  if (totalMinutes > 40 || stepsCount >= 5) return 'media';
  return 'facil';
}

function extractImageUrl(rawImage: unknown, baseUrl: string): string {
  let candidate = '';
  if (typeof rawImage === 'string') {
    candidate = rawImage.trim();
  } else if (Array.isArray(rawImage)) {
    for (const item of rawImage) {
      const found = extractImageUrl(item, baseUrl);
      if (found) return found;
    }
  } else if (rawImage && typeof rawImage === 'object') {
    const obj = rawImage as Record<string, unknown>;
    if (typeof obj.url === 'string') candidate = obj.url.trim();
    else if (typeof obj.contentUrl === 'string') candidate = obj.contentUrl.trim();
  }

  if (!candidate) return '';
  try {
    return new URL(candidate, baseUrl || undefined).toString();
  } catch {
    return candidate;
  }
}

function extractInstructions(rawInstructions: unknown): RecipeStep[] {
  const rawSteps: string[] = [];

  const pushText = (text: string, sectionPrefix?: string) => {
    const cleaned = cleanText(text)
      .replace(/^(paso\s*\d+[:.-]?|\d+[\.\-\)]\s*)/i, '')
      .trim();
    if (!cleaned || cleaned.length < 2) return;
    rawSteps.push(sectionPrefix ? `${sectionPrefix}: ${cleaned}` : cleaned);
  };

  const walk = (node: unknown, sectionPrefix?: string) => {
    if (!node) return;
    if (typeof node === 'string') {
      const parts = decodeHtmlEntities(node)
        .replace(/<\/?(p|li|br|div|h\d)[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .split(/\r?\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2);
      parts.forEach((p) => pushText(p, sectionPrefix));
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, sectionPrefix));
      return;
    }

    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      const typeVal = String(obj['@type'] || '');
      if (/HowToSection/i.test(typeVal)) {
        const secName = cleanText(obj.name);
        if (obj.itemListElement) {
          walk(obj.itemListElement, secName || sectionPrefix);
        }
        return;
      }

      if (typeof obj.text === 'string' && obj.text.trim()) {
        pushText(obj.text, sectionPrefix);
      } else if (typeof obj.name === 'string' && obj.name.trim()) {
        pushText(obj.name, sectionPrefix);
      }

      if (obj.itemListElement) {
        walk(obj.itemListElement, sectionPrefix);
      }
    }
  };

  walk(rawInstructions);

  return rawSteps.map((instruction, idx) => ({
    id: `step_${Date.now()}_${idx + 1}`,
    stepNumber: idx + 1,
    instruction,
    tip: '',
  }));
}

function isRecipeType(typeVal: unknown): boolean {
  if (typeof typeVal === 'string') {
    return /(^|[\/:#])Recipe$/i.test(typeVal.trim());
  }
  if (Array.isArray(typeVal)) {
    return typeVal.some((t) => isRecipeType(t));
  }
  return false;
}

function findRecipeNodeInJsonLd(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeNodeInJsonLd(item);
      if (found) return found;
    }
    return null;
  }

  const obj = data as Record<string, unknown>;
  if (isRecipeType(obj['@type'])) {
    return obj;
  }

  if (Array.isArray(obj['@graph'])) {
    const found = findRecipeNodeInJsonLd(obj['@graph']);
    if (found) return found;
  }

  if (obj.mainEntity) {
    const found = findRecipeNodeInJsonLd(obj.mainEntity);
    if (found) return found;
  }

  return null;
}

function extractMetaContent(html: string, attrName: string, attrValue: string): string {
  const escaped = attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern1 = new RegExp(
    `<meta[^>]*${attrName}=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    'i'
  );
  const pattern2 = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*${attrName}=["']${escaped}["'][^>]*>`,
    'i'
  );
  const match = html.match(pattern1) || html.match(pattern2);
  return match ? cleanText(match[1]) : '';
}

export function parseRecipeFromHtml(html: string, sourceUrl: string): ImportedRecipeDraft | null {
  if (!html || !html.trim()) return null;

  // 1. Buscar todos los bloques JSON-LD
  const ldRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  let recipeNode: Record<string, unknown> | null = null;

  while ((match = ldRegex.exec(html)) !== null) {
    const rawJson = match[1]
      .replace(/^\s*<!--/, '')
      .replace(/-->\s*$/, '')
      .trim();
    if (!rawJson) continue;

    try {
      const parsed = JSON.parse(rawJson);
      const found = findRecipeNodeInJsonLd(parsed);
      if (found) {
        recipeNode = found;
        break;
      }
    } catch {
      // Intentar limpiar saltos de línea no escapados o comas finales comunes
      try {
        const sanitized = rawJson.replace(/,\s*([}\]])/g, '$1');
        const parsed = JSON.parse(sanitized);
        const found = findRecipeNodeInJsonLd(parsed);
        if (found) {
          recipeNode = found;
          break;
        }
      } catch {
        // Ignorar bloque malformado
      }
    }
  }

  if (recipeNode) {
    const title = cleanText(recipeNode.name || recipeNode.headline) || 'Receta importada';
    const description = cleanText(recipeNode.description).slice(0, 400);
    const prepTime = parseIsoDurationMinutes(recipeNode.prepTime);
    const cookTime = parseIsoDurationMinutes(recipeNode.cookTime);
    const totalTime = parseIsoDurationMinutes(recipeNode.totalTime);

    let finalPrep = prepTime;
    let finalCook = cookTime;
    if (finalPrep === 0 && finalCook === 0 && totalTime > 0) {
      finalPrep = totalTime;
    }

    const servings = parseServings(recipeNode.recipeYield);
    const imageUrl =
      extractImageUrl(recipeNode.image, sourceUrl) ||
      extractMetaContent(html, 'property', 'og:image');

    const rawIngredients = Array.isArray(recipeNode.recipeIngredient)
      ? recipeNode.recipeIngredient
      : Array.isArray(recipeNode.ingredients)
      ? recipeNode.ingredients
      : [];

    const ingredients: Ingredient[] = rawIngredients
      .map((item) => cleanText(item))
      .filter(Boolean)
      .map((line, idx) => parseIngredientLine(line, idx));

    const steps = extractInstructions(recipeNode.recipeInstructions);

    const category = inferCategory(
      recipeNode.recipeCategory,
      recipeNode.keywords,
      title
    );
    const difficulty = inferDifficulty(
      recipeNode.keywords,
      description,
      finalPrep + finalCook,
      steps.length
    );

    if (ingredients.length > 0 || steps.length > 0) {
      return {
        title,
        category,
        description,
        prepTimeMinutes: finalPrep || 15,
        cookTimeMinutes: finalCook,
        servings,
        difficulty,
        imageUrl,
        sourceUrl,
        ingredients:
          ingredients.length > 0
            ? ingredients
            : [{ id: `ing_${Date.now()}_1`, name: '', amount: '1', unit: 'ud' }],
        steps:
          steps.length > 0
            ? steps
            : [{ id: `step_${Date.now()}_1`, stepNumber: 1, instruction: '' }],
        extractedFrom: 'schema_org',
      };
    }
  }

  // 2. Respaldo HTML / Microdatos / OpenGraph si no había JSON-LD
  const ogTitle =
    extractMetaContent(html, 'property', 'og:title') ||
    extractMetaContent(html, 'name', 'twitter:title');
  const htmlTitleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanText(ogTitle || (htmlTitleMatch ? htmlTitleMatch[1] : ''))
    .replace(/\s*[-|•]\s*[^-|•]+$/, '')
    .trim();

  const description = (
    extractMetaContent(html, 'property', 'og:description') ||
    extractMetaContent(html, 'name', 'description')
  ).slice(0, 400);

  const imageUrl = extractImageUrl(
    extractMetaContent(html, 'property', 'og:image') ||
      extractMetaContent(html, 'name', 'twitter:image'),
    sourceUrl
  );

  // Microdatos itemprop="recipeIngredient" / itemprop="ingredients"
  const ingMicroRegex = /itemprop=["'](?:recipeIngredient|ingredients)["'][^>]*>([\s\S]*?)<\/(?:li|p|span|div)>/gi;
  const microIngredients: Ingredient[] = [];
  let ingMatch: RegExpExecArray | null;
  let ingIdx = 0;
  while ((ingMatch = ingMicroRegex.exec(html)) !== null) {
    const line = cleanText(ingMatch[1]);
    if (line) {
      microIngredients.push(parseIngredientLine(line, ingIdx++));
    }
  }

  const stepMicroRegex = /itemprop=["']recipeInstructions["'][^>]*>([\s\S]*?)<\/(?:li|p|div|section)>/gi;
  const microSteps: RecipeStep[] = [];
  let stMatch: RegExpExecArray | null;
  let stIdx = 1;
  while ((stMatch = stepMicroRegex.exec(html)) !== null) {
    const line = cleanText(stMatch[1]).replace(/^(paso\s*\d+[:.-]?|\d+[\.\-\)]\s*)/i, '').trim();
    if (line && line.length > 4) {
      microSteps.push({
        id: `step_${Date.now()}_${stIdx}`,
        stepNumber: stIdx++,
        instruction: line,
      });
    }
  }

  if (!title && microIngredients.length === 0 && microSteps.length === 0) {
    return null;
  }

  return {
    title: title || 'Receta importada',
    category: inferCategory('', '', title),
    description,
    prepTimeMinutes: 20,
    cookTimeMinutes: 20,
    servings: 4,
    difficulty: 'media',
    imageUrl,
    sourceUrl,
    ingredients:
      microIngredients.length > 0
        ? microIngredients
        : [{ id: `ing_${Date.now()}_1`, name: '', amount: '1', unit: 'ud' }],
    steps:
      microSteps.length > 0
        ? microSteps
        : [{ id: `step_${Date.now()}_1`, stepNumber: 1, instruction: '' }],
    extractedFrom: 'html_fallback',
  };
}

/**
 * Procesa texto pegado manualmente cuando una web bloquea el acceso automático.
 * Soporta texto estructurado con encabezados ("Ingredientes", "Preparación", "Elaboración")
 * o campos separados.
 */
export function parseRecipeFromManualText(params: {
  rawText: string;
  customTitle?: string;
  customIngredientsText?: string;
  customStepsText?: string;
  sourceUrl?: string;
}): ImportedRecipeDraft {
  const {
    rawText,
    customTitle,
    customIngredientsText,
    customStepsText,
    sourceUrl = '',
  } = params;

  // Si el usuario proporcionó HTML copiado, intentar parsear Schema.org primero
  if (rawText && /<script[^>]*ld\+json/i.test(rawText)) {
    const fromHtml = parseRecipeFromHtml(rawText, sourceUrl);
    if (fromHtml) return fromHtml;
  }

  let title = (customTitle || '').trim();
  let ingLines: string[] = [];
  let stepLines: string[] = [];

  if (customIngredientsText?.trim() || customStepsText?.trim()) {
    ingLines = (customIngredientsText || '')
      .split(/\r?\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    stepLines = (customStepsText || '')
      .split(/\r?\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
  } else if (rawText.trim()) {
    const lines = rawText
      .split(/\r?\n+/)
      .map((l) => l.trim())
      .filter(Boolean);

    let mode: 'unknown' | 'ingredients' | 'steps' = 'unknown';

    for (const line of lines) {
      if (/^(ingredientes|para los ingredientes)\b[:\s]*$/i.test(line)) {
        mode = 'ingredients';
        continue;
      }
      if (/^(preparaci[oó]n|elaboraci[oó]n|instrucciones|c[oó]mo hacerlo|pasos|modo de preparaci[oó]n)\b[:\s]*$/i.test(line)) {
        mode = 'steps';
        continue;
      }

      if (!title && mode === 'unknown' && line.length <= 90 && !/^\d+[\.\)]\s/.test(line)) {
        title = line;
        continue;
      }

      if (mode === 'ingredients') {
        ingLines.push(line);
      } else if (mode === 'steps') {
        stepLines.push(line);
      } else {
        // Heurística cuando no hay encabezados explícitos
        if (/^\d+[\.\-\)]\s+/.test(line) || line.length > 65) {
          stepLines.push(line);
        } else {
          ingLines.push(line);
        }
      }
    }
  }

  const finalTitle = title || 'Receta importada manualmente';
  const ingredients =
    ingLines.length > 0
      ? ingLines.map((l, idx) => parseIngredientLine(l, idx))
      : [{ id: `ing_${Date.now()}_1`, name: '', amount: '1', unit: 'ud' }];

  const steps: RecipeStep[] =
    stepLines.length > 0
      ? stepLines.map((l, idx) => ({
          id: `step_${Date.now()}_${idx + 1}`,
          stepNumber: idx + 1,
          instruction: l.replace(/^(paso\s*\d+[:.-]?|\d+[\.\-\)]\s*)/i, '').trim() || l,
          tip: '',
        }))
      : [{ id: `step_${Date.now()}_1`, stepNumber: 1, instruction: '' }];

  return {
    title: finalTitle,
    category: inferCategory('', '', finalTitle),
    description: '',
    prepTimeMinutes: 20,
    cookTimeMinutes: 20,
    servings: 4,
    difficulty: inferDifficulty('', '', 40, steps.length),
    imageUrl: '',
    sourceUrl: sourceUrl.trim(),
    ingredients,
    steps,
    extractedFrom: 'manual_text',
  };
}
