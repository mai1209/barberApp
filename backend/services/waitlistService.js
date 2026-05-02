import { BarberModel } from "../models/Barber.js";
import { UserModel } from "../models/User.js";
import { WaitlistEntryModel } from "../models/WaitlistEntry.js";
import { sendAppMail } from "./mailer.js";
import { getTimeZoneLabel } from "../utils/timezone.js";

const PUBLIC_BOOKING_BASE_URL = String(
  process.env.PUBLIC_BOOKING_BASE_URL || "https://barberappbycodex.com",
).replace(/\/+$/, "");

function normalizeDateLabel(dateLike) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Cordoba",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateLike));
}

function buildBookingUrl(shopSlug) {
  return `${PUBLIC_BOOKING_BASE_URL}/${encodeURIComponent(String(shopSlug || "").trim())}`;
}

export async function createOrRefreshWaitlistEntry({
  ownerId,
  barberId,
  shopSlug,
  desiredDate,
  customerName,
  customerEmail,
  customerPhone,
  serviceLabel,
  durationMinutes,
}) {
  const normalizedEmail = String(customerEmail || "").trim().toLowerCase();
  const normalizedDate = normalizeDateLabel(desiredDate);
  const normalizedPhone = String(customerPhone || "").trim();
  const normalizedServiceLabel =
    String(serviceLabel || "").trim() || "Servicio";
  const normalizedCustomerName =
    String(customerName || "").trim() || "Cliente";

  const entry = await WaitlistEntryModel.findOneAndUpdate(
    {
      owner: ownerId,
      barber: barberId,
      desiredDate: normalizedDate,
      customerEmail: normalizedEmail,
      status: { $in: ["active", "notified"] },
    },
    {
      $set: {
        shopSlug: String(shopSlug || "").trim().toLowerCase(),
        customerName: normalizedCustomerName,
        customerPhone: normalizedPhone,
        serviceLabel: normalizedServiceLabel,
        durationMinutes: Number(durationMinutes || 30),
        status: "active",
      },
      $setOnInsert: {
        message: "",
      },
    },
    {
      upsert: true,
      new: true,
    },
  ).lean();

  return entry;
}

export async function markWaitlistFulfilled({
  ownerId,
  barberId,
  desiredDate,
  customerEmail,
}) {
  const normalizedEmail = String(customerEmail || "").trim().toLowerCase();
  if (!normalizedEmail) return;

  await WaitlistEntryModel.updateMany(
    {
      owner: ownerId,
      barber: barberId,
      desiredDate: normalizeDateLabel(desiredDate),
      customerEmail: normalizedEmail,
      status: { $in: ["active", "notified"] },
    },
    {
      $set: {
        status: "fulfilled",
      },
    },
  );
}

export async function notifyWaitlistForReleasedAppointment({
  ownerId,
  barberId,
  shopSlug,
  appointmentStartTime,
  releasedDurationMinutes,
}) {
  const desiredDate = normalizeDateLabel(appointmentStartTime);
  const safeReleasedDuration = Number(releasedDurationMinutes || 0);
  if (safeReleasedDuration < 15) return { notifiedCount: 0 };

  const [ownerDoc, barberDoc, entry] = await Promise.all([
    UserModel.findById(ownerId).select({ fullName: 1, shopSlug: 1 }).lean(),
    BarberModel.findById(barberId).select({ fullName: 1 }).lean(),
    WaitlistEntryModel.findOne({
      owner: ownerId,
      barber: barberId,
      desiredDate,
      status: "active",
      durationMinutes: { $lte: safeReleasedDuration },
    })
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  if (!entry?.customerEmail) {
    return { notifiedCount: 0 };
  }

  const bookingUrl = buildBookingUrl(shopSlug || ownerDoc?.shopSlug);
  const dateLabel = new Date(`${desiredDate}T12:00:00`).toLocaleDateString(
    "es-AR",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "America/Argentina/Cordoba",
    },
  );
  const startTimeLabel = getTimeZoneLabel(appointmentStartTime).time;
  const ownerName = ownerDoc?.fullName || "la barbería";
  const barberName = barberDoc?.fullName || "tu barbero";

  await sendAppMail({
    to: entry.customerEmail,
    subject: `⏳ Se liberó un turno con ${barberName}`,
    html: `
      <div style="background:#121212;color:#ffffff;padding:28px;font-family:sans-serif;border-radius:16px;max-width:560px;margin:auto;border:1px solid #B89016;">
        <h2 style="margin:0 0 12px;color:#B89016;">Se liberó un lugar</h2>
        <p style="color:#d6d6d6;line-height:1.6;margin:0 0 14px;">
          Hola <strong>${entry.customerName}</strong>, se liberó un hueco para <strong>${entry.serviceLabel}</strong> con <strong>${barberName}</strong> el <strong>${dateLabel}</strong>.
        </p>
        <p style="color:#d6d6d6;line-height:1.6;margin:0 0 18px;">
          El hueco liberado comienza cerca de las <strong>${startTimeLabel}</strong>. Si todavía te sirve, reservá cuanto antes desde la página pública de <strong>${ownerName}</strong>.
        </p>
        <div style="text-align:center;margin:18px 0;">
          <a href="${bookingUrl}" style="display:inline-block;background:#FF1493;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:800;">
            Volver a reservar
          </a>
        </div>
      </div>
    `,
  });

  await WaitlistEntryModel.updateOne(
    { _id: entry._id },
    {
      $set: {
        status: "notified",
        lastNotifiedAt: new Date(),
      },
      $inc: {
        notificationsCount: 1,
      },
    },
  );

  return { notifiedCount: 1, entryId: String(entry._id) };
}
