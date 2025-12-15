
import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { supabase } from './services/supabaseClient';
import { Role } from './types';
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
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [role, setRole] = useState<Role>(Role.PARTNER); // Default

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCurrentUser(session?.user || null);
      if (session?.user) fetchUserRole(session.user.id, session.user.email);
      setIsLoading(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setCurrentUser(session?.user || null);
      if (session?.user) fetchUserRole(session.user.id, session.user.email);
      else setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string, email?: string) => {
      if (email && email.toLowerCase() === 'yysz2006@gmail.com') {
        setRole(Role.SUPER_ADMIN);
        setIsLoading(false);
        return;
      }

      // In Supabase, roles are often stored in a 'profiles' table or metadata
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (data && data.role) {
          setRole(data.role as Role);
      } else {
          // Default to CEO for demo if no profile found, or handle otherwise
          setRole(Role.CEO); 
      }
      setIsLoading(false);
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.body.className = `bg-slate-50 text-slate-900 antialiased ${lang === 'ar' ? 'font-cairo' : 'font-inter'}`;
  }, [lang]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
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
    setRole,
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
