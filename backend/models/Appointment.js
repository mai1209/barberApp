import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    barber: {
      type: mongoose.Types.ObjectId,
      ref: "Barber",
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    service: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: 15,
      max: 240,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

appointmentSchema.index({ owner: 1, barber: 1, startTime: 1 });

export const AppointmentModel =
  mongoose.models.Appointment ??
  mongoose.model("Appointment", appointmentSchema);
