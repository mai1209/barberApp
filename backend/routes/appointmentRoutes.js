import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddlewares.js";
import {
  createAppointment,
  listAppointments,
  updateAppointmentStatus,
  listServices,
  deleteAppointment
} from "../api/appointmentController.js";

const router = Router();

router.use(requireAuth);

router.get("/services", listServices);
router.get("/", listAppointments);
router.post("/", createAppointment);
router.delete('/:appointmentId',  deleteAppointment);

router.patch("/:appointmentId", updateAppointmentStatus);

export default router;
