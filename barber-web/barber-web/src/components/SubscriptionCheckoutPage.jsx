import { useEffect, useMemo, useState } from 'react';
import {
  createPublicRecurringSubscription,
  createPublicSubscriptionCheckout,
  fetchPlanPricing,
} from '../services/api';
import styles from '../styles/SubscriptionCheckoutPage.module.css';

const APP_STORE_URL = 'https://apps.apple.com';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.barberAppByCodex.hub';

const PLAN_META = {
  basic: {
    label: 'Básico',
    variant: 'basic',
    title: 'Plan Básico',
    description: 'Turnos online, cobro online y automatización base para tu barbería.',
  },
  pro: {
    label: 'Pro',
    variant: 'pro',
    title: 'Plan Pro',
    description: 'Métricas, historial y herramientas avanzadas para el negocio.',
  },
};

function getInitialPlan() {
  const url = new URL(window.location.href);
  const plan = String(url.searchParams.get('plan') || '').trim().toLowerCase();
  return plan === 'pro' ? 'pro' : 'basic';
}

function getInitialEmail() {
  const url = new URL(window.location.href);
  return String(url.searchParams.get('email') || '').trim();
}

function getInitialPaymentMode() {
  const url = new URL(window.location.href);
  return String(url.searchParams.get('mode') || '').trim().toLowerCase() === 'automatic'
    ? 'automatic'
    : 'manual';
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3.18 23.76c.3.17.64.24.99.2l12.5-7.22-2.6-2.6-10.89 9.62zm-1.93-20.7A2 2 0 001 4.08v15.84c0 .45.13.87.35 1.23l.08.08 8.87-8.87v-.21L1.25 3.06zm18.63 8.06l-2.55-1.47-2.9 2.9 2.9 2.9 2.56-1.48c.73-.42.73-1.43-.01-1.85zm-17.5 10.6l10.89-9.62-2.6-2.6L1.25 20.7c.3.35.72.57 1.13.72z" />
    </svg>
  );
}

