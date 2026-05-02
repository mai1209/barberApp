import mongoose from "mongoose";

const waitlistEntrySchema = new mongoose.Schema(
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
    shopSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    desiredDate: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    customerPhone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
    },
    serviceLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 15,
      max: 240,
    },
    status: {
      type: String,
      enum: ["active", "notified", "fulfilled", "cancelled"],
      default: "active",
      index: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    lastNotifiedAt: {
      type: Date,
      default: null,
    },
    notificationsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

waitlistEntrySchema.index({
  owner: 1,
  barber: 1,
  desiredDate: 1,
  customerEmail: 1,
  status: 1,
});

export const WaitlistEntryModel =
  mongoose.models.WaitlistEntry ??
  mongoose.model("WaitlistEntry", waitlistEntrySchema);
