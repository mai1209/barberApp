import { NativeModules, Platform } from "react-native";
import { getToken } from "./authStorage";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean;
};


const LAN_IP = "192.168.100.48"; 
const ANDROID_EMULATOR_HOST = "10.0.2.2";

const isAndroid = Platform.OS === "android";
const isAndroidEmulator = Boolean(

  NativeModules?.PlatformConstants?.isTesting === true
);

const DEV_CANDIDATES = isAndroid
  ? [
      `http://${ANDROID_EMULATOR_HOST}:3002`, 
      `http://${LAN_IP}:3002`,
    ]
  : [`http://${LAN_IP}:3002`];


const PROD_API_URL = "https://barber-app-zeta-one.vercel.app";


let resolvedDevBaseUrl: string | null = null;

async function resolveDevBaseUrl(): Promise<string> {
  if (resolvedDevBaseUrl) return resolvedDevBaseUrl;

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
    }
  }

  resolvedDevBaseUrl = DEV_CANDIDATES[0];
  return resolvedDevBaseUrl;
}


async function getBaseUrl() {
  if (!__DEV__) return PROD_API_URL;
  return await resolveDevBaseUrl();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = await getBaseUrl();
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
    throw new Error(`RED FALLÓ: ${url} | Motivo: ${err.message}`);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error ?? `Error servidor: ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function registerUser(payload: { email: string; fullName: string; password: string; }) {
  return request("/api/auth/register", { method: "POST", body: payload });
}

export function loginUser(payload: { email: string; password: string; }) {
  return request<{ token: string; user: any }>("/api/auth/login", { method: "POST", body: payload });
}

export function getCurrentUser() {
  return request<{ user: any }>("/api/auth/me", { auth: true });
}

export type ThemeConfig = {
  primary?: string | null;
  secondary?: string | null;
  card?: string | null;
  gradientColors?: string[] | null;
  logoDataUrl?: string | null;
};

export function updateThemeConfig(payload: ThemeConfig) {
  return request<{ message: string; user: any }>("/api/auth/theme", {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export function updatePassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  return request<{ message: string }>("/api/auth/password", {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export function requestPasswordRecovery(payload: { email: string }) {
  return request<{ message: string }>("/api/auth/password/recovery/request", {
    method: "POST",
    body: payload,
  });
}

export function confirmPasswordRecovery(payload: {
  email: string;
  code: string;
  newPassword: string;
}) {
  return request<{ message: string }>("/api/auth/password/recovery/confirm", {
    method: "POST",
    body: payload,
  });
}

export function savePushTokenApi(token: string) {
  return request("/api/auth/save-push-token", { method: "POST", body: { token }, auth: true });
}


export type Barber = { 
  _id: string; 
  fullName: string; 
  email?: string; 
  phone?: string; 
  photoUrl?: string | null;
  scheduleRange?: string; 
  scheduleRanges?: { label: string; start: string; end: string }[];
  workDays?: number[];
};

export type ServiceOption = {
  _id: string;
  name: string;
  durationMinutes: number;
  price?: number;
};

export type PaymentMethod = "cash" | "transfer";

export type Appointment = {
  _id: string;
  barber: { _id: string; fullName: string } | string;
  customerName: string;
  service: string;
  startTime: string;
  durationMinutes: number;
  servicePrice?: number;
  paymentMethod?: PaymentMethod;
  status: string;
  notes?: string;
  email: string;
};

export type AppointmentMetricMonth = {
  key: string;
  label: string;
  appointmentsCount: number;
  totalRevenue: number;
  cashCount: number;
  cashRevenue: number;
  transferCount: number;
  transferRevenue: number;
};

export type AppointmentMetricsResponse = {
  barber: { _id: string; fullName: string } | null;
  period: {
    mode: "monthly" | "annual";
    key: string;
    label: string;
    year: number;
    month: number | null;
    from: string;
    to: string;
  };
  totals: Omit<AppointmentMetricMonth, "key" | "label">;
  monthly: AppointmentMetricMonth[];
};

export type MonthOverviewBarber = {
  barberId: string;
  barberName: string;
  appointmentsCount: number;
  totalRevenue: number;
  cashCount: number;
  cashRevenue: number;
  transferCount: number;
  transferRevenue: number;
};

export type CurrentMonthOverviewResponse = {
  period: {
    mode: "monthly" | "annual";
    key: string;
    label: string;
    year: number;
    month: number | null;
    from: string;
    to: string;
  };
  byBarber: MonthOverviewBarber[];
  totals: Omit<MonthOverviewBarber, "barberId" | "barberName">;
};

export function fetchBarbers() {
  return request<{ barbers: Barber[] }>("/api/barbers", { auth: true });
}

export function fetchServices() {
  return request<{ services: ServiceOption[] }>("/api/appointments/services", { auth: true });
}

export function createBarber(payload: { 
  fullName: string; 
  email?: string; 
  phone?: string; 
  photoUrl?: string;
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

export function updateBarber(
  barberId: string,
  payload: {
    fullName: string;
    email?: string;
    phone?: string;
    photoUrl?: string;
    scheduleRange?: string;
    scheduleRanges?: { label: string; start: string; end: string }[];
    workDays: number[];
  },
) {
  return request<{ barber: Barber }>(`/api/barbers/${barberId}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export function deleteBarber(barberId: string) {
  return request<{ barber: Barber }>(`/api/barbers/${barberId}`, {
    method: "DELETE",
    auth: true,
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

export function createAppointment(payload: {
  barberId: string;
  customerName: string;
  service: string;
  startTime: string;
  durationMinutes?: number;
  servicePrice?: number;
  notes?: string;
  email: string;
  paymentMethod?: PaymentMethod;
}) {
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

export function fetchAppointmentMetrics(params?: {
  barberId?: string;
  year?: number;
  month?: number;
  annual?: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (params?.barberId) searchParams.set("barberId", params.barberId);
  if (params?.year) searchParams.set("year", String(params.year));
  if (params?.month) searchParams.set("month", String(params.month));
  if (params?.annual) searchParams.set("annual", "true");
  const query = searchParams.toString();

  return request<AppointmentMetricsResponse>(
    `/api/appointments/metrics${query ? `?${query}` : ""}`,
    { auth: true }
  );
}

export function fetchCurrentMonthOverview() {
  return request<CurrentMonthOverviewResponse>("/api/appointments/month-overview", { auth: true });
}

export function fetchOwnerMetricsOverview(params?: {
  year?: number;
  month?: number;
  annual?: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (params?.year) searchParams.set("year", String(params.year));
  if (params?.month) searchParams.set("month", String(params.month));
  if (params?.annual) searchParams.set("annual", "true");
  const query = searchParams.toString();

  return request<CurrentMonthOverviewResponse>(
    `/api/appointments/month-overview${query ? `?${query}` : ""}`,
    { auth: true }
  );
}
