import mongoose, { Schema } from "mongoose";

const reportSchema = new Schema(
  {
    reportCode: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Issue title is required"],
      trim: true,
      minlength: [5, "Issue title is too short"],
      maxlength: [150, "Issue title is too long"],
    },

    description: {
      type: String,
      required: [true, "Issue description is required"],
      trim: true,
      minlength: [10, "Please provide more details about the issue"],
      maxlength: [5000, "Issue description is too long"],
    },

    category: {
      type: String,
      enum: ["bug", "transaction", "account", "technical", "other"],
      required: [true, "Report category is required"],
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      required: true,
    },

    stepsToReproduce: {
      type: String,
      trim: true,
      maxlength: [5000, "Steps to reproduce are too long"],
      default: "",
    },

    status: {
      type: String,
      enum: ["open", "in-progress", "resolved"],
      default: "open",
      index: true,
    },

    adminResponse: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    // Store the environment when the report
    // is submitted. Useful for debugging.
    environment: {
      browser: {
        type: String,
        default: "",
        trim: true,
      },

      platform: {
        type: String,
        default: "",
        trim: true,
      },

      appVersion: {
        type: String,
        default: "",
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// User's reports + newest first
reportSchema.index({
  userId: 1,
  createdAt: -1,
});

// Useful when filtering reports by status
reportSchema.index({
  userId: 1,
  status: 1,
  createdAt: -1,
});

export const Report = mongoose.model("Report", reportSchema);
