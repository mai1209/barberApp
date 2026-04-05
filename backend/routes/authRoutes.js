import { Router } from "express";
import {
  confirmPasswordRecovery,
  createSubscriptionCheckout,
  disconnectMercadoPago,
  getMailDebug,
  getPlanPricingAdmin,
  getCurrentUser,
  getMercadoPagoConnectionStatus,
  getMercadoPagoConnectUrl,
  handleMercadoPagoOAuthCallback,
  loginUser,
  requestPasswordRecovery,
  registerUser,
  runSubscriptionLifecycle,
  sendTestMail,
  listSubscriptionUsers,
  updatePaymentSettings,
  updatePassword,
  updateNotificationSettings,
  updatePlanPricingAdmin,
  updateOwnSubscriptionSettings,
  updateSubscriptionUser,
  updateThemeConfig,
} from "../api/authController.js";
import { savePushToken } from "../api/authController.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";
import { requireAdminPanelSecret } from "../middlewares/adminPanelMiddleware.js";

const router = Router();


//defino las rutas login y registro
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/password/recovery/request", requestPasswordRecovery);
router.post("/password/recovery/confirm", confirmPasswordRecovery);
router.get("/mercadopago/callback", handleMercadoPagoOAuthCallback);
router.get("/subscription/lifecycle/run", runSubscriptionLifecycle);
router.post("/subscription/lifecycle/run", runSubscriptionLifecycle);
router.get("/mail-debug", requireAuth, getMailDebug);
router.get("/me", requireAuth, getCurrentUser);
router.get("/mercadopago/status", requireAuth, getMercadoPagoConnectionStatus);
router.get("/mercadopago/connect", requireAuth, getMercadoPagoConnectUrl);
router.delete("/mercadopago/connect", requireAuth, disconnectMercadoPago);
router.post("/subscription/checkout", requireAuth, createSubscriptionCheckout);
router.put("/password", requireAuth, updatePassword);
router.put("/theme", requireAuth, updateThemeConfig);
router.put("/payment-settings", requireAuth, updatePaymentSettings);
router.put("/notification-settings", requireAuth, updateNotificationSettings);
router.put("/subscription-settings", requireAuth, updateOwnSubscriptionSettings);
router.post("/test-mail", requireAuth, sendTestMail);
router.post("/save-push-token", requireAuth, savePushToken);
router.get("/admin/subscriptions", requireAdminPanelSecret, listSubscriptionUsers);
router.patch("/admin/subscriptions/:userId", requireAdminPanelSecret, updateSubscriptionUser);
router.get("/admin/plan-pricing", requireAdminPanelSecret, getPlanPricingAdmin);
router.put("/admin/plan-pricing", requireAdminPanelSecret, updatePlanPricingAdmin);
export default router;
