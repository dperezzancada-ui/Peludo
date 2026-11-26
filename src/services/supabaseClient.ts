import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'peludo_supabase_url';
const STORAGE_KEY_KEY = 'peludo_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let currentUrl: string = '';
let currentKey: string = '';

/**
 * Normaliza y limpia de forma estricta la URL del proyecto Supabase.
 * Formato requerido por el SDK: https://<id-proyecto>.supabase.co
 *
 * Evita el error "Invalid path specified in request URL" causado por:
 * 1. URLs que terminan en /auth/v1 o /rest/v1 (el SDK ya añade /auth/v1 automáticamente;
 *    si se incluye aquí se duplicaría como /auth/v1/auth/v1/signup).
 * 2. Barras inclinadas al final (ej. https://xxxx.supabase.co/ -> //auth/v1/signup).
 * 3. Enlaces copiados directamente de la barra del navegador (ej. dashboard/project/...).
 * 4. Comillas o espacios accidentales.
 */
export function cleanSupabaseUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return '';
  let clean = rawUrl.trim();

  // Eliminar comillas envolventes simples o dobles
  clean = clean.replace(/^["']+|["']+$/g, '').trim();
  if (!clean) return '';

  // Si el usuario pegó la URL del panel de control de Supabase:
  const dashboardMatch = clean.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Asegurar protocolo https
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }

  try {
    const parsed = new URL(clean);
    // Extraer estrictamente el origen (protocolo + host, sin pathname ni query ni trailing slash)
    // Ej: "https://abc.supabase.co/auth/v1" -> "https://abc.supabase.co"
    const origin = parsed.origin.trim().replace(/\/+$/, '');
    return origin;
  } catch {
    // Limpieza de respaldo por expresiones regulares
    return clean
      .replace(/\/auth\/v1.*$/i, '')
      .replace(/\/rest\/v1.*$/i, '')
      .replace(/\/storage\/v1.*$/i, '')
      .replace(/\/+$/, '');
  }
}

/**
 * Normaliza la clave anónima pública (anon key) eliminando comillas,
 * saltos de línea o espacios accidentales al copiar.
 */
export function cleanAnonKey(rawKey: string | null | undefined): string {
  if (!rawKey) return '';
  return rawKey
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s+/g, '');
}

export function getSupabaseCredentials(): { url: string; anonKey: string; isFromEnv: boolean } {
  const envUrlRaw = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKeyRaw = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const envUrl = cleanSupabaseUrl(envUrlRaw);
  const envKey = cleanAnonKey(envKeyRaw);

  const hasValidEnv = Boolean(
    envUrl &&
    envKey &&
    !envUrl.includes('YOUR_PROJECT_REF') &&
    envKey.length > 20
  );

  if (hasValidEnv) {
    return { url: envUrl, anonKey: envKey, isFromEnv: true };
  }

  // Comprobar fallback en localStorage (para configuración desde la UI)
  let localUrlRaw = '';
  let localKeyRaw = '';
  if (typeof window !== 'undefined') {
    localUrlRaw = localStorage.getItem(STORAGE_URL_KEY) || '';
    localKeyRaw = localStorage.getItem(STORAGE_KEY_KEY) || '';
  }

  const localUrl = cleanSupabaseUrl(localUrlRaw);
  const localKey = cleanAnonKey(localKeyRaw);

  // Auto-corrección: Si en localStorage había una URL guardada con /auth/v1 o barra final,
  // la sobrescribimos automáticamente con el formato limpio para solucionar el error de inmediato.
  if (typeof window !== 'undefined') {
    if (localUrl && localUrlRaw && localUrl !== localUrlRaw) {
      try {
        localStorage.setItem(STORAGE_URL_KEY, localUrl);
      } catch {
        // Ignorar si storage está restringido
      }
    }
    if (localKey && localKeyRaw && localKey !== localKeyRaw) {
      try {
        localStorage.setItem(STORAGE_KEY_KEY, localKey);
      } catch {
        // Ignorar
      }
    }
  }

  return {
    url: localUrl || envUrl,
    anonKey: localKey || envKey,
    isFromEnv: false,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    !url.includes('YOUR_PROJECT_REF') &&
    anonKey.length > 20
  );
}

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey || !url.startsWith('https://') || url.includes('YOUR_PROJECT_REF')) {
    return null;
  }

  // Garantizar que la URL entregada a createClient sea siempre limpia
  const finalUrl = cleanSupabaseUrl(url);
  const finalKey = cleanAnonKey(anonKey);

  if (!finalUrl || !finalKey) {
    return null;
  }

  if (cachedClient && currentUrl === finalUrl && currentKey === finalKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(finalUrl, finalKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    currentUrl = finalUrl;
    currentKey = finalKey;
    return cachedClient;
  } catch (err) {
    console.error('Error al inicializar cliente Supabase:', err);
    return null;
  }
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    const cleanUrl = cleanSupabaseUrl(url);
    const cleanKey = cleanAnonKey(anonKey);
    localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
    localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
    cachedClient = null;
    currentUrl = '';
    currentKey = '';
    window.dispatchEvent(new Event('peludo_supabase_config_changed'));
  }
}

export function clearSupabaseCredentials(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_KEY_KEY);
    cachedClient = null;
    currentUrl = '';
    currentKey = '';
    window.dispatchEvent(new Event('peludo_supabase_config_changed'));
  }
}

