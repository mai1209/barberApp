import { UserModel } from "../models/User.js";
import { SubscriptionCouponModel } from "../models/SubscriptionCoupon.js";
import { hashPassword, verifyPassword } from "../token/passwordManager.js";
import { signAccessToken, verifyAccessToken } from "../token/jwtManager.js";
import crypto from "crypto";
import {
  getMailerDebugInfo,
  sendAppMail,
  verifyMailerConnection,
} from "../services/mailer.js";
import {
  buildMercadoPagoOAuthUrl,
  buildMercadoPagoSubscriptionReturnUrls,
  buildMercadoPagoSubscriptionWebhookUrl,
  createMercadoPagoSystemPreference,
  exchangeMercadoPagoCode,
  getMercadoPagoConfig,
  updateMercadoPagoSystemPreapproval,
} from "../services/mercadoPago.js";
import {
  isSubscriptionLifecycleAuthorized,
  notifySubscriptionPriceChange,
  processSubscriptionLifecycle,
} from "../services/subscriptionLifecycleService.js";
import {
  getOrCreatePlanPricing,
  serializePlanPricing,
} from "../services/planPricingService.js";
import {
  normalizeCouponCode,
  resolvePlanPricingForSubscription,
} from "../services/subscriptionPricingService.js";

const PASSWORD_RESET_EXPIRY_MS = 15 * 60 * 1000;
const SUBSCRIPTION_CURRENCY_ID = String(
  process.env.SUBSCRIPTIONS_CURRENCY_ID || "USD",
).trim().toUpperCase();
const SUBSCRIPTION_PLAN_CONFIG = {
  basic: {
    title: "Suscripción BarberApp Básico",
    description: "Plan mensual BarberApp Básico",
    billingCycle: "monthly",
  },
  pro: {
    title: "Suscripción BarberApp Pro",
    description: "Plan mensual BarberApp Pro",
    billingCycle: "monthly",
  },
};

function sanitizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSlugCandidate(value) {
  const slug = slugify(value);
  return slug.length >= 3 ? slug : "";
}

function normalizeHexColor(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : null;
}

function buildPasswordResetCode() {
  return String(crypto.randomInt(100000, 999999));
}

function hashPasswordResetCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

async function sendPasswordRecoveryEmail({ email, fullName, code }) {
  await sendAppMail({
    to: email,
    subject: "Recupera tu contraseña de BarberApp",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2 style="margin-bottom: 8px;">Recuperación de contraseña</h2>
        <p>Hola ${fullName || "barbero/a"},</p>
        <p>Tu código para poner una nueva contraseña es:</p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; margin: 18px 0; color: #FF1493;">
          ${code}
        </div>
        <p>Este código vence en 15 minutos.</p>
        <p>Si vos no pediste este cambio, ignorá este correo.</p>
      </div>
    `,
  });
}

export async function sendTestMail(req, res, next) {
  try {
    const user = await UserModel.findById(req.user.id)
      .select({ email: 1, fullName: 1 })
      .lean();

    if (!user?.email) {
      return res.status(400).json({ error: "El usuario no tiene un email configurado." });
    }

    await sendAppMail({
      to: user.email,
      subject: "Prueba de correo de BarberApp",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <h2 style="margin-bottom: 8px;">Correo de prueba</h2>
          <p>Hola ${user.fullName || "barbero/a"},</p>
          <p>Este correo confirma que la configuración SMTP de tu BarberApp está funcionando.</p>
          <p>Si recibiste este mensaje, los mails automáticos del sistema deberían salir bien.</p>
        </div>
      `,
      text: `Hola ${user.fullName || "barbero/a"}. Este correo confirma que la configuración SMTP de tu BarberApp está funcionando.`,
    });

    return res.json({ message: `Correo de prueba enviado a ${user.email}` });
  } catch (err) {
    return next(err);
  }
}

export async function getMailDebug(req, res, next) {
  try {
    const verify = await verifyMailerConnection();
    return res.json({
      ok: verify.ok,
      verify,
      env: getMailerDebugInfo(),
    });
  } catch (err) {
    return next(err);
  }
}

function buildMercadoPagoStateToken(userId) {
  return signAccessToken(
    {
      sub: userId,
      type: "mp_oauth",
      nonce: crypto.randomUUID(),
    },
    { expiresIn: "15m" },
  );
}

function buildMercadoPagoConnectionPayload(userDoc) {
  const auth = userDoc?.mercadoPagoAuth ?? null;
  return {
    connectionStatus:
      userDoc?.paymentSettings?.mercadoPagoConnectionStatus || "disconnected",
    sellerId:
      userDoc?.paymentSettings?.mercadoPagoSellerId ||
      auth?.userId ||
      null,
    publicKey:
      userDoc?.paymentSettings?.mercadoPagoPublicKey ||
      auth?.publicKey ||
      null,
    linkedAt: auth?.linkedAt || null,
    expiresAt: auth?.expiresAt || null,
    hasRefreshToken: Boolean(auth?.refreshToken),
  };
}

