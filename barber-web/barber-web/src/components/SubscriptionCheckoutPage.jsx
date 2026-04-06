import { useEffect, useMemo, useState } from 'react';
import {
  createPublicRecurringSubscription,
  createPublicSubscriptionCheckout,
  fetchPlanPricing,
} from '../services/api';
import styles from '../styles/SubscriptionCheckoutPage.module.css';

const PLAN_META = {
  basic: {
    label: 'Básico',
    accent: styles.pink,
    title: 'Plan Básico',
    description: 'Turnos online, cobro online y automatización base para tu barbería.',
  },
  pro: {
    label: 'Pro',
    accent: styles.green,
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
    url.searchParams.set('mode', paymentMode);
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
      <section className={styles.hero}>
        <p className={styles.eyebrow}>PLANES BARBERAPP</p>
        <h1 className={styles.title}>Alta o renovación de plan</h1>
        <p className={styles.subtitle}>
          Completá el email de la cuenta y elegí el plan. Si tu cuenta tiene precio especial o
          descuento, se va a aplicar automáticamente en el checkout.
        </p>
      </section>

      <section className={styles.cards}>
        {planCards.map((plan) => (
          <button
            key={plan.key}
            type="button"
            className={`${styles.planCard} ${plan.accent} ${
              selectedPlan === plan.key ? styles.planCardActive : ''
            }`}
            onClick={() => setSelectedPlan(plan.key)}
          >
            <span className={styles.planBadge}>{plan.label}</span>
            <h2 className={styles.planTitle}>{plan.title}</h2>
            <strong className={styles.planPrice}>{plan.price}</strong>
            <span className={styles.planNote}>{plan.note}</span>
            <p className={styles.planDescription}>{plan.description}</p>
          </button>
        ))}
      </section>

      <section className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.modeSwitch}>
            <button
              type="button"
              className={`${styles.modeButton} ${paymentMode === 'manual' ? styles.modeButtonActive : ''}`}
              onClick={() => setPaymentMode('manual')}
            >
              Pago mensual manual
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${paymentMode === 'automatic' ? styles.modeButtonActive : ''}`}
              onClick={() => setPaymentMode('automatic')}
            >
              Renovación automática
            </button>
          </div>

          <p className={styles.modeHelper}>
            {paymentMode === 'automatic'
              ? 'Autorizás una vez el cobro mensual y después Mercado Pago intenta renovar solo cada mes.'
              : 'Pagás cada mes manualmente desde la web cuando toque renovar.'}
          </p>

          <label className={styles.field}>
            <span>Email de la cuenta</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@barberia.com"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Cupón de descuento</span>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Opcional"
            />
          </label>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading
              ? paymentMode === 'automatic'
                ? 'Generando autorización...'
                : 'Generando pago...'
              : paymentMode === 'automatic'
                ? 'Activar renovación automática'
                : 'Completar pago'}
          </button>
        </form>

        {message ? <div className={styles.messageBox}>{message}</div> : null}
        {error ? <div className={styles.errorBox}>{error}</div> : null}

        <p className={styles.helper}>
          Si tenés dudas con el plan o querés un presupuesto especial, podés escribir por WhatsApp.
        </p>
        <a
          href="https://wa.me/543425543308?text=Hola%20quiero%20consultar%20por%20mi%20plan%20de%20BarberApp"
          className={styles.whatsappLink}
          target="_blank"
          rel="noreferrer"
        >
          Hablar por WhatsApp
        </a>
      </section>
    </main>
  );
}
