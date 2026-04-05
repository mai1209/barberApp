
import mongoose from "mongoose";

const themeConfigSchema = new mongoose.Schema(
  {
    primary: { type: String, trim: true, default: null },
    secondary: { type: String, trim: true, default: null },
    card: { type: String, trim: true, default: null },
    gradientColors: {
      type: [String],
      default: [],
    },
    logoDataUrl: { type: String, default: null },
    bannerDataUrl: { type: String, default: null },
    mobileBannerDataUrl: { type: String, default: null },
  },
  {
    _id: false,
  },
);

const paymentSettingsSchema = new mongoose.Schema(
  {
    cashEnabled: { type: Boolean, default: true },
    advancePaymentEnabled: { type: Boolean, default: false },
    advanceMode: {
      type: String,
      enum: ["deposit", "full"],
      default: "deposit",
    },
    advanceType: {
      type: String,
      enum: ["percent", "fixed"],
      default: "percent",
    },
    advanceValue: { type: Number, default: 30, min: 0 },
    mercadoPagoConnectionStatus: {
      type: String,
      enum: ["disconnected", "pending", "connected"],
      default: "disconnected",
    },
    mercadoPagoSellerId: { type: String, default: null },
    mercadoPagoPublicKey: { type: String, default: null },
  },
  {
    _id: false,
  },
);

const mercadoPagoAuthSchema = new mongoose.Schema(
  {
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    userId: { type: String, default: null },
    publicKey: { type: String, default: null },
    scope: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    linkedAt: { type: Date, default: null },
    lastRefreshAt: { type: Date, default: null },
  },
  {
    _id: false,
  },
);

const notificationSettingsSchema = new mongoose.Schema(
  {
    barberReminderEnabled: { type: Boolean, default: true },
    barberReminderMinutesBefore: {
      type: Number,
      enum: [15, 30, 60, 120, 180, 1440],
      default: 60,
    },
    customerSameDayEmailEnabled: { type: Boolean, default: true },
  },
  {
    _id: false,
  },
);

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ["basic", "pro", "custom"],
      default: "basic",
    },
    status: {
      type: String,
      enum: ["trial", "active", "past_due", "cancelled"],
      default: "trial",
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly", "custom", null],
      default: "monthly",
    },
    renewalMode: {
      type: String,
      enum: ["manual", "automatic"],
      default: "manual",
    },
    customPriceArs: {
      type: Number,
      default: null,
      min: 0,
    },
    customPriceUsdReference: {
      type: Number,
      default: null,
      min: 0,
    },
    internalNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 400,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    pendingPlan: {
      type: String,
      enum: ["basic", "pro", "custom", null],
      default: null,
    },
    mercadoPagoPreferenceId: {
      type: String,
      default: null,
    },
    mercadoPagoPreapprovalId: {
      type: String,
      default: null,
    },
    mercadoPagoPreapprovalStatus: {
      type: String,
      default: null,
    },
    mercadoPagoPaymentId: {
      type: String,
      default: null,
    },
    nextBillingAt: {
      type: Date,
      default: null,
    },
    lastPaymentAt: {
      type: Date,
      default: null,
    },
    renewalReminder7dAt: {
      type: Date,
      default: null,
    },
    renewalReminder3dAt: {
      type: Date,
      default: null,
    },
    renewalReminder1dAt: {
      type: Date,
      default: null,
    },
    pastDueAt: {
      type: Date,
      default: null,
    },
    pastDueReminderSentAt: {
      type: Date,
      default: null,
    },
    graceUntil: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      required: true,
      minlength: 3,
      maxlength: 120,
    },
    shopSlug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
      minlength: 3,
      maxlength: 80,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/,
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 10,
    },
    role: {
      type: String,
      enum: ["admin", "technician", "viewer"],
      default: "technician",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    pushToken:{
      type:String,
      default:null,
    },
    passwordResetCodeHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    themeConfig: {
      type: themeConfigSchema,
      default: () => ({}),
    },
    paymentSettings: {
      type: paymentSettingsSchema,
      default: () => ({}),
    },
    mercadoPagoAuth: {
      type: mercadoPagoAuthSchema,
      default: null,
      select: false,
    },
    notificationSettings: {
      type: notificationSettingsSchema,
      default: () => ({}),
    },
    subscription: {
      type: subscriptionSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
 
);

//userSchema.index({ email: 1 }, { unique: true });

userSchema.method("toJSON", function toJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.passwordResetCodeHash;
  delete obj.passwordResetExpiresAt;
  return obj;
});

export const UserModel = mongoose.models.User ?? mongoose.model("User", userSchema);
