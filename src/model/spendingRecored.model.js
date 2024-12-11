import mongoose, { Schema } from "mongoose";

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
    date: {
      type: String,
      required: true,
    }, // Format: YYYY-MM-DD
    spending: {
      type: Map,
      of: Number,
      required: true,
      default: {},
    }, // Key-value pair of categories and their amounts
  },
  { timestamps: true }
);
spendingRecordSchema.index({ user: 1, date: 1 }); // Index for efficient querying by user and date

export const spendingRecored = mongoose.model(
  "SpendingRecord",
  spendingRecordSchema
);
