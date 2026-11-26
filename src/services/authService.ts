import { getSupabase } from './supabaseClient';
import { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const authService = {
  async getSession(): Promise<Session | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }
      return data.session;
    } catch (err) {
      console.error('Session catch error:', err);
      return null;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  },

  async signIn(email: string, password: string): Promise<{ user: User | null; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { user: null, error: 'Configura Supabase antes de iniciar sesión.' };

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('Invalid login credentials')) {
          msg = 'Correo electrónico o contraseña incorrectos.';
        } else if (msg.includes('Email not confirmed')) {
          msg = 'Por favor, confirma tu correo electrónico antes de entrar.';
        }
        return { user: null, error: msg };
      }

      return { user: data.user };
    } catch (err: any) {
      return { user: null, error: err?.message || 'Error inesperado al iniciar sesión.' };
    }
  },

  async signUp(
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ user: User | null; session: Session | null; error?: string; requiresEmailConfirm?: boolean }> {
    const supabase = getSupabase();
    if (!supabase) return { user: null, session: null, error: 'Configura Supabase antes de registrarte.' };

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName?.trim() || email.split('@')[0],
          },
        },
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('User already registered')) {
          msg = 'Ya existe una cuenta con este correo electrónico.';
        } else if (msg.includes('Password should be')) {
          msg = 'La contraseña debe tener al menos 6 caracteres.';
        } else if (msg.includes('Invalid path specified in request URL') || msg.includes('requested path is invalid')) {
          msg = 'La URL de Supabase debe ser únicamente la raíz (https://xxxxx.supabase.co), sin sufijo /auth/v1 ni /rest/v1. Se ha corregido automáticamente en la configuración.';
        }
        return { user: null, session: null, error: msg };
      }

      const requiresEmailConfirm = !data.session;
      return {
        user: data.user,
        session: data.session,
        requiresEmailConfirm,
      };
    } catch (err: any) {
      const raw = err?.message || '';
      let msg = raw || 'Error inesperado al registrar usuario.';
      if (raw.includes('Invalid path specified in request URL') || raw.includes('requested path is invalid')) {
        msg = 'La URL de Supabase debe ser únicamente la raíz (https://xxxxx.supabase.co), sin sufijo /auth/v1 ni /rest/v1.';
      }
      return { user: null, session: null, error: msg };
    }
  },

  async signOut(): Promise<{ error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return {};

    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err?.message };
    }
  },

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Supabase no configurado.' };

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al enviar enlace.' };
    }
  },

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const supabase = getSupabase();
    if (!supabase) return { unsubscribe: () => {} };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });

    return {
      unsubscribe: () => authListener.subscription.unsubscribe(),
    };
  },
};
