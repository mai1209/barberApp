import { Router } from "express";
import {
  publicBarberAppointments,
  publicCreateRecurringSubscriptionCheckout,
  publicCreateSubscriptionCheckout,
  publicCreateAppointment,
  publicCreateWaitlistEntry,
  publicListBarbers,
  publicGetPlanPricing,
  publicGetShop,
  publicListServices,
} from "../api/publicController.js";

const router = Router();

router.get("/plans", publicGetPlanPricing);
router.post("/subscriptions/checkout", publicCreateSubscriptionCheckout);
router.post("/subscriptions/recurring/start", publicCreateRecurringSubscriptionCheckout);
router.get("/shops/:shopSlug", publicGetShop);
router.get("/shops/:shopSlug/barbers", publicListBarbers);
router.get("/shops/:shopSlug/barbers/:barberId/appointments", publicBarberAppointments);
router.get("/shops/:shopSlug/services", publicListServices);
router.post("/shops/:shopSlug/appointments", publicCreateAppointment);
router.post("/shops/:shopSlug/waitlist", publicCreateWaitlistEntry);

export default router;
 
