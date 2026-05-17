// LandingPage.jsx
import { useEffect, useRef, useState } from "react";
import { fetchPlanPricing } from "../services/api";
import styles from "../styles/LandingPage.module.css";
import { DEFAULT_DOMAIN_BRANDING } from "../config/domainBranding";

function LandingPage({ branding = DEFAULT_DOMAIN_BRANDING }) {
  const [pricing, setPricing] = useState({
    basic: { ars: 25000, usdReference: 25 },
    pro: { ars: 35000, usdReference: 35 },
  });
  const registerUrl = branding.registerPath || "/registro";
  const plansUrl = branding.plansPath || "/planes";
  const appStoreUrl = branding.appStoreUrl;
  const playStoreUrl = branding.playStoreUrl;
  const hasAppStore = Boolean(appStoreUrl);
  const hasPlayStore = Boolean(playStoreUrl);

  const plans = [
    {
      badge: "Básico",
      title: "Todo lo necesario para vender turnos online",
      price: `ARS ${pricing.basic.ars.toLocaleString("es-AR")}`,
      billingLabel: `por mes · USD ${pricing.basic.usdReference}`,
      description:
        "Ideal para barberías que quieren ordenar la agenda, automatizar turnos y empezar a cobrar online sin complejidad.",
      features: [
        "Personalización de colores y logo",
        "Link personalizado",
        "Vinculación con Mercado Pago",
        "Carga infinita de barberos",
        "Carga infinita de servicios",
        "Turnos ilimitados",
        "Vinculación con WhatsApp para cancelación de turnos",
        "Confirmación y recordatorio de turno vía mail",
        "Notificación y recordatorio de turnos vía app para el barbero",
      ],
      cta: "Conocer plan básico",
      href: "/planes?plan=basic",
      buttonClassName: styles.planButton,
      badgeClassName: styles.planBadge,
    },
    {
      badge: "Pro",
      title: "Métricas, historial y control más profundo",
      price: `ARS ${pricing.pro.ars.toLocaleString("es-AR")}`,
      billingLabel: `por mes · USD ${pricing.pro.usdReference}`,
      description:
        "Ideal para barberías que ya trabajan con más volumen y necesitan medir mejor el negocio.",
      features: [
        "Todo lo del plan Básico",
        "Métricas generales e individuales",
        "Métricas mensuales y anuales",
        "Historial de servicios, turnos y caja",
        "Exportación por mail, PDF y Excel",
      ],
      cta: "Conocer plan pro",
      href: "/planes?plan=pro",
      buttonClassName: `${styles.planButton} ${styles.planButtonGreen}`,
      badgeClassName: `${styles.planBadge} ${styles.planBadgeGreen}`,
    },
    {
      badge: "Personalizable",
      title: "Marca propia y solución hecha a medida",
      price: "A medida",
      billingLabel: "consultar por WhatsApp",
      description:
        "Ideal para barberías o cadenas que buscan identidad propia, dominio propio y una app con nombre propio.",
      features: [
        "Todo lo del plan Pro",
        "Personalización completa de la web",
        "Dominio propio",
        "App con nombre propio en App Store y Play Store",
        "Implementación y presupuesto por fuera del flujo estándar",
      ],
      cta: "Hablar por un plan a medida",
      href: branding.whatsappHref,
      external: true,
      buttonClassName: `${styles.planButton} ${styles.planButtonGhost}`,
      badgeClassName: `${styles.planBadge} ${styles.planBadgeGold}`,
    },
  ];

  // Parallax sutil en el hero
  const heroRef = useRef(null);
  useEffect(() => {
    let mounted = true;
    fetchPlanPricing()
      .then((response) => {
        if (!mounted) return;
        setPricing({
          basic: {
            ars: Number(response.pricing?.basic?.ars || 25000),
            usdReference: Number(response.pricing?.basic?.usdReference || 25),
          },
          pro: {
            ars: Number(response.pricing?.pro?.ars || 35000),
            usdReference: Number(response.pricing?.pro?.usdReference || 35),
          },
        });
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Intersection Observer para animar al hacer scroll
  useEffect(() => {
    const els = document.querySelectorAll("[data-animate]");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(styles.visible);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const features = [
    {
      img: "./calendario.png",
      alt: "calendar",
      title: "Turnos online 24/7",
      desc: "Tus clientes reservan cuando quieren, desde cualquier lugar, sin llamarte.",
    },
    {
      img: "./notificacion.png",
      alt: "notificacion",
      title: "Notificaciones al instante",
      desc: "Recibís una notificación cada vez que alguien reserva. Nada se te escapa.",
    },
    {
      img: "./tijeras.png",
      alt: "tijeras",
      title: "Multi barbero",
      desc: "Gestioná todo tu equipo desde una sola cuenta. Cada uno con su agenda.",
    },
    {
      img: "./email.png",
      alt: "email",
      title: "Confirmación por email",
      desc: "Tus clientes reciben un email con los detalles de su turno automáticamente.",
    },
    {
      img: "./reloj.png",
      alt: "reloj",
      title: "Horarios flexibles",
      desc: "Configurá horario corrido o doble jornada. Se adapta a como trabajás vos.",
    },
    {
      img: "./telefono.png",
      alt: "telefono",
      title: "App nativa",
      desc: hasPlayStore
        ? "Disponible para iOS y Android. Rápida, fluida y pensada para el día a día."
        : "Disponible para iPhone. Rápida, fluida y pensada para el día a día.",
    },
  ];

  const stats = [
    { num: "0 min", label: "de configuración" },
    { num: "24/7", label: "reservas disponibles" },
    { num: "100%", label: "mejor que la competencia" },
  ];

  const steps = [
    {
      n: "01",
      title: "Descargá la app",
      desc: hasPlayStore
        ? "Disponible en App Store y Google Play."
        : "Disponible en App Store.",
    },
    {
      n: "02",
      title: "Configurá tu barbería",
      desc: "Agregá tus barberos, servicios y horarios en minutos.",
    },
    {
      n: "03",
      title: "Compartí tu link",
      desc: "Tus clientes reservan desde su celu sin registrarse.",
    },
  ];

  return (
    <div className={styles.landing} style={branding.themeVars}>
      {/* PARTÍCULAS */}
      <div className={styles.particles} aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className={styles.particle} style={{ "--i": i }} />
        ))}
      </div>

      <div className={styles.bgGrid} aria-hidden="true" />
      <div className={styles.bgGlow1} aria-hidden="true" />
      <div className={styles.bgGlow2} aria-hidden="true" />
      <div className={styles.bgGlow3} aria-hidden="true" />

      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
        <img className={styles.navLogoImg} src={branding.logoSrc} alt={branding.siteName} />
        </div>
        <div className={styles.navActions}>
          <a href={plansUrl} className={styles.navPlansButton}>
            Ver planes
          </a>
          <a href={registerUrl} className={styles.navRegisterButton}>
            Registrate
          </a>
          <a
            href={branding.codexBadgeHref}
            target="_blank"
            rel="noreferrer"
          >
            <span className={styles.navBadge}>{branding.codexBadgeText}</span>
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div ref={heroRef} className={styles.heroInner}>
          <div
            className={`${styles.heroEyebrow} ${styles.animDelay0}`}
            data-animate
          >
            <span className={styles.eyebrowDot} />
            {branding.landing.eyebrow}
          </div>

          <h1
            className={`${styles.heroTitle} ${styles.animDelay1}`}
            data-animate
          >
            {branding.landing.heroTitle}
            <br />
            <span className={styles.heroTitleAccent}>{branding.landing.heroAccent}</span>
          </h1>

          <p
            className={`${styles.heroSubtitle} ${styles.animDelay2}`}
            data-animate
          >
            {branding.landing.heroSubtitle}
          </p>

          <p
            className={`${styles.heroFlowNote} ${styles.animDelay2}`}
            data-animate
          >
            {branding.landing.flowNote}
          </p>

          <div
            className={`${styles.heroCtagroup} ${styles.animDelay3}`}
            data-animate
          >
            <a
              href={registerUrl}
              className={styles.btnPrimary}
            >
              {branding.landing.primaryCta}
              <span className={styles.btnShine} />
            </a>
            <a href={plansUrl} className={styles.btnSecondary}>
              Ver planes
            </a>
            {hasAppStore ? (
              <a
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnSecondary}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                App Store
              </a>
            ) : null}
            {hasPlayStore ? (
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnSecondary}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M3.18 23.76c.3.17.64.24.99.2l12.5-7.22-2.6-2.6-10.89 9.62zm-1.93-20.7A2 2 0 0 0 1 4.08v15.84c0 .45.13.87.35 1.23l.08.08 8.87-8.87v-.21L1.25 3.06zm18.63 8.06-2.55-1.47-2.9 2.9 2.9 2.9 2.56-1.48c.73-.42.73-1.43-.01-1.85zm-17.5 10.6 10.89-9.62-2.6-2.6L1.25 20.7c.3.35.72.57 1.13.72z" />
                </svg>
                Google Play
              </a>
            ) : null}
          </div>

          {/* PHONE */}
          <div
            className={`${styles.phoneMockup} ${styles.animDelay4}`}
            data-animate
          >
            <div className={styles.phoneRing} />
            <div className={styles.phoneRing2} />
            <div className={styles.phoneFrame}>
              <div className={styles.phoneNotch} />
              <div className={styles.phoneScreen}>
                <div className={styles.loginLogo}>{branding.siteName.toUpperCase()}</div>
                <div className={styles.loginSubtitle}>Inicia sesión</div>
                <div className={styles.loginInput}>correo@ejemplo.com</div>
                <div className={styles.loginInput}>••••••••</div>
                <button className={styles.loginButton}>Entrar</button>
                <div className={styles.loginFooter}>
                  ¿No tienes cuenta? <span>Registrate</span>
                </div>
              </div>
            </div>
            <div className={styles.phoneGlow} />
          </div>
        </div>

        {/* SCROLL INDICATOR */}
        <div className={styles.scrollIndicator}>
          <span className={styles.scrollDot} />
          <span className={styles.scrollText}>scroll</span>
        </div>
      </section>

      <section id="planes" className={styles.plansSection}>
        <div
          className={`${styles.featuresLabel} ${styles.revealUp}`}
          data-animate
        >
          Planes
        </div>
        <h2
          className={`${styles.featuresTitle} ${styles.revealUp} ${styles.animDelay1}`}
          data-animate
        >
          {branding.landing.plansTitle}
          <br />
          {branding.landing.plansAccent}
        </h2>

        <div className={styles.plansGrid}>
          {plans.map((plan) => (
            <article
              key={plan.badge}
              className={`${styles.planCard} ${styles.revealUp}`}
              data-animate
            >
              <div className={plan.badgeClassName}>{plan.badge}</div>
              <h3 className={styles.planTitle}>{plan.title}</h3>
              <div className={styles.planPriceRow}>
                <span className={styles.planPrice}>{plan.price}</span>
                <span className={styles.planPriceLabel}>
                  {plan.billingLabel}
                </span>
              </div>
              <p className={styles.planDescription}>{plan.description}</p>
              <ul className={styles.planList}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <a
                href={plan.href}
                target={plan.external ? "_blank" : undefined}
                rel={plan.external ? "noreferrer" : undefined}
                className={plan.buttonClassName}
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className={styles.features}>
        <div
          className={`${styles.featuresLabel} ${styles.revealUp}`}
          data-animate
        >
          ¿Por qué {branding.siteName}?
        </div>
        <h2
          className={`${styles.featuresTitle} ${styles.revealUp} ${styles.animDelay1}`}
          data-animate
        >
          {branding.landing.whyTitle}
          <br />
          {branding.landing.whyAccent}
        </h2>
        <div className={styles.featuresGrid}>
          {features.map((f, i) => (
            <div
              className={`${styles.featureCard} ${styles.revealUp}`}
              data-animate
              key={i}
              style={{ "--delay": `${i * 0.1}s` }}
            >
              <div className={styles.featureIconWrap}>
                <img src={f.img} alt={f.alt} className={styles.featureIcon} />
              </div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
              <div className={styles.featureCardGlow} />
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className={styles.stats}>
        <div className={`${styles.statsInner} ${styles.revealUp}`} data-animate>
          {stats.map((s, i) => (
            <div className={styles.statItem} key={i}>
              <div className={styles.statNum}>{s.num}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.how}>
        <div
          className={`${styles.featuresLabel} ${styles.revealUp}`}
          data-animate
        >
          Cómo funciona
        </div>
        <h2
          className={`${styles.featuresTitle} ${styles.revealUp} ${styles.animDelay1}`}
          data-animate
        >
          {branding.landing.stepsTitle}
        </h2>
        <div className={styles.steps}>
          {steps.map((s, i) => (
            <div
              className={`${styles.step} ${styles.revealLeft}`}
              data-animate
              key={i}
              style={{ "--delay": `${i * 0.15}s` }}
            >
              <div className={styles.stepNumber}>{s.n}</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
              <div className={styles.stepLine} />
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaGlow} />
        <div className={styles.ctaOrb} />
        <h2 className={`${styles.ctaTitle} ${styles.revealUp}`} data-animate>
          {branding.landing.finalTitle}
        </h2>
        <p
          className={`${styles.ctaSubtitle} ${styles.revealUp} ${styles.animDelay1}`}
          data-animate
        >
          {branding.landing.finalSubtitle}
        </p>
        <div
          className={`${styles.heroCtagroup} ${styles.revealUp} ${styles.animDelay2}`}
          data-animate
        >
          <a
            href={registerUrl}
            className={styles.btnPrimary}
          >
            {branding.landing.primaryCta}
            <span className={styles.btnShine} />
          </a>
          {hasAppStore ? (
            <a
              href={appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              App Store
            </a>
          ) : null}
          {hasPlayStore ? (
            <a
              href={playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              Google Play
            </a>
          ) : null}
        </div>
      </section>

      <footer className={styles.footer}>
        <img className={styles.logo} src={branding.logoSrc} alt={branding.siteName} />
        <a
          href={branding.footerHref}
          target="_blank"
          rel="noreferrer"
        >
          {" "}
          <span>
            {branding.footerTextPrefix} <strong>{branding.footerTextStrong}</strong> · {new Date().getFullYear()}
          </span>
        </a>
      </footer>
    </div>
  );
}

export default LandingPage;
