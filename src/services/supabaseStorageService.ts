import { getSupabase } from './supabaseClient';

export const RECIPE_IMAGES_BUCKET = 'recipe-images';
export const STORAGE_URI_PREFIX = 'storage://recipe-images/';
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const SIGNED_URL_EXPIRES_IN = 3600; // 1 hora en segundos

interface SignedCacheEntry {
  signedUrl: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, SignedCacheEntry>();

/**
 * Comprueba si un valor corresponde a una ruta interna del bucket privado
 */
export function isPrivateStorageUri(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.startsWith(STORAGE_URI_PREFIX)) return true;
  // Detecta rutas tipo "<uuid>/<archivo>" sin protocolo
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/.+/i.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Extrae la ruta interna del objeto dentro del bucket `recipe-images`
 * a partir de `storage://recipe-images/...` o incluso si accidentalmente
 * llegara una URL firmada del mismo bucket.
 */
export function extractObjectPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(STORAGE_URI_PREFIX)) {
    return trimmed.slice(STORAGE_URI_PREFIX.length).replace(/^\/+/, '');
  }

  // Si es una ruta directa tipo "<userId>/<archivo>"
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/.+/i.test(trimmed)) {
    return trimmed.replace(/^\/+/, '');
  }

  // Si por cualquier motivo se pasó una URL firmada previa de Supabase Storage
  const signedMatch = trimmed.match(/\/storage\/v1\/object\/sign\/recipe-images\/([^?]+)/i);
  if (signedMatch && signedMatch[1]) {
    try {
      return decodeURIComponent(signedMatch[1]).replace(/^\/+/, '');
    } catch {
      return signedMatch[1].replace(/^\/+/, '');
    }
  }

  return null;
}

/**
 * Construye la ruta interna canónica para guardar en `public.recipes.image_url`
 */
export function toStorageUri(objectPath: string): string {
  const clean = objectPath.replace(/^\/+/, '');
  return `${STORAGE_URI_PREFIX}${clean}`;
}

/**
 * Garantiza que en base de datos se guarde `storage://recipe-images/{userId}/{archivo}`
 * para imágenes del bucket privado, manteniendo intactas URLs externas y Base64 antiguas.
 */
export function normalizeImageForPersistence(value: string | null | undefined): string {
  if (!value) return '';
  const objectPath = extractObjectPath(value);
  if (objectPath) {
    return toStorageUri(objectPath);
  }
  return value.trim();
}

/**
 * Comprime y redimensiona una imagen en el navegador antes de subirla a Storage.
 * - Redimensiona a máx 1600px de lado mayor para agilizar carga móvil y ahorrar espacio.
 * - Asegura que el resultado final no supere los 5 MB.
 */
export async function compressRecipeImage(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<{
  blob: Blob;
  contentType: string;
  extension: string;
  originalSize: number;
  compressedSize: number;
}> {
  const isImageMime = file.type.startsWith('image/');
  const hasImageExt = /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name || '');

  if (!isImageMime && !hasImageExt) {
    throw new Error('El archivo seleccionado no es una imagen válida (JPG, PNG, WebP o GIF).');
  }

  // Si el archivo original es muy grande (> 25 MB), evitar bloquear el navegador móvil
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('La fotografía seleccionada supera los 25 MB. Por favor elige una imagen más ligera.');
  }

  onProgress?.(15, 'Leyendo fotografía...');

  // Si es GIF animado pequeño (< 5 MB), preservar sin rasterizar para no perder animación
  if (file.type === 'image/gif' && file.size <= MAX_IMAGE_SIZE_BYTES) {
    onProgress?.(40, 'Imagen preparada...');
    return {
      blob: file,
      contentType: 'image/gif',
      extension: 'gif',
      originalSize: file.size,
      compressedSize: file.size,
    };
  }

  // Cargar imagen en elemento HTMLImageElement usando ObjectURL
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo procesar la fotografía. Prueba con formato JPG, PNG o WebP.'));
    };
    image.src = objectUrl;
  });

  onProgress?.(30, 'Optimizando tamaño y calidad...');

  const maxDim = 1600;
  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  // Si ya es pequeña (<= 1600px y <= 450 KB y tipo permitido), podemos subirla directamente o recomprimir suavemente
  const allowedDirectly = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  if (allowedDirectly && targetWidth <= maxDim && targetHeight <= maxDim && file.size <= 450 * 1024) {
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    onProgress?.(45, 'Imagen optimizada...');
    return {
      blob: file,
      contentType: file.type,
      extension: ext,
      originalSize: file.size,
      compressedSize: file.size,
    };
  }

  if (targetWidth > maxDim || targetHeight > maxDim) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
      targetWidth = maxDim;
    } else {
      targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
      targetHeight = maxDim;
    }
  }

  const renderToBlob = (width: number, height: number, mimeType: string, quality: number): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);

    // Fondo blanco suave por si la imagen original tenía canal alfa y se exporta a JPEG
    if (mimeType === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
  };

  // Preferimos WebP si el navegador lo soporta (muy ligero) o JPEG como estándar universal
  let outputMime = 'image/webp';
  let outputExt = 'webp';
  let compressedBlob = await renderToBlob(targetWidth, targetHeight, outputMime, 0.84);

  // Fallback a JPEG si el navegador no soporta toBlob en webp (devuelve PNG o null)
  if (!compressedBlob || compressedBlob.type !== 'image/webp') {
    outputMime = 'image/jpeg';
    outputExt = 'jpg';
    compressedBlob = await renderToBlob(targetWidth, targetHeight, outputMime, 0.84);
  }

  // Si supera los 5 MB, bajar calidad y resolución progresivamente
  const attempts = [
    { scale: 1, quality: 0.7 },
    { scale: 0.8, quality: 0.65 },
    { scale: 0.65, quality: 0.6 },
  ];

  for (const attempt of attempts) {
    if (compressedBlob && compressedBlob.size <= MAX_IMAGE_SIZE_BYTES) break;
    compressedBlob = await renderToBlob(
      Math.round(targetWidth * attempt.scale),
      Math.round(targetHeight * attempt.scale),
      'image/jpeg',
      attempt.quality
    );
    outputMime = 'image/jpeg';
    outputExt = 'jpg';
  }

  if (!compressedBlob) {
    throw new Error('Error al comprimir la imagen en este dispositivo.');
  }

  if (compressedBlob.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('La imagen sigue superando el límite de 5 MB tras comprimirla. Prueba con otra fotografía.');
  }

  onProgress?.(45, 'Imagen optimizada lista para subir...');

  return {
    blob: compressedBlob,
    contentType: outputMime,
    extension: outputExt,
    originalSize: file.size,
    compressedSize: compressedBlob.size,
  };
}

