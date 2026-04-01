import nodemailer from "nodemailer";

const MAIL_USER = String(process.env.MAIL_USER ?? "").trim();
const MAIL_APP_PASSWORD = String(process.env.MAIL_APP_PASSWORD ?? "").trim();
const MAIL_FROM_NAME = String(process.env.MAIL_FROM_NAME ?? "BarberApp by CODEX®").trim();

let transporter;

function buildTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: MAIL_USER,
      pass: MAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

export function getMailerConfigError() {
  if (!MAIL_USER) {
    return "Falta configurar MAIL_USER en backend/.env.";
  }
  if (!MAIL_APP_PASSWORD) {
    return "Falta configurar MAIL_APP_PASSWORD en backend/.env.";
  }
  return null;
}

export async function sendAppMail({
  to,
  subject,
  html,
  text,
}) {
  const configError = getMailerConfigError();
  if (configError) {
    throw new Error(configError);
  }

  try {
    const activeTransporter = buildTransporter();
    return await activeTransporter.sendMail({
      from: `"${MAIL_FROM_NAME}" <${MAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    const message = String(err?.message ?? err ?? "Error desconocido");

    if (/Invalid login/i.test(message)) {
      throw new Error(
        "Gmail rechazo el login del correo. Revisa MAIL_USER y MAIL_APP_PASSWORD en backend/.env.",
      );
    }

    throw new Error(`No se pudo enviar el mail: ${message}`);
  }
}
