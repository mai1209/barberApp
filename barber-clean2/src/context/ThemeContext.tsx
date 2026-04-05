import React, {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getToken,
  getUserProfile,
  saveUserProfile,
} from '../services/authStorage';
import { getCurrentUser } from '../services/api';

export type ThemeConfig = {
  primary?: string | null;
  secondary?: string | null;
  card?: string | null;
  gradientColors?: string[] | null;
  logoDataUrl?: string | null;
  bannerDataUrl?: string | null;
  mobileBannerDataUrl?: string | null;
};

type ThemeProfile = {
  shopSlug?: string | null;
  themeConfig?: ThemeConfig | null;
};

export type Theme = {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  gradientColors: string[];
  logo: any;
};

const DEFAULT_THEME: Theme = {
  primary: '#FF1493',
  secondary: '#FFFFFF',
  background: 'transparent',
  card: '#343434',
  gradientColors: ['#F0EAD6', '#343434', '#1B1B1B', '#080808'],
  logo: require('../assets/logo.png'),
};

const themes: Record<string, Theme> = {
  codex: DEFAULT_THEME,
  orion: {
    ...DEFAULT_THEME,
  },
  saiko: {
    primary: '#B07FFF',
    secondary: '#3F15B1',
    background: 'transparent',
    card: '#1E1231', 
    gradientColors: ['#D8A6FF', '#B07FFF', '#6322D1', '#3F15B1'],
    logo: require('../assets/LogoKevin.png'),
  },
};

type ThemeContextValue = {
  theme: Theme;
  shopSlug: string | null;
  setShopSlug: (slug: string | null) => void;
  applyUserTheme: (profile: ThemeProfile | null) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  shopSlug: null,
  setShopSlug: () => {},
  applyUserTheme: () => {},
});

function buildThemeFromProfile(profile: ThemeProfile | null) {
  const normalizedSlug = (profile?.shopSlug ?? '').trim().toLowerCase();
  const presetTheme = themes[normalizedSlug] ?? DEFAULT_THEME;
  const customTheme = profile?.themeConfig;

  if (!customTheme) {
    return {
      resolvedSlug: profile?.shopSlug ?? null,
      resolvedTheme: presetTheme,
    };
  }

  const gradientColors =
    Array.isArray(customTheme.gradientColors) && customTheme.gradientColors.length === 4
      ? customTheme.gradientColors
      : presetTheme.gradientColors;

  return {
    resolvedSlug: profile?.shopSlug ?? null,
    resolvedTheme: {
      ...presetTheme,
      primary: customTheme.primary || presetTheme.primary,
      secondary: customTheme.secondary || presetTheme.secondary,
      card: customTheme.card || presetTheme.card,
      gradientColors,
      logo: customTheme.logoDataUrl
        ? { uri: customTheme.logoDataUrl }
        : presetTheme.logo,
    },
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [shopSlug, setShopSlug] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  const applyUserTheme = useCallback((profile: ThemeProfile | null) => {
    const { resolvedSlug, resolvedTheme } = buildThemeFromProfile(profile);
    setShopSlug(resolvedSlug);
    setTheme(resolvedTheme);
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const profile = await getUserProfile<ThemeProfile>();
      if (isMounted) {
        applyUserTheme(profile);
      }

      const token = await getToken();
      if (!token) return;

      try {
        const response = await getCurrentUser();
        const freshUser = response.user;
        await saveUserProfile(freshUser);

        if (isMounted) {
          applyUserTheme(freshUser);
        }
      } catch (_error) {}
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      theme,
      shopSlug,
      setShopSlug,
      applyUserTheme,
    }),
    [theme, shopSlug, applyUserTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