export const supabaseStorageService = {
  /**
   * Sube una fotografía al bucket PRIVADO `recipe-images` dentro de `{userId}/`.
   * Devuelve la ruta interna `storage://recipe-images/{userId}/{archivo}`
   * y una URL firmada temporal (`createSignedUrl`) para vista previa inmediata.
   */
  async uploadRecipeImage(
    file: File,
    userId: string,
    onProgress?: (progress: number, statusText: string) => void
  ): Promise<{
    storageUri: string;
    objectPath: string;
    signedUrl: string;
    originalSize: number;
    compressedSize: number;
    error?: string;
  }> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        storageUri: '',
        objectPath: '',
        signedUrl: '',
        originalSize: file.size,
        compressedSize: file.size,
        error: 'Supabase no está configurado.',
      };
    }

    if (!userId) {
      return {
        storageUri: '',
        objectPath: '',
        signedUrl: '',
        originalSize: file.size,
        compressedSize: file.size,
        error: 'Debes iniciar sesión para subir fotografías a Supabase Storage.',
      };
    }

    try {
      const { blob, contentType, extension, originalSize, compressedSize } =
        await compressRecipeImage(file, onProgress);

      if (compressedSize > MAX_IMAGE_SIZE_BYTES) {
        return {
          storageUri: '',
          objectPath: '',
          signedUrl: '',
          originalSize,
          compressedSize,
          error: 'La fotografía supera el límite máximo permitido de 5 MB.',
        };
      }

      onProgress?.(60, 'Subiendo fotografía a la nube privada...');

      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `${Date.now()}-${randomSuffix}.${extension}`;
      const objectPath = `${userId}/${fileName}`;

      // Temporizador suave de progreso visual mientras finaliza la subida
      let visualPct = 62;
      const progressTimer = setInterval(() => {
        visualPct = Math.min(88, visualPct + 4);
        onProgress?.(visualPct, 'Guardando en Supabase Storage...');
      }, 220);

      const { error: uploadError } = await supabase.storage
        .from(RECIPE_IMAGES_BUCKET)
        .upload(objectPath, blob, {
          contentType,
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressTimer);

      if (uploadError) {
        console.error('Error uploading image to private bucket:', uploadError);
        return {
          storageUri: '',
          objectPath: '',
          signedUrl: '',
          originalSize,
          compressedSize,
          error: uploadError.message,
        };
      }

      onProgress?.(92, 'Generando enlace seguro temporal...');

      // NUNCA usar getPublicUrl() — el bucket es privado, usamos createSignedUrl()
      const { data: signedData, error: signError } = await supabase.storage
        .from(RECIPE_IMAGES_BUCKET)
        .createSignedUrl(objectPath, SIGNED_URL_EXPIRES_IN);

      if (signError || !signedData?.signedUrl) {
        return {
          storageUri: toStorageUri(objectPath),
          objectPath,
          signedUrl: '',
          originalSize,
          compressedSize,
          error: signError?.message || 'Imagen subida, pero no se pudo firmar la URL temporal.',
        };
      }

      const storageUri = toStorageUri(objectPath);
      signedUrlCache.set(objectPath, {
        signedUrl: signedData.signedUrl,
        expiresAt: Date.now() + (SIGNED_URL_EXPIRES_IN - 300) * 1000,
      });

      onProgress?.(100, '¡Fotografía subida con éxito!');

      return {
        storageUri,
        objectPath,
        signedUrl: signedData.signedUrl,
        originalSize,
        compressedSize,
      };
    } catch (err: any) {
      return {
        storageUri: '',
        objectPath: '',
        signedUrl: '',
        originalSize: file.size,
        compressedSize: file.size,
        error: err?.message || 'Error inesperado al subir la fotografía.',
      };
    }
  },

  /**
   * Elimina una fotografía del bucket privado si pertenece al usuario actual.
   */
  async deleteRecipeImage(storageUriOrPath: string, currentUserId?: string): Promise<void> {
    const objectPath = extractObjectPath(storageUriOrPath);
    if (!objectPath) return;

    // Respetar regla de propiedad: solo intentar eliminar si la carpeta coincide con el usuario
    if (currentUserId && !objectPath.startsWith(`${currentUserId}/`)) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      await supabase.storage.from(RECIPE_IMAGES_BUCKET).remove([objectPath]);
      signedUrlCache.delete(objectPath);
    } catch (err) {
      console.warn('No se pudo eliminar la imagen anterior del storage:', err);
    }
  },

  /**
   * Obtiene una URL firmada para una sola imagen privada (con caché en memoria).
   * Para URLs externas o Base64 antiguas, devuelve el valor original sin modificar.
   */
  async getSignedImageUrl(
    imageValue: string | null | undefined,
    forceRefresh = false
  ): Promise<string> {
    if (!imageValue) return '';
    const objectPath = extractObjectPath(imageValue);
    if (!objectPath) {
      return imageValue;
    }

    const now = Date.now();
    const cached = signedUrlCache.get(objectPath);
    if (!forceRefresh && cached && cached.expiresAt > now) {
      return cached.signedUrl;
    }

    const supabase = getSupabase();
    if (!supabase) return '';

    try {
      const { data, error } = await supabase.storage
        .from(RECIPE_IMAGES_BUCKET)
        .createSignedUrl(objectPath, SIGNED_URL_EXPIRES_IN);

      if (error || !data?.signedUrl) {
        console.warn('Error creando signedUrl para', objectPath, error?.message);
        return '';
      }

      signedUrlCache.set(objectPath, {
        signedUrl: data.signedUrl,
        expiresAt: now + (SIGNED_URL_EXPIRES_IN - 300) * 1000,
      });

      return data.signedUrl;
    } catch {
      return '';
    }
  },

  /**
   * Resuelve en un único lote (`createSignedUrls`) todas las rutas privadas
   * `storage://recipe-images/...` de una lista de recetas.
   * Nunca usa `getPublicUrl()`.
   */
  async resolveSignedImageUrls(
    imageValues: (string | null | undefined)[]
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    const pathsToSign = new Set<string>();
    const rawToPath = new Map<string, string>();
    const now = Date.now();

    for (const raw of imageValues) {
      if (!raw) continue;
      const objectPath = extractObjectPath(raw);
      if (!objectPath) {
        // URL externa o Base64 antigua: mantener intacta
        result[raw] = raw;
        continue;
      }

      rawToPath.set(raw, objectPath);
      const cached = signedUrlCache.get(objectPath);
      if (cached && cached.expiresAt > now) {
        result[raw] = cached.signedUrl;
      } else {
        pathsToSign.add(objectPath);
      }
    }

    if (pathsToSign.size === 0) {
      return result;
    }

    const supabase = getSupabase();
    if (!supabase) {
      return result;
    }

    const pathList = Array.from(pathsToSign);

    try {
      const { data, error } = await supabase.storage
        .from(RECIPE_IMAGES_BUCKET)
        .createSignedUrls(pathList, SIGNED_URL_EXPIRES_IN);

      if (!error && Array.isArray(data)) {
        const pathToSigned = new Map<string, string>();
        data.forEach((item, index) => {
          const objPath = item.path || pathList[index];
          if (objPath && item.signedUrl) {
            pathToSigned.set(objPath, item.signedUrl);
            signedUrlCache.set(objPath, {
              signedUrl: item.signedUrl,
              expiresAt: now + (SIGNED_URL_EXPIRES_IN - 300) * 1000,
            });
          }
        });

        rawToPath.forEach((objPath, rawKey) => {
          const signed = pathToSigned.get(objPath);
          if (signed) {
            result[rawKey] = signed;
          }
        });
      } else if (error) {
        console.warn('Error en createSignedUrls:', error.message);
      }
    } catch (err) {
      console.warn('Excepción en resolveSignedImageUrls:', err);
    }

    return result;
  },
};
