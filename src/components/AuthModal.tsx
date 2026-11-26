import React, { useState } from 'react';
import { Logo } from './Logo';
import { authService } from '../services/authService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Settings,
} from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onOpenConfig?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess, onOpenConfig }) => {
  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!configured) {
      setErrorMsg('Primero debes configurar la URL y la Anon Key de tu proyecto Supabase.');
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMsg('Introduce una dirección de correo electrónico válida.');
      return;
    }

    if (tab !== 'forgot' && (!password || password.length < 6)) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      if (tab === 'signin') {
        const res = await authService.signIn(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          onSuccess();
          onClose();
        }
      } else if (tab === 'signup') {
        const res = await authService.signUp(email, password, displayName);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.requiresEmailConfirm) {
          setSuccessMsg(
            '¡Cuenta creada con éxito! Hemos enviado un enlace de confirmación a tu correo. Revisa tu bandeja de entrada.'
          );
        } else {
          onSuccess();
          onClose();
        }
      } else if (tab === 'forgot') {
        const res = await authService.resetPassword(email);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg('Te hemos enviado un correo para restablecer tu contraseña.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden relative my-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer active:scale-95"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex justify-center mb-2">
            <Logo size="lg" showSubtitle={false} />
          </div>

          <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            {tab === 'signin' && 'Acceso al Recetario Familiar'}
            {tab === 'signup' && 'Unirme a Las Recetas de Peludo'}
            {tab === 'forgot' && 'Recuperar Contraseña'}
          </h3>
          <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-xs mx-auto">
            {tab === 'signin' && 'Inicia sesión para sincronizar tus recetas y favoritos en la nube'}
            {tab === 'signup' && 'Crea tu cuenta familiar con correo y contraseña'}
            {tab === 'forgot' && 'Te enviaremos las instrucciones de recuperación'}
          </p>
        </div>

        {/* Supabase Not Configured Warning */}
        {!configured && (
          <div className="p-4 mx-6 mt-4 rounded-2xl bg-amber-100/80 border border-amber-300 text-amber-900 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <p className="font-bold">Credenciales de Supabase no detectadas</p>
              <p className="text-stone-700">
                Necesitas conectar tu proyecto de Supabase para poder autenticarte en la nube.
              </p>
              {onOpenConfig && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenConfig();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 text-white font-bold rounded-xl text-xs hover:bg-amber-800 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configurar URL y Anon Key</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200 bg-white/80 px-6 pt-3">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              tab === 'signin'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              tab === 'signup'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Nombre o apodo familiar
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ej: Mamá, David, Abuela Carmen"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-sm text-stone-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 min-h-[44px]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@ejemplo.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-stone-200 text-sm text-stone-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 min-h-[44px]"
              />
            </div>
          </div>

          {tab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-stone-700">Contraseña</label>
                {tab === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-stone-200 text-sm text-stone-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm shadow-md shadow-amber-900/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>
                  {tab === 'signin' && 'Entrar al Recetario'}
                  {tab === 'signup' && 'Crear mi Cuenta'}
                  {tab === 'forgot' && 'Enviar Correo de Recuperación'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {tab === 'forgot' && (
            <button
              type="button"
              onClick={() => setTab('signin')}
              className="w-full text-center text-xs font-bold text-stone-500 hover:text-stone-800 pt-1 cursor-pointer"
            >
              ← Volver a Iniciar Sesión
            </button>
          )}

          <div className="pt-2 text-center text-[11px] text-stone-500">
            <p>Tus recetas familiares se guardan de forma privada y segura en Supabase con RLS.</p>
          </div>
        </form>
      </div>
    </div>
  );
};
