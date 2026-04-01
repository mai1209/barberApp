import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddlewares.js";
import {
  createBarber,
  deactivateBarber,
  listBarbers,
  listBarberAppointments,
  updateBarber,
} from "../api/barberController.js";

const router = Router();

// Rutas privadas (la web pública usa /api/public/shops/:slug/*)
router.use(requireAuth);
router.get("/", listBarbers);
router.get("/:barberId/appointments", listBarberAppointments);
router.post("/", createBarber);
router.put("/:barberId", updateBarber);
router.delete("/:barberId", deactivateBarber);

export default router;
