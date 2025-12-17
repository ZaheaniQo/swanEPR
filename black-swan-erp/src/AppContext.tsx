
import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { supabase } from './services/supabaseClient';
import { ProfileStatus, Role } from './types';
import { TRANSLATIONS } from './constants';
import { Session, User } from '@supabase/supabase-js';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  currentUser: User | null;
  currentUserRole: Role;
  setRole: (r: Role) => void;
  profileStatus: ProfileStatus | 'UNKNOWN';
  passwordChanged: boolean;
  setPasswordChanged: (v: boolean) => void;
  lang: 'en' | 'ar';
  dir: 'ltr' | 'rtl';
  isLoading: boolean;
  toasts: Toast[];
  setLang: (lang: 'en' | 'ar') => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lang, setLang] = useState<'en' | 'ar'>('ar');
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [role, setRoleState] = useState<Role>(() => {
    if (typeof window === 'undefined') return Role.PARTNER;
    const cached = window.localStorage.getItem('bs_last_role') as Role | null;
    return cached || Role.PARTNER;
  });
  const persistRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('bs_last_role', r);
    }
  };
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | 'UNKNOWN'>('ACTIVE');
  const [passwordChanged, setPasswordChanged] = useState<boolean>(false);

  useEffect(() => {
    const loadSession = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setCurrentUser(session?.user || null);
        if (session?.user) {
          const metaRole = session.user.user_metadata?.role as Role | undefined;
          if (metaRole) persistRole(metaRole);
          setPasswordChanged(!!session.user.user_metadata?.password_changed);
          await fetchUserRole(session.user.id, session.user.email, metaRole);
        } else {
          setPasswordChanged(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load session', error);
        // Keep current role on error to avoid role flapping
        setIsLoading(false);
      }
    };

    loadSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoading(true);
      try {
        setSession(session);
        setCurrentUser(session?.user || null);
        if (session?.user) {
          const metaRole = session.user.user_metadata?.role as Role | undefined;
          if (metaRole) persistRole(metaRole);
          setPasswordChanged(!!session.user.user_metadata?.password_changed);
          await fetchUserRole(session.user.id, session.user.email, metaRole);
        } else {
          setPasswordChanged(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth state change failed', error);
        // Keep current role on error
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string, email?: string, metaRole?: Role) => {
    try {
      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (isLocal && email && email.toLowerCase() === 'yysz2006@gmail.com') {
        persistRole(Role.SUPER_ADMIN);
        setProfileStatus('ACTIVE');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data && data.role) {
        persistRole(data.role as Role);
      } else {
        // Fallback to metadata role if available, otherwise keep current
        if (metaRole) persistRole(metaRole);
      }
      setProfileStatus('ACTIVE');
    } catch (err) {
      console.error('Failed to fetch user role', err);
      // Keep current role to avoid flicker; optionally fall back to metadata
      if (metaRole) persistRole(metaRole);
      setProfileStatus('ACTIVE');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.body.className = `bg-slate-50 text-slate-900 antialiased ${lang === 'ar' ? 'font-cairo' : 'font-inter'}`;
  }, [lang]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    persistRole(Role.PARTNER);
    setProfileStatus('ACTIVE');
    setPasswordChanged(false);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('bs_last_role');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const value = {
    currentUser,
    currentUserRole: role,
    setRole: persistRole,
    profileStatus,
    passwordChanged,
    setPasswordChanged,
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr' as 'rtl' | 'ltr',
    setLang,
    isLoading,
    toasts,
    showToast,
    removeToast,
    signOut
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const useTranslation = () => {
  const { lang, setLang, dir } = useApp();
  
  const t = (key: string) => {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    return entry[lang];
  };

  const toggleLang = () => setLang(lang === 'en' ? 'ar' : 'en');

  return { t, lang, toggleLang, dir };
};
