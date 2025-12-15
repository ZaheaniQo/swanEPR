import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import { Role, LanguageContextType } from './types';
import { TRANSLATIONS } from './constants';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  currentUserRole: Role;
  setRole: (role: Role) => void;
  lang: 'en' | 'ar';
  setLang: (lang: 'en' | 'ar') => void;
  isLoading: boolean;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren<{}>) => {
  const [currentUserRole, setCurrentUserRole] = useState<Role>(Role.CEO);
  const [lang, setLang] = useState<'en' | 'ar'>('ar'); // Default to Arabic
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Set HTML dir attribute
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    // Update font class on body
    document.body.className = `bg-slate-50 text-slate-900 antialiased ${lang === 'ar' ? 'font-cairo' : 'font-inter'}`;
  }, [lang]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const value = {
    currentUserRole,
    setRole: (r: Role) => {
        setIsLoading(true);
        setCurrentUserRole(r);
        setTimeout(() => setIsLoading(false), 500); 
    },
    lang,
    setLang,
    isLoading,
    toasts,
    showToast,
    removeToast
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const useTranslation = () => {
  const { lang, setLang } = useApp();
  
  const t = (key: string) => {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    return entry[lang];
  };

  const toggleLang = () => setLang(lang === 'en' ? 'ar' : 'en');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return { t, lang, toggleLang, dir };
};