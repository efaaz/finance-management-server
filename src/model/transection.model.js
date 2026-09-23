import mongoose, { Schema } from "mongoose";

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

    date: {
      type: Date,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

transactionSchema.index({
  userId: 1,
  date: -1,
});

export const Transaction = mongoose.model(
  "Transaction",
  transactionSchema,
);