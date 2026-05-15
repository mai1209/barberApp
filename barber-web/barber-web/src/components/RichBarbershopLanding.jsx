"use client";

import styles from "../styles/RichBarbershopLanding.module.css";
import { DEFAULT_DOMAIN_BRANDING } from "../config/domainBranding";

export default function RichBarbershopLanding({
  branding = DEFAULT_DOMAIN_BRANDING,
}) {
  const bookingUrl = (() => {
    if (typeof window === "undefined") {
      return branding.bookingPath || "/turnos";
    }

    const target = new URL(
      branding.bookingPath || "/turnos",
      window.location.origin,
    );

    const activeBrand = new URL(window.location.href).searchParams.get("brand");

    if (activeBrand) {
      target.searchParams.set("brand", activeBrand);
    }

    return `${target.pathname}${target.search}`;
  })();

  const instagramHref =
    branding.instagramHref || "https://www.instagram.com/richbarbershop";

  const linktreeHref = branding.linktreeHref || branding.contactHref || "#";
  const contactHref = branding.contactHref || branding.whatsappHref || "#";
  const contactLabel = branding.contactLabel || "Contacto";
  const appStoreUrl = branding.appStoreUrl || "";

  const phoneText = branding.phoneText || "+54 342 555-0000";

  const addressText =
    branding.addressText || "Dirección de la barbería, Santa Fe, Argentina";

  const mapsHref = branding.mapsHref || "#";

  const mapsSrc =
    branding.mapsSrc ||
    "https://www.google.com/maps?q=Santa%20Fe%20Argentina&output=embed";

  return (
    <main className={styles.page} style={branding.themeVars}>
      <div className={styles.orbTop} aria-hidden="true" />
      <div className={styles.orbBottom} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />

      <section className={styles.heroShell}>
        <nav className={styles.nav}>
          <div className={styles.brand}>
            <img
              className={styles.brandLogo}
              src={branding.logoSrc}
              alt={branding.siteName}
            />
          </div>

          <div className={styles.navActions}>
            <a href={bookingUrl} className={styles.navLink}>
              Turnos
            </a>

            <a
              href={contactHref}
              target="_blank"
              rel="noreferrer"
              className={styles.navCta}
            >
              {contactLabel}
            </a>
          </div>
        </nav>

        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />

          <img
            className={`${styles.lamp} ${styles.lampLeft}`}
            src="/lampara.png"
            alt=""
            aria-hidden="true"
          />

          <img
            className={`${styles.lamp} ${styles.lampRight}`}
            src="/lampara2.png"
            alt=""
            aria-hidden="true"
          />

          <div className={styles.copy}>
            <p className={styles.sectionEyebrow}>
              {branding.landing?.eyebrow || branding.siteName}
            </p>

            <h1 className={styles.title}>
              <span className={styles.titleLine}>
                {branding.landing?.heroTitle || branding.siteName}
              </span>

              <span className={styles.titleAccent}>
                {branding.landing?.heroAccent || "Reservá online"}
              </span>
            </h1>

            <p className={styles.subtitle}>{branding.landing?.heroSubtitle}</p>

            <div className={styles.actions}>
              <a href={bookingUrl} className={styles.primaryButton}>
                {branding.landing?.primaryCta || "Reservar turno"}
              </a>

              <a
                href={contactHref}
                target="_blank"
                rel="noreferrer"
                className={styles.secondaryButton}
              >
                Ver contacto
              </a>
            </div>
          </div>
        </section>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.sectionEyebrow}>Experiencia Rich</p>

          <h2 className={styles.sectionTitle}>
            Clásica en esencia, moderna en ejecución.
          </h2>

          <p className={styles.sectionText}>
            Una barbería cálida, premium y elegante, pensada para hombres que
            valoran la presencia, la atención cercana y la fidelización desde la
            primera visita.
          </p>
        </div>

        <div className={styles.visual}>
          <div className={styles.photoTall} data-reveal="left">
            <span>Fades y cortes con precisión</span>
          </div>

          <div className={styles.photoCard} data-reveal="up">
            <span>Perfilados y atención al detalle</span>
          </div>

          <div className={styles.photoWide} data-reveal="right">
            <span>Afeitado premium con toallas calientes y navaja</span>
          </div>
        </div>
      </section>

      <section className={styles.locationSection}>
        <div className={styles.locationCopy} data-reveal="left">
          <p className={styles.sectionEyebrow}>Ubicación</p>

          <h2 className={styles.locationTitle}>San Luis 2557, Rosario.</h2>

          <p className={styles.locationText}>
            Reservá online, escribinos por nuestras redes o encontranos directo
            en el mapa. La experiencia arranca antes del turno.
          </p>

          <div className={styles.infoList}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Dirección</span>
              <a href={mapsHref} target="_blank" rel="noreferrer">
                {addressText}
              </a>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Teléfono</span>
              <strong>{phoneText}</strong>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Instagram</span>
              <a href={instagramHref} target="_blank" rel="noreferrer">
                richbarbershoprosario
              </a>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Linktree</span>
              <a href={linktreeHref} target="_blank" rel="noreferrer">
                Abrir accesos
              </a>
            </div>
          </div>

          <div className={styles.locationActions}>
            <a href={bookingUrl} className={styles.primaryButton}>
              Reservar turno
            </a>

            <a
              href={instagramHref}
              target="_blank"
              rel="noreferrer"
              className={styles.secondaryButton}
            >
              Ver Instagram
            </a>
            {appStoreUrl ? (
              <a
                href={appStoreUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.secondaryButton}
              >
                App Store
              </a>
            ) : null}
          </div>
        </div>

        <div className={styles.mapCard} data-reveal="right">
          <iframe
            title={`Mapa de ${branding.siteName}`}
            src={mapsSrc}
            className={styles.mapFrame}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>

      <footer className={styles.footer} data-reveal>
        <div className={styles.footerBrand}>
          <img
            className={styles.footerLogo}
            src={branding.logoSrc}
            alt={branding.siteName}
          />

          <p className={styles.footerText}>
            {branding.siteName} · {branding.landing?.finalSubtitle}
          </p>
        </div>

        <div className={styles.footerInfo}>
          <p>{addressText}</p>
          <p>{phoneText}</p>
          <p>Corte y afeitado premium</p>
        </div>

        <div className={styles.footerLinks}>
          <a href={bookingUrl}>Reservar turno</a>

          <a href={linktreeHref} target="_blank" rel="noreferrer">
            Linktree
          </a>

          <a href={instagramHref} target="_blank" rel="noreferrer">
            Instagram
          </a>

          {appStoreUrl ? (
            <a href={appStoreUrl} target="_blank" rel="noreferrer">
              App Store
            </a>
          ) : null}
        </div>
      </footer>
    </main>
  );
}
