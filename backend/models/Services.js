import { Schema, model } from "mongoose";

const ServiceSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  durationMinutes: { type: Number, required: true, default: 30 },
  bufferAfterMinutes: { type: Number, default: null, min: 0, max: 120 },
  price: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

ServiceSchema.index({ owner: 1, isActive: 1, name: 1 });

export const ServiceModel = model("Service", ServiceSchema);
