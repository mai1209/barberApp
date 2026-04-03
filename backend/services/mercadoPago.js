const DEFAULT_AUTH_URL = "https://auth.mercadopago.com.ar/authorization";
const DEFAULT_API_BASE_URL = "https://api.mercadopago.com";

function getRequiredEnv(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) {
    const error = new Error(`Falta ${name} en variables de entorno.`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

export function getMercadoPagoConfig() {
  return {
    clientId: getRequiredEnv("MERCADO_PAGO_CLIENT_ID"),
    clientSecret: getRequiredEnv("MERCADO_PAGO_CLIENT_SECRET"),
    redirectUri: getRequiredEnv("MERCADO_PAGO_REDIRECT_URI"),
    publicBookingBaseUrl: getRequiredEnv("PUBLIC_BOOKING_BASE_URL"),
    backendBaseUrl: getRequiredEnv("BACKEND_PUBLIC_BASE_URL"),
    authUrl: String(process.env.MERCADO_PAGO_OAUTH_AUTHORIZE_URL || DEFAULT_AUTH_URL).trim(),
    apiBaseUrl: String(process.env.MERCADO_PAGO_API_BASE_URL || DEFAULT_API_BASE_URL).trim(),
    webhookSecret: String(process.env.MERCADO_PAGO_WEBHOOK_SECRET || "").trim() || null,
  };
}

async function mercadoPagoFetch(path, options = {}) {
  const { apiBaseUrl } = getMercadoPagoConfig();
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      payload?.cause?.[0]?.description ||
      `Mercado Pago respondió ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.details = payload;
    throw error;
  }

  return payload;
}

export function buildMercadoPagoOAuthUrl({ state }) {
  const { authUrl, clientId, redirectUri } = getMercadoPagoConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    platform_id: "mp",
    redirect_uri: redirectUri,
    state,
  });
  return `${authUrl}?${params.toString()}`;
}

export async function exchangeMercadoPagoCode({ code }) {
  const { clientId, clientSecret, redirectUri } = getMercadoPagoConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  return mercadoPagoFetch("/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
}

export async function refreshMercadoPagoAccessToken({ refreshToken }) {
  const { clientId, clientSecret } = getMercadoPagoConfig();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  return mercadoPagoFetch("/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
}

export async function createMercadoPagoPreference({ accessToken, payload }) {
  return mercadoPagoFetch("/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getMercadoPagoPayment({ accessToken, paymentId }) {
  return mercadoPagoFetch(`/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
}

export function buildMercadoPagoBookingReturnUrls(shopSlug) {
  const { publicBookingBaseUrl } = getMercadoPagoConfig();
  const base = publicBookingBaseUrl.replace(/\/+$/, "");
  const shopPath = `${base}/${encodeURIComponent(shopSlug)}`;
  return {
    success: `${shopPath}?payment_result=success`,
    pending: `${shopPath}?payment_result=pending`,
    failure: `${shopPath}?payment_result=failure`,
  };
}

export function buildMercadoPagoWebhookUrl() {
  const { backendBaseUrl } = getMercadoPagoConfig();
  return `${backendBaseUrl.replace(/\/+$/, "")}/api/payments/mercadopago/webhook`;
}

