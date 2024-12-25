import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Transaction } from "../model/transection.model.js";
import { Category } from "../model/category.model.js";

// Get all transactions
const getTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id; // Authenticated user

  // Fetch all transactions for the authenticated user
  const transactions = await Transaction.find({ userId }).populate(
    "categoryId",
    "-userId"
  );

  return res.json(new ApiResponse(200, transactions, "Transactions found."));
});

// Create a new transection
const createTransection = asyncHandler(async (req, res) => {
  const { userId, categoryId, type, amount, date, note } = req.body;
  const user = req.user_id; // Authenticated user

  if (user) {
    throw new ApiError(401, "Unauthorized.");
  }

  // Validate fields
  if (!date || !userId || !amount || !categoryId || !type || !note) {
    throw new ApiError(400, "All fields are required.");
  }

  // Validate category
  const category = await Category.findOne({
    _id: categoryId,
    $or: [{ userId: null }, { userId }],
  });

  if (!category) {
    return res.status(400).json({ message: "Invalid category" });
  }

  // Create the transaction
  const transaction = await Transaction.create({
    userId,
    date,
    type,
    categoryId,
    amount,
    note,
  });

  return res.json(
    new ApiResponse(201, transaction, "Transection created successfully.")
  );
});

export { getTransactions, createTransection };