export default function SubscriptionCheckoutPage() {
  const [selectedPlan, setSelectedPlan] = useState(getInitialPlan);
  const [paymentMode, setPaymentMode] = useState(getInitialPaymentMode);
  const [email, setEmail] = useState(getInitialEmail);
  const [couponCode, setCouponCode] = useState('');
  const [pricing, setPricing] = useState({
    basic: { ars: 25000, usdReference: 25 },
    pro: { ars: 35000, usdReference: 35 },
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
    const url = new URL(window.location.href);
    url.searchParams.set('plan', selectedPlan);
    if (email.trim()) url.searchParams.set('email', email.trim());
    else url.searchParams.delete('email');
    if (paymentMode === 'automatic') url.searchParams.set('mode', paymentMode);
    else url.searchParams.delete('mode');
    window.history.replaceState({}, '', url.toString());
  }, [selectedPlan, email, paymentMode]);

  const planCards = useMemo(
    () => [
      {
        key: 'basic',
        ...PLAN_META.basic,
        price: `ARS ${pricing.basic.ars.toLocaleString('es-AR')}`,
        note: `ref. USD ${pricing.basic.usdReference}`,
      },
      {
        key: 'pro',
        ...PLAN_META.pro,
        price: `ARS ${pricing.pro.ars.toLocaleString('es-AR')}`,
        note: `ref. USD ${pricing.pro.usdReference}`,
      },
    ],
    [pricing],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response =
        paymentMode === 'automatic'
          ? await createPublicRecurringSubscription({
              email,
              plan: selectedPlan,
              couponCode,
            })
          : await createPublicSubscriptionCheckout({
              email,
              plan: selectedPlan,
              couponCode,
            });

      if (response.activatedDirectly) {
        setMessage(
          (response.message ||
            `Se aplicó el cupón ${response.couponApplied || ''} y el plan quedó activo gratis hasta ${new Intl.DateTimeFormat(
              'es-AR',
              {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              },
            ).format(new Date(response.expiresAt))}.`) +
            ' Ahora abrí la app e iniciá sesión con esta misma cuenta para empezar a usarla.',
        );
        return;
      }

      if (paymentMode === 'automatic') {
        setMessage(
          `Vas a autorizar la renovación automática mensual del plan. El valor actual es ARS ${Number(
            response.amount || 0,
          ).toLocaleString('es-AR')}.`,
        );
      } else if (response.discountApplied) {
        setMessage(
          `${response.couponApplied ? `Se aplicó el cupón ${response.couponApplied}. ` : 'A esta cuenta se le aplicó un precio diferencial. '}Vas a pagar ARS ${Number(
            response.amount || 0,
          ).toLocaleString('es-AR')}.`,
        );
      }

      const targetUrl = response.checkoutUrl || response.sandboxCheckoutUrl;
      if (!targetUrl) {
        throw new Error('No pudimos generar el link de pago del plan.');
      }

      window.location.assign(targetUrl);
    } catch (err) {
      setError(err.message || 'No pudimos iniciar el pago del plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.screen}>
      <div className={styles.meshGrid} aria-hidden="true" />
      <div className={styles.orbTop} aria-hidden="true" />
      <div className={styles.orbBottom} aria-hidden="true" />

      <header className={styles.topBar}>
        <a href="/" className={styles.backBtn}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Volver al inicio
        </a>

        <div className={styles.topBarBrand}>
          <div className={styles.topBarMark}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 2L14 5v6L8 14 2 11V5L8 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className={styles.topBarName}>BarberApp</span>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.leftCol}>
          <div className={styles.heroBlock}>
            <p className={styles.eyebrow}>PLANES BARBERAPP</p>
            <h1 className={styles.title}>
              Alta o renovación
              <br />
              <span className={styles.titleAccent}>de plan.</span>
            </h1>
            <p className={styles.subtitle}>
              Completá el email de la cuenta y elegí el plan. Si tu cuenta tiene precio especial o
              descuento, se va a aplicar automáticamente en el checkout.
            </p>
          </div>

          <div className={styles.planGrid}>
            {planCards.map((plan) => (
              <button
                key={plan.key}
                type="button"
                className={`${styles.planCard} ${styles[`planCard_${plan.variant}`]} ${
                  selectedPlan === plan.key ? styles.planCardActive : ''
                }`}
                onClick={() => setSelectedPlan(plan.key)}
              >
                <div className={styles.planCardTop}>
                  <span className={`${styles.planBadge} ${styles[`planBadge_${plan.variant}`]}`}>
                    {plan.label}
                  </span>
                  {selectedPlan === plan.key ? (
                    <span
                      className={`${styles.planSelectedDot} ${styles[`planSelectedDot_${plan.variant}`]}`}
                    />
                  ) : null}
                </div>

                <h2 className={styles.planTitle}>{plan.title}</h2>
                <div className={styles.planPricingRow}>
                  <strong className={`${styles.planPrice} ${styles[`planPrice_${plan.variant}`]}`}>
                    {plan.price}
                  </strong>
                  <span className={styles.planNote}>/ mes · {plan.note}</span>
                </div>
                <p className={styles.planDescription}>{plan.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.rightCol}>
          <div className={styles.formCard}>
            <div className={styles.formCardHeader}>
              <span className={styles.formCardTag}>Checkout</span>
              <span className={styles.formCardCaption}>
                Seleccionaste: {PLAN_META[selectedPlan].title}
              </span>
            </div>

            <div className={styles.modeToggleGroup}>
              <p className={styles.modeGroupLabel}>Modalidad de pago</p>
              <div className={styles.modeToggle}>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${paymentMode === 'manual' ? styles.modeBtnActive : ''}`}
                  onClick={() => setPaymentMode('manual')}
                >
                  <span className={styles.modeBtnDot} />
                  Pago mensual manual
                  <span className={styles.modeBtnReco}>recomendado</span>
                </button>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${styles.modeBtnAuto} ${
                    paymentMode === 'automatic' ? styles.modeBtnAutoActive : ''
                  }`}
                  onClick={() => setPaymentMode('automatic')}
                >
                  <span className={styles.modeBtnDot} />
                  Renovación automática
                </button>
              </div>
              <p className={styles.modeHelper}>
                {paymentMode === 'automatic'
                  ? 'Autorizás una vez el cobro mensual y después Mercado Pago intenta renovar solo cada mes.'
                  : 'Pagás cada mes manualmente desde la web cuando toque renovar.'}
              </p>
            </div>

            {paymentMode === 'automatic' ? (
              <div className={styles.warningBanner}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 1.5L14.5 13H1.5L8 1.5z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 6v3.5M8 11v.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span>
                  Importante: para renovación automática, Mercado Pago puede rechazar tarjetas
                  prepagas. Si falla, probá con una tarjeta de crédito o débito tradicional.
                </span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Email de la cuenta</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tu@barberia.com"
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Cupón de descuento</span>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  placeholder="Opcional"
                />
              </label>

              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? (
                  <>
                    <span className={styles.spinner} />
                    {paymentMode === 'automatic' ? 'Generando autorización...' : 'Generando pago...'}
                  </>
                ) : (
                  <>
                    {paymentMode === 'automatic'
                      ? 'Activar renovación automática'
                      : 'Completar pago'}
                    <ArrowIcon />
                  </>
                )}
              </button>

              {paymentMode === 'automatic' ? (
                <p className={styles.submitWarning}>
                  Si tu tarjeta es prepaga, usá pago mensual manual para evitar rechazos en Mercado
                  Pago.
                </p>
              ) : null}
            </form>

            {message ? <div className={styles.messageBox}>{message}</div> : null}
            {error ? <div className={styles.errorBox}>{error}</div> : null}

            <div className={styles.cardDivider}>
              <span>Consultas</span>
            </div>

            <div className={styles.whatsappRow}>
              <p className={styles.whatsappHelper}>
                Si tenés dudas con el plan o querés un presupuesto especial, podés escribir por
                WhatsApp.
              </p>
              <a
                href="https://wa.me/543425543308?text=Hola%20quiero%20consultar%20por%20mi%20plan%20de%20BarberApp"
                className={styles.whatsappBtn}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsAppIcon />
                Hablar por WhatsApp
              </a>
            </div>

            <div className={styles.downloadCard}>
              <div className={styles.downloadCardIcon}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M10 2a8 8 0 100 16A8 8 0 0010 2z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M10 6v4l3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.downloadCardBody}>
                <p className={styles.downloadTitle}>Después del alta, descargá la app</p>
                <p className={styles.downloadText}>
                  Cuando completes la activación, entrá a la app con esta misma cuenta para empezar
                  a usar tu barbería desde el celular.
                </p>
                <div className={styles.storeButtons}>
                  <a href={APP_STORE_URL} target="_blank" rel="noreferrer" className={styles.storeBtn}>
                    <AppleIcon />
                    App Store
                  </a>
                  <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer" className={styles.storeBtn}>
                    <PlayIcon />
                    Google Play
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
