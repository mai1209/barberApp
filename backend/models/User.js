
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
