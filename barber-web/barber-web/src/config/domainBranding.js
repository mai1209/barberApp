const DEFAULT_APP_STORE_URL =
  "https://apps.apple.com/ar/app/barber-app/id6762878422";
const DEFAULT_PLAY_STORE_URL = "";
const DEFAULT_CODEX_URL = "https://www.letsbuilditcodex.com/";
const DEFAULT_WHATSAPP_URL =
  "https://wa.me/543425543308?text=Hola%20quiero%20consultar%20por%20BarberApp";

export const DEFAULT_DOMAIN_BRANDING = {
  siteName: "BarberApp",
  navLogoText: "BarberAppByCodex",
  logoSrc: "/logoBarber.png",
  bookingPath: "/turnos",
  registerPath: "/registro",
  plansPath: "/planes",
  appStoreUrl: DEFAULT_APP_STORE_URL,
  playStoreUrl: DEFAULT_PLAY_STORE_URL,
  codexBadgeText: "by CODEX®",
  codexBadgeHref: DEFAULT_CODEX_URL,
  footerHref: DEFAULT_CODEX_URL,
  footerTextPrefix: "BarberApp by",
  footerTextStrong: "CODEX®",
  whatsappHref: DEFAULT_WHATSAPP_URL,
  landing: {
    eyebrow: "Sistema de turnos inteligente",
    heroTitle: "Tu barbería,",
    heroAccent: "sin caos.",
    heroSubtitle:
      "Reservas online 24/7, notificaciones automáticas y gestión de agenda para vos y tu equipo — todo desde el celular.",
    flowNote:
      "Registrate y activá tu plan desde la web. Después descargás la app en iPhone o Android e ingresás con tu cuenta.",
    primaryCta: "Registrate y activá tu barbería",
    plansTitle: "Elegí el nivel que mejor",
    plansAccent: "acompaña tu barbería.",
    whyTitle: "Todo lo que necesitás,",
    whyAccent: "nada de lo que no.",
    stepsTitle: "En 3 pasos, listo.",
    finalTitle: "¿Listo para dejar de perder turnos?",
    finalSubtitle: "Más de 100 barberías ya usan BarberApp. Unite hoy.",
  },
  checkout: {
    eyebrow: "PLANES BARBERAPP",
    title: "Alta o renovación",
    accent: "de plan.",
    subtitle:
      "Completá el email de la cuenta y elegí el plan. Si tu cuenta tiene precio especial o descuento, se va a aplicar automáticamente en el checkout.",
    topBarName: "BarberApp",
  },
  register: {
    eyebrow: "ALTA BARBERAPP",
    title: "Creá tu cuenta",
    accent: "y seguí con el plan.",
    subtitle:
      "Primero registrás tu barbería. Después elegís el plan y completás el pago desde la web.",
    helperTitle: "Qué pasa después",
    helperText:
      "Al terminar este paso te llevamos a la pantalla de planes con el email ya cargado para que sigas con la activación.",
    topBarName: "BarberApp",
  },
  booking: {
    navLogoText: "BarberAppByCodex",
    navBadgeText: "by CODEX®",
    navBadgeHref: DEFAULT_CODEX_URL,
  },
  themeVars: {},
};

