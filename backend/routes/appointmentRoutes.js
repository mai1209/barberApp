import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddlewares.js";
import {
  createAppointment,
  listAppointments,
  updateAppointmentStatus,
  listServices,
  createService,
  updateService,
  deleteService,
  deleteAppointment,
  getAppointmentMetrics,
  getCurrentMonthOverview,
  getCustomerHistory,
} from "../api/appointmentController.js";

const router = Router();

router.use(requireAuth);

router.get("/services", listServices);
router.post("/services", createService);
router.put("/services/:serviceId", updateService);
router.delete("/services/:serviceId", deleteService);
router.get("/metrics", getAppointmentMetrics);
router.get("/month-overview", getCurrentMonthOverview);
router.get("/history", getCustomerHistory);
router.get("/", listAppointments);
router.post("/", createAppointment);
router.delete('/:appointmentId',  deleteAppointment);

router.patch("/:appointmentId", updateAppointmentStatus);

export default router;