function buildMercadoPagoCallbackHtml({
  success,
  title,
  message,
}) {
  const accent = success ? "#34C759" : "#FF5A5F";
  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
    </head>
    <body style="margin:0;background:#0D0D11;color:#fff;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;">
      <div style="max-width:460px;width:100%;background:#17171C;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:28px;text-align:center;">
        <div style="width:64px;height:64px;border-radius:20px;margin:0 auto 18px;background:${accent};display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:800;">
          ${success ? "✓" : "!"}
        </div>
        <h1 style="margin:0 0 12px;font-size:24px;">${title}</h1>
        <p style="margin:0 0 18px;color:#B7BECC;line-height:1.5;">${message}</p>
        <p style="margin:0;color:#7C8596;font-size:13px;">Podés volver a la app y refrescar la pantalla de Cobros.</p>
      </div>
    </body>
  </html>`;
}

function sanitizeThemeConfigInput(input) {
  if (!input || typeof input !== "object") {
    return { updates: {}, hasAnyField: false };
  }

  const updates = {};
  let hasAnyField = false;

  if (Object.prototype.hasOwnProperty.call(input, "primary")) {
    hasAnyField = true;
    const normalized = normalizeHexColor(input.primary);
    if (input.primary != null && String(input.primary).trim() !== "" && !normalized) {
      throw new Error("El color primario no es válido.");
    }
    updates.primary = normalized;
  }

  if (Object.prototype.hasOwnProperty.call(input, "secondary")) {
    hasAnyField = true;
    const normalized = normalizeHexColor(input.secondary);
    if (input.secondary != null && String(input.secondary).trim() !== "" && !normalized) {
      throw new Error("El color secundario no es válido.");
    }
    updates.secondary = normalized;
  }

  if (Object.prototype.hasOwnProperty.call(input, "card")) {
    hasAnyField = true;
    const normalized = normalizeHexColor(input.card);
    if (input.card != null && String(input.card).trim() !== "" && !normalized) {
      throw new Error("El color de tarjeta no es válido.");
    }
    updates.card = normalized;
  }

  if (Object.prototype.hasOwnProperty.call(input, "gradientColors")) {
    hasAnyField = true;
    if (input.gradientColors == null) {
      updates.gradientColors = [];
    } else if (!Array.isArray(input.gradientColors) || input.gradientColors.length !== 4) {
      throw new Error("El gradiente debe tener exactamente 4 colores.");
    } else {
      const normalizedColors = input.gradientColors.map(color => normalizeHexColor(color));
      if (normalizedColors.some(color => !color)) {
        throw new Error("Uno de los colores del gradiente no es válido.");
      }
      updates.gradientColors = normalizedColors;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "logoDataUrl")) {
    hasAnyField = true;

    if (input.logoDataUrl == null || String(input.logoDataUrl).trim() === "") {
      updates.logoDataUrl = null;
    } else {
      const logoDataUrl = String(input.logoDataUrl);
      if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(logoDataUrl)) {
        throw new Error("El logo debe ser una imagen válida en base64.");
      }
      if (logoDataUrl.length > 2_500_000) {
        throw new Error("El logo es demasiado grande. Elegí una imagen más liviana.");
      }
      updates.logoDataUrl = logoDataUrl;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "bannerDataUrl")) {
    hasAnyField = true;

    if (input.bannerDataUrl == null || String(input.bannerDataUrl).trim() === "") {
      updates.bannerDataUrl = null;
    } else {
      const bannerDataUrl = String(input.bannerDataUrl);
      if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(bannerDataUrl)) {
        throw new Error("La portada debe ser una imagen válida en base64.");
      }
      if (bannerDataUrl.length > 4_500_000) {
        throw new Error("La portada es demasiado grande. Elegí una imagen más liviana.");
      }
      updates.bannerDataUrl = bannerDataUrl;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "mobileBannerDataUrl")) {
    hasAnyField = true;

    if (input.mobileBannerDataUrl == null || String(input.mobileBannerDataUrl).trim() === "") {
      updates.mobileBannerDataUrl = null;
    } else {
      const mobileBannerDataUrl = String(input.mobileBannerDataUrl);
      if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(mobileBannerDataUrl)) {
        throw new Error("La portada para teléfono debe ser una imagen válida en base64.");
      }
      if (mobileBannerDataUrl.length > 4_500_000) {
        throw new Error("La portada para teléfono es demasiado grande. Elegí una imagen más liviana.");
      }
      updates.mobileBannerDataUrl = mobileBannerDataUrl;
    }
  }

  return { updates, hasAnyField };
}

function sanitizePaymentSettingsInput(input) {
  if (!input || typeof input !== "object") {
    return { updates: {}, hasAnyField: false };
  }

  const updates = {};
  let hasAnyField = false;

  if (Object.prototype.hasOwnProperty.call(input, "cashEnabled")) {
    hasAnyField = true;
    updates.cashEnabled = Boolean(input.cashEnabled);
  }

  if (Object.prototype.hasOwnProperty.call(input, "advancePaymentEnabled")) {
    hasAnyField = true;
    updates.advancePaymentEnabled = Boolean(input.advancePaymentEnabled);
  }

  if (Object.prototype.hasOwnProperty.call(input, "advanceMode")) {
    hasAnyField = true;
    const value = String(input.advanceMode ?? "").trim().toLowerCase();
    if (value && !["deposit", "full"].includes(value)) {
      throw new Error("El modo de cobro adelantado no es válido.");
    }
    updates.advanceMode = value || "deposit";
  }

  if (Object.prototype.hasOwnProperty.call(input, "advanceType")) {
    hasAnyField = true;
    const value = String(input.advanceType ?? "").trim().toLowerCase();
    if (value && !["percent", "fixed"].includes(value)) {
      throw new Error("El tipo de adelanto no es válido.");
    }
    updates.advanceType = value || "percent";
  }

  if (Object.prototype.hasOwnProperty.call(input, "advanceValue")) {
    hasAnyField = true;
    const parsed = Number(input.advanceValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("El valor del adelanto no es válido.");
    }
    updates.advanceValue = parsed;
  }

  if (Object.prototype.hasOwnProperty.call(input, "mercadoPagoConnectionStatus")) {
    hasAnyField = true;
    const value = String(input.mercadoPagoConnectionStatus ?? "")
      .trim()
      .toLowerCase();
    if (value && !["disconnected", "pending", "connected"].includes(value)) {
      throw new Error("El estado de Mercado Pago no es válido.");
    }
    updates.mercadoPagoConnectionStatus = value || "disconnected";
  }

  if (Object.prototype.hasOwnProperty.call(input, "mercadoPagoSellerId")) {
    hasAnyField = true;
    const value = String(input.mercadoPagoSellerId ?? "").trim();
    updates.mercadoPagoSellerId = value || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "mercadoPagoPublicKey")) {
    hasAnyField = true;
    const value = String(input.mercadoPagoPublicKey ?? "").trim();
    updates.mercadoPagoPublicKey = value || null;
  }

  return { updates, hasAnyField };
}

function sanitizeSubscriptionInput(input) {
  if (!input || typeof input !== "object") {
    return { updates: {}, hasAnyField: false };
  }

  const updates = {};
  let hasAnyField = false;

  if (Object.prototype.hasOwnProperty.call(input, "plan")) {
    const plan = String(input.plan ?? "").trim();
    if (!["basic", "pro", "custom"].includes(plan)) {
      throw new Error("El plan no es válido.");
    }
    updates.plan = plan;
    hasAnyField = true;
  }

  if (Object.prototype.hasOwnProperty.call(input, "status")) {
    const status = String(input.status ?? "").trim();
    if (!["trial", "active", "past_due", "cancelled"].includes(status)) {
      throw new Error("El estado no es válido.");
    }
    updates.status = status;
    hasAnyField = true;
  }

  if (Object.prototype.hasOwnProperty.call(input, "billingCycle")) {
    const rawCycle = input.billingCycle;
    const cycle =
      rawCycle == null || String(rawCycle).trim() === ""
        ? null
        : String(rawCycle).trim();
    if (cycle !== null && !["monthly", "yearly", "custom"].includes(cycle)) {
      throw new Error("El ciclo de facturación no es válido.");
    }
    updates.billingCycle = cycle;
    hasAnyField = true;
  }

  if (Object.prototype.hasOwnProperty.call(input, "renewalMode")) {
    const renewalMode = String(input.renewalMode ?? "").trim();
    if (!["manual", "automatic"].includes(renewalMode)) {
      throw new Error("El modo de renovación no es válido.");
    }
    updates.renewalMode = renewalMode;
    hasAnyField = true;
  }

  if (Object.prototype.hasOwnProperty.call(input, "customPriceArs")) {
    hasAnyField = true;
    const raw = input.customPriceArs;
    if (raw == null || String(raw).trim() === "") {
      updates.customPriceArs = null;
    } else {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error("El precio especial en ARS no es válido.");
      }
      updates.customPriceArs = parsed;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "customPriceUsdReference")) {
    hasAnyField = true;
    const raw = input.customPriceUsdReference;
    if (raw == null || String(raw).trim() === "") {
      updates.customPriceUsdReference = null;
    } else {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error("La referencia especial en USD no es válida.");
      }
      updates.customPriceUsdReference = parsed;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "internalNotes")) {
    hasAnyField = true;
    const notes = String(input.internalNotes ?? "").trim();
    if (notes.length > 400) {
      throw new Error("Las notas internas no pueden superar los 400 caracteres.");
    }
    updates.internalNotes = notes;
  }

  if (Object.prototype.hasOwnProperty.call(input, "startedAt")) {
    hasAnyField = true;
    if (!input.startedAt) {
      updates.startedAt = null;
    } else {
      const parsed = new Date(input.startedAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error("La fecha de inicio no es válida.");
      }
      updates.startedAt = parsed;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "expiresAt")) {
    hasAnyField = true;
    if (!input.expiresAt) {
      updates.expiresAt = null;
    } else {
      const parsed = new Date(input.expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error("La fecha de vencimiento no es válida.");
      }
      updates.expiresAt = parsed;
    }
  }

  return { updates, hasAnyField };
}

function sanitizeSubscriptionCouponInput(input, { partial = false } = {}) {
  if (!input || typeof input !== "object") {
    return { updates: {}, hasAnyField: false };
  }

  const updates = {};
  let hasAnyField = false;

  if (Object.prototype.hasOwnProperty.call(input, "code")) {
    hasAnyField = true;
    const code = normalizeCouponCode(input.code);
    if (!partial && !code) {
      throw new Error("El código del cupón es obligatorio.");
    }
    if (code) {
      updates.code = code;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "plan")) {
    hasAnyField = true;
    const rawPlan = input.plan == null || String(input.plan).trim() === ""
      ? null
      : String(input.plan).trim();
    if (rawPlan !== null && !["basic", "pro"].includes(rawPlan)) {
      throw new Error("El plan del cupón no es válido.");
    }
    updates.plan = rawPlan;
  }

  if (Object.prototype.hasOwnProperty.call(input, "couponCategory")) {
    hasAnyField = true;
    const couponCategory = String(input.couponCategory ?? "").trim() || "standard";
    if (!["standard", "referral"].includes(couponCategory)) {
      throw new Error("La categoría del cupón no es válida.");
    }
    updates.couponCategory = couponCategory;
  } else if (!partial) {
    updates.couponCategory = "standard";
  }

  if (Object.prototype.hasOwnProperty.call(input, "referralOwnerName")) {
    hasAnyField = true;
    const referralOwnerName = String(input.referralOwnerName ?? "").trim();
    if (referralOwnerName.length > 120) {
      throw new Error("El nombre del referente no puede superar los 120 caracteres.");
    }
    updates.referralOwnerName = referralOwnerName;
  } else if (!partial) {
    updates.referralOwnerName = "";
  }

  const rawDiscountType = Object.prototype.hasOwnProperty.call(input, "discountType")
    ? String(input.discountType ?? "").trim() || "percentage"
    : partial
      ? null
      : "percentage";

  if (rawDiscountType && !["percentage", "fixed_usd_reference"].includes(rawDiscountType)) {
    throw new Error("El tipo de descuento del cupón no es válido.");
  }

  if (rawDiscountType) {
    hasAnyField = true;
    updates.discountType = rawDiscountType;
  }

  if (
    (rawDiscountType === "percentage" || (!rawDiscountType && Object.prototype.hasOwnProperty.call(input, "discountPercent"))) &&
    Object.prototype.hasOwnProperty.call(input, "discountPercent")
  ) {
    hasAnyField = true;
    const discountPercent = Number(input.discountPercent);
    if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      throw new Error("El descuento del cupón debe estar entre 0 y 100.");
    }
    updates.discountPercent = Number(discountPercent.toFixed(2));
  } else if (!partial && rawDiscountType === "percentage") {
    throw new Error("El descuento porcentual del cupón es obligatorio.");
  } else if (rawDiscountType === "fixed_usd_reference") {
    updates.discountPercent = null;
  }

  if (
    (rawDiscountType === "fixed_usd_reference" ||
      Object.prototype.hasOwnProperty.call(input, "discountAmountUsdReference")) &&
    Object.prototype.hasOwnProperty.call(input, "discountAmountUsdReference")
  ) {
    hasAnyField = true;
    const discountAmountUsdReference = Number(input.discountAmountUsdReference);
    if (!Number.isFinite(discountAmountUsdReference) || discountAmountUsdReference <= 0) {
      throw new Error("El monto fijo del cupón en USD de referencia no es válido.");
    }
    updates.discountAmountUsdReference = Number(discountAmountUsdReference.toFixed(2));
  } else if (!partial && rawDiscountType === "fixed_usd_reference") {
    throw new Error("El monto fijo del cupón en USD de referencia es obligatorio.");
  } else if (rawDiscountType === "percentage") {
    updates.discountAmountUsdReference = null;
  }

  if (Object.prototype.hasOwnProperty.call(input, "benefitDurationType")) {
    hasAnyField = true;
    const benefitDurationType = String(input.benefitDurationType ?? "").trim() || "forever";
    if (!["forever", "one_time", "months"].includes(benefitDurationType)) {
      throw new Error("La duración del beneficio no es válida.");
    }
    updates.benefitDurationType = benefitDurationType;
  } else if (!partial) {
    updates.benefitDurationType = "forever";
  }

  if (Object.prototype.hasOwnProperty.call(input, "benefitDurationValue")) {
    hasAnyField = true;
    const raw = input.benefitDurationValue;
    if (raw == null || String(raw).trim() === "") {
      updates.benefitDurationValue = null;
    } else {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error("La duración del beneficio debe ser un entero mayor a cero.");
      }
      updates.benefitDurationValue = parsed;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "maxRedemptions")) {
    hasAnyField = true;
    const raw = input.maxRedemptions;
    if (raw == null || String(raw).trim() === "") {
      updates.maxRedemptions = null;
    } else {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error("El máximo de usos debe ser un entero mayor a cero.");
      }
      updates.maxRedemptions = parsed;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "expiresAt")) {
    hasAnyField = true;
    if (!input.expiresAt) {
      updates.expiresAt = null;
    } else {
      const parsed = new Date(input.expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error("La fecha de vencimiento del cupón no es válida.");
      }
      updates.expiresAt = parsed;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, "internalNote")) {
    hasAnyField = true;
    const internalNote = String(input.internalNote ?? "").trim();
    if (internalNote.length > 300) {
      throw new Error("La nota interna del cupón no puede superar los 300 caracteres.");
    }
    updates.internalNote = internalNote;
  }

  if (Object.prototype.hasOwnProperty.call(input, "isActive")) {
    hasAnyField = true;
    updates.isActive = Boolean(input.isActive);
  } else if (!partial) {
    updates.isActive = true;
  }

  const effectiveCategory =
    updates.couponCategory ??
    (partial ? null : "standard");
  const effectiveReferralOwnerName =
    updates.referralOwnerName ??
    (partial ? null : "");

  if (effectiveCategory === "referral" && !String(effectiveReferralOwnerName || "").trim()) {
    throw new Error("El nombre del referente es obligatorio para códigos de referido.");
  }

  return { updates, hasAnyField };
}

function serializeSubscriptionCoupon(coupon) {
  if (!coupon) return null;
  return {
    _id: String(coupon._id),
    code: coupon.code,
    plan: coupon.plan || null,
    couponCategory: coupon.couponCategory || "standard",
    referralOwnerName: coupon.referralOwnerName || "",
    discountType: coupon.discountType || "percentage",
    discountPercent: Number(coupon.discountPercent || 0),
    discountAmountUsdReference: Number(coupon.discountAmountUsdReference || 0),
    benefitDurationType: coupon.benefitDurationType || "forever",
    benefitDurationValue: coupon.benefitDurationValue ?? null,
    maxRedemptions: coupon.maxRedemptions ?? null,
    redemptionCount: Number(coupon.redemptionCount || 0),
    expiresAt: coupon.expiresAt || null,
    internalNote: coupon.internalNote || "",
    isActive: Boolean(coupon.isActive),
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

function sanitizePlanPricingInput(input) {
  if (!input || typeof input !== "object") {
    return { updates: {}, hasAnyField: false };
  }

  const updates = {};
  let hasAnyField = false;

  const fields = [
    ["basicPriceArs", "El precio ARS del plan Básico no es válido."],
    ["basicPriceUsdReference", "La referencia USD del plan Básico no es válida."],
    ["proPriceArs", "El precio ARS del plan Pro no es válido."],
    ["proPriceUsdReference", "La referencia USD del plan Pro no es válida."],
  ];

  for (const [field, message] of fields) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) continue;
    const parsed = Number(input[field]);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(message);
    }
    updates[field] = parsed;
    hasAnyField = true;
  }

  return { updates, hasAnyField };
}

function sanitizeNotificationSettingsInput(input) {
  if (!input || typeof input !== "object") {
    return { updates: {}, hasAnyField: false };
  }

  const updates = {};
  let hasAnyField = false;
  const allowedReminderMinutes = new Set([15, 30, 60, 120, 180, 1440]);

  if (Object.prototype.hasOwnProperty.call(input, "barberReminderEnabled")) {
    hasAnyField = true;
    updates.barberReminderEnabled = Boolean(input.barberReminderEnabled);
  }

  if (Object.prototype.hasOwnProperty.call(input, "barberReminderMinutesBefore")) {
    hasAnyField = true;
    const parsed = Number(input.barberReminderMinutesBefore);
    if (!allowedReminderMinutes.has(parsed)) {
      throw new Error("El tiempo del recordatorio debe ser 15, 30, 60, 120, 180 o 1440 minutos.");
    }
    updates.barberReminderMinutesBefore = parsed;
  }

  if (Object.prototype.hasOwnProperty.call(input, "customerSameDayEmailEnabled")) {
    hasAnyField = true;
    updates.customerSameDayEmailEnabled = Boolean(input.customerSameDayEmailEnabled);
  }

  return { updates, hasAnyField };
}

async function buildAvailableSlug(baseValue) {
  const base = baseValue || "barberia";
  let candidate = base;
  let suffix = 1;
  while (await UserModel.exists({ shopSlug: candidate })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function registerUser(req, res, next) {
  try {
    const fullName = String(req.body?.fullName ?? "").trim();
    const email = sanitizeEmail(req.body?.email);
    const password = String(req.body?.password ?? "");
    const requestedSlugRaw = String(req.body?.shopSlug ?? "").trim();
    const requestedSlug = requestedSlugRaw ? normalizeSlugCandidate(requestedSlugRaw) : "";

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "fullName, email y password son obligatorios" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "El password debe tener al menos 8 caracteres" });
    }
    if (requestedSlugRaw && !requestedSlug) {
      return res
        .status(400)
        .json({ error: "shopSlug solo puede incluir letras, números y guiones." });
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Ya existe un usuario con ese email" });
    }

    const passwordHash = await hashPassword(password);
    const fallbackSlug = normalizeSlugCandidate(fullName) || "barberia";
    let shopSlug = requestedSlug || fallbackSlug;
    const slugExists = await UserModel.exists({ shopSlug });
    if (slugExists) {
      if (requestedSlug) {
        return res.status(409).json({ error: "El enlace público ya está en uso." });
      }
      shopSlug = await buildAvailableSlug(fallbackSlug);
    }

    const userDoc = await UserModel.create({
      fullName,
      shopSlug,
      email,
      passwordHash,
      subscription: {
        plan: "basic",
        status: "trial",
        billingCycle: "monthly",
        startedAt: new Date(),
      },
      // no aceptar role desde el cliente
    });

    const token = signAccessToken({
      sub: userDoc._id.toString(),
      email: userDoc.email,
      role: userDoc.role,
    });

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      token,
      user: userDoc.toJSON(),
    });
  } catch (err) {
    return next(err);
  }
}

export async function createSubscriptionCheckout(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const plan = String(req.body?.plan ?? "").trim();
    const planConfig = SUBSCRIPTION_PLAN_CONFIG[plan];
    if (!planConfig) {
      return res.status(400).json({ error: "El plan seleccionado no es válido." });
    }

    const userDoc = await UserModel.findById(userId);
    if (!userDoc || userDoc.isActive === false) {
      return res.status(404).json({ error: "No encontramos la cuenta." });
    }

    const pricingDoc = await getOrCreatePlanPricing();
    const pricing = serializePlanPricing(pricingDoc);
    const resolvedPricing = resolvePlanPricingForSubscription({
      plan,
      pricing,
      subscription: userDoc.subscription,
    });
    const amount =
      SUBSCRIPTION_CURRENCY_ID === "USD"
        ? Number(resolvedPricing.effectiveUsdReference || 0)
        : Number(resolvedPricing.effectiveArs || 0);

    if (!(amount > 0)) {
      return res.status(400).json({ error: "El plan no tiene un precio configurado." });
    }

    const externalReference = `subscription:${userDoc._id.toString()}:${plan}:${Date.now()}`;
    const returnUrls = buildMercadoPagoSubscriptionReturnUrls();
    const preference = await createMercadoPagoSystemPreference({
      payload: {
        items: [
          {
            id: `${plan}-monthly`,
            title: planConfig.title,
            description: planConfig.description,
            quantity: 1,
            currency_id: SUBSCRIPTION_CURRENCY_ID,
            unit_price: amount,
          },
        ],
        payer: userDoc.email
          ? {
              email: userDoc.email,
              name: userDoc.fullName,
            }
          : undefined,
        external_reference: externalReference,
        notification_url: `${buildMercadoPagoSubscriptionWebhookUrl()}?userId=${userDoc._id.toString()}`,
        back_urls: returnUrls,
        auto_return: "approved",
        metadata: {
          user_id: userDoc._id.toString(),
          plan,
          billing_cycle: planConfig.billingCycle,
          subscription_type: "barberapp_plan",
        },
      },
    });

    userDoc.subscription = {
      ...(userDoc.subscription?.toObject?.() ?? userDoc.subscription ?? {}),
      pendingPlan: plan,
      mercadoPagoPreferenceId: preference.id || null,
    };
    await userDoc.save();

    return res.json({
      checkoutUrl: preference.init_point || null,
      sandboxCheckoutUrl: preference.sandbox_init_point || null,
      preferenceId: preference.id || null,
      amount,
      currencyId: SUBSCRIPTION_CURRENCY_ID,
      discountApplied: resolvedPricing.discountApplied,
    });
  } catch (err) {
    return next(err);
  }
}

export async function loginUser(req, res, next) {
  try {
    const email = sanitizeEmail(req.body?.email);
    const password = String(req.body?.password ?? "");

    if (!email || !password) {
      return res.status(400).json({ error: "email y password son obligatorios" });
    }

    const userDoc = await UserModel.findOne({ email, isActive: true }).select("+passwordHash");
    if (!userDoc) return res.status(401).json({ error: "Credenciales inválidas" });

    const isValidPassword = await verifyPassword(password, userDoc.passwordHash);
    if (!isValidPassword) return res.status(401).json({ error: "Credenciales inválidas" });

    // Aseguramos el slug
    if (!userDoc.shopSlug) {
      const fallbackSlug = normalizeSlugCandidate(userDoc.fullName) || "barberia";
      userDoc.shopSlug = await buildAvailableSlug(fallbackSlug);
      await userDoc.save();
    }

    const token = signAccessToken({
      sub: userDoc._id.toString(),
      email: userDoc.email,
      role: userDoc.role,
    });

    // --- AGREGAMOS ESTO PARA QUE LA APP TENGA DATOS SEGUROS ---
    const userResponse = userDoc.toJSON();
    
    return res.json({
      message: "Login exitoso",
      token,
      user: {
        ...userResponse,
        shopSlug: userDoc.shopSlug // Forzamos que viaje el slug
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const userDoc = await UserModel.findById(userId);
    if (!userDoc || userDoc.isActive === false) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    if (!userDoc.shopSlug) {
      const fallbackSlug = normalizeSlugCandidate(userDoc.fullName) || "barberia";
      userDoc.shopSlug = await buildAvailableSlug(fallbackSlug);
      await userDoc.save();
    }

    return res.json({
      user: {
        ...userDoc.toJSON(),
        shopSlug: userDoc.shopSlug,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getMercadoPagoConnectionStatus(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const userDoc = await UserModel.findById(userId)
      .select("+mercadoPagoAuth")
      .lean();

    if (!userDoc || userDoc.isActive === false) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    return res.json({
      mercadoPago: buildMercadoPagoConnectionPayload(userDoc),
    });
  } catch (err) {
    return next(err);
  }
}

export async function getMercadoPagoConnectUrl(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    getMercadoPagoConfig();
    const state = buildMercadoPagoStateToken(userId);
    const authUrl = buildMercadoPagoOAuthUrl({ state });

    return res.json({ authUrl });
  } catch (err) {
    return next(err);
  }
}

export async function handleMercadoPagoOAuthCallback(req, res, next) {
  try {
    const errorCode = String(req.query?.error ?? "").trim();
    const errorDescription = String(req.query?.error_description ?? "").trim();
    const code = String(req.query?.code ?? "").trim();
    const state = String(req.query?.state ?? "").trim();

    if (errorCode) {
      return res
        .status(400)
        .send(
          buildMercadoPagoCallbackHtml({
            success: false,
            title: "No se pudo conectar Mercado Pago",
            message: errorDescription || errorCode,
          }),
        );
    }

    if (!code || !state) {
      return res
        .status(400)
        .send(
          buildMercadoPagoCallbackHtml({
            success: false,
            title: "Falta información para completar la conexión",
            message: "Mercado Pago no devolvió el código de autorización esperado.",
          }),
        );
    }

    const payload = verifyAccessToken(state);
    if (!payload?.sub || payload?.type !== "mp_oauth") {
      return res
        .status(400)
        .send(
          buildMercadoPagoCallbackHtml({
            success: false,
            title: "La conexión venció o no es válida",
            message: "Volvé a iniciar la conexión desde la pantalla de Cobros.",
          }),
        );
    }

    const userDoc = await UserModel.findById(payload.sub).select("+mercadoPagoAuth");
    if (!userDoc || userDoc.isActive === false) {
      return res
        .status(404)
        .send(
          buildMercadoPagoCallbackHtml({
            success: false,
            title: "No encontramos la barbería",
            message: "La cuenta usada para conectar Mercado Pago ya no está disponible.",
          }),
        );
    }

    const tokenResponse = await exchangeMercadoPagoCode({ code });
    const expiresAt = tokenResponse.expires_in
      ? new Date(Date.now() + Number(tokenResponse.expires_in) * 1000)
      : null;

    userDoc.mercadoPagoAuth = {
      accessToken: tokenResponse.access_token || null,
      refreshToken: tokenResponse.refresh_token || null,
      userId: tokenResponse.user_id ? String(tokenResponse.user_id) : null,
      publicKey: tokenResponse.public_key || null,
      scope: tokenResponse.scope || null,
      expiresAt,
      linkedAt: new Date(),
      lastRefreshAt: new Date(),
    };

    userDoc.paymentSettings = {
      ...(userDoc.paymentSettings?.toObject?.() ?? userDoc.paymentSettings ?? {}),
      mercadoPagoConnectionStatus: "connected",
      mercadoPagoSellerId: tokenResponse.user_id ? String(tokenResponse.user_id) : null,
      mercadoPagoPublicKey: tokenResponse.public_key || null,
    };

    await userDoc.save();

    return res
      .status(200)
      .send(
        buildMercadoPagoCallbackHtml({
          success: true,
          title: "Mercado Pago conectado",
          message: "La cuenta quedó vinculada a tu barbería. Ya podés volver a la app y ofrecer cobro adelantado real.",
        }),
      );
  } catch (err) {
    return next(err);
  }
}

export async function disconnectMercadoPago(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const userDoc = await UserModel.findById(userId).select("+mercadoPagoAuth");
    if (!userDoc || userDoc.isActive === false) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    userDoc.mercadoPagoAuth = null;
    userDoc.paymentSettings = {
      ...(userDoc.paymentSettings?.toObject?.() ?? userDoc.paymentSettings ?? {}),
      mercadoPagoConnectionStatus: "disconnected",
      mercadoPagoSellerId: null,
      mercadoPagoPublicKey: null,
    };

    await userDoc.save();

    return res.json({
      message: "Mercado Pago desconectado.",
      user: userDoc.toJSON(),
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateThemeConfig(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const userDoc = await UserModel.findById(userId);
    if (!userDoc || userDoc.isActive === false) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const { updates, hasAnyField } = sanitizeThemeConfigInput(req.body ?? {});
    if (!hasAnyField) {
      return res.status(400).json({ error: "No llegaron cambios de tema para guardar." });
    }

    userDoc.themeConfig = {
      ...(userDoc.themeConfig?.toObject?.() ?? userDoc.themeConfig ?? {}),
      ...updates,
    };

    await userDoc.save();

    return res.json({
      message: "Tema guardado correctamente",
      user: userDoc.toJSON(),
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
}

export async function updatePaymentSettings(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const userDoc = await UserModel.findById(userId);
    if (!userDoc || userDoc.isActive === false) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const { updates, hasAnyField } = sanitizePaymentSettingsInput(req.body ?? {});
    if (!hasAnyField) {
      return res.status(400).json({ error: "No llegaron cambios de cobro para guardar." });
    }

    userDoc.paymentSettings = {
      ...(userDoc.paymentSettings?.toObject?.() ?? userDoc.paymentSettings ?? {}),
      ...updates,
    };

    await userDoc.save();

    return res.json({
      message: "Configuración de cobro guardada correctamente",
      user: userDoc.toJSON(),
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
}

export async function updateNotificationSettings(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const userDoc = await UserModel.findById(userId);
    if (!userDoc || userDoc.isActive === false) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const { updates, hasAnyField } = sanitizeNotificationSettingsInput(req.body ?? {});
    if (!hasAnyField) {
      return res.status(400).json({ error: "No llegaron cambios de notificaciones para guardar." });
    }

    userDoc.notificationSettings = {
      ...(userDoc.notificationSettings?.toObject?.() ?? userDoc.notificationSettings ?? {}),
      ...updates,
    };

    await userDoc.save();

    return res.json({
      message: "Notificaciones guardadas correctamente",
      user: userDoc.toJSON(),
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
}

export async function updateOwnSubscriptionSettings(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const userDoc = await UserModel.findById(userId);
    if (!userDoc || userDoc.isActive === false) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const { updates, hasAnyField } = sanitizeSubscriptionInput(req.body ?? {});
    if (!hasAnyField) {
      return res.status(400).json({ error: "No llegaron cambios de suscripción para guardar." });
    }

    if (
      updates.renewalMode === "manual" &&
      userDoc.subscription?.renewalMode === "automatic" &&
      userDoc.subscription?.mercadoPagoPreapprovalId
    ) {
      try {
        await updateMercadoPagoSystemPreapproval({
          preapprovalId: userDoc.subscription.mercadoPagoPreapprovalId,
          payload: { status: "cancelled" },
        });
      } catch (err) {
        console.error("No se pudo cancelar la renovación automática en Mercado Pago:", err?.message || err);
      }

      updates.mercadoPagoPreapprovalStatus = "cancelled";
      updates.mercadoPagoPreapprovalId = null;
      updates.nextBillingAt = null;
    }

    userDoc.subscription = {
      ...(userDoc.subscription?.toObject?.() ?? userDoc.subscription ?? {}),
      ...updates,
    };

    await userDoc.save();

    return res.json({
      message: "Configuración de suscripción guardada correctamente.",
      user: userDoc.toJSON(),
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
}

export async function getPlanPricingAdmin(req, res, next) {
  try {
    const pricingDoc = await getOrCreatePlanPricing();
    return res.json({ pricing: serializePlanPricing(pricingDoc) });
  } catch (err) {
    return next(err);
  }
}

export async function listSubscriptionCouponsAdmin(req, res, next) {
  try {
    const coupons = await SubscriptionCouponModel.find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      coupons: coupons.map(serializeSubscriptionCoupon),
    });
  } catch (err) {
    return next(err);
  }
}

export async function createSubscriptionCouponAdmin(req, res, next) {
  try {
    const { updates } = sanitizeSubscriptionCouponInput(req.body ?? {});

    const existing = await SubscriptionCouponModel.findOne({ code: updates.code }).lean();
    if (existing) {
      return res.status(409).json({ error: "Ya existe un cupón con ese código." });
    }

    const coupon = await SubscriptionCouponModel.create(updates);

    return res.status(201).json({
      message: "Cupón creado correctamente.",
      coupon: serializeSubscriptionCoupon(coupon.toJSON()),
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
}

export async function updateSubscriptionCouponAdmin(req, res, next) {
  try {
    const couponId = String(req.params?.couponId || "").trim();
    if (!couponId) {
      return res.status(400).json({ error: "Falta el cupón a actualizar." });
    }

    const { updates, hasAnyField } = sanitizeSubscriptionCouponInput(req.body ?? {}, {
      partial: true,
    });
    if (!hasAnyField) {
      return res.status(400).json({ error: "No llegaron cambios del cupón para guardar." });
    }

    if (updates.code) {
      const existing = await SubscriptionCouponModel.findOne({
        code: updates.code,
        _id: { $ne: couponId },
      }).lean();
      if (existing) {
        return res.status(409).json({ error: "Ya existe otro cupón con ese código." });
      }
    }

    const coupon = await SubscriptionCouponModel.findByIdAndUpdate(
      couponId,
      updates,
      { new: true },
    ).lean();

    if (!coupon) {
      return res.status(404).json({ error: "Cupón no encontrado." });
    }

    return res.json({
      message: "Cupón actualizado correctamente.",
      coupon: serializeSubscriptionCoupon(coupon),
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
}

export async function updatePlanPricingAdmin(req, res, next) {
  try {
    const { updates, hasAnyField } = sanitizePlanPricingInput(req.body ?? {});
    if (!hasAnyField) {
      return res.status(400).json({ error: "No llegaron cambios de precios para guardar." });
    }

    const pricingDoc = await getOrCreatePlanPricing();
    const previousPricing = serializePlanPricing(pricingDoc);
    Object.assign(pricingDoc, updates);
    await pricingDoc.save();
    const nextPricing = serializePlanPricing(pricingDoc);

    const changedPlans = ["basic", "pro"].filter((plan) => {
      const previousAmount = Number(previousPricing?.[plan]?.ars || 0);
      const nextAmount = Number(nextPricing?.[plan]?.ars || 0);
      return previousAmount > 0 && nextAmount > 0 && previousAmount !== nextAmount;
    });

    let notifiedUsers = 0;
    if (changedPlans.length) {
      const usersToNotify = await UserModel.find({
        "subscription.status": "active",
        "subscription.plan": { $in: changedPlans },
        $and: [
          {
            $or: [
              { "subscription.customPriceArs": null },
              { "subscription.customPriceArs": { $exists: false } },
              { "subscription.customPriceArs": 0 },
            ],
          },
          {
            $or: [
              { "subscription.customPriceUsdReference": null },
              { "subscription.customPriceUsdReference": { $exists: false } },
              { "subscription.customPriceUsdReference": 0 },
            ],
          },
        ],
      }).select({
        email: 1,
        fullName: 1,
        pushToken: 1,
        subscription: 1,
      });

      const results = await Promise.allSettled(
        usersToNotify.map(async (userDoc) => {
          const plan = String(userDoc.subscription?.plan || "").trim();
          if (!changedPlans.includes(plan)) return false;

          await notifySubscriptionPriceChange({
            userDoc,
            plan,
            previousAmountArs: previousPricing[plan]?.ars,
            nextAmountArs: nextPricing[plan]?.ars,
            effectiveAt: userDoc.subscription?.nextBillingAt || userDoc.subscription?.expiresAt || null,
          });
          return true;
        }),
      );

      notifiedUsers = results.filter((result) => result.status === "fulfilled" && result.value).length;
    }

    return res.json({
      message: "Precios actualizados correctamente.",
      pricing: serializePlanPricing(pricingDoc),
      notifiedUsers,
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
}

export async function listSubscriptionUsers(req, res, next) {
  try {
    const search = String(req.query?.search ?? "").trim().toLowerCase();

    const users = await UserModel.find({})
      .sort({ createdAt: -1 })
      .select({
        fullName: 1,
        email: 1,
        shopSlug: 1,
        role: 1,
        isActive: 1,
        createdAt: 1,
        subscription: 1,
      })
      .lean();

    const filtered = users.filter((user) => {
      if (!search) return true;
      return [user.fullName, user.email, user.shopSlug]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });

    return res.json({
      users: filtered.map((user) => ({
        _id: String(user._id),
        fullName: user.fullName,
        email: user.email,
        shopSlug: user.shopSlug,
        role: user.role,
        isActive: Boolean(user.isActive),
        createdAt: user.createdAt,
        subscription: user.subscription ?? {
          plan: "basic",
          status: "trial",
          billingCycle: "monthly",
          startedAt: null,
          expiresAt: null,
        },
      })),
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateSubscriptionUser(req, res, next) {
  try {
    const userId = String(req.params?.userId ?? "").trim();
    if (!userId) {
      return res.status(400).json({ error: "Falta el usuario a actualizar." });
    }

    const { updates, hasAnyField } = sanitizeSubscriptionInput(req.body ?? {});
    if (!hasAnyField) {
      return res.status(400).json({ error: "No llegaron cambios de suscripción para guardar." });
    }

    const userDoc = await UserModel.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ error: "No encontramos esa cuenta." });
    }

    userDoc.subscription = {
      ...(userDoc.subscription?.toObject?.() ?? userDoc.subscription ?? {}),
      ...updates,
    };

    await userDoc.save();

    return res.json({
      message: "Suscripción actualizada correctamente.",
      user: {
        _id: String(userDoc._id),
        fullName: userDoc.fullName,
        email: userDoc.email,
        shopSlug: userDoc.shopSlug,
        subscription: userDoc.subscription,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
}

export async function runSubscriptionLifecycle(req, res, next) {
  try {
    if (!isSubscriptionLifecycleAuthorized(req)) {
      return res.status(401).json({ error: "No autorizado para correr el cron de suscripciones." });
    }

    const result = await processSubscriptionLifecycle({ now: new Date() });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

export async function updatePassword(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const currentPassword = String(req.body?.currentPassword ?? "");
    const newPassword = String(req.body?.newPassword ?? "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "La contraseña actual y la nueva son obligatorias." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres." });
    }

    const userDoc = await UserModel.findById(userId).select("+passwordHash");
    if (!userDoc || userDoc.isActive === false) {
      return res.status(401).json({ error: "Usuario no autorizado" });
    }

    const isValidPassword = await verifyPassword(currentPassword, userDoc.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({ error: "La contraseña actual no coincide." });
    }

    userDoc.passwordHash = await hashPassword(newPassword);
    await userDoc.save();

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    return next(err);
  }
}

export async function requestPasswordRecovery(req, res, next) {
  try {
    const email = sanitizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ error: "El email es obligatorio." });
    }

    const userDoc = await UserModel.findOne({ email, isActive: true });
    if (!userDoc) {
      return res.json({
        message: "Si existe una cuenta con ese mail, enviamos un código de recuperación.",
      });
    }

    const code = buildPasswordResetCode();
    userDoc.passwordResetCodeHash = hashPasswordResetCode(code);
    userDoc.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);
    await userDoc.save();

    await sendPasswordRecoveryEmail({
      email: userDoc.email,
      fullName: userDoc.fullName,
      code,
    });

    return res.json({
      message: "Te mandamos un código al mail para recuperar la contraseña.",
    });
  } catch (err) {
    return next(err);
  }
}

export async function confirmPasswordRecovery(req, res, next) {
  try {
    const email = sanitizeEmail(req.body?.email);
    const code = String(req.body?.code ?? "").trim();
    const newPassword = String(req.body?.newPassword ?? "");

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Email, código y nueva contraseña son obligatorios." });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "El código debe tener 6 números." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres." });
    }

    const userDoc = await UserModel.findOne({ email, isActive: true }).select(
      "+passwordResetCodeHash +passwordResetExpiresAt +passwordHash",
    );

    if (!userDoc || !userDoc.passwordResetCodeHash || !userDoc.passwordResetExpiresAt) {
      return res.status(400).json({ error: "El código es inválido o ya no sirve." });
    }

    if (new Date(userDoc.passwordResetExpiresAt).getTime() < Date.now()) {
      userDoc.passwordResetCodeHash = null;
      userDoc.passwordResetExpiresAt = null;
      await userDoc.save();
      return res.status(400).json({ error: "El código venció. Pedí uno nuevo." });
    }

    if (userDoc.passwordResetCodeHash !== hashPasswordResetCode(code)) {
      return res.status(400).json({ error: "El código es inválido o ya no sirve." });
    }

    userDoc.passwordHash = await hashPassword(newPassword);
    userDoc.passwordResetCodeHash = null;
    userDoc.passwordResetExpiresAt = null;
    await userDoc.save();

    return res.json({ message: "Tu contraseña nueva ya quedó guardada." });
  } catch (err) {
    return next(err);
  }
}

export async function savePushToken(req, res) {
  try {
    const userId = req.user?.id; // <--- Ahora sí vendrá en .id gracias al middleware
    const { token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    await UserModel.findByIdAndUpdate(userId, { pushToken: token });

    console.log("✅ TOKEN GUARDADO EXITOSAMENTE PARA EL USUARIO:", userId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Error en savePushToken:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}
