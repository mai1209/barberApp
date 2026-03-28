import mongoose from "mongoose";
import { AppointmentModel } from "../models/Appointment.js";
import { ServiceModel } from "../models/Services.js";
import { UserModel } from "../models/User.js";
import admin from "../firebase.js";
import { BarberModel } from "../models/Barber.js";

// ... tus otros imports ...
import nodemailer from "nodemailer";

// CONFIGURACIÓN DE CORREO (Asegurate de usar tus 16 letras)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "barberAppByCodex@gmail.com",
    pass: "hywu gkkm mbej fwou",
  },
});

function buildDayRange(dateParam) {
  if (typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const [year, month, day] = dateParam.split("-").map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { startOfDay, endOfDay };
  }
  const date = dateParam ? new Date(dateParam) : new Date();
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);
  return { startOfDay, endOfDay };
}

function normalizeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

async function findActiveShop(shopSlug) {
  const normalized = normalizeSlug(shopSlug);
  if (!normalized) return null;
  return UserModel.findOne({ shopSlug: normalized, isActive: true }).lean();
}

// ← Convierte siempre a ObjectId para que Mongoose matchee correctamente
function toObjectId(id) {
  return new mongoose.Types.ObjectId(String(id));
}

function sanitizeBarber(barber) {
  if (!barber) return null;
  return {
    _id: barber._id.toString(),
    fullName: barber.fullName,
    shift: barber.shift,
    scheduleRange: barber.scheduleRange || null,
    scheduleRanges: barber.scheduleRanges || [],

    workDays: barber.workDays || [],
  };
}

function sanitizeAppointment(app) {
  return {
    _id: app._id.toString(),
    startTime: app.startTime,
    durationMinutes: app.durationMinutes ?? 30,
    status: app.status,
  };
}

function sanitizeShop(shop) {
  if (!shop) return null;
  return { _id: shop._id.toString(), name: shop.fullName, slug: shop.shopSlug };
}

function sanitizeService(service) {
  if (!service) return null;
  return {
    _id: service._id.toString(),
    name: service.name,
    durationMinutes: service.durationMinutes ?? 30,
    price: service.price ?? 0,
  };
}

export async function publicGetShop(req, res, next) {
  try {
    const shop = await findActiveShop(req.params.shopSlug);
    if (!shop) return res.status(404).json({ error: "Barbería no encontrada" });
    const ownerId = toObjectId(shop._id);
    const totalBarbers = await BarberModel.countDocuments({
      owner: ownerId,
      isActive: true,
    });
    return res.json({
      shop: sanitizeShop(shop),
      stats: { barbers: totalBarbers },
    });
  } catch (err) {
    return next(err);
  }
}

export async function publicListBarbers(req, res, next) {
  try {
    const shop = await findActiveShop(req.params.shopSlug);
    if (!shop) return res.status(404).json({ error: "Barbería no encontrada" });
    const ownerId = toObjectId(shop._id);

    const barbers = await BarberModel.find({ owner: ownerId, isActive: true })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      shop: sanitizeShop(shop),
      barbers: barbers.map(sanitizeBarber),
    });
  } catch (err) {
    return next(err);
  }
}

export async function publicListServices(req, res, next) {
  try {
    const shop = await findActiveShop(req.params.shopSlug);
    if (!shop) return res.status(404).json({ error: "Barbería no encontrada" });
    const ownerId = toObjectId(shop._id);
    const services = await ServiceModel.find({ owner: ownerId, isActive: true })
      .sort({ name: 1 })
      .lean();
    return res.json({
      shop: sanitizeShop(shop),
      services: services.map(sanitizeService),
    });
  } catch (err) {
    return next(err);
  }
}

export async function publicBarberAppointments(req, res, next) {
  try {
    const { barberId, shopSlug } = req.params;
    const { startOfDay, endOfDay } = buildDayRange(req.query.date);
    const shop = await findActiveShop(shopSlug);
    if (!shop) return res.status(404).json({ error: "Barbería no encontrada" });
    const ownerId = toObjectId(shop._id);
    const barber = await BarberModel.findOne({
      _id: barberId,
      owner: ownerId,
      isActive: true,
    }).lean();
    if (!barber)
      return res.status(404).json({ error: "Barbero no encontrado" });
    const appointments = await AppointmentModel.find({
      owner: ownerId,
      barber: barberId,
      startTime: { $gte: startOfDay, $lte: endOfDay },
    })
      .sort({ startTime: 1 })
      .lean();
    return res.json({
      shop: sanitizeShop(shop),
      barber: sanitizeBarber(barber),
      appointments: appointments.map(sanitizeAppointment),
    });
  } catch (err) {
    return next(err);
  }
}

