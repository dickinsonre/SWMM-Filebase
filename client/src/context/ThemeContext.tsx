import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ColorTheme = "epa" | "uf" | "oregon-state" | "auburn";

interface ThemeState {
  dark: boolean;
  colorTheme: ColorTheme;
  setDark: (dark: boolean) => void;
  setColorTheme: (theme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeState>({
  dark: true,
  colorTheme: "epa",
  setDark: () => {},
  setColorTheme: () => {},
});

const STORAGE_KEY = "swmm-theme";

function loadTheme(): { dark: boolean; colorTheme: ColorTheme } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        dark: parsed.dark ?? true,
        colorTheme: parsed.colorTheme ?? "epa",
      };
    }
  } catch {}
  return { dark: true, colorTheme: "epa" };
}

function saveTheme(dark: boolean, colorTheme: ColorTheme) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ dark, colorTheme }));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDarkState] = useState(() => loadTheme().dark);
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => loadTheme().colorTheme);

  const setDark = (value: boolean) => {
    setDarkState(value);
    saveTheme(value, colorTheme);
  };

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
    saveTheme(dark, theme);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(dark ? "dark" : "light");

    root.classList.remove("theme-epa", "theme-uf", "theme-oregon-state", "theme-auburn");
    root.classList.add(`theme-${colorTheme}`);
  }, [dark, colorTheme]);

  return (
    <ThemeContext.Provider value={{ dark, colorTheme, setDark, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
