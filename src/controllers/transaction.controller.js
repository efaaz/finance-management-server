import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Category } from "../model/category.model.js";
import { Transaction } from "../model/transection.model.js";
// Get all transactions
const getTransactions = asyncHandler(async (req, res) => {

  const userId = req.user._id.toString(); // Authenticated user
  const transactions = await Transaction.find({ userId  }).limit(10)

  return res.json(new ApiResponse(200, transactions, "Transactions found."));
});

// Create a new transection
const createTransection = asyncHandler(async (req, res) => {
  const { categoryId, type, amount, date, note } = req.body;
  const userId = req.user._id; // Authenticated user

  // Authorization check
  if (!userId) {
    throw new ApiError(401, "Unauthorized.");
  }

  // Validate required fields
  if (!date || !amount || !categoryId || !type) {
    throw new ApiError(
      400,
      "Fields date, type, amount and categoryId are required."
    );
  }

  // Normalize ISO date string: pad month/day to two digits if needed
  const normalizedDate = date.replace(
    /^(\d{4})-(\d{1,2})-(\d{1,2})T/,
    (_, y, m, d) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T`
  );

  // Parse and validate date
  let dateObj;
  try {
    dateObj = new Date(normalizedDate);
    if (isNaN(dateObj.getTime())) throw new Error();
  } catch {
    throw new ApiError(
      400,
      `Invalid date format '${date}'. Use ISO string or valid Date.`
    );
  }

  // Validate category ownership or default
  const category = await Category.findOne({
    _id: categoryId,
    $or: [{ userId: null }, { userId }],
  });

  if (!category) {
    throw new ApiError(400, "Invalid category.");
  }

  // Create the transaction
  const transaction = await Transaction.create({
    userId,
    date: dateObj,
    type,
    categoryId,
    amount,
    note: note || "",
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, transaction, "Transaction created successfully.")
    );
});

// Get Today's Transactions with Summary (Date only comparison)
const getTodaysTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const today = new Date().toISOString().split('T')[0]; // "2025-01-01"

  const result = await Transaction.aggregate([
    {
      $match: {
        userId,
        $expr: {
          $eq: [
            { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            today
          ]
        }
      }
    },
    {
      $facet: {
        transactions: [
          { $sort: { date: -1 } },
          { $limit: 10 }
        ],
        summary: [
          {
            $group: {
              _id: null,
              totalIncome: {
                $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
              },
              totalSpending: {
                $sum: { $cond: [{ $eq: ["$type", "spending"] }, "$amount", 0] }
              },
              spendingCategories: {
                $push: {
                  $cond: [
                    { $eq: ["$type", "spending"] },
                    { categoryId: "$categoryId", amount: "$amount" },
                    "$$REMOVE"
                  ]
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              totalIncome: 1,
              totalSpending: 1,
              spendingCategories: {
                $reduce: {
                  input: "$spendingCategories",
                  initialValue: [],
                  in: {
                    $concatArrays: [
                      "$$value",
                      "$$this"
                    ]
                  }
                }
              }
            }
          }
        ]
      }
    },
    {
      $project: {
        transactions: 1,
        totalIncome: { $arrayElemAt: ["$summary.totalIncome", 0] },
        totalSpending: { $arrayElemAt: ["$summary.totalSpending", 0] },
        spendingCategories: {
          $arrayElemAt: ["$summary.spendingCategories", 0]
        }
      }
    }
  ]);

  const response = result[0] || {
    transactions: [],
    totalIncome: 0,
    totalSpending: 0,
    spendingCategories: []
  };

  return res.json(new ApiResponse(200, response, "Today's transactions retrieved"));
});

// Get Monthly Transactions with Summary (Date only comparison)
const getMonthlyTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const currentDate = new Date();
  const year = currentDate.getUTCFullYear();
  const month = currentDate.getUTCMonth() + 1;

  const result = await Transaction.aggregate([
    {
      $match: {
        userId,
        $expr: {
          $and: [
            { $eq: [{ $year: "$date" }, year] },
            { $eq: [{ $month: "$date" }, month] }
          ]
        }
      }
    },
    {
      $facet: {
        transactions: [
          { $sort: { date: -1 } }
        ],
        summary: [
          {
            $group: {
              _id: null,
              totalIncome: {
                $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
              },
              totalSpending: {
                $sum: { $cond: [{ $eq: ["$type", "spending"] }, "$amount", 0] }
              },
              spendingCategories: {
                $push: {
                  $cond: [
                    { $eq: ["$type", "spending"] },
                    { categoryId: "$categoryId", amount: "$amount" },
                    "$$REMOVE"
                  ]
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              totalIncome: 1,
              totalSpending: 1,
              spendingCategories: {
                $reduce: {
                  input: "$spendingCategories",
                  initialValue: [],
                  in: {
                    $concatArrays: [
                      "$$value",
                      "$$this"
                    ]
                  }
                }
              }
            }
          }
        ]
      }
    },
    {
      $project: {
        transactions: 1,
        totalIncome: { $arrayElemAt: ["$summary.totalIncome", 0] },
        totalSpending: { $arrayElemAt: ["$summary.totalSpending", 0] },
        spendingCategories: {
          $arrayElemAt: ["$summary.spendingCategories", 0]
        }
      }
    }
  ]);

  const response = result[0] || {
    transactions: [],
    totalIncome: 0,
    totalSpending: 0,
    spendingCategories: []
  };

  return res.json(new ApiResponse(200, response, "Monthly transactions retrieved"));
});

// Get Spending by Category (Aggregation pipeline)
const getSpendingByCategory = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();

  const categorySpending = await Transaction.aggregate([
    { 
      $match: { 
        userId,
        type: 'spending' 
      } 
    },
    {
      $group: {
        _id: "$categoryId",
        totalAmount: { $sum: "$amount" },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $project: {
        categoryId: "$_id",
        totalAmount: 1,
        transactionCount: 1,
        _id: 0
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  return res.json(new ApiResponse(200, categorySpending, "Spending by category"));
});

export { getTransactions, createTransection, getTodaysTransactions, getMonthlyTransactions, getSpendingByCategory };
