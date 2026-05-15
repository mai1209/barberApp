import { useEffect, useState } from 'react';
import BookingForm from './BookingForm';
import styles from '../styles/App.module.css';
import { setShopSlug as registerShopSlug } from '../services/api';
import LandingPage from './LandingPage';
import SubscriptionAdmin from './SubscriptionAdmin';
import SubscriptionCouponsPage from './SubscriptionCouponsPage';
import SubscriptionCheckoutPage from './SubscriptionCheckoutPage';
import NotFoundPage from './NotFoundPage';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import AccountDeletionPage from './AccountDeletionPage';
import RegisterAccountPage from './RegisterAccountPage';
import SupportPage from './SupportPage';
import { resolveDomainBranding } from '../config/domainBranding';
import RichBarbershopLanding from './RichBarbershopLanding';
//import landingStyles from '../styles/LandingPage.module.css';



function sanitizeSlug(value) {
  return (
    String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '') || null
  );
}

function sanitizePath(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');
}

function resolveInitialSlug(branding, internalPage) {
  const fromEnv = sanitizeSlug(process.env.REACT_APP_SHOP_SLUG);
  if (fromEnv) return fromEnv;

  const url = new URL(window.location.href);
  const querySlug =
    sanitizeSlug(url.searchParams.get('shop')) ||
    sanitizeSlug(url.searchParams.get('barberia'));
  if (querySlug) return querySlug;

  const bookingPath = sanitizePath(branding?.bookingPath);
  if (internalPage === 'booking' && branding?.shopSlug) {
    return sanitizeSlug(branding.shopSlug);
  }

  const [firstSegment] = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (sanitizePath(firstSegment) === bookingPath) {
    return sanitizeSlug(branding?.shopSlug);
  }
  return sanitizeSlug(firstSegment);
}

function resolveInternalPage(branding) {
  const url = new URL(window.location.href);
  const pathname = url.pathname.replace(/^\/+|\/+$/g, '');
  const segments = pathname ? pathname.split('/') : [];
  const bookingPath = sanitizePath(branding?.bookingPath);
  const brandOverride = url.searchParams.get('brand');

  if ((branding?.isCustomDomain || brandOverride) && pathname === bookingPath) {
    return 'booking';
  }

  if (pathname === 'admin' || pathname === 'admin/subscriptions') {
    return 'subscription-admin';
  }

  if (pathname === 'admin/subscription-coupons') {
    return 'subscription-coupons';
  }

  if (pathname === 'planes' || pathname === 'suscripcion') {
    return 'subscription-checkout';
  }

  if (
    pathname === 'registro' ||
    pathname === 'crear-cuenta' ||
    pathname === 'signup'
  ) {
    return 'register-account';
  }

  if (pathname === 'politica-de-privacidad' || pathname === 'privacy-policy') {
    return 'privacy-policy';
  }

  if (
    pathname === 'soporte' ||
    pathname === 'contacto' ||
    pathname === 'support'
  ) {
    return 'support';
  }

  if (
    pathname === 'eliminacion-de-cuenta' ||
    pathname === 'eliminar-cuenta' ||
    pathname === 'account-deletion'
  ) {
    return 'account-deletion';
  }

  if (
    segments[0] === bookingPath ||
    segments[0] === 'admin' ||
    segments[0] === 'planes' ||
    segments[0] === 'suscripcion' ||
    segments[0] === 'registro' ||
    segments[0] === 'crear-cuenta' ||
    segments[0] === 'signup' ||
    segments[0] === 'soporte' ||
    segments[0] === 'contacto' ||
    segments[0] === 'support' ||
    segments[0] === 'politica-de-privacidad' ||
    segments[0] === 'privacy-policy' ||
    segments[0] === 'eliminacion-de-cuenta' ||
    segments[0] === 'eliminar-cuenta' ||
    segments[0] === 'account-deletion'
  ) {
    return 'not-found';
  }

  if (segments.length > 1) {
    return 'not-found';
  }

  return null;
}

function renderLandingByBranding(branding) {
  if (branding.customLanding === 'rich-barbershop') {
    return <RichBarbershopLanding branding={branding} />;
  }

  return <LandingPage branding={branding} />;
}


function App() {
  const [branding] = useState(() => {
    const url = new URL(window.location.href);
    return resolveDomainBranding(
      window.location.hostname,
      url.searchParams.get('brand'),
    );
  });
  const [internalPage] = useState(() => resolveInternalPage(branding));
  const [shopSlug] = useState(() => resolveInitialSlug(branding, internalPage));
  const [missingShop, setMissingShop] = useState(false);

  useEffect(() => {
    const pageTitle = branding?.siteName || 'BarberAppByCodex';
    document.title = pageTitle;

    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon && branding?.logoSrc) {
      favicon.setAttribute('href', branding.logoSrc);
    }

    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleTouchIcon && branding?.logoSrc) {
      appleTouchIcon.setAttribute('href', branding.logoSrc);
    }
  }, [branding]);

  if (internalPage === 'subscription-admin') {
    return <SubscriptionAdmin />;
  }

  if (internalPage === 'subscription-coupons') {
    return <SubscriptionCouponsPage />;
  }

  if (internalPage === 'subscription-checkout') {
    return <SubscriptionCheckoutPage branding={branding} />;
  }

  if (internalPage === 'register-account') {
    return <RegisterAccountPage branding={branding} />;
  }

  if (internalPage === 'privacy-policy') {
    return <PrivacyPolicyPage />;
  }

  if (internalPage === 'support') {
    return <SupportPage />;
  }

  if (internalPage === 'account-deletion') {
    return <AccountDeletionPage />;
  }

  if (internalPage === 'not-found' || missingShop) {
    return <NotFoundPage />;
  }

  if (shopSlug) registerShopSlug(shopSlug);

  if (!shopSlug) {
    return renderLandingByBranding(branding);  // ← sin el main wrapper
  }

  return (
    <main className={styles.app}>
      <div className={styles.glow} aria-hidden="true" />
      <BookingForm
        shopSlug={shopSlug}
        branding={branding}
        onNotFound={() => setMissingShop(true)}
      />
    </main>
  );
}

export default App;
