import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getUserProfile } from "../services/authStorage";

export type Theme = {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  gradientColors: string[];
  logo: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const themes: Record<string, Theme> = {
  orion: {
    primary: "#B89016",
    secondary: "#D8A63C",
    background: "transparent",
    card: "#1C1C1C",
    gradientColors: ["#812917", "#4D190E", "#B33A21", "#802A17"],
    logo: require("../assets/LogoOrion.png"),
  },
saiko: {
    primary: "#B07FFF", // El lila brillante de las letras superiores
    secondary: "#3F15B1", // El violeta oscuro del fondo del logo
    background: "transparent", // Un negro con tinte violeta muy profundo para el fondo
    card: "#1E1231", // Un tono berenjena oscuro para las tarjetas
    gradientColors: [
      "#D8A6FF", // Lila claro (Stops del gradiente)
      "#B07FFF", // Lila medio
      "#6322D1", // Violeta vibrante
      "#3F15B1"  // Violeta profundo
    ],
    logo: require("../assets/LogoKevin.png"), // TODO: cambiar por el de Saiko cuando lo exportes
  },
};

type ThemeContextValue = {
  theme: Theme;
  setShopSlug: (slug: string | null) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes.orion,
  setShopSlug: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [shopSlug, setShopSlug] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(themes.orion);

  useEffect(() => {
    (async () => {
      const profile = await getUserProfile<{ shopSlug?: string }>();
      if (profile?.shopSlug) setShopSlug(profile.shopSlug);
    })();
  }, []);

  useEffect(() => {
    const normalized = (shopSlug ?? "").trim().toLowerCase();
    setTheme(themes[normalized] ?? themes.orion);
  }, [shopSlug]);

  const value = useMemo(
    () => ({
      theme,
      setShopSlug,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
