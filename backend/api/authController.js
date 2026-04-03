import { UserModel } from "../models/User.js";
import { hashPassword, verifyPassword } from "../token/passwordManager.js";
import { signAccessToken } from "../token/jwtManager.js";
import crypto from "crypto";
import {
  getMailerDebugInfo,
  sendAppMail,
  verifyMailerConnection,
} from "../services/mailer.js";

const PASSWORD_RESET_EXPIRY_MS = 15 * 60 * 1000;

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
      // no aceptar role desde el cliente
    });

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      user: userDoc.toJSON(),
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
