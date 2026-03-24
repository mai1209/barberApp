import admin from "firebase-admin";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
let serviceAccount;

// 1. Intentamos leer la variable de entorno de Vercel (Producción)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error("Error parseando FIREBASE_SERVICE_ACCOUNT:", error);
  }
} else {
  // 2. Si no hay variable (estás en local), usamos el archivo físico
  // Usamos require() para evitar el error de 'assert'
  serviceAccount = require("./firebase-key.json");
}

// Inicializar solo si no se inicializó antes (evita errores en Hot Reload)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;