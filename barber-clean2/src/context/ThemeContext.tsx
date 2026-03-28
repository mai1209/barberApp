import React, {
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

export type Theme = {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  gradientColors: string[];
  logo: any;
};

const themes: Record<string, Theme> = {
  orion: {
    primary: '#B89016',
    secondary: '#D8A63C',
    background: 'transparent',
    card: '#1C1C1C',
    gradientColors: ['#812917', '#4D190E', '#B33A21', '#802A17'],
    logo: require('../assets/LogoOrion.png'),
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
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.orion,
  shopSlug: null,
  setShopSlug: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [shopSlug, setShopSlug] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(themes.orion);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const profile = await getUserProfile<{ shopSlug?: string }>();
      if (isMounted && profile?.shopSlug) {
        setShopSlug(profile.shopSlug);
      }

      const token = await getToken();
      if (!token) return;

      try {
        const response = await getCurrentUser();
        const freshUser = response.user;
        await saveUserProfile(freshUser);

        if (isMounted) {
          setShopSlug(freshUser?.shopSlug ?? null);
        }
      } catch (_error) {}
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const normalized = (shopSlug ?? '').trim().toLowerCase();
    setTheme(themes[normalized] ?? themes.orion);
  }, [shopSlug]);

  const value = useMemo(
    () => ({
      theme,
      shopSlug,
      setShopSlug,
    }),
    [theme, shopSlug],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
