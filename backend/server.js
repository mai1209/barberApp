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

// 1. Middleware de Conexión (Asegura que Mongo esté listo antes de cada consulta)
app.use(async (req, res, next) => {
  try {
    await connectMongo();
    next();
  } catch (err) {
    res.status(500).json({ error: "Error de conexión a la base de datos" });
  }
});

// 2. Ruta de Bienvenida (Para que la URL principal no tire 404)
app.get('/', (req, res) => {
  res.status(200).json({
    message: "🚀 BarberApp Backend Online - Powered by CODEX®",
    status: "Ready",
    database: "Connected"
  });
});

// 3. Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/public', publicRoutes);

// 4. Manejo de Errores (Siempre al final)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

// Solo para desarrollo local
if (process.env.NODE_ENV !== 'production') {
  const PORT = Number(process.env.PORT ?? 3002);
  app.listen(PORT, () => {
    console.log(`🚀 Servidor local corriendo en http://localhost:${PORT}`);
  });
}