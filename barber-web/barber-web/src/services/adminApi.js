const rawBaseUrl = process.env.REACT_APP_API_BASE_URL;

function resolveAdminBaseUrl() {
  const fallback = '/api/auth';
  const trimmed = (rawBaseUrl || fallback).replace(/\/+$/, '');

  if (trimmed.endsWith('/api/public')) return trimmed.replace(/\/public$/, '');
  if (trimmed.endsWith('/api')) return `${trimmed}/auth`;
  if (trimmed.endsWith('/auth')) return trimmed;
  return `${trimmed}/api/auth`;
}

const ADMIN_BASE_URL = resolveAdminBaseUrl();

function buildHeaders(secret, extra = {}) {
  return {
    'Content-Type': 'application/json',
    'x-admin-secret': secret,
    ...extra,
  };
}

async function request(path, { method = 'GET', body, secret } = {}) {
  const response = await fetch(`${ADMIN_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(secret),
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      `La solicitud falló con código ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export function fetchSubscriptions({ secret, search = '' }) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return request(`/admin/subscriptions${query}`, { secret });
}

export function updateSubscription({ userId, secret, payload }) {
  return request(`/admin/subscriptions/${userId}`, {
    method: 'PATCH',
    secret,
    body: payload,
  });
}

export function fetchPlanPricing({ secret }) {
  return request('/admin/plan-pricing', { secret });
}

export function updatePlanPricing({ secret, payload }) {
  return request('/admin/plan-pricing', {
    method: 'PUT',
    secret,
    body: payload,
  });
}
