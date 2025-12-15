
import React, { createContext, useContext, useEffect, useState, ReactNode, PropsWithChildren } from 'react';
import { dataService } from '../services/dataService';
import { BrandingSettings } from '../types';

interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl?: string;
  setMode: (mode: 'light' | 'dark' | 'system') => void;
  updateBranding: (settings: Partial<BrandingSettings>) => Promise<void>;
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);

// Helper to convert hex to RGB values for Tailwind variables
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    : null;
};

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [branding, setBranding] = useState<BrandingSettings>({
    mode: 'light',
    primaryColor: '#0e887eff', // Default Teal
    accentColor: '#1c3769ff', // Default Bronze
    fontFamily: 'Inter',
    logoUrl: ''
  });

  useEffect(() => {
    // Load initial settings
    dataService.getCompanySettings().then(settings => {
      if (settings.branding) {
        setBranding(prev => ({ ...prev, ...settings.branding }));
      }
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply Mode
    if (branding.mode === 'dark' || (branding.mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply Colors
    const primaryRgb = hexToRgb(branding.primaryColor);
    const accentRgb = hexToRgb(branding.accentColor);

    if (primaryRgb) {
      root.style.setProperty('--color-primary', primaryRgb);
      // Generate a hover variant (slightly darker/saturated)
      root.style.setProperty('--color-primary-hover', primaryRgb); 
    }
    if (accentRgb) {
      root.style.setProperty('--color-accent', accentRgb);
    }

    // Apply Font
    document.body.style.fontFamily = branding.fontFamily === 'Cairo' ? "'Cairo', sans-serif" : "'Inter', sans-serif";

  }, [branding]);

  const updateBranding = async (newSettings: Partial<BrandingSettings>) => {
    const updated = { ...branding, ...newSettings };
    setBranding(updated);
    // Save to database
    await dataService.updateCompanySettings({ branding: updated } as any);
  };

  const setMode = (mode: 'light' | 'dark' | 'system') => {
    updateBranding({ mode });
  };

  return (
    <ThemeContext.Provider value={{ ...branding, setMode, updateBranding }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
