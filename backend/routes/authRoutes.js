import { Router } from "express";
import {
  confirmPasswordRecovery,
  disconnectMercadoPago,
  getMailDebug,
  getCurrentUser,
  getMercadoPagoConnectionStatus,
  getMercadoPagoConnectUrl,
  handleMercadoPagoOAuthCallback,
  loginUser,
  requestPasswordRecovery,
  registerUser,
  sendTestMail,
  updatePaymentSettings,
  updatePassword,
  updateThemeConfig,
} from "../api/authController.js";
import { savePushToken } from "../api/authController.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = Router();


//defino las rutas login y registro
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/password/recovery/request", requestPasswordRecovery);
router.post("/password/recovery/confirm", confirmPasswordRecovery);
router.get("/mercadopago/callback", handleMercadoPagoOAuthCallback);
router.get("/mail-debug", requireAuth, getMailDebug);
router.get("/me", requireAuth, getCurrentUser);
router.get("/mercadopago/status", requireAuth, getMercadoPagoConnectionStatus);
router.get("/mercadopago/connect", requireAuth, getMercadoPagoConnectUrl);
router.delete("/mercadopago/connect", requireAuth, disconnectMercadoPago);
router.put("/password", requireAuth, updatePassword);
router.put("/theme", requireAuth, updateThemeConfig);
router.put("/payment-settings", requireAuth, updatePaymentSettings);
router.post("/test-mail", requireAuth, sendTestMail);
router.post("/save-push-token", requireAuth, savePushToken);
export default router;
