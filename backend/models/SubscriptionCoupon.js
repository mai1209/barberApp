import mongoose from "mongoose";

const subscriptionCouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["basic", "pro", null],
      default: null,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    benefitDurationType: {
      type: String,
      enum: ["forever", "one_time", "months"],
      default: "forever",
    },
    benefitDurationValue: {
      type: Number,
      default: null,
      min: 1,
    },
    maxRedemptions: {
      type: Number,
      default: null,
      min: 1,
    },
    redemptionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    internalNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const SubscriptionCouponModel =
  mongoose.models.SubscriptionCoupon ??
  mongoose.model("SubscriptionCoupon", subscriptionCouponSchema);