export const DOMAIN_BRANDING = {
  "rich-barbershop.com": {
    shopSlug: "rich-barbershop",
    siteName: "Rich Barbershop",
    logoSrc: "/logoRich.png",
    navLogoText: "Rich Barbershop",
    codexBadgeText: "Reservá online",
    codexBadgeHref: "/turnos",
    footerHref: "/turnos",
    footerTextPrefix: "Sitio de",
    footerTextStrong: "Rich Barbershop",
    contactHref: "https://linktr.ee/richbarbershoprosario/",
    contactLabel: "Linktree",
    instagramHref: "https://www.instagram.com/richbarbershoprosario/",
    linktreeHref: "https://linktr.ee/richbarbershoprosario/",
    addressText: "San Luis 2557, Rosario",
    phoneText: "3413-391929",
    mapsHref:
      "https://www.google.com/maps/place/Rich+Barbershop/@-32.9455565,-60.6614166,17z/data=!3m1!4b1!4m6!3m5!1s0x95b7abf448417741:0xcbcb3778ad2e3a95!8m2!3d-32.9455565!4d-60.6588417!16s%2Fg%2F11zh_z8ftt?entry=ttu&g_ep=EgoyMDI2MDUxMS4wIKXMDSoASAFQAw%3D%3D",
    mapsSrc:
      "https://www.google.com/maps?q=Rich%20Barbershop%20San%20Luis%202557%20Rosario&output=embed",
    customLanding: "rich-barbershop",
    landing: {
      eyebrow: "CORTE Y AFEITADO PREMIUM",
      heroTitle: "RICH",
      heroAccent: "BARBERSHOP",
      heroSubtitle:
        "En Rich Barbershop combinamos la esencia de la barbería clásica con el estilo moderno. Brindamos cortes, fades, perfilados y afeitados tradicionales premium con toallas calientes y navaja, creando una experiencia pensada para hombres que buscan calidad, presencia y atención de primer nivel.",
      primaryCta: "Reservar turno",
      finalTitle: "Reservá tu próxima visita.",
      finalSubtitle:
        "Cálida, premium, vintage y profesional. Una barbería pensada para fidelizar con atención cercana y resultados de primer nivel.",
    },
    checkout: {
      eyebrow: "PLANES RICH BARBERSHOP",
      title: "Activación online",
      accent: "de tu barbería.",
      subtitle:
        "Completá el email de la cuenta y seguí el alta desde este dominio, manteniendo la activación vinculada a Rich Barbershop.",
      topBarName: "Rich Barbershop",
    },
    register: {
      eyebrow: "ALTA RICH BARBERSHOP",
      title: "Creá tu cuenta",
      accent: "y seguí con el alta.",
      subtitle:
        "Registrá tu barbería desde este dominio y continuá el plan sin salir de la experiencia de marca de Rich Barbershop.",
      topBarName: "Rich Barbershop",
    },
    booking: {
      navLogoText: "Rich Barbershop",
      navBadgeText: "Reservas",
      navBadgeHref: "/turnos",
      webPreset: "vintage",
      bannerSrc: "/imgportada.jpeg",
      mobileBannerSrc: "/img2.jpeg",
      logoSrc: "/logoRich.png",
    },
    themeVars: {
      "--pink": "#0C2215",
      "--pink-light": "#C7A45A",
      "--pink-dim": "rgba(199, 164, 90, 0.12)",
      "--pink-border": "rgba(199, 164, 90, 0.28)",
      "--border": "rgba(12, 34, 21, 0.10)",
      "--text": "#0C2215",
      "--text-muted": "#3C4D41",
      "--text-dim": "#7B715C",
      "--font-body": "\"Poppins\", sans-serif",
      "--font-display": "\"Poppins\", sans-serif",
    },
  },
};

function normalizeHostname(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

function normalizeBrandKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

export function resolveDomainBranding(hostname, brandOverride) {
  const normalized = normalizeHostname(hostname);
  const overrideKey = normalizeBrandKey(brandOverride);
  const override =
    DOMAIN_BRANDING[overrideKey] || DOMAIN_BRANDING[normalized] || null;

  if (!override) {
    return {
      ...DEFAULT_DOMAIN_BRANDING,
      landing: { ...DEFAULT_DOMAIN_BRANDING.landing },
      checkout: { ...DEFAULT_DOMAIN_BRANDING.checkout },
      register: { ...DEFAULT_DOMAIN_BRANDING.register },
      booking: { ...DEFAULT_DOMAIN_BRANDING.booking },
      themeVars: { ...DEFAULT_DOMAIN_BRANDING.themeVars },
      hostname: normalized,
      isCustomDomain: false,
    };
  }

  return {
    ...DEFAULT_DOMAIN_BRANDING,
    ...override,
    landing: {
      ...DEFAULT_DOMAIN_BRANDING.landing,
      ...(override.landing || {}),
    },
    checkout: {
      ...DEFAULT_DOMAIN_BRANDING.checkout,
      ...(override.checkout || {}),
    },
    register: {
      ...DEFAULT_DOMAIN_BRANDING.register,
      ...(override.register || {}),
    },
    booking: {
      ...DEFAULT_DOMAIN_BRANDING.booking,
      ...(override.booking || {}),
    },
    themeVars: {
      ...DEFAULT_DOMAIN_BRANDING.themeVars,
      ...(override.themeVars || {}),
    },
    hostname: normalized,
    isCustomDomain: true,
  };
}
