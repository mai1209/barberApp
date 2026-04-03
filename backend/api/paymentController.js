import crypto from "crypto";
import { AppointmentModel } from "../models/Appointment.js";
import { UserModel } from "../models/User.js";
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

    return res.status(200).json({ received: true, updated: true });
  } catch (err) {
    return next(err);
  }
}
