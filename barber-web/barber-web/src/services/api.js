const rawBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api/public';
const BASE_URL = rawBaseUrl.replace(/\/$/, '');
let currentShopSlug = null;

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

export function setShopSlug(slug) {
  currentShopSlug = sanitizeSlug(slug);
}

export function getShopSlug() {
  return currentShopSlug;
}

function buildShopPath(path = '') {
  if (!currentShopSlug) {
    throw new Error('No se configuró la barbería actual.');
  }
  const suffix = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `/shops/${currentShopSlug}${suffix}`;
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  };

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  let payload = null;

  try {
    payload = await response.json();
  } catch (err) {
    // Ignore JSON parse errors for empty responses.
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      `La solicitud falló con código ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  return payload;
}

export async function fetchBarbers() {
  return request(buildShopPath('/barbers'));
}

export async function fetchServices() {
  return request(buildShopPath('/services'));
}

// En tu api.js
export async function fetchBarberAppointments(barberId, date) {
  // Verificá que date sea "YYYY-MM-DD"
  const query = date ? `?date=${date}` : '';
  return request(buildShopPath(`/barbers/${barberId}/appointments${query}`));
}

export async function createAppointment(payload) {
  return request(buildShopPath('/appointments'), {
    method: 'POST',
    body: payload,
  });
}

export async function fetchShopInfo() {
  return request(buildShopPath());
}
