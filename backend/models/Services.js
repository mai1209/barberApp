import { Schema, model } from "mongoose";

const ServiceSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  durationMinutes: { type: Number, required: true, default: 30 },
  price: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

export const ServiceModel = model("Service", ServiceSchema);
