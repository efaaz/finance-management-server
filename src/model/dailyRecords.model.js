import mongoose, { Schema } from "mongoose";

const dailyRecordSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
    }, // Format: YYYY-MM-DD
    totalIncome: {
      type: Number,
      default: 0,
    },
    totalSpending: {
      type: Number,
      default: 0,
    },
    netIncome: { type: Number, default: 0 },
  },
  { timestamps: true }
);

dailyRecordSchema.index({ user: 1, date: 1 }, { unique: true }); // Ensure unique daily records per user and date
export const dailyRecord = mongoose.model("DailyRecord", dailyRecordSchema);
