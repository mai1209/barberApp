import { BarberModel } from "../models/Barber.js";
import { AppointmentModel } from "../models/Appointment.js";
import { UserModel } from "../models/User.js";
import { getTimeZoneDayRange, getTimeZoneWeekday } from "../utils/timezone.js";
import {
  deriveScheduleRange,
  normalizeDayScheduleOverrides,
  normalizeScheduleRanges,
  resolveBarberScheduleForWeekday,
  sanitizeScheduleRange,
} from "../utils/barberSchedule.js";
import {
  normalizeBarberClosedDays,
  resolveBarberClosureForDate,
  serializeBarberClosure,
} from "../utils/barberClosures.js";
import {
  resolveShopClosureForDate,
  serializeShopClosure,
} from "../utils/shopClosures.js";

function normalizeShift(value) {
  if (value == null) return undefined;
  const allowed = ["morning", "afternoon", "evening", "full"];
  const normalized = String(value ?? "").toLowerCase();
  return allowed.includes(normalized) ? normalized : undefined;
}

function serializeBarber(doc) {
  if (!doc) return null;
  return {
    ...doc,
    scheduleRange: doc.scheduleRange || null,
    scheduleRanges: normalizeScheduleRanges(doc.scheduleRanges),
    dayScheduleOverrides: normalizeDayScheduleOverrides(doc.dayScheduleOverrides),
    barberClosedDays: normalizeBarberClosedDays(doc.barberClosedDays),
    workDays: Array.from(new Set(doc.workDays || []))
      .map(Number)
      .sort(),
  };
}

export async function listBarbers(req, res, next) {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json({ error: "Auth requerida" });

    const barbersDocs = await BarberModel.find({
      owner: ownerId,
      isActive: true,
    }).lean();

    console.log("Documentos encontrados en DB:", barbersDocs.length);

    // 2. MAPEADO FORZADO:
    const barbers = barbersDocs.map(serializeBarber);

    return res.json({ barbers });
  } catch (err) {
    console.error("ERROR EN LISTBARBERS:", err);
    return next(err);
  }
}

export async function createBarber(req, res, next) {
  try {
    const ownerId = req.user.id;
    const fullName = String(req.body?.fullName ?? "").trim();
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const phone = String(req.body?.phone ?? "").trim();
    const photoUrl = String(req.body?.photoUrl ?? "").trim();
    const shift = normalizeShift(req.body?.shift);

    // 1. CAPTURAMOS LOS DÍAS DESDE EL BODY
    const rawWorkDays = req.body?.workDays || [];

    // 2. LIMPIEZA DE SEGURIDAD (Evita duplicados y asegura números)
    const cleanWorkDays = Array.from(new Set(rawWorkDays.map(Number))).sort(
      (a, b) => a - b,
    );

    const scheduleRange = sanitizeScheduleRange(req.body?.scheduleRange) || undefined;
    const scheduleRanges = normalizeScheduleRanges(req.body?.scheduleRanges);
    const dayScheduleOverrides = normalizeDayScheduleOverrides(
      req.body?.dayScheduleOverrides,
    );
    const barberClosedDays = normalizeBarberClosedDays(req.body?.barberClosedDays);


    if (!fullName) {
      return res
        .status(400)
        .json({ error: "El nombre del barbero es obligatorio" });
    }

    // 3. PASAMOS workDays AL MODELO
    const barber = await BarberModel.create({
      owner: ownerId,
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      photoUrl: photoUrl || undefined,
      shift,
      scheduleRange: scheduleRange,
      scheduleRanges,
      dayScheduleOverrides,
      barberClosedDays,
      workDays: cleanWorkDays,
      isActive: true,
    });

    return res.status(201).json({ barber: serializeBarber(barber.toJSON()) });
  } catch (err) {
    console.error("Error al crear barbero:", err);
    return next(err);
  }
}

