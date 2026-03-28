import { Router } from "express";
import { getCurrentUser, loginUser, registerUser } from "../api/authController.js";
import { savePushToken } from "../api/authController.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = Router();


//defino las rutas login y registro
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", requireAuth, getCurrentUser);
router.post("/save-push-token", requireAuth, savePushToken);
export default router;
