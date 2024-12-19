import { asyncHandler } from "../utils/asyncHandler.js";
import { dailyRecord } from "../model/dailyRecords.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

// Get daily record or create if it doesn't exist
const getOrCreateDailyRecord = asyncHandler(async (req, res) => {
  const user = req.user; // Authenticated user
  const currentDate = new Date()
    .toLocaleDateString("en-GB")
    .replace(/\//g, "-"); // Format: DD-MM-YYYY

  // Check if a daily record exists
  let dailyRecordDoc = await dailyRecord.findOne({
    user: user._id,
    date: currentDate,
  });

  // If no daily record exists, create a new one
  if (!dailyRecordDoc) {
    dailyRecordDoc = await dailyRecord.create({
      user: user._id,
      date: currentDate,
      netIncome: 0, // Initialize netIncome
    });
  } else {
    // Ensure netIncome is correctly calculated
    dailyRecordDoc.netIncome =
      dailyRecordDoc.totalIncome - dailyRecordDoc.totalSpending;
    await dailyRecordDoc.save();
  }

  return res.json(
    new ApiResponse(200, dailyRecordDoc, "Daily record found or created.")
  );
});

// Update daily record (e.g., income, spending)
const updateDailyRecord = asyncHandler(async (req, res) => {
  const { date, totalIncome, totalSpending } = req.body;
  const user = req.user; // Authenticated user

  // Validate fields
  if (!date || (!totalIncome && !totalSpending)) {
    throw new ApiError(
      400,
      "Date and at least one field to update are required."
    );
  }

  // Build update object
  const update = {};
  if (totalIncome !== undefined) update.totalIncome = totalIncome;
  if (totalSpending !== undefined) update.totalSpending = totalSpending;

  // Update or create the daily record
  const updatedRecord = await dailyRecord.findOneAndUpdate(
    { user: user._id, date },
    {
      $set: update,
      $setOnInsert: { user: user._id, date },
    },
    { new: true, upsert: true }
  );

  // Recalculate netIncome
  updatedRecord.netIncome =
    (updatedRecord.totalIncome || 0) - (updatedRecord.totalSpending || 0);
  await updatedRecord.save();

  return res.json(new ApiResponse(200, updatedRecord, "Daily record updated."));
});

// Retrieve all daily records for a user
const getAllDailyRecords = asyncHandler(async (req, res) => {
  const user = req.user; // Authenticated user

  const records = await dailyRecord.find({ user: user._id }).sort({ date: -1 });

  if (!records || records.length === 0) {
    throw new ApiError(404, "No daily records found.");
  }

  // Recalculate netIncome for each record if necessary
  const updatedRecords = records.map((record) => {
    record.netIncome = (record.totalIncome || 0) - (record.totalSpending || 0);
    return record;
  });

  return res.json(new ApiResponse(200, updatedRecords, "Daily records found."));
});

export {
  getOrCreateDailyRecord,
  updateDailyRecord,
  getAllDailyRecords,
};
