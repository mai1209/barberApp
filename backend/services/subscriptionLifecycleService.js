import admin from "../firebase.js";
import { UserModel } from "../models/User.js";
import { sendAppMail } from "./mailer.js";

const GRACE_PERIOD_DAYS = 3;

function normalizeStatus(value) {
  return ["trial", "active", "past_due", "cancelled"].includes(String(value))
    ? String(value)
    : "trial";
}

function formatDateLabel(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function buildSubscriptionMailHtml({
  title,
  intro,
  ctaLabel,
  expiresAt,
  statusColor,
}) {
  return `
    <div style="background:#121212;color:#ffffff;padding:30px;font-family:sans-serif;border-radius:15px;max-width:520px;margin:auto;border:1px solid ${statusColor};">
      <div style="text-align:center;margin-bottom:22px;">
        <h2 style="color:${statusColor};margin:0;font-size:24px;letter-spacing:1px;">${title}</h2>
        <p style="color:#aaa;font-size:14px;margin-top:10px;">${intro}</p>
      </div>
      <p style="margin:10px 0;color:#ddd;font-size:15px;">
        <strong>Vencimiento:</strong>
        <span style="color:#FF1493;font-weight:700;"> ${formatDateLabel(expiresAt)}</span>
      </p>
      <p style="margin:14px 0 0;color:#bbb;font-size:14px;line-height:1.6;">
        Podés entrar a la app y tocar <strong>${ctaLabel}</strong> para mantener la cuenta activa.
      </p>
      <div style="text-align:center;margin-top:18px;">
        <p style="font-size:9px;color:#444;letter-spacing:3px;margin:0;text-transform:uppercase;">POWERED BY CODEX® SYSTEM</p>
      </div>
    </div>
  `;
}

function buildPushPayload({ title, body }) {
  return {
    notification: { title, body },
    android: { priority: "high" },
  };
}

async function sendSubscriptionMail({
  userDoc,
  title,
  intro,
  ctaLabel,
  expiresAt,
  statusColor,
}) {
  if (!userDoc?.email) return false;

  await sendAppMail({
    to: userDoc.email,
    subject: title,
    html: buildSubscriptionMailHtml({
      title,
      intro,
      ctaLabel,
      expiresAt,
      statusColor,
    }),
  });

  return true;
}

async function sendSubscriptionPush({ userDoc, title, body }) {
  if (!userDoc?.pushToken || !admin.apps.length) return false;

  await admin.messaging().send({
    token: userDoc.pushToken,
    ...buildPushPayload({ title, body }),
  });

  return true;
}

export function isSubscriptionLifecycleAuthorized(req) {
  const expectedSecret = String(
    process.env.REMINDERS_CRON_SECRET || process.env.CRON_SECRET || "",
  ).trim();
  if (!expectedSecret) return false;

  const authHeader = String(req.headers.authorization || "").trim();
  const bearerSecret = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const providedSecret = String(
    bearerSecret || req.headers["x-reminder-secret"] || req.query?.secret || "",
  ).trim();

  return providedSecret === expectedSecret;
}

function daysUntil(date, now) {
  return Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

function buildGraceUntil(expiresAt) {
  const grace = new Date(expiresAt);
  grace.setDate(grace.getDate() + GRACE_PERIOD_DAYS);
  return grace;
}

export async function processSubscriptionLifecycle({ now = new Date() } = {}) {
  const users = await UserModel.find({
    "subscription.expiresAt": { $ne: null },
    "subscription.status": { $in: ["active", "past_due"] },
  });

  let scanned = 0;
  let reminder7dSent = 0;
  let reminder3dSent = 0;
  let reminder1dSent = 0;
  let movedToPastDue = 0;
  let movedToCancelled = 0;

  for (const userDoc of users) {
    scanned += 1;

    const subscription = userDoc.subscription ?? {};
    const status = normalizeStatus(subscription.status);
    const expiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
    if (!expiresAt || Number.isNaN(expiresAt.getTime())) continue;

    if (status === "active") {
      const remainingDays = daysUntil(expiresAt, now);

      if (remainingDays <= 0) {
        userDoc.subscription = {
          ...(userDoc.subscription?.toObject?.() ?? userDoc.subscription ?? {}),
          status: "past_due",
          pastDueAt: now,
          pastDueReminderSentAt: subscription.pastDueReminderSentAt || null,
          graceUntil: subscription.graceUntil || buildGraceUntil(expiresAt),
        };

        try {
          await sendSubscriptionMail({
            userDoc,
            title: "Tu plan venció",
            intro: "Tu plan ya venció. Tenés unos días de gracia para renovarlo sin perder continuidad.",
            ctaLabel: "Renovar plan",
            expiresAt,
            statusColor: "#F5C451",
          });
          await sendSubscriptionPush({
            userDoc,
            title: "Plan vencido",
            body: "Tu plan venció. Entrá a la app y renovalo para seguir activo.",
          });
        } catch (error) {
          console.error("Error notificando plan vencido:", error?.message || error);
        }

        movedToPastDue += 1;
        await userDoc.save();
        continue;
      }

      const reminderChecks = [
        { days: 7, field: "renewalReminder7dAt", counter: "reminder7dSent" },
        { days: 3, field: "renewalReminder3dAt", counter: "reminder3dSent" },
        { days: 1, field: "renewalReminder1dAt", counter: "reminder1dSent" },
      ];

      for (const reminder of reminderChecks) {
        if (remainingDays > reminder.days) continue;
        if (subscription[reminder.field]) continue;

        try {
          await sendSubscriptionMail({
            userDoc,
            title: `Tu plan vence en ${reminder.days} día${reminder.days === 1 ? "" : "s"}`,
            intro: `Tu suscripción está por vencer. Renovala antes del ${formatDateLabel(expiresAt)} para no perder acceso.`,
            ctaLabel: "Renovar plan",
            expiresAt,
            statusColor: reminder.days === 1 ? "#FF8A00" : "#21C063",
          });
          await sendSubscriptionPush({
            userDoc,
            title: "Renovación de plan",
            body: `Tu plan vence en ${reminder.days} día${reminder.days === 1 ? "" : "s"}.`,
          });
        } catch (error) {
          console.error("Error enviando recordatorio de suscripción:", error?.message || error);
        }

        userDoc.subscription = {
          ...(userDoc.subscription?.toObject?.() ?? userDoc.subscription ?? {}),
          [reminder.field]: now,
        };

        if (reminder.counter === "reminder7dSent") reminder7dSent += 1;
        if (reminder.counter === "reminder3dSent") reminder3dSent += 1;
        if (reminder.counter === "reminder1dSent") reminder1dSent += 1;

        await userDoc.save();
        break;
      }

      continue;
    }

    if (status === "past_due") {
      const graceUntil = subscription.graceUntil ? new Date(subscription.graceUntil) : buildGraceUntil(expiresAt);

      if (!subscription.pastDueReminderSentAt) {
        try {
          await sendSubscriptionMail({
            userDoc,
            title: "Pago pendiente del plan",
            intro: "Tu cuenta está pendiente de pago. Renovala antes de la fecha límite para evitar la baja comercial.",
            ctaLabel: "Renovar plan",
            expiresAt: graceUntil,
            statusColor: "#F5C451",
          });
          await sendSubscriptionPush({
            userDoc,
            title: "Pago pendiente",
            body: "Tu plan está pendiente. Renovalo antes de que se cancele.",
          });
        } catch (error) {
          console.error("Error enviando aviso past_due:", error?.message || error);
        }

        userDoc.subscription = {
          ...(userDoc.subscription?.toObject?.() ?? userDoc.subscription ?? {}),
          graceUntil,
          pastDueReminderSentAt: now,
        };
        await userDoc.save();
        continue;
      }

      if (now.getTime() > graceUntil.getTime()) {
        userDoc.subscription = {
          ...(userDoc.subscription?.toObject?.() ?? userDoc.subscription ?? {}),
          status: "cancelled",
          cancelledAt: now,
          graceUntil,
        };

        try {
          await sendSubscriptionMail({
            userDoc,
            title: "Tu plan fue desactivado",
            intro: "No registramos la renovación dentro del período de gracia. Podés volver a activarlo desde la app cuando quieras.",
            ctaLabel: "Activar plan",
            expiresAt: graceUntil,
            statusColor: "#FF5A5F",
          });
          await sendSubscriptionPush({
            userDoc,
            title: "Plan desactivado",
            body: "Tu plan fue desactivado. Podés volver a activarlo desde la app.",
          });
        } catch (error) {
          console.error("Error enviando cancelación de plan:", error?.message || error);
        }

        movedToCancelled += 1;
        await userDoc.save();
      }
    }
  }

  return {
    ok: true,
    scanned,
    reminder7dSent,
    reminder3dSent,
    reminder1dSent,
    movedToPastDue,
    movedToCancelled,
    ranAt: now.toISOString(),
  };
}
