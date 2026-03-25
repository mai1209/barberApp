import { NativeModules, Platform } from "react-native";
import { getToken } from "./authStorage";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean;
};

// 1. CONFIGURACIÓN DE IPs
// Desarrollo local (simuladores/emuladores)
const LAN_IP = "192.168.100.54"; // Ajusta a tu IP local si cambió
const DEV_API_URL = Platform.select({
  ios: `http://${LAN_IP}:3002`,
  android: 'http://10.0.2.2:3002',
  default: 'http://localhost:3002',
});

// Producción (Vercel)
const PROD_API_URL = "https://barber-f8qtylpas-mai1209s-projects.vercel.app";

// 2. EXPORTACIÓN DE LA URL BASE
export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

// 3. FUNCIÓN DE PETICIÓN GENÉRICA
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

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
  } catch (err) {
    // Si falla aquí, es un error de red (IP incorrecta o servidor apagado)
    throw new Error(`Error de red: No se pudo conectar a ${url}`);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error ?? "Error de conexión con el servidor";
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
