import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { settingsService } from '../services/settingsService';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    
    const stored = localStorage.getItem('appTheme') as ThemeMode | null;
    if (stored) return stored;
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('appTheme', newTheme);
    

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await settingsService.getSystemSettings();
        if (!mounted || !data) return;

       
        const sysTheme = (data.SystemTheme || data.systemTheme) as ThemeMode | undefined;
        if (sysTheme === 'dark' || sysTheme === 'light') {
       
          setTheme(sysTheme);
        }

      
        const themeColor = data.SystemThemeColor || data.systemThemeColor || data.systemPrimaryColor || data.systemPrimary || undefined;
        if (themeColor && typeof themeColor === 'string') {
          try {
            document.documentElement.style.setProperty('--primary', themeColor);
          } catch (e) {
        
          }
        }
      } catch (err) {
       
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
