import crypto from "crypto";
import { AppointmentModel } from "../models/Appointment.js";
import { BarberModel } from "../models/Barber.js";
import { UserModel } from "../models/User.js";
import { sendAppMail } from "../services/mailer.js";
import {
  buildMercadoPagoBookingReturnUrls,
  buildMercadoPagoWebhookUrl,
  createMercadoPagoPreference,
  getMercadoPagoConfig,
  getMercadoPagoPayment,
  refreshMercadoPagoAccessToken,
} from "../services/mercadoPago.js";

function normalizePaymentStatus(value) {
  if (value === "approved" || value === "authorized") return "approved";
  if (value === "pending" || value === "in_process") return "pending";
  if (value === "cancelled" || value === "rejected" || value === "charged_back") {
    return "rejected";
  }
  if (value === "refunded") return "refunded";
  return "unknown";
}

function calculateAdvanceAmount({ amountTotal, settings }) {
  const total = Number(amountTotal || 0);
  if (!Number.isFinite(total) || total <= 0) return 0;

  if (settings?.advanceMode === "full") {
    return total;
  }

  if (settings?.advanceType === "fixed") {
    return Math.min(total, Math.max(0, Number(settings?.advanceValue || 0)));
  }

  const percent = Math.max(0, Number(settings?.advanceValue || 0));
  return Math.min(total, Math.round((total * percent) / 100));
}

