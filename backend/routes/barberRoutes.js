import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddlewares.js";
import {
  createBarber,
  listBarbers,
  listBarberAppointments,
} from "../api/barberController.js";

const router = Router();

// 1. ESTA RUTA DEBE SER PÚBLICA (Para que la web vea a Xime, Kevin, etc.)
router.get("/", listBarbers);

// 2. ESTA TAMBIÉN DEBE SER PÚBLICA (Para que la web vea qué turnos están ocupados)
router.get("/:barberId/appointments", listBarberAppointments);

// --- A partir de aquí, SI pedimos autenticación ---
router.use(requireAuth); 

// 3. SOLO EL ADMIN PUEDE CREAR UN BARBERO
router.post("/", createBarber);

export default router;