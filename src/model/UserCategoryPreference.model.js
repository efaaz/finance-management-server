import mongoose, { Schema } from "mongoose";

const userCategoryPreferenceSchema = new Schema(
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

    isDisabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userCategoryPreferenceSchema.index(
  { userId: 1, categoryId: 1 },
  { unique: true }
);

export const UserCategoryPreference = mongoose.model(
  "UserCategoryPreference",
  userCategoryPreferenceSchema
);
