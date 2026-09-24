import mongoose, { Schema } from "mongoose";
import { SUPPORTED_CURRENCIES } from "../utils/supportedCurrency.js";

const transactionSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    type: {
      type: String,
      enum: ["income", "spending"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: SUPPORTED_CURRENCIES,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({
  userId: 1,
  date: -1,
});

export const Transaction = mongoose.model("Transaction", transactionSchema);