export async function updateBarber(req, res, next) {
  try {
    const ownerId = req.user?.id;
    const { barberId } = req.params;

    if (!ownerId) return res.status(401).json({ error: "Auth requerida" });

    const fullName = String(req.body?.fullName ?? "").trim();
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const phone = String(req.body?.phone ?? "").trim();
    const photoUrl = String(req.body?.photoUrl ?? "").trim();
    const shift = normalizeShift(req.body?.shift);
    const rawWorkDays = Array.isArray(req.body?.workDays) ? req.body.workDays : [];
    const cleanWorkDays = Array.from(new Set(rawWorkDays.map(Number))).sort(
      (a, b) => a - b,
    );
    const scheduleRange = sanitizeScheduleRange(req.body?.scheduleRange) || undefined;
    const scheduleRanges = normalizeScheduleRanges(req.body?.scheduleRanges);
    const dayScheduleOverrides = normalizeDayScheduleOverrides(
      req.body?.dayScheduleOverrides,
    );
    const barberClosedDays = normalizeBarberClosedDays(req.body?.barberClosedDays);

    if (!fullName) {
      return res
        .status(400)
        .json({ error: "El nombre del barbero es obligatorio" });
    }

    if (cleanWorkDays.length === 0) {
      return res
        .status(400)
        .json({ error: "Selecciona al menos un día de trabajo." });
    }

    const barber = await BarberModel.findOneAndUpdate(
      {
        _id: barberId,
        owner: ownerId,
        isActive: true,
      },
      {
        fullName,
        email: email || undefined,
        phone: phone || undefined,
        photoUrl: photoUrl || undefined,
        shift,
        scheduleRange: scheduleRange ?? null,
        scheduleRanges,
        dayScheduleOverrides,
        barberClosedDays,
        workDays: cleanWorkDays,
      },
      {
        new: true,
      },
    ).lean();

    if (!barber) {
      return res.status(404).json({ error: "Barbero no encontrado" });
    }

    return res.json({ barber: serializeBarber(barber) });
  } catch (err) {
    console.error("Error al actualizar barbero:", err);
    return next(err);
  }
}

export async function deactivateBarber(req, res, next) {
  try {
    const ownerId = req.user?.id;
    const { barberId } = req.params;

    if (!ownerId) return res.status(401).json({ error: "Auth requerida" });

    const barber = await BarberModel.findOneAndUpdate(
      {
        _id: barberId,
        owner: ownerId,
        isActive: true,
      },
      {
        isActive: false,
      },
      {
        new: true,
      },
    ).lean();

    if (!barber) {
      return res.status(404).json({ error: "Barbero no encontrado" });
    }

    return res.json({ barber: serializeBarber(barber) });
  } catch (err) {
    return next(err);
  }
}

// --- ESTA ES LA FUNCIÓN QUE FALTABA Y QUE USA TU FORMULARIO DE RESERVAS ---
export async function listBarberAppointments(req, res, next) {
  try {
    const { barberId } = req.params;
    const { date } = req.query;
    const effectiveDate =
      typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : undefined;
    const { startOfDay, endOfDay } = buildDayRange(date);
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json({ error: "Auth requerida" });

    // Buscamos al barbero del owner y traemos sus días de trabajo (workDays)
    const barber = await BarberModel.findOne({
      _id: barberId,
      owner: ownerId,
    }).lean();
    if (!barber)
      return res.status(404).json({ error: "Barbero no encontrado" });
    const ownerDoc = await UserModel.findById(ownerId)
      .select({ shopClosedDays: 1 })
      .lean();
    const shopClosure = resolveShopClosureForDate(
      ownerDoc,
      effectiveDate || date || new Date(),
    );
    const barberClosure = resolveBarberClosureForDate(
      barber,
      effectiveDate || date || new Date(),
    );

    // Buscamos los turnos ya ocupados para ese día
    const appointments = await AppointmentModel.find({
      owner: ownerId,
      barber: barberId,
      startTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ["pending", "completed"] },
    }).lean();

    const weekday = getTimeZoneWeekday(
      effectiveDate ? `${effectiveDate}T12:00:00` : new Date(),
    );
    const resolvedSchedule = resolveBarberScheduleForWeekday(
      barber,
      weekday,
      effectiveDate,
    );

    // Enviamos el barbero CON sus workDays limpios
    return res.json({
      barber: serializeBarber(barber),
      resolvedSchedule: shopClosure || barberClosure
        ? { scheduleRange: null, scheduleRanges: [] }
        : resolvedSchedule,
      shopClosure: serializeShopClosure(shopClosure),
      barberClosure: serializeBarberClosure(barberClosure),
      appointments,
    });
  } catch (err) {
    return next(err);
  }
}
function buildDayRange(dateParam) {
  return getTimeZoneDayRange(dateParam);
}
