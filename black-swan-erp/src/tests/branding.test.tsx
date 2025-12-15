import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { dataService } from '../services/dataService';

// Mock dataService
vi.mock('../services/dataService', () => ({
  dataService: {
    getCompanySettings: vi.fn(),
    updateCompanySettings: vi.fn()
  }
}));

describe('Branding & ThemeContext', () => {
  it('should load initial branding from dataService', async () => {
    const mockSettings = {
      branding: {
        primaryColor: '#ff0000',
        accentColor: '#00ff00',
        fontFamily: 'Cairo',
        logoUrl: 'https://example.com/logo.png'
      }
    };

    (dataService.getCompanySettings as any).mockResolvedValue(mockSettings);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    // Wait for effect
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.primaryColor).toBe('#ff0000');
    expect(result.current.accentColor).toBe('#00ff00');
    expect(result.current.fontFamily).toBe('Cairo');
    expect(result.current.logoUrl).toBe('https://example.com/logo.png');
  });

  it('should update branding and persist to dataService', async () => {
    const mockSettings = { branding: {} };
    (dataService.getCompanySettings as any).mockResolvedValue(mockSettings);
    (dataService.updateCompanySettings as any).mockResolvedValue(undefined);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      await result.current.updateBranding({ primaryColor: '#0000ff' });
    });

    expect(result.current.primaryColor).toBe('#0000ff');
    expect(dataService.updateCompanySettings).toHaveBeenCalledWith(
      expect.objectContaining({
        branding: expect.objectContaining({ primaryColor: '#0000ff' })
      })
    );
  });
});
