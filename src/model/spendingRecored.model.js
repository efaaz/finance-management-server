import mongoose, { Schema } from "mongoose";
import { SUPPORTED_CURRENCIES } from "../utils/supportedCurrency.js";

const spendingRecordSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dailyRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DailyRecord",
      required: true,
    },

    // YYYY-MM-DD
    date: {
      type: String,
      required: true,
    },

    spending: {
      type: Map,
      of: Number,
      default: {},
    },
    currency: {
      type: String,
      enum: SUPPORTED_CURRENCIES,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

spendingRecordSchema.index({ user: 1, date: 1, currency: 1 }, { unique: true });

export const SpendingRecord = mongoose.model(
  "SpendingRecord",
  spendingRecordSchema
);
