import mongoose, { Schema } from "mongoose";
import { SUPPORTED_CURRENCIES } from "../utils/supportedCurrency.js";

const dailyRecordSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    currency: {
      type: String,
      enum: SUPPORTED_CURRENCIES,
      required: true,
    },

    // YYYY-MM-DD
    date: {
      type: String,
      required: true,
    },

    totalIncome: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalSpending: {
      type: Number,
      default: 0,
      min: 0,
    },

    netIncome: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

dailyRecordSchema.index({ user: 1, date: 1, currency: 1 }, { unique: true });

export const dailyRecord = mongoose.model("DailyRecord", dailyRecordSchema);
