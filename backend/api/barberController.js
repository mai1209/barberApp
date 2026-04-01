import { BarberModel } from "../models/Barber.js";
import { AppointmentModel } from "../models/Appointment.js";
import { getTimeZoneDayRange } from "../utils/timezone.js";

const DEFAULT_SCHEDULE_RANGE = "08:00 - 22:00";
const SHIFT_RANGES = {
  morning: "08:00 - 12:00",
  afternoon: "12:00 - 18:00",
  evening: "18:00 - 22:00",
  full: DEFAULT_SCHEDULE_RANGE,
};

function normalizeShift(value) {
  if (value == null) return undefined;
  const allowed = ["morning", "afternoon", "evening", "full"];
  const normalized = String(value ?? "").toLowerCase();
  return allowed.includes(normalized) ? normalized : undefined;
}

function sanitizeScheduleRange(value) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function deriveScheduleRange(barberDoc) {
  return (
    barberDoc?.scheduleRange ||
    SHIFT_RANGES[barberDoc?.shift] ||
    DEFAULT_SCHEDULE_RANGE
  );
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
    const barbers = barbersDocs.map((doc) => ({
      _id: doc._id,
      fullName: doc.fullName,
      email: doc.email || undefined,
      phone: doc.phone || undefined,
      photoUrl: doc.photoUrl || null,
      scheduleRange: doc.scheduleRange || null,
      scheduleRanges: doc.scheduleRanges || [],
      isActive: doc.isActive,
      workDays: (doc.workDays || []).map(Number), // ← ESTO FALTABA
    }));

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
      scheduleRanges: req.body?.scheduleRanges || [],
      workDays: cleanWorkDays, // <--- ESTO FALTABA
      isActive: true,
    });

    return res.status(201).json({ barber: barber.toJSON() });
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
    const scheduleRanges = Array.isArray(req.body?.scheduleRanges)
      ? req.body.scheduleRanges
          .map((item) => ({
            label: String(item?.label ?? "").trim(),
            start: String(item?.start ?? "").trim(),
            end: String(item?.end ?? "").trim(),
          }))
          .filter((item) => item.start && item.end)
      : [];

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
        workDays: cleanWorkDays,
      },
      {
        new: true,
      },
    ).lean();

    if (!barber) {
      return res.status(404).json({ error: "Barbero no encontrado" });
    }

    return res.json({ barber });
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

    return res.json({ barber });
  } catch (err) {
    return next(err);
  }
}

// --- ESTA ES LA FUNCIÓN QUE FALTABA Y QUE USA TU FORMULARIO DE RESERVAS ---
export async function listBarberAppointments(req, res, next) {
  try {
    const { barberId } = req.params;
    const { date } = req.query;
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

    // Buscamos los turnos ya ocupados para ese día
    const appointments = await AppointmentModel.find({
      owner: ownerId,
      barber: barberId,
      startTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: "cancelled" },
    }).lean();

    // Enviamos el barbero CON sus workDays limpios
    return res.json({
      barber: {
        ...barber,
        workDays: Array.from(new Set(barber.workDays || []))
          .map(Number)
          .sort(),
      },
      appointments,
    });
  } catch (err) {
    return next(err);
  }
}
function buildDayRange(dateParam) {
  return getTimeZoneDayRange(dateParam);
}
