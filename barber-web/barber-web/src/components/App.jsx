import {  useState } from 'react';
import BookingForm from './BookingForm';
import styles from '../styles/App.module.css';
import { setShopSlug as registerShopSlug } from '../services/api';
import LandingPage from './LandingPage';
import SubscriptionAdmin from './SubscriptionAdmin';
import SubscriptionCheckoutPage from './SubscriptionCheckoutPage';
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

function resolveInitialSlug() {
  const fromEnv = sanitizeSlug(process.env.REACT_APP_SHOP_SLUG);
  if (fromEnv) return fromEnv;

  const url = new URL(window.location.href);
  const querySlug =
    sanitizeSlug(url.searchParams.get('shop')) ||
    sanitizeSlug(url.searchParams.get('barberia'));
  if (querySlug) return querySlug;

  const [firstSegment] = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  return sanitizeSlug(firstSegment);
}

function resolveInternalPage() {
  const url = new URL(window.location.href);
  const pathname = url.pathname.replace(/^\/+|\/+$/g, '');

  if (pathname === 'admin' || pathname === 'admin/subscriptions') {
    return 'subscription-admin';
  }

  if (pathname === 'planes' || pathname === 'suscripcion') {
    return 'subscription-checkout';
  }

  return null;
}


function App() {
  const [internalPage] = useState(() => resolveInternalPage());
  const [shopSlug] = useState(() => resolveInitialSlug());

  if (internalPage === 'subscription-admin') {
    return <SubscriptionAdmin />;
  }

  if (internalPage === 'subscription-checkout') {
    return <SubscriptionCheckoutPage />;
  }

  if (shopSlug) registerShopSlug(shopSlug);

  if (!shopSlug) {
    return <LandingPage />;  // ← sin el main wrapper
  }

  return (
    <main className={styles.app}>
      <div className={styles.glow} aria-hidden="true" />
      <BookingForm shopSlug={shopSlug} />
    </main>
  );
}

export default App;
