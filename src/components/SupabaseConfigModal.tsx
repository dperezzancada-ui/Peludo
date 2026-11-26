import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  KeyRound,
  Globe,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  cleanSupabaseUrl,
  cleanAnonKey,
} from '../services/supabaseClient';
import { createClient } from '@supabase/supabase-js';

interface SupabaseConfigModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ onClose, onSaved }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isFromEnv, setIsFromEnv] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const creds = getSupabaseCredentials();
    setUrl(creds.url);
    setAnonKey(creds.anonKey);
    setIsFromEnv(creds.isFromEnv);
  }, []);

  const hasPathInUrl = url.includes('/auth/v1') || url.includes('/rest/v1') || (url.endsWith('/') && url.length > 8);
  const normalizedUrlPreview = cleanSupabaseUrl(url);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const cleanUrl = cleanSupabaseUrl(url);
    const cleanKey = cleanAnonKey(anonKey);

    if (!cleanUrl.startsWith('https://') || !cleanUrl.includes('.supabase.co')) {
      setTestResult({
        success: false,
        message: 'La URL debe empezar por https:// y terminar en .supabase.co (sin /auth/v1 ni barra final).',
      });
      setTesting(false);
      return;
    }

    if (cleanKey.length < 20) {
      setTestResult({
        success: false,
        message: 'La clave Anon Key parece incompleta o inválida.',
      });
      setTesting(false);
      return;
    }

    try {
      const client = createClient(cleanUrl, cleanKey);

      // 1. Probar endpoint de Autenticación (evita error "Invalid path specified in request URL")
      const { error: authError } = await client.auth.getSession();
      if (authError && authError.message.includes('Invalid path specified in request URL')) {
        setTestResult({
          success: false,
          message: 'Error en la URL de autenticación: asegúrate de usar https://xxxxx.supabase.co sin sufijo /auth/v1.',
        });
        setTesting(false);
        return;
      }

      // 2. Probar tabla public.recipes
      const { error: dbError } = await client.from('recipes').select('id').limit(1);

      if (dbError && !dbError.message.includes('permission denied') && !dbError.message.includes('row-level security')) {
        setTestResult({
          success: false,
          message: `Respuesta de Supabase: ${dbError.message}`,
        });
      } else {
        setTestResult({
          success: true,
          message: '¡Conexión verificada con éxito! Tanto la autenticación (/auth/v1) como la tabla recipes responden correctamente.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'No se pudo conectar a la URL especificada.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = cleanSupabaseUrl(url);
    const finalKey = cleanAnonKey(anonKey);
    saveSupabaseCredentials(finalUrl, finalKey);
    onSaved();
    onClose();
  };

  const handleClear = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden relative my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer active:scale-95"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
              Conexión con Supabase
            </h3>
          </div>
          <p className="text-emerald-100 text-xs sm:text-sm">
            Conecta tu proyecto existente de Supabase con la tabla <code className="bg-black/20 px-1.5 py-0.5 rounded text-white font-mono">public.recipes</code>
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {isFromEnv && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Variables cargadas desde el archivo de entorno (.env).</span>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-stone-500" />
              <span>Project URL</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzproject.supabase.co"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-sm font-mono text-stone-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 min-h-[44px]"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Encuéntrala en Supabase ➔ Project Settings ➔ API ➔ Project URL. Debe ser <code className="text-stone-700 font-mono bg-stone-100 px-1 py-0.5 rounded">https://xxxx.supabase.co</code> (sin sufijo /auth/v1 ni barra final).
            </p>
            {hasPathInUrl && (
              <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Normalizado automáticamente a: <strong className="font-mono">{normalizedUrlPreview}</strong> (evita duplicar /auth/v1).
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-stone-500" />
              <span>Project API Key (anon public)</span>
            </label>
            <textarea
              required
              rows={3}
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-xs font-mono text-stone-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 resize-none"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Utiliza exclusivamente la clave pública <strong className="text-stone-700">anon</strong> (nunca service_role).
            </p>
          </div>

          {/* Test connection button */}
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              disabled={testing || !url || !anonKey}
              onClick={handleTestConnection}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 min-h-[42px] flex items-center gap-2"
            >
              {testing ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-stone-600 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>Probar Conexión</span>
            </button>

            {url && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-stone-500 hover:text-stone-700 text-xs font-semibold hover:underline cursor-pointer ml-auto"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-950/20 cursor-pointer min-h-[44px]"
            >
              Guardar y Conectar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