export async function publicCreateAppointment(req, res, next) {
  try {
    const { shopSlug } = req.params;
    const shop = await findActiveShop(shopSlug);
    if (!shop) return res.status(404).json({ error: "Barbería no encontrada" });

    // 1. AGREGAR 'email' AQUÍ (que viene del body)
    const {
      barberId,
      customerName,
      service,
      startTime,
      durationMinutes,
      notes,
      email,
    } = req.body;

    if (!barberId)
      return res.status(400).json({ error: "Debes seleccionar un barbero." });

    const ownerId = toObjectId(shop._id);
    const barber = await BarberModel.findOne({
      _id: barberId,
      owner: ownerId,
      isActive: true,
    }).lean();
    if (!barber)
      return res.status(404).json({ error: "Barbero no encontrado" });
    const appointmentDate = new Date(startTime);

    // --- VALIDACIÓN DE SOLAPAMIENTO (mismo criterio que la app) ---
    const endTime = new Date(
      appointmentDate.getTime() + (Number(durationMinutes) || 30) * 60000,
    );
    const overlappingCandidates = await AppointmentModel.find({
      owner: ownerId,
      barber: barberId,
      status: { $ne: "cancelled" },
      startTime: { $lt: endTime },
    })
      .select({ startTime: 1, durationMinutes: 1 })
      .lean();

    const overlaps = overlappingCandidates.some((existing) => {
      const existingStart = new Date(existing.startTime);
      const existingDuration = existing.durationMinutes || 30;
      const existingEnd = new Date(
        existingStart.getTime() + existingDuration * 60000,
      );
      return existingEnd > appointmentDate;
    });
    if (overlaps) {
      return res.status(409).json({ error: "El horario ya está ocupado" });
    }

    // Guardamos en la base de datos
    const appointment = await AppointmentModel.create({
      owner: ownerId,
      barber: barberId,
      customerName: customerName.trim(),
      service,
      startTime: appointmentDate,
      durationMinutes: Number(durationMinutes) || 30,
      notes,
      status: "pending",
      // Si querés guardar el email en la DB, podés agregarlo al modelo y ponerlo acá
    });

    // --- LÓGICA DE NOTIFICACIÓN PUSH AL BARBERO (YA LA TENÍAS) ---
    try {
      const user = await UserModel.findById(ownerId);
      const targetToken = user?.pushToken || user?.fcmToken;
      if (targetToken) {
        const timeLabel = appointmentDate.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "America/Argentina/Cordoba",
        });
        const payload = {
          token: targetToken,
          notification: {
            title: "💈¡Nuevo Turno (Web)!",
            body: `${customerName} reservó ${service} a las ${timeLabel}`,
          },
          android: { priority: "high" },
        };
        const resp = await admin.messaging().send(payload);
        console.log("Push público OK:", resp);
      }
    } catch (pushErr) {
      console.error("⚠️ Error enviando push:", pushErr.message);
    }

    if (email) {
      const shopName = shop.fullName || "Tu Barbería";
      const timeZone = "America/Argentina/Cordoba";
      const dateLabel = appointmentDate.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone,
      });
      const timeLabel = appointmentDate.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone,
      });


const mailOptions = {
  from: `"BarberApp by CODEX®" <barberAppByCodex@gmail.com>`,
  to: email,
  subject: `✅ Turno Confirmado: ${service}`,
  html: `
    <div style="background-color: #121212; color: #ffffff; padding: 30px; font-family: sans-serif; border-radius: 15px; max-width: 500px; margin: auto; border: 1px solid #B89016;">
      
      <div style="text-align: center; margin-bottom: 25px;">
         <h2 style="color: #B89016; margin: 0; font-size: 24px; letter-spacing: 1px;">¡RESERVA EXITOSA!</h2>
         <p style="color: #888; font-size: 14px; margin-top: 10px;">Hola <strong>${customerName}</strong>, confirmamos tu cita en <b>${shopName}</b>:</p>
      </div>

     
        <p style="margin: 10px 0; color: #ccc; font-size: 15px;">
          <span style="color: #B89016; margin-right: 5px;">◈</span> <strong>Barbero:</strong> 
          <span style="color: #FF1493; font-weight: bold;">${barber.fullName}${barber.phone ? ` · ${barber.phone}` : ''}</span>
        </p>
        <p style="margin: 10px 0; color: #ccc; font-size: 15px;">
          <span style="color: #B89016; margin-right: 5px;">◈</span> <strong>Servicio:</strong> 
          <span style="color: #FF1493; font-weight: bold;">${service}</span>
        </p>
        <p style="margin: 10px 0; color: #ccc; font-size: 15px;">
          <span style="color: #B89016; margin-right: 5px;">◈</span> <strong>Fecha:</strong> 
          <span style="color: #FF1493; font-weight: bold;">${dateLabel}</span>
        </p>
        <p style="margin: 10px 0; color: #ccc; font-size: 15px;">
          <span style="color: #B89016; margin-right: 5px;">◈</span> <strong>Hora:</strong> 
          <span style="color: #FF1493; font-weight: bold;">${timeLabel}</span>
        </p>
    

      <div style="text-align: center; margin-top: 16px;">

        ${barber.phone ? `
        <a href="https://wa.me/${barber.phone.replace(/\s+/g, '')}?text=Hola!%20Soy%20${customerName},%20te%20escribo%20por%20mi%20turno%20del%20dia%20${dateLabel}%20a%20las%20${timeLabel}%20para%20CANCELARLO" 
           style="background-color: #FF1493; color: white; padding: 12px 18px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 14px; border: 1px solid #ff4d4d; margin-bottom: 8px;">
           CONCELAR TURNO
        </a>
        ` : ''}
      </div>

      <div style="text-align: center; margin-top: 12px;">
        <p style="font-size: 9px; color: #444; letter-spacing: 3px; margin: 0; text-transform: uppercase;">
           POWERED BY CODEX® SYSTEM
        </p>
      </div>
    </div>
  `
};


      transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.log("Nodemailer Error:", error);
        else console.log("✅ Email de confirmación enviado a:", email);
      });
    }

    return res.status(201).json({ message: "¡Reserva exitosa!", appointment });
  } catch (err) {
    console.error("❌ Error en publicCreateAppointment:", err);
    return res.status(400).json({ error: err.message });
  }
}
