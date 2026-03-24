import { UserModel } from "../models/User.js";
import { hashPassword, verifyPassword } from "../token/passwordManager.js";
import { signAccessToken } from "../token/jwtManager.js";

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