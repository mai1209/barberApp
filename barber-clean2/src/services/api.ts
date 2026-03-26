import { NativeModules, Platform } from "react-native";
import { getToken } from "./authStorage";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean;
};

// 1. CONFIGURACIÓN DE IPs
// Usa tu IP LAN para dispositivos físicos. 10.0.2.2 solo funciona en emulador Android.
const LAN_IP = "192.168.100.46"; // ajusta si tu IP cambió
const ANDROID_EMULATOR_HOST = "10.0.2.2";

const isAndroid = Platform.OS === "android";
const isAndroidEmulator = Boolean(
  // Expo/React Native no da un flag oficial sin librerías externas; usamos esta heurística
  NativeModules?.PlatformConstants?.isTesting === true
);

const DEV_CANDIDATES = isAndroid
  ? [
      `http://${ANDROID_EMULATOR_HOST}:3002`, // emulador
      `http://${LAN_IP}:3002`, // dispositivo físico en la misma LAN
    ]
  : [`http://${LAN_IP}:3002`];

// Producción (Vercel)
const PROD_API_URL = "https://barber-app-zeta-one.vercel.app";

// Cacheamos el host que funcione en dev para no probar en cada request
let resolvedDevBaseUrl: string | null = null;

async function resolveDevBaseUrl(): Promise<string> {
  if (resolvedDevBaseUrl) return resolvedDevBaseUrl;

  // si ya sabemos que es emulador, probamos primero el host de emulador
  const candidates = isAndroidEmulator ? DEV_CANDIDATES : [...DEV_CANDIDATES].reverse();

  for (const base of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const resp = await fetch(`${base}/`, { signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        resolvedDevBaseUrl = base;
        return base;
      }
    } catch (_e) {
      // ignoramos y probamos siguiente
    }
  }

  // fallback: primer candidato
  resolvedDevBaseUrl = DEV_CANDIDATES[0];
  return resolvedDevBaseUrl;
}


// 3. FUNCIÓN DE PETICIÓN GENÉRICA
async function getBaseUrl() {
  if (!__DEV__) return PROD_API_URL;
  return await resolveDevBaseUrl();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = await getBaseUrl();
  // Limpiamos espacios por si acaso y armamos la URL
  const url = `${baseUrl.trim()}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (options.auth) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (err: any) {
    // 🔥 ESTO ES LO QUE NECESITAMOS VER EN EL EMULADOR:
    throw new Error(`RED FALLÓ: ${url} | Motivo: ${err.message}`);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    // Si el servidor responde pero con error (ej: 403 CORS o 500)
    const message = payload?.error ?? `Error servidor: ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}
// --- SERVICIOS DE LA API ---

// 🔐 AUTH
export function registerUser(payload: { email: string; fullName: string; password: string; }) {
  return request("/api/auth/register", { method: "POST", body: payload });
}

export function loginUser(payload: { email: string; password: string; }) {
  return request<{ token: string; user: any }>("/api/auth/login", { method: "POST", body: payload });
}

export function savePushTokenApi(token: string) {
  return request("/api/auth/save-push-token", { method: "POST", body: { token }, auth: true });
}

// 👥 BARBEROS & TURNOS
// Actualiza el tipo Barber para incluir workDays
export type Barber = { 
  _id: string; 
  fullName: string; 
  email?: string; 
  phone?: string; 
  scheduleRange?: string; 
    scheduleRanges?: { label: string; start: string; end: string }[]; // ← AGREGAR

  workDays?: number[]; // <--- Agregar esto
};export type ServiceOption = { _id: string; name: string; durationMinutes: number; price?: number; };
export type Appointment = {
  _id: string;
  barber: { _id: string; fullName: string } | string;
  customerName: string;
  service: string;
  startTime: string;
  durationMinutes: number;
  status: string;
    notes?: string; // ← AGREGAR ESTO
    email: string; // <-- Asegurate de que esta línea esté presente

};

export function fetchBarbers() {
  return request<{ barbers: Barber[] }>("/api/barbers", { auth: true });
}

export function fetchServices() {
  return request<{ services: ServiceOption[] }>("/api/appointments/services", { auth: true });
}

// Actualiza la función de creación
export function createBarber(payload: { 
  fullName: string; 
  email?: string; 
  phone?: string; 
   scheduleRange?: string;
  scheduleRanges?: { label: string; start: string; end: string }[];
  workDays: number[];
}) {
  return request<{ barber: Barber }>("/api/barbers", { 
    method: "POST", 
    body: payload, 
    auth: true 
  });
}

export function fetchAppointments(params?: { date?: string }) {
  const query = params?.date ? `?date=${encodeURIComponent(params.date)}` : "";
  return request<{ appointments: Appointment[] }>(`/api/appointments${query}`, { auth: true });
}

export function fetchBarberAppointments(barberId: string, date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return request<{ barber: Barber; appointments: Appointment[] }>(`/api/barbers/${barberId}/appointments${query}`, { auth: true });
}

export function createAppointment(payload: { barberId: string; customerName: string; service: string; startTime: string; durationMinutes?: number; notes?: string; email: string;  }) {
  return request<{ appointment: Appointment }>("/api/appointments", { method: "POST", body: payload, auth: true });
}

export function updateAppointmentStatus(appointmentId: string, status: "pending" | "completed" | "cancelled") {
  return request<{ appointment: Appointment }>(`/api/appointments/${appointmentId}`, { method: "PATCH", body: { status }, auth: true });
}

export function deleteAppointment(appointmentId: string) {
  return request<{ success: boolean }>(
    `/api/appointments/${appointmentId}`,
    { method: "DELETE", auth: true }
  );
}
