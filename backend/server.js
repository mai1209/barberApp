
import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectMongo } from "./database/connectMongo.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import barberRoutes from "./routes/barberRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";



//inicio express como nombre app
const app = express();

//seteo cors
app.use(cors())

//transformo en json
app.use(express.json())

//defino puerto en variable y host en variable
const PORT = Number(process.env.PORT ?? 3002)
const HOST = process.env.Host ?? '0.0.0.0'



//rutas

app.use('/api/auth', authRoutes)
app.use('/api/barbers', barberRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/public', publicRoutes)


//manejadores de errores (AL FINAL)
app.use(notFoundHandler);
app.use(errorHandler);




//FUNCION PARA INICIAR EL SERVIDOR 
async function startServer() {
  try {
    await connectMongo();

    app.listen(PORT, HOST, () => {
      console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("Error iniciando servidor:", err);
    process.exit(1);
  }
}

startServer();
