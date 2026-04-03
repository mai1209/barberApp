import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectMongo } from "./database/connectMongo.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import barberRoutes from "./routes/barberRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

const app = express();

// --- CONFIGURACIÓN DE CORS ---
// Esto permite que tu Frontend en Vercel pueda hablar con este Backend
app.use(cors({
  origin: function (origin, callback) {
    const whitelist = [
      "http://localhost:3000",
      "https://barberappbycodex.com",
      "https://www.barberappbycodex.com", 
      "https://barber-app-evf4.vercel.app",
      
    ];
    // Si el origin está en la lista O si no hay origin (App móvil), permitimos
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json({ limit: "8mb" }));

// 1. Middleware de Conexión
app.use(async (req, res, next) => {
  try {
    await connectMongo();
    next();
  } catch (err) {
    res.status(500).json({ error: "Error de conexión a la base de datos" });
  }
});

// 2. Ruta de Bienvenida
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
app.use('/api/payments', paymentRoutes);

// 4. Manejadores de errores
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

if (process.env.NODE_ENV !== 'production') {
  const PORT = Number(process.env.PORT ?? 3002);
  app.listen(PORT, () => {
    console.log(`🚀 Servidor local corriendo en http://localhost:${PORT}`);
  });
}
