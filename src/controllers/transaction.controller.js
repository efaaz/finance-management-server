import mongoose from "mongoose";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Category } from "../model/category.model.js";
import { Transaction } from "../model/transection.model.js";
import { dailyRecord } from "../model/dailyRecords.model.js";
import { SpendingRecord } from "../model/spendingRecored.model.js";



/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Convert a date into the DailyRecord date key.
 * Format: YYYY-MM-DD
 *
 * NOTE:
 * This currently uses UTC.
 * Later, make this timezone-aware based on the user's timezone.
 */
const getDateKey = (date) => {
  return new Date(date).toISOString().slice(0, 10);
};

/**
 * Parse and validate an incoming date.
 */
const parseTransactionDate = (date) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(400, "Invalid date. Please provide a valid ISO date.");
  }

  return parsedDate;
};

/**
 * Validate ObjectId.
 */
const validateObjectId = (id, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${fieldName}.`);
  }
};

/**
 * Check that category belongs to the user
 * or is a global/default category.
 *
 * Also make sure category type matches
 * transaction type.
 */
const getValidCategory = async ({ categoryId, userId, type, session }) => {
  validateObjectId(categoryId, "category");

  const category = await Category.findOne({
    _id: categoryId,
    type,
    $or: [{ userId: null }, { userId }],
  }).session(session);

  if (!category) {
    throw new ApiError(400, "Invalid category for this transaction type.");
  }

  return category;
};

/**
 * Update/create a DailyRecord.
 *
 * Example:
 *
 * incomeDelta = +500
 * spendingDelta = 0
 * netIncomeDelta = +500
 *
 * or:
 *
 * incomeDelta = 0
 * spendingDelta = +500
 * netIncomeDelta = -500
 */
const updateDailyRecord = async ({
  userId,
  dateKey,
  incomeDelta = 0,
  spendingDelta = 0,
  session,
}) => {
  return dailyRecord.findOneAndUpdate(
    {
      user: userId,
      date: dateKey,
    },
    {
      $inc: {
        totalIncome: incomeDelta,
        totalSpending: spendingDelta,
        netIncome: incomeDelta - spendingDelta,
      },

      $setOnInsert: {
        user: userId,
        date: dateKey,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    }
  );
};

/**
 * Update SpendingRecord.
 *
 * spending is a MongoDB Map:
 *
 * spending: {
 *   "<categoryId>": amount
 * }
 *
 * Positive delta:
 *   creates/upserts the category amount.
 *
 * Negative delta:
 *   safely decrements an existing category amount.
 */
const updateSpendingRecord = async ({
  userId,
  dateKey,
  dailyRecordId,
  categoryId,
  delta,
  session,
}) => {
  if (delta === 0) {
    return;
  }

  const categoryKey = categoryId.toString();

  const spendingField = `spending.${categoryKey}`;

  // Adding spending
  if (delta > 0) {
    return SpendingRecord.findOneAndUpdate(
      {
        user: userId,
        date: dateKey,
      },
      {
        $inc: {
          [spendingField]: delta,
        },

        $setOnInsert: {
          user: userId,
          date: dateKey,
          dailyRecord: dailyRecordId,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session,
      }
    );
  }

  // Removing spending
  const result = await SpendingRecord.updateOne(
    {
      user: userId,
      date: dateKey,
      [spendingField]: {
        $gte: Math.abs(delta),
      },
    },
    {
      $inc: {
        [spendingField]: delta,
      },
    },
    {
      session,
    }
  );

  if (result.matchedCount === 0) {
    throw new ApiError(
      500,
      "Spending record is out of sync with transaction data."
    );
  }
};

/**
 * Get pagination values safely.
 */
const getPagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);

  const requestedLimit = Number.parseInt(query.limit, 10) || 10;

  const limit = Math.min(Math.max(requestedLimit, 1), 100);

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};

/*
|--------------------------------------------------------------------------
| Get Transactions
|--------------------------------------------------------------------------
*/

/**
 * GET /transactions
 *
 * Supports:
 * ?page=1
 * ?limit=10
 * ?type=income
 * ?type=spending
 * ?categoryId=...
 */
const getTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const { page, limit, skip } = getPagination(req.query);

  const filter = {
    userId,
  };

  if (req.query.type) {
    if (!["income", "spending"].includes(req.query.type)) {
      throw new ApiError(400, "Invalid transaction type.");
    }

    filter.type = req.query.type;
  }

  if (req.query.categoryId) {
    validateObjectId(req.query.categoryId, "category");

    filter.categoryId = req.query.categoryId;
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate("categoryId", "categoryName type")
      .sort({
        date: -1,
        _id: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    Transaction.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Transactions fetched successfully."
    )
  );
});

/*
|--------------------------------------------------------------------------
| Create Transaction
|--------------------------------------------------------------------------
*/

/**
 * POST /transactions
 */
const createTransaction = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const currency = req.user.defaultCurrency;

  const { categoryId, type, amount, date, note = "" } = req.body;

  if (!categoryId || !type || amount === undefined || !date) {
    throw new ApiError(400, "Category, type, amount and date are required.");
  }

  if (!["income", "spending"].includes(type)) {
    throw new ApiError(400, "Invalid transaction type.");
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new ApiError(400, "Amount must be greater than zero.");
  }

  const dateObj = parseTransactionDate(date);

  const session = await mongoose.startSession();

  let createdTransaction;

  try {
    await session.withTransaction(async () => {
      await getValidCategory({
        categoryId,
        userId,
        type,
        session,
      });

      const transaction = new Transaction({
        userId,
        categoryId,
        type,
        amount: numericAmount,
        currency,
        date: dateObj,
        note: note.trim(),
      });

      await transaction.save({ session });

      createdTransaction = transaction;

      const dateKey = getDateKey(dateObj);

      const dailyRecordDoc = await dailyRecord.findOneAndUpdate(
        {
          user: userId,
          date: dateKey,
          currency,
        },
        {
          $inc: {
            totalIncome: type === "income" ? numericAmount : 0,

            totalSpending: type === "spending" ? numericAmount : 0,

            netIncome: type === "income" ? numericAmount : -numericAmount,
          },

          $setOnInsert: {
            user: userId,
            date: dateKey,
            currency,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          session,
        }
      );

      if (type === "spending") {
        const categoryKey = categoryId.toString();

        await SpendingRecord.findOneAndUpdate(
          {
            user: userId,
            date: dateKey,
            currency,
          },
          {
            $inc: {
              [`spending.${categoryKey}`]: numericAmount,
            },

            $setOnInsert: {
              user: userId,
              date: dateKey,
              currency,
              dailyRecord: dailyRecordDoc._id,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            session,
          }
        );
      }
    });
  } finally {
    await session.endSession();
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        createdTransaction,
        "Transaction created successfully."
      )
    );
});

/*
|--------------------------------------------------------------------------
| Update Transaction
|--------------------------------------------------------------------------
*/

/**
 * PATCH /transactions/:id
 */
const updateTransaction = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const transactionId = req.params.id;

  validateObjectId(transactionId, "transaction");

  const { categoryId, type, amount, date, note } = req.body;

  const session = await mongoose.startSession();

  let updatedTransaction;

  try {
    await session.withTransaction(async () => {
      /*
       * Get existing transaction.
       */
      const existingTransaction = await Transaction.findOne({
        _id: transactionId,
        userId,
      }).session(session);

      if (!existingTransaction) {
        throw new ApiError(404, "Transaction not found.");
      }

      /*
       * Build final values.
       */
      const newType = type ?? existingTransaction.type;

      const newAmount =
        amount !== undefined ? Number(amount) : existingTransaction.amount;

      const newDate =
        date !== undefined
          ? parseTransactionDate(date)
          : existingTransaction.date;

      const newCategoryId = categoryId ?? existingTransaction.categoryId;

      const newNote =
        note !== undefined ? note.trim() : existingTransaction.note;

      /*
       * Validate final values.
       */
      if (!["income", "spending"].includes(newType)) {
        throw new ApiError(400, "Invalid transaction type.");
      }

      if (!Number.isFinite(newAmount) || newAmount <= 0) {
        throw new ApiError(400, "Amount must be greater than zero.");
      }

      await getValidCategory({
        categoryId: newCategoryId,
        userId,
        type: newType,
        session,
      });

      const oldDateKey = getDateKey(existingTransaction.date);

      const newDateKey = getDateKey(newDate);

      const sameBucket =
        existingTransaction.type === newType &&
        existingTransaction.categoryId.toString() ===
          newCategoryId.toString() &&
        oldDateKey === newDateKey;

      /*
       * CASE 1
       *
       * Same date + type + category.
       *
       * Only the amount changed.
       *
       * Example:
       * ৳500 → ৳700
       *
       * We update only the difference.
       */
      if (sameBucket) {
        const amountDelta = newAmount - existingTransaction.amount;

        if (amountDelta !== 0) {
          await updateDailyRecord({
            userId,
            dateKey: oldDateKey,
            incomeDelta: newType === "income" ? amountDelta : 0,
            spendingDelta: newType === "spending" ? amountDelta : 0,
            session,
          });

          if (newType === "spending") {
            await updateSpendingRecord({
              userId,
              dateKey: oldDateKey,
              dailyRecordId: null,
              categoryId: newCategoryId,
              delta: amountDelta,
              session,
            });
          }
        }
      } else {
        /*
         * CASE 2
         *
         * Something structural changed:
         *
         * date
         * type
         * category
         *
         * Reverse old transaction.
         */

        await updateDailyRecord({
          userId,
          dateKey: oldDateKey,
          incomeDelta:
            existingTransaction.type === "income"
              ? -existingTransaction.amount
              : 0,
          spendingDelta:
            existingTransaction.type === "spending"
              ? -existingTransaction.amount
              : 0,
          session,
        });

        if (existingTransaction.type === "spending") {
          await updateSpendingRecord({
            userId,
            dateKey: oldDateKey,
            dailyRecordId: existingTransaction.dailyRecord,
            categoryId: existingTransaction.categoryId,
            delta: -existingTransaction.amount,
            session,
          });
        }

        /*
         * Apply new transaction.
         */
        const newDailyRecord = await updateDailyRecord({
          userId,
          dateKey: newDateKey,
          incomeDelta: newType === "income" ? newAmount : 0,
          spendingDelta: newType === "spending" ? newAmount : 0,
          session,
        });

        if (newType === "spending") {
          await updateSpendingRecord({
            userId,
            dateKey: newDateKey,
            dailyRecordId: newDailyRecord._id,
            categoryId: newCategoryId,
            delta: newAmount,
            session,
          });
        }
      }

      /*
       * Finally update the transaction itself.
       */
      existingTransaction.categoryId = newCategoryId;

      existingTransaction.type = newType;

      existingTransaction.amount = newAmount;

      existingTransaction.date = newDate;

      existingTransaction.note = newNote;

      await existingTransaction.save({
        session,
      });

      updatedTransaction = existingTransaction;
    });
  } finally {
    await session.endSession();
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedTransaction,
        "Transaction updated successfully."
      )
    );
});

/*
|--------------------------------------------------------------------------
| Delete Transaction
|--------------------------------------------------------------------------
*/

/**
 * DELETE /transactions/:id
 */
const deleteTransaction = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const transactionId = req.params.id;

  validateObjectId(transactionId, "transaction");

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const transaction = await Transaction.findOne({
        _id: transactionId,
        userId,
      }).session(session);

      if (!transaction) {
        throw new ApiError(404, "Transaction not found.");
      }

      const dateKey = getDateKey(transaction.date);

      /*
       * Reverse DailyRecord contribution.
       */
      await updateDailyRecord({
        userId,
        dateKey,
        incomeDelta: transaction.type === "income" ? -transaction.amount : 0,
        spendingDelta:
          transaction.type === "spending" ? -transaction.amount : 0,
        session,
      });

      /*
       * Reverse SpendingRecord contribution.
       */
      if (transaction.type === "spending") {
        await updateSpendingRecord({
          userId,
          dateKey,
          dailyRecordId: null,
          categoryId: transaction.categoryId,
          delta: -transaction.amount,
          session,
        });
      }

      /*
       * Delete source transaction.
       */
      await Transaction.deleteOne(
        {
          _id: transactionId,
          userId,
        },
        {
          session,
        }
      );
    });
  } finally {
    await session.endSession();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Transaction deleted successfully."));
});

/*
|--------------------------------------------------------------------------
| Get Today's Transactions
|--------------------------------------------------------------------------
*/

/**
 * GET /transactions/today
 */
const getTodaysTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);

  startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

  const dateKey = getDateKey(startOfToday);

  const [transactions, dailyRecordDoc] = await Promise.all([
    Transaction.find({
      userId,
      date: {
        $gte: startOfToday,
        $lt: startOfTomorrow,
      },
    })
      .populate("categoryId", "categoryName type")
      .sort({
        date: -1,
        _id: -1,
      })
      .limit(6)
      .lean(),

    dailyRecord
      .findOne({
        user: userId,
        date: dateKey,
      })
      .lean(),
  ]);

  /*
   * DailyRecord already contains today's
   * summary, so no Transaction aggregation
   * is needed here.
   */

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        transactions,

        totalIncome: dailyRecordDoc?.totalIncome ?? 0,

        totalSpending: dailyRecordDoc?.totalSpending ?? 0,

        netIncome: dailyRecordDoc?.netIncome ?? 0,
      },
      "Today's transactions fetched successfully."
    )
  );
});

/*
|--------------------------------------------------------------------------
| Get Monthly Transactions
|--------------------------------------------------------------------------
*/

/**
 * GET /transactions/month
 *
 * Returns:
 * - transactions
 * - monthly income
 * - monthly spending
 */
const getMonthlyTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const now = new Date();

  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  const monthStartKey = getDateKey(monthStart);

  const nextMonthStartKey = getDateKey(nextMonthStart);

  const [transactions, summaryResult] = await Promise.all([
    Transaction.find({
      userId,
      date: {
        $gte: monthStart,
        $lt: nextMonthStart,
      },
    })
      .populate("categoryId", "categoryName type")
      .sort({
        date: -1,
        _id: -1,
      })
      .lean(),

    dailyRecord.aggregate([
      {
        $match: {
          user: userId,
          date: {
            $gte: monthStartKey,
            $lt: nextMonthStartKey,
          },
        },
      },

      {
        $group: {
          _id: null,

          totalIncome: {
            $sum: "$totalIncome",
          },

          totalSpending: {
            $sum: "$totalSpending",
          },

          netIncome: {
            $sum: "$netIncome",
          },
        },
      },

      {
        $project: {
          _id: 0,
          totalIncome: 1,
          totalSpending: 1,
          netIncome: 1,
        },
      },
    ]),
  ]);

  const summary = summaryResult[0] ?? {
    totalIncome: 0,
    totalSpending: 0,
    netIncome: 0,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        transactions,
        totalIncome: summary.totalIncome,
        totalSpending: summary.totalSpending,
        netIncome: summary.netIncome,
      },
      "Monthly transactions fetched successfully."
    )
  );
});

/*
|--------------------------------------------------------------------------
| Spending By Category
|--------------------------------------------------------------------------
*/

/**
 * GET /transactions/spending-by-category
 *
 * Optional:
 *
 * ?from=2026-09-01
 * ?to=2026-09-30
 */
const getSpendingByCategory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const match = {
    userId,
    type: "spending",
  };

  /*
   * Optional date filtering.
   */
  if (req.query.from || req.query.to) {
    match.date = {};

    if (req.query.from) {
      match.date.$gte = parseTransactionDate(req.query.from);
    }

    if (req.query.to) {
      const endDate = parseTransactionDate(req.query.to);

      /*
       * Make `to` inclusive.
       */
      endDate.setUTCHours(23, 59, 59, 999);

      match.date.$lte = endDate;
    }
  }

  const categorySpending = await Transaction.aggregate([
    {
      $match: match,
    },

    {
      $group: {
        _id: "$categoryId",

        totalAmount: {
          $sum: "$amount",
        },

        transactionCount: {
          $sum: 1,
        },
      },
    },

    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },

    {
      $unwind: {
        path: "$category",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 0,

        categoryId: "$_id",

        categoryName: "$category.categoryName",

        totalAmount: 1,

        transactionCount: 1,
      },
    },

    {
      $sort: {
        totalAmount: -1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        categorySpending,
        "Spending by category fetched successfully."
      )
    );
});

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// this months transactions
const getThisMonthTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

  const requestedLimit = Number.parseInt(req.query.limit, 10) || 20;

  const limit = Math.min(Math.max(requestedLimit, 1), 100);

  const skip = (page - 1) * limit;

  /*
  |--------------------------------------------------------------------------
  | Query parameters
  |--------------------------------------------------------------------------
  */

  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";

  const type = typeof req.query.type === "string" ? req.query.type : "all";

  const categoryId =
    typeof req.query.categoryId === "string" ? req.query.categoryId : "all";

  /*
  |--------------------------------------------------------------------------
  | Base transaction filter
  |--------------------------------------------------------------------------
  */

  const match = {
    userId,
  };

  /*
  |--------------------------------------------------------------------------
  | Type filter
  |--------------------------------------------------------------------------
  */

  if (type !== "all") {
    if (!["income", "spending"].includes(type)) {
      throw new ApiError(400, "Invalid transaction type.");
    }

    match.type = type;
  }

  /*
  |--------------------------------------------------------------------------
  | Category filter
  |--------------------------------------------------------------------------
  */

  if (categoryId !== "all") {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new ApiError(400, "Invalid category ID.");
    }

    match.categoryId = new mongoose.Types.ObjectId(categoryId);
  }

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  |
  | Search can match:
  |
  | - transaction note
  | - category name
  |
  | We use $lookup because categoryName lives
  | in the Category collection.
  |
  */

  const pipeline = [
    {
      $match: match,
    },

    {
      $lookup: {
        from: Category.collection.name,
        localField: "categoryId",
        foreignField: "_id",
        as: "category",
      },
    },

    {
      $unwind: "$category",
    },
  ];

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");

    pipeline.push({
      $match: {
        $or: [
          {
            note: {
              $regex: searchRegex,
            },
          },
          {
            "category.categoryName": {
              $regex: searchRegex,
            },
          },
        ],
      },
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Pagination + total count
  |--------------------------------------------------------------------------
  */

  pipeline.push({
    $facet: {
      transactions: [
        {
          $sort: {
            date: -1,
            _id: -1,
          },
        },

        {
          $skip: skip,
        },

        {
          $limit: limit,
        },

        {
          $project: {
            _id: 1,
            userId: 1,

            type: 1,
            date: 1,
            amount: 1,
            currency: 1,
            note: 1,

            categoryId: {
              _id: "$category._id",
              categoryName: "$category.categoryName",
              type: "$category.type",
            },

            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],

      pagination: [
        {
          $count: "total",
        },
      ],
    },
  });

  const result = await Transaction.aggregate(pipeline);

  const aggregationResult = result[0] ?? {};

  const transactions = aggregationResult.transactions ?? [];

  const total = aggregationResult.pagination?.[0]?.total ?? 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        transactions,

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Transactions fetched successfully."
    )
  );
});


const getThisMonthsSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    const now = new Date();

    // Current month boundaries for DailyRecord's YYYY-MM-DD string
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const startDate = `${year}-${month}-01`;

    const nextMonth = new Date(year, now.getMonth() + 1, 1);
    const endYear = nextMonth.getFullYear();
    const endMonth = String(nextMonth.getMonth() + 1).padStart(2, "0");
    const endDate = `${endYear}-${endMonth}-01`;

    // Transaction date boundaries
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const startOfNextMonth = new Date(
      year,
      now.getMonth() + 1,
      1
    );

    const [dailySummary, spendingByCategory] = await Promise.all([
      // --------------------------------
      // 1. Monthly summary from DailyRecord
      // --------------------------------
      dailyRecord.aggregate([
        {
          $match: {
            user: userId,
            date: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalIncome: { $sum: "$totalIncome" },
            totalSpending: { $sum: "$totalSpending" },
            netIncome: { $sum: "$netIncome" },
          },
        },
        {
          $project: {
            _id: 0,
            totalIncome: 1,
            totalSpending: 1,
            netIncome: 1,
          },
        },
      ]),

      // --------------------------------
      // 2. Category-wise spending
      // --------------------------------
      Transaction.aggregate([
        {
          $match: {
            userId: userId,
            type: "spending",
            date: {
              $gte: startOfMonth,
              $lt: startOfNextMonth,
            },
            amount: {
              $gt: 0,
            },
          },
        },

        {
          $group: {
            _id: "$categoryId",
            totalSpending: {
              $sum: "$amount",
            },
          },
        },

        {
          $match: {
            totalSpending: {
              $gt: 0,
            },
          },
        },

        // Get category information
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },

        {
          $unwind: "$category",
        },

        {
          $project: {
            _id: 0,
            categoryId: "$_id",
            categoryName: "$category.categoryName",
            totalSpending: 1,
          },
        },

        {
          $sort: {
            totalSpending: -1,
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: dailySummary[0] || {
          totalIncome: 0,
          totalSpending: 0,
          netIncome: 0,
        },

        spendingByCategory,
      },
    });
  } catch (error) {
    console.error("Get this month's summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get this month's summary",
    });
  }
};


export {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTodaysTransactions,
  getMonthlyTransactions,
  getSpendingByCategory,
  getThisMonthTransactions,
  getThisMonthsSummary
};
