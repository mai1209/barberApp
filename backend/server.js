import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectMongo } from "./database/connectMongo.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import barberRoutes from "./routes/barberRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Conexión a MongoDB (Intentamos conectar apenas arranca la función)
// Middleware para asegurar conexión en cada request de Vercel
app.use(async (req, res, next) => {
  try {
    await connectMongo();
    next();
  } catch (err) {
    res.status(500).json({ error: "Error de conexión a la base de datos" });
  }
});
// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/public', publicRoutes);

// Manejadores de errores
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * EXPLICACIÓN PARA CODEX®:
 * En Vercel no usamos app.listen(). Vercel "envuelve" esta app y la ejecuta 
 * cuando llega un request. Por eso exportamos 'app' como default.
 */
export default app;


// Solo ejecutamos el servidor manualmente si estamos en nuestra compu (Local)
if (process.env.NODE_ENV !== 'production') {
  const PORT = Number(process.env.PORT ?? 3002);
  app.listen(PORT, () => {
    console.log(`🚀 Servidor local corriendo en http://localhost:${PORT}`);
  });
}