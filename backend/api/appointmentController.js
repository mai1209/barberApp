import mongoose from "mongoose";
import { BarberModel } from "../models/Barber.js";
import { AppointmentModel } from "../models/Appointment.js";
import { ServiceModel } from "../models/Services.js";
import { UserModel } from "../models/User.js";
import admin from "../firebase.js";
import nodemailer from "nodemailer";

// 1. CONFIGURACIÓN DE NODEMAILER
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "barberAppByCodex@gmail.com",
    pass: "hywu gkkm mbej fwou", // Tu clave de 16 letras
  },
});

// Función auxiliar para calcular rangos de fecha
function buildDayRange(dateLike) {
  if (typeof dateLike === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateLike)) {
    const [year, month, day] = dateLike.split("-").map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { startOfDay, endOfDay };
  }
  const date = dateLike ? new Date(dateLike) : new Date();
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);
  return { startOfDay, endOfDay };
}

// --- CONTROLADORES ---

// LISTAR TURNOS (Para el admin/barbero)
export async function listAppointments(req, res, next) {
  try {
    const { date } = req.query;
    const { startOfDay, endOfDay } = buildDayRange(date);

    // Traemos todos los turnos del día (para este tenant) sin filtrar por owner
    // porque hay casos en los que el owner no coincide con el usuario logueado (ej: staff).
    const appointments = await AppointmentModel.find({
      startTime: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate({ path: "barber", select: "fullName" })
      .sort({ startTime: 1 })
      .lean();

    return res.json({ appointments });
  } catch (err) {
    return next(err);
  }
}

// CREAR TURNO (Público desde Web/App)
export async function createAppointment(req, res, next) {
  try {
    const ownerId = req.user?.id; // Puede ser undefined en reserva pública
    const { barberId, durationMinutes = 30, email } = req.body;
    
    const customerName = String(req.body?.customerName ?? "").trim();
    const service = String(req.body?.service ?? "").trim();
    const notes = String(req.body?.notes ?? "").trim();
    const startTime = req.body?.startTime ? new Date(req.body.startTime) : null;

    if (!barberId || !customerName || !service || !startTime) {
      return res.status(400).json({ error: "Datos obligatorios faltantes" });
    }

    const barber = await BarberModel.findById(barberId).lean();
    if (!barber) return res.status(404).json({ error: "Barbero no encontrado" });

    // 1. VALIDACIÓN DÍA LABORAL (usar horario local de la barbería)
    const dayOfWeek = startTime.getDay();
    const barberWorkDays = (barber.workDays || []).map(Number);
    
    if (barberWorkDays.length > 0 && !barberWorkDays.includes(dayOfWeek)) {
      return res.status(400).json({ error: "El barbero no trabaja este día." });
    }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    const finalOwnerId = ownerId || barber.owner;

    // 2. VALIDACIÓN SOLAPAMIENTO
    const overlappingCandidates = await AppointmentModel.find({
      barber: barberId,
      status: { $ne: "cancelled" },
      startTime: { $lt: endTime },
    }).select({ startTime: 1, durationMinutes: 1 }).lean();

    const isOverlapping = overlappingCandidates.some((existing) => {
      const existingStart = new Date(existing.startTime);
      const existingDuration = existing.durationMinutes || 30;
      const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);
      return existingEnd > startTime;
    });

    if (isOverlapping) {
      return res.status(409).json({ error: "El horario ya está ocupado" });
    }

    // 3. GUARDAR EN BASE DE DATOS
    const appointment = await AppointmentModel.create({
      owner: finalOwnerId,
      barber: barberId,
      customerName,
      service,
      startTime,
      durationMinutes,
      notes,
      customerEmail: email || undefined,
    });

    // --- ENVIAR NOTIFICACIÓN PUSH AL BARBERO ---
    try {
      const user = await UserModel.findById(finalOwnerId);
      const token = user?.pushToken || user?.fcmToken;
      if (token) {
        const timeZone = "America/Argentina/Cordoba";
        const timeLabel = startTime.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone,
        });
        const payload = {
          token: token,
          notification: {
            title: "💈¡NUEVO TURNO!",
            body: `${customerName} reservó ${service} a las ${timeLabel}`,
          },
          android: {
            priority: "high",
          },
        };
        const resp = await admin.messaging().send(payload);
        console.log("Push enviado OK:", resp);
      }
    } catch (err) {
      console.log("Push error:", err.message, err);
    }

    // --- ENVIAR EMAIL DE CONFIRMACIÓN AL CLIENTE ---
    if (email) {
      // Obtener datos del dueño para el nombre de la barbería
      const ownerUser = await UserModel.findById(finalOwnerId).lean();
      const shopName = ownerUser?.fullName || "Tu Barbería";

      const timeZone = "America/Argentina/Cordoba";
      const dateLabel = startTime.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone,
      });
      const timeLabel = startTime.toLocaleTimeString("es-AR", {
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
          <span style="color: #FF1493; font-weight: bold;">${barber.fullName}${barber.phone ? ` Telefono Barbero ${barber.phone}` : ''}</span>
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
        else console.log("Email enviado con éxito a:", email);
      });
    }

    return res.status(201).json({ appointment });
  } catch (err) {
    console.error("Error en createAppointment:", err);
    return next(err);
  }
}

// ACTUALIZAR ESTADO (pending, completed, cancelled)
export async function updateAppointmentStatus(req, res, next) {
  try {
    const ownerId = req.user.id;
    const { appointmentId } = req.params;
    const { status } = req.body;

    if (!["pending", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    const appointment = await AppointmentModel.findOneAndUpdate(
      { _id: appointmentId, owner: ownerId },
      { status },
      { new: true }
    ).lean();

    if (!appointment) return res.status(404).json({ error: "Turno no encontrado" });

    return res.json({ appointment });
  } catch (err) {
    return next(err);
  }
}

// LISTAR SERVICIOS
export async function listServices(req, res, next) {
  try {
    const ownerId = req.user.id;
    const services = await ServiceModel.find({
      owner: ownerId,
      isActive: true,
    }).sort({ name: 1 });
    return res.json({ services });
  } catch (err) {
    return next(err);
  }
}

// ELIMINAR TURNO
export async function deleteAppointment(req, res, next) {
  try {
    const { appointmentId } = req.params;

    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) return res.status(404).json({ error: "Turno no encontrado" });

    // Autorización básica: solo el dueño del turno o un admin puede borrarlo
    if (
      appointment.owner &&
      appointment.owner.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "No autorizado para borrar este turno" });
    }

    await appointment.deleteOne();

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}
