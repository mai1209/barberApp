import mongoose from "mongoose";

const DEFAULT_URI = "mongodb+srv://mairacoria1209_db_user:barberiaApp12@barberiaapp.gs7mwz3.mongodb.net/barberiaApp?retryWrites=true&w=majority";
const DEFAULT_DB_NAME = "barberiaApp";
const DEFAULT_TIMEOUT = 15000;

let mongoReadyPromise;

export async function connectMongo() {
  if (mongoReadyPromise && mongoose.connection.readyState === 1) return mongoReadyPromise;

  // El .trim() elimina los espacios invisibles que nos estaban rompiendo todo
  const uri = (process.env.MONGODB_URI ?? DEFAULT_URI).trim();
  const dbName = (process.env.MONGODB_DB_NAME ?? DEFAULT_DB_NAME).trim();
  const timeout = Number(process.env.MONGODB_TIMEOUT_MS ?? DEFAULT_TIMEOUT);

  mongoose.set("strictQuery", true);

  try {
    mongoReadyPromise = mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: timeout,
    });

    await mongoReadyPromise;
    console.log(`[MongoDB] ✅ Conectado exitosamente a la DB: ${dbName}`);
    return mongoReadyPromise;
  } catch (err) {
    console.error("[MongoDB] ❌ Error de conexión:", err.message);
    mongoReadyPromise = null;
    throw err;
  }
}