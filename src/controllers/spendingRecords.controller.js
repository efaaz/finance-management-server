import { asyncHandler } from "../utils/asyncHandler.js";
import { SpendingRecord } from "../model/spendingRecored.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { dailyRecord } from "../model/dailyRecords.model.js";

const createSpendingRecord = asyncHandler(async (req, res) => {
  const { date, spending } = req.body; // Spending is expected as { category: amount, ... }

  if (
    !date ||
    typeof spending !== "object" ||
    Object.keys(spending).length === 0
  ) {
    throw new ApiError(
      400,
      "Date and spending categories with amounts are required"
    );
  }

  const user = req.user; // Assume req.user contains the authenticated user's details

  // Check if a daily record already exists for the user on the given date
  let dailyRecordExists = await dailyRecord.findOne({ user: user._id, date });

  if (!dailyRecordExists) {
    // Create a new daily record if not found
    dailyRecordExists = await dailyRecord.create({
      user: user._id,
      date,
    });
  }

  // Prepare the spending updates for the SpendingRecord schema
  const updateSpending = {};
  Object.keys(spending).forEach((category) => {
    updateSpending[`spending.${category}`] = spending[category];
  });

  // Upsert the SpendingRecord document
  const spendingRecord = await SpendingRecord.findOneAndUpdate(
    { user: user._id, date },
    {
      $inc: updateSpending, // Increment spending amounts for each category
      $setOnInsert: { user: user._id, dailyRecord: dailyRecordExists._id }, // Set these only if a new document is inserted
    },
    { upsert: true, new: true } // Create a new document if not found, and return the updated document
  );

  // Update the dailyRecord's totalSpending field
  const totalSpendingIncrement = Object.values(spending).reduce(
    (sum, amount) => sum + amount,
    0
  );
  const updatedDailyRecord = await dailyRecord.findOneAndUpdate(
    { user: user._id, date },
    {
      $inc: { totalSpending: totalSpendingIncrement },
    },
    { new: true }
  );

  return res.json(
    new ApiResponse(
      200,
      { spendingRecord, updatedDailyRecord },
      "Spending record updated successfully!"
    )
  );
});

export { createSpendingRecord };