function buildWebhookManifest({ paymentId, xRequestId, ts }) {
  return `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
}

function buildPaymentApprovedMailHtml({
  customerName,
  shopName,
  barberName,
  barberPhone,
  service,
  appointmentDate,
}) {
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
  const cancelPhone = String(barberPhone || "").replace(/\s+/g, "");

  return `
    <div style="background-color: #121212; color: #ffffff; padding: 30px; font-family: sans-serif; border-radius: 15px; max-width: 500px; margin: auto; border: 1px solid #B89016;">
      <div style="text-align: center; margin-bottom: 25px;">
        <h2 style="color: #B89016; margin: 0; font-size: 24px; letter-spacing: 1px;">¡PAGO APROBADO!</h2>
        <p style="color: #888; font-size: 14px; margin-top: 10px;">Hola <strong>${customerName}</strong>, tu turno quedó confirmado en <b>${shopName}</b>:</p>
      </div>

      <p style="margin: 10px 0; color: #ccc; font-size: 15px;">
        <span style="color: #B89016; margin-right: 5px;">◈</span> <strong>Barbero:</strong>
        <span style="color: #FF1493; font-weight: bold;">${barberName}${barberPhone ? ` · ${barberPhone}` : ""}</span>
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
        ${cancelPhone ? `
        <a href="https://wa.me/${cancelPhone}?text=Hola!%20Soy%20${encodeURIComponent(customerName)},%20te%20escribo%20por%20mi%20turno%20del%20dia%20${encodeURIComponent(dateLabel)}%20a%20las%20${encodeURIComponent(timeLabel)}%20para%20cancelarlo"
          style="background-color: #FF1493; color: white; padding: 12px 18px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 14px; border: 1px solid #ff4d4d; margin-bottom: 8px;">
          CANCELAR TURNO
        </a>
        ` : ""}
      </div>

      <div style="text-align: center; margin-top: 12px;">
        <p style="font-size: 9px; color: #444; letter-spacing: 3px; margin: 0; text-transform: uppercase;">
          POWERED BY CODEX® SYSTEM
        </p>
      </div>
    </div>
  `;
}

async function sendMercadoPagoApprovedMail({ appointment, userDoc }) {
  if (!appointment?.customerEmail) return;

  const barber = await BarberModel.findById(appointment.barber)
    .select({ fullName: 1, phone: 1 })
    .lean();

  const mailHtml = buildPaymentApprovedMailHtml({
    customerName: appointment.customerName,
    shopName: userDoc?.fullName || "Tu Barbería",
    barberName: barber?.fullName || "Barbero",
    barberPhone: barber?.phone || "",
    service: appointment.service,
    appointmentDate: new Date(appointment.startTime),
  });

  await sendAppMail({
    to: appointment.customerEmail,
    subject: `✅ Pago aprobado: ${appointment.service}`,
    html: mailHtml,
  });
}

function isMercadoPagoWebhookValid(req) {
  const { webhookSecret } = getMercadoPagoConfig();
  if (!webhookSecret) return true;

  const xSignature = String(req.headers["x-signature"] || "").trim();
  const xRequestId = String(req.headers["x-request-id"] || "").trim();
  const paymentId =
    String(req.body?.data?.id || req.query?.["data.id"] || req.body?.id || "").trim();

  if (!xSignature || !xRequestId || !paymentId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [key, value] = part.split("=").map((item) => item.trim());
      return [key, value];
    }),
  );

  if (!parts.ts || !parts.v1) return false;

  const manifest = buildWebhookManifest({
    paymentId,
    xRequestId,
    ts: parts.ts,
  });
  const digest = crypto
    .createHmac("sha256", webhookSecret)
    .update(manifest)
    .digest("hex");

  return digest === parts.v1;
}

async function ensureMercadoPagoAccessToken(userDoc) {
  const auth = userDoc?.mercadoPagoAuth;
  if (!auth?.accessToken) {
    const error = new Error("La barbería no tiene Mercado Pago conectado.");
    error.statusCode = 400;
    throw error;
  }

  if (!auth.expiresAt || new Date(auth.expiresAt).getTime() > Date.now() + 60_000) {
    return auth.accessToken;
  }

  if (!auth.refreshToken) {
    const error = new Error("La conexión con Mercado Pago venció. Volvé a conectarla.");
    error.statusCode = 400;
    throw error;
  }

  const refreshed = await refreshMercadoPagoAccessToken({
    refreshToken: auth.refreshToken,
  });

  userDoc.mercadoPagoAuth = {
    ...(userDoc.mercadoPagoAuth?.toObject?.() ?? userDoc.mercadoPagoAuth ?? {}),
    accessToken: refreshed.access_token || null,
    refreshToken: refreshed.refresh_token || auth.refreshToken,
    publicKey: refreshed.public_key || auth.publicKey || null,
    scope: refreshed.scope || auth.scope || null,
    userId: refreshed.user_id ? String(refreshed.user_id) : auth.userId || null,
    expiresAt: refreshed.expires_in
      ? new Date(Date.now() + Number(refreshed.expires_in) * 1000)
      : auth.expiresAt || null,
    lastRefreshAt: new Date(),
    linkedAt: auth.linkedAt || new Date(),
  };

  userDoc.paymentSettings = {
    ...(userDoc.paymentSettings?.toObject?.() ?? userDoc.paymentSettings ?? {}),
    mercadoPagoConnectionStatus: "connected",
    mercadoPagoSellerId:
      refreshed.user_id ? String(refreshed.user_id) : userDoc.paymentSettings?.mercadoPagoSellerId || null,
    mercadoPagoPublicKey:
      refreshed.public_key || userDoc.paymentSettings?.mercadoPagoPublicKey || null,
  };

  await userDoc.save();

  return userDoc.mercadoPagoAuth.accessToken;
}

export async function createAppointmentMercadoPagoPreference({
  appointmentId,
  ownerId,
}) {
  const appointment = await AppointmentModel.findById(appointmentId);
  if (!appointment) {
    const error = new Error("No encontramos el turno a cobrar.");
    error.statusCode = 404;
    throw error;
  }

  const userDoc = await UserModel.findById(ownerId).select("+mercadoPagoAuth");
  if (!userDoc || userDoc.isActive === false) {
    const error = new Error("No encontramos la barbería.");
    error.statusCode = 404;
    throw error;
  }

  const accessToken = await ensureMercadoPagoAccessToken(userDoc);
  const settings = userDoc.paymentSettings || {};
  const amountToCharge = calculateAdvanceAmount({
    amountTotal: appointment.amountTotal || appointment.servicePrice || 0,
    settings,
  });

  if (!Number.isFinite(amountToCharge) || amountToCharge <= 0) {
    const error = new Error("No pudimos calcular el monto a cobrar con Mercado Pago.");
    error.statusCode = 400;
    throw error;
  }

  const externalReference = appointment._id.toString();
  const backUrls = buildMercadoPagoBookingReturnUrls(userDoc.shopSlug);
  const preference = await createMercadoPagoPreference({
    accessToken,
    payload: {
      items: [
        {
          id: appointment._id.toString(),
          title: `${appointment.service} - ${userDoc.fullName}`,
          description:
            settings.advanceMode === "full"
              ? "Pago total del turno"
              : "Seña online del turno",
          quantity: 1,
          currency_id: "ARS",
          unit_price: Number(amountToCharge),
        },
      ],
      payer: appointment.customerEmail
        ? {
            email: appointment.customerEmail,
            name: appointment.customerName,
          }
        : undefined,
      external_reference: externalReference,
      notification_url: `${buildMercadoPagoWebhookUrl()}?appointmentId=${appointment._id.toString()}`,
      back_urls: backUrls,
      auto_return: "approved",
      metadata: {
        appointment_id: appointment._id.toString(),
        owner_id: userDoc._id.toString(),
        shop_slug: userDoc.shopSlug,
      },
    },
  });

  appointment.mercadoPagoPreferenceId = preference.id || null;
  appointment.mercadoPagoExternalReference = externalReference;
  await appointment.save();

  return {
    preferenceId: preference.id || null,
    checkoutUrl: preference.init_point || null,
    sandboxCheckoutUrl: preference.sandbox_init_point || null,
    amountToCharge,
  };
}

export async function handleMercadoPagoWebhook(req, res, next) {
  try {
    if (!isMercadoPagoWebhookValid(req)) {
      return res.status(401).json({ error: "Webhook de Mercado Pago inválido." });
    }

    const type = String(req.body?.type || req.query?.type || "").trim();
    const paymentId = String(
      req.body?.data?.id || req.query?.["data.id"] || req.body?.id || "",
    ).trim();

    if (type && type !== "payment") {
      return res.status(200).json({ received: true, ignored: true });
    }

    if (!paymentId) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const appointmentId = String(req.query?.appointmentId || req.body?.appointmentId || "").trim();
    const targetAppointment = appointmentId
      ? await AppointmentModel.findById(appointmentId)
      : await AppointmentModel.findOne({
          $or: [{ mercadoPagoPaymentId: paymentId }],
        });

    if (!targetAppointment) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const userDoc = await UserModel.findById(targetAppointment.owner).select("+mercadoPagoAuth");
    if (!userDoc || userDoc.isActive === false) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const accessToken = await ensureMercadoPagoAccessToken(userDoc);
    const payment = await getMercadoPagoPayment({ accessToken, paymentId });
    const normalizedPaymentStatus = normalizePaymentStatus(payment.status);
    const previousPaymentStatus = String(targetAppointment.paymentStatus || "").trim();
    const shouldSendApprovedMail =
      normalizedPaymentStatus === "approved" &&
      targetAppointment.customerEmail &&
      previousPaymentStatus !== "paid" &&
      previousPaymentStatus !== "partial";

    targetAppointment.mercadoPagoPaymentId = String(payment.id || paymentId);
    targetAppointment.mercadoPagoMerchantOrderId = payment.order?.id
      ? String(payment.order.id)
      : payment.order?.type || targetAppointment.mercadoPagoMerchantOrderId;

    if (normalizedPaymentStatus === "approved") {
      const paidAmount = Math.max(0, Number(payment.transaction_amount || 0));
      const totalAmount = Math.max(
        0,
        Number(targetAppointment.amountTotal || targetAppointment.servicePrice || 0),
      );

      targetAppointment.paymentMethodCollected = "transfer";
      targetAppointment.amountPaid = Math.min(totalAmount, paidAmount);
      targetAppointment.amountPending = Math.max(
        0,
        totalAmount - targetAppointment.amountPaid,
      );
      targetAppointment.paymentStatus =
        targetAppointment.amountPending > 0 ? "partial" : "paid";
    } else if (normalizedPaymentStatus === "refunded") {
      targetAppointment.paymentStatus = "refunded";
      targetAppointment.amountPaid = 0;
      targetAppointment.amountPending = Math.max(
        0,
        Number(targetAppointment.amountTotal || targetAppointment.servicePrice || 0),
      );
      targetAppointment.paymentMethodCollected = null;
    } else if (normalizedPaymentStatus === "rejected") {
      targetAppointment.paymentStatus = "unpaid";
      targetAppointment.amountPaid = 0;
      targetAppointment.amountPending = Math.max(
        0,
        Number(targetAppointment.amountTotal || targetAppointment.servicePrice || 0),
      );
      targetAppointment.paymentMethodCollected = null;
    }

    await targetAppointment.save();

    if (shouldSendApprovedMail) {
      try {
        await sendMercadoPagoApprovedMail({
          appointment: targetAppointment,
          userDoc,
        });
      } catch (mailErr) {
        console.error(
          "Error enviando email de confirmacion tras pago aprobado:",
          mailErr?.message || mailErr,
        );
      }
    }

    return res.status(200).json({ received: true, updated: true });
  } catch (err) {
    return next(err);
  }
}
