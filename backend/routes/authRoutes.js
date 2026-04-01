import { Router } from "express";
import {
  confirmPasswordRecovery,
  getCurrentUser,
  loginUser,
  requestPasswordRecovery,
  registerUser,
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
router.get("/me", requireAuth, getCurrentUser);
router.put("/password", requireAuth, updatePassword);
router.put("/theme", requireAuth, updateThemeConfig);
router.post("/save-push-token", requireAuth, savePushToken);
export default router;
