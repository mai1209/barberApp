import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddlewares.js";
import {
  createBarber,
  listBarbers,
  listBarberAppointments,
} from "../api/barberController.js";

const router = Router();

// Rutas privadas (la web pública usa /api/public/shops/:slug/*)
router.use(requireAuth);
router.get("/", listBarbers);
router.get("/:barberId/appointments", listBarberAppointments);
router.post("/", createBarber);

export default router;
