import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { Report } from "../model/helpReport.model.js";
import { generateReportCode } from "../utils/generateReportCode.js";

const createReport = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const {
    title,
    description,
    category,
    priority,
    stepsToReproduce,
    environment,
  } = req.body;

  // ==========================================
  // Required validation
  // ==========================================

  if (!title?.trim()) {
    throw new ApiError(400, "Issue title is required.");
  }

  if (!description?.trim()) {
    throw new ApiError(400, "Issue description is required.");
  }

  // ==========================================
  // Allowed values
  // ==========================================

  const allowedCategories = [
    "bug",
    "transaction",
    "account",
    "technical",
    "other",
  ];

  const allowedPriorities = ["low", "medium", "high"];

  if (!allowedCategories.includes(category)) {
    throw new ApiError(400, "Invalid report category.");
  }

  if (!allowedPriorities.includes(priority)) {
    throw new ApiError(400, "Invalid report priority.");
  }

  // ==========================================
  // Create report
  // ==========================================

  const report = await Report.create({
    reportCode: generateReportCode(),

    userId,

    title: title.trim(),

    description: description.trim(),

    category,

    priority,

    stepsToReproduce: stepsToReproduce?.trim() || "",

    environment: {
      browser: environment?.browser?.trim() || "",

      platform: environment?.platform?.trim() || "",

      appVersion: environment?.appVersion?.trim() || "",
    },
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        report: report.toObject(),
      },
      "Report submitted successfully."
    )
  );
});

const getMyReportById = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new ApiError(400, "Invalid report ID.");
  }

  const report = await Report.findOne({
    _id: reportId,
    userId,
  }).lean();

  if (!report) {
    throw new ApiError(404, "Report not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, report, "Report retrieved successfully."));
});

export { createReport, getMyReportById };
