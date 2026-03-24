// LandingPage.jsx
import { useEffect, useRef } from "react";
import styles from "../styles/LandingPage.module.css";

function LandingPage() {
  // Parallax sutil en el hero
  const heroRef = useRef(null);
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

  const appointments = [
    {
      time: "09:00",
      name: "Matías G.",
      service: "Corte + Barba",
      color: "#ff1493",
    },
    {
      time: "10:30",
      name: "Rodrigo P.",
      service: "Corte clásico",
      color: "#ff1493",
    },
    { time: "12:00", name: "Lucas M.", service: "Degradé", color: "#2ecc71" },
  ];

  return (
    <div className={styles.landing}>
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
          <span className={styles.navLogoScissors}>✂</span>
          <span className={styles.navLogoText}>BarberAppByCodex</span>
        </div>
        <a  href="https://www.letsbuilditcodex.com/" target="_blank"><span className={styles.navBadge}>by CODEX®</span>
</a>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div ref={heroRef} className={styles.heroInner}>
          <div
            className={`${styles.heroEyebrow} ${styles.animDelay0}`}
            data-animate
          >
            <span className={styles.eyebrowDot} />
            Sistema de turnos inteligente
          </div>

          <h1
            className={`${styles.heroTitle} ${styles.animDelay1}`}
            data-animate
          >
            Tu barbería,
            <br />
            <span className={styles.heroTitleAccent}>sin caos.</span>
          </h1>

          <p
            className={`${styles.heroSubtitle} ${styles.animDelay2}`}
            data-animate
          >
            Reservas online 24/7, notificaciones automáticas y gestión de agenda
            para vos y tu equipo — todo desde el celular.
          </p>

          <div
            className={`${styles.heroCtagroup} ${styles.animDelay3}`}
            data-animate
          >
            <a
              href="https://apps.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnPrimary}
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
              <span className={styles.btnShine} />
            </a>
            <a
              href="https://play.google.com"
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
                <div className={styles.screenHeader}>
                  <span className={styles.screenGreeting}>
                    ¡Hola, Barbería!
                  </span>
                  <div className={styles.screenAvatar}>B</div>
                </div>
                <div className={styles.screenDateCard}>
                  <span className={styles.screenDateLabel}>HOY</span>
                  <span className={styles.screenDateDay}>Lunes</span>
                  <span className={styles.screenDateFull}>23 de marzo</span>
                </div>
                <div className={styles.screenSectionTitle}>Turnos del día</div>
                {appointments.map((t, i) => (
                  <div
                    className={styles.screenCard}
                    key={i}
                    style={{ animationDelay: `${0.8 + i * 0.2}s` }}
                  >
                    <div
                      className={styles.screenCardTime}
                      style={{ color: t.color }}
                    >
                      {t.time}
                    </div>
                    <div className={styles.screenCardInfo}>
                      <div className={styles.screenCardName}>{t.name}</div>
                      <div className={styles.screenCardService}>
                        {t.service}
                      </div>
                    </div>
                    <div
                      className={styles.screenCardDot}
                      style={{ background: t.color }}
                    />
                  </div>
                ))}
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

      {/* FEATURES */}
      <section className={styles.features}>
        <div
          className={`${styles.featuresLabel} ${styles.revealUp}`}
          data-animate
        >
          ¿Por qué BarberApp?
        </div>
        <h2
          className={`${styles.featuresTitle} ${styles.revealUp} ${styles.animDelay1}`}
          data-animate
        >
          Todo lo que necesitás,
          <br />
          nada de lo que no.
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
          En 3 pasos, listo.
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
          ¿Listo para dejar de perder turnos?
        </h2>
        <p
          className={`${styles.ctaSubtitle} ${styles.revealUp} ${styles.animDelay1}`}
          data-animate
        >
          Más de 100 barberías ya usan BarberApp. Unite hoy.
        </p>
        <div
          className={`${styles.heroCtagroup} ${styles.revealUp} ${styles.animDelay2}`}
          data-animate
        >
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnPrimary}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            App Store
            <span className={styles.btnShine} />
          </a>
          <a
            href="https://play.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.18 23.76c.3.17.64.24.99.2l12.5-7.22-2.6-2.6-10.89 9.62zm-1.93-20.7A2 2 0 0 0 1 4.08v15.84c0 .45.13.87.35 1.23l.08.08 8.87-8.87v-.21L1.25 3.06zm18.63 8.06-2.55-1.47-2.9 2.9 2.9 2.9 2.56-1.48c.73-.42.73-1.43-.01-1.85zm-17.5 10.6 10.89-9.62-2.6-2.6L1.25 20.7c.3.35.72.57 1.13.72z" />
            </svg>
            Google Play
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <img className={styles.logo} src="./logo.png" alt="codex" />
        <a href="https://www.letsbuilditcodex.com/" target="_blank" >
          {" "}
          <span>
            BarberApp by <strong>CODEX®</strong> · {new Date().getFullYear()}
          </span>
        </a>
      </footer>
    </div>
  );
}

export default LandingPage;
