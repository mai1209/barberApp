import { Router } from "express";
import { handleMercadoPagoWebhook } from "../api/paymentController.js";

const router = Router();

router.post("/mercadopago/webhook", handleMercadoPagoWebhook);

export default router;

