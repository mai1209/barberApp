// LandingPage.jsx — Windows 2000 Edition
import { useRef } from "react";
import styles from "../styles/LandingPage.module.css";

/* ── Win2K window-chrome helper ── */
function Win2KWindow({ title, children, style, className }) {
  return (
    <div
      className={className}
      style={{
        border: "2px solid",
        borderColor: "#fff #404040 #404040 #fff",
        boxShadow: "2px 2px 0 rgba(0,0,0,0.25)",
        background: "#d4d0c8",
        marginBottom: 16,
        ...style,
      }}
    >
      {/* Title bar */}
      <div
        style={{
          background: "linear-gradient(to right, #000080, #1084d0)",
          padding: "3px 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
        }}
      >
        <span style={{ color: "#fff", fontWeight: "bold", fontSize: 11, fontFamily: "Tahoma,Arial,sans-serif" }}>
          {title}
        </span>
        <span style={{ color: "#fff", fontSize: 10, letterSpacing: 3, fontFamily: "Tahoma,Arial,sans-serif" }}>
          _ □ ✕
        </span>
      </div>
      {/* Content area */}
      <div style={{ padding: "10px 12px" }}>{children}</div>
    </div>
  );
}

function LandingPage() {
  const heroRef = useRef(null);

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
      desc: "Disponible para iOS y Android. Rápida, fluida y pensada para el día a día.",
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
      desc: "Disponible en App Store y Google Play.",
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
    <div className={styles.landing}>
      {/* Hidden legacy decorations */}
      <div className={styles.particles} aria-hidden="true" />
      <div className={styles.bgGrid} aria-hidden="true" />
      <div className={styles.bgGlow1} aria-hidden="true" />
      <div className={styles.bgGlow2} aria-hidden="true" />
      <div className={styles.bgGlow3} aria-hidden="true" />

      {/* ── TASKBAR (nav) ── */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <span className={styles.navLogoScissors}>✂</span>
          <span className={styles.navLogoText}>BarberApp</span>
        </div>
        <a href="https://www.letsbuilditcodex.com/" target="_blank" rel="noopener noreferrer">
          <span className={styles.navBadge}>by CODEX®</span>
        </a>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div ref={heroRef} className={styles.heroInner}>

          {/* Main hero window */}
          <Win2KWindow title="BarberApp — Sistema de Turnos v2.0" style={{ maxWidth: 700, width: "100%" }}>
            {/* Icon + heading row */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 12 }}>
              {/* Big scissors icon */}
              <div style={{
                width: 64, height: 64, flexShrink: 0,
                background: "#d4d0c8",
                border: "2px solid", borderColor: "#fff #404040 #404040 #fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36,
              }}>
                ✂
              </div>
              <div>
                <h1 className={styles.heroTitle} style={{
                  background: "none", border: "none", padding: 0,
                  fontFamily: "Tahoma,Arial,sans-serif",
                  fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: "bold",
                  color: "#000",
                }}>
                  Tu barbería,{" "}
                  <span className={styles.heroTitleAccent}>sin caos.</span>
                </h1>
                <p className={styles.heroSubtitle} style={{ background: "none", border: "none", padding: 0, marginTop: 6 }}>
                  Reservas online 24/7, notificaciones automáticas y gestión de agenda
                  para vos y tu equipo — todo desde el celular.
                </p>
              </div>
            </div>

            {/* Separator */}
            <div style={{ height: 2, background: "#808080", margin: "8px 0 4px", boxShadow: "0 1px 0 #fff" }} />

            {/* Buttons */}
            <div className={styles.heroCtagroup} style={{
              background: "none", border: "none", padding: "8px 0 0",
              justifyContent: "flex-end",
            }}>
              <a
                href="https://apps.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnPrimary}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                App Store
              </a>
              <a
                href="https://play.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnSecondary}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.3.17.64.24.99.2l12.5-7.22-2.6-2.6-10.89 9.62zm-1.93-20.7A2 2 0 0 0 1 4.08v15.84c0 .45.13.87.35 1.23l.08.08 8.87-8.87v-.21L1.25 3.06zm18.63 8.06-2.55-1.47-2.9 2.9 2.9 2.9 2.56-1.48c.73-.42.73-1.43-.01-1.85zm-17.5 10.6 10.89-9.62-2.6-2.6L1.25 20.7c.3.35.72.57 1.13.72z" />
                </svg>
                Google Play
              </a>
              <button className={styles.btnPrimary} style={{ background: "#d4d0c8" }}>
                Más info
              </button>
            </div>
          </Win2KWindow>

          {/* Phone "dialog" */}
          <div className={styles.phoneMockup}>
            <div className={styles.phoneFrame}>
              <div className={styles.phoneNotch} />
              <div className={styles.phoneScreen}>
                <div className={styles.loginLogo}>BARBERAPP</div>
                <div className={styles.loginSubtitle}>Iniciar sesión</div>
                <div style={{ height: 1, background: "#808080", marginBottom: 4, boxShadow: "0 1px 0 #fff" }} />
                <label style={{ fontSize: 10, fontFamily: "Tahoma,Arial,sans-serif" }}>Correo electrónico:</label>
                <div className={styles.loginInput}>correo@ejemplo.com</div>
                <label style={{ fontSize: 10, fontFamily: "Tahoma,Arial,sans-serif" }}>Contraseña:</label>
                <div className={styles.loginInput}>••••••••</div>
                <div style={{ height: 1, background: "#808080", marginTop: 4, boxShadow: "0 1px 0 #fff" }} />
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
                  <button className={styles.loginButton}>Entrar</button>
                  <button className={styles.loginButton} style={{ width: "auto", padding: "3px 8px" }}>
                    Cancelar
                  </button>
                </div>
                <div className={styles.loginFooter}>
                  ¿No tienes cuenta? <span>Registrate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className={styles.features}>
        <Win2KWindow title="BarberApp — Características del Sistema">
          <div className={styles.featuresLabel}>¿Por qué BarberApp?</div>
          <h2 className={styles.featuresTitle}>
            Todo lo que necesitás, nada de lo que no.
          </h2>
          <div className={styles.featuresGrid}>
            {features.map((f, i) => (
              <div className={styles.featureCard} key={i}>
                <div className={styles.featureIconWrap}>
                  <img src={f.img} alt={f.alt} className={styles.featureIcon} />
                </div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </Win2KWindow>
      </section>

      {/* ── STATS ── */}
      <section className={styles.stats}>
        <Win2KWindow title="BarberApp — Estadísticas" style={{ maxWidth: 900, margin: "0 auto 16px" }}>
          <div className={styles.statsInner} style={{ border: "none", boxShadow: "none", borderRadius: 0 }}>
            {stats.map((s, i) => (
              <div className={styles.statItem} key={i}>
                <div className={styles.statNum}>{s.num}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </Win2KWindow>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={styles.how}>
        <Win2KWindow title="BarberApp — Asistente de Configuración (Wizard)">
          <div className={styles.featuresLabel}>Cómo funciona</div>
          <h2 className={styles.featuresTitle}>En 3 pasos, listo.</h2>
          <div className={styles.steps}>
            {steps.map((s, i) => (
              <div className={styles.step} key={i}>
                <div className={styles.stepNumber}>{s.n}</div>
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Win2KWindow>
      </section>

      {/* ── CTA FINAL ── */}
      <section className={styles.ctaSection}>
        <Win2KWindow title="BarberApp — Confirmación" style={{ maxWidth: 600, margin: "0 auto" }}>
          {/* Icon row */}
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, flexShrink: 0, fontSize: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#d4d0c8",
              border: "2px solid", borderColor: "#fff #404040 #404040 #fff",
            }}>
              ✂
            </div>
            <div>
              <h2 className={styles.ctaTitle} style={{ textAlign: "left" }}>
                ¿Listo para dejar de perder turnos?
              </h2>
              <p className={styles.ctaSubtitle} style={{ textAlign: "left" }}>
                Más de 100 barberías ya usan BarberApp. Unite hoy.
              </p>
            </div>
          </div>
          <div style={{ height: 1, background: "#808080", marginBottom: 10, boxShadow: "0 1px 0 #fff" }} />
          <div className={styles.heroCtagroup} style={{
            background: "none", border: "none", padding: "4px 0 0",
            justifyContent: "flex-end", marginBottom: 0,
          }}>
            <a
              href="https://apps.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnPrimary}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              App Store
            </a>
            <a
              href="https://play.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.18 23.76c.3.17.64.24.99.2l12.5-7.22-2.6-2.6-10.89 9.62zm-1.93-20.7A2 2 0 0 0 1 4.08v15.84c0 .45.13.87.35 1.23l.08.08 8.87-8.87v-.21L1.25 3.06zm18.63 8.06-2.55-1.47-2.9 2.9 2.9 2.9 2.56-1.48c.73-.42.73-1.43-.01-1.85zm-17.5 10.6 10.89-9.62-2.6-2.6L1.25 20.7c.3.35.72.57 1.13.72z" />
              </svg>
              Google Play
            </a>
            <button className={styles.btnPrimary} style={{ background: "#d4d0c8" }}>
              Cancelar
            </button>
          </div>
        </Win2KWindow>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <img className={styles.logo} src="./logo.png" alt="codex logo" />
        <a href="https://www.letsbuilditcodex.com/" target="_blank" rel="noopener noreferrer">
          <span>
            BarberApp by <strong>CODEX®</strong> · {new Date().getFullYear()}
          </span>
        </a>
        <span style={{ fontSize: 9, color: "#808080" }}>
          Microsoft Windows 2000 [Version 5.00.2195] — All rights reserved
        </span>
      </footer>
    </div>
  );
}

export default LandingPage;
