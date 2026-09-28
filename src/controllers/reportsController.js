import asyncHandler from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Transaction } from "../models/transaction.model.js";

const getFinancialReport = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();

  const { startDate, endDate } = req.query;

  // Default: current month
  const now = new Date();

  let start;
  let end;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);

    // Include the complete end date
    end.setHours(23, 59, 59, 999);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "Invalid startDate or endDate."
          )
        );
    }

    if (start > end) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "startDate cannot be greater than endDate."
          )
        );
    }
  } else {
    start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
  }

  // Previous period has the same number of days
  const periodLength =
    end.getTime() - start.getTime() + 1;

  const previousEnd = new Date(start.getTime() - 1);

  const previousStart = new Date(
    start.getTime() - periodLength
  );

  const currentMatch = {
    userId,
    date: {
      $gte: start,
      $lte: end,
    },
  };

  const previousMatch = {
    userId,
    date: {
      $gte: previousStart,
      $lte: previousEnd,
    },
  };

  const [
    overview,
    trend,
    spendingByCategory,
    incomeByCategory,
    topExpenses,
    topIncome,
    transactionCount,
    previousOverview,
  ] = await Promise.all([
    // -----------------------------------
    // CURRENT PERIOD OVERVIEW
    // -----------------------------------
    Transaction.aggregate([
      {
        $match: currentMatch,
      },
      {
        $group: {
          _id: null,

          totalIncome: {
            $sum: {
              $cond: [
                { $eq: ["$type", "income"] },
                "$amount",
                0,
              ],
            },
          },

          totalSpending: {
            $sum: {
              $cond: [
                { $eq: ["$type", "spending"] },
                "$amount",
                0,
              ],
            },
          },

          transactionCount: {
            $sum: 1,
          },
        },
      },
    ]),

    // -----------------------------------
    // DAILY TREND
    // -----------------------------------
    Transaction.aggregate([
      {
        $match: currentMatch,
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
            },
          },

          income: {
            $sum: {
              $cond: [
                { $eq: ["$type", "income"] },
                "$amount",
                0,
              ],
            },
          },

          spending: {
            $sum: {
              $cond: [
                { $eq: ["$type", "spending"] },
                "$amount",
                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          date: "$_id",
          income: 1,
          spending: 1,
        },
      },

      {
        $sort: {
          date: 1,
        },
      },
    ]),

    // -----------------------------------
    // SPENDING BY CATEGORY
    // -----------------------------------
    Transaction.aggregate([
      {
        $match: {
          ...currentMatch,
          type: "spending",
        },
      },

      {
        $group: {
          _id: "$categoryId",
          amount: {
            $sum: "$amount",
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
        $unwind: "$category",
      },

      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          categoryName: "$category.categoryName",
          amount: 1,
        },
      },

      {
        $sort: {
          amount: -1,
        },
      },
    ]),

    // -----------------------------------
    // INCOME BY CATEGORY
    // -----------------------------------
    Transaction.aggregate([
      {
        $match: {
          ...currentMatch,
          type: "income",
        },
      },

      {
        $group: {
          _id: "$categoryId",
          amount: {
            $sum: "$amount",
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
        $unwind: "$category",
      },

      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          categoryName: "$category.categoryName",
          amount: 1,
        },
      },

      {
        $sort: {
          amount: -1,
        },
      },
    ]),

    // -----------------------------------
    // TOP EXPENSES
    // -----------------------------------
    Transaction.aggregate([
      {
        $match: {
          ...currentMatch,
          type: "spending",
        },
      },

      {
        $sort: {
          amount: -1,
        },
      },

      {
        $limit: 5,
      },

      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },

      {
        $unwind: "$category",
      },

      {
        $project: {
          _id: 1,
          amount: 1,
          note: 1,
          date: 1,
          currency: 1,
          categoryId: 1,
          categoryName: "$category.categoryName",
        },
      },
    ]),

    // -----------------------------------
    // TOP INCOME
    // -----------------------------------
    Transaction.aggregate([
      {
        $match: {
          ...currentMatch,
          type: "income",
        },
      },

      {
        $sort: {
          amount: -1,
        },
      },

      {
        $limit: 5,
      },

      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },

      {
        $unwind: "$category",
      },

      {
        $project: {
          _id: 1,
          amount: 1,
          note: 1,
          date: 1,
          currency: 1,
          categoryId: 1,
          categoryName: "$category.categoryName",
        },
      },
    ]),

    // -----------------------------------
    // TRANSACTION COUNT
    // -----------------------------------
    Transaction.countDocuments(currentMatch),

    // -----------------------------------
    // PREVIOUS PERIOD OVERVIEW
    // -----------------------------------
    Transaction.aggregate([
      {
        $match: previousMatch,
      },

      {
        $group: {
          _id: null,

          totalIncome: {
            $sum: {
              $cond: [
                { $eq: ["$type", "income"] },
                "$amount",
                0,
              ],
            },
          },

          totalSpending: {
            $sum: {
              $cond: [
                { $eq: ["$type", "spending"] },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const current = overview[0] || {
    totalIncome: 0,
    totalSpending: 0,
    transactionCount: 0,
  };

  const previous = previousOverview[0] || {
    totalIncome: 0,
    totalSpending: 0,
  };

  const totalIncome = current.totalIncome || 0;
  const totalSpending = current.totalSpending || 0;

  const netIncome = totalIncome - totalSpending;

  const savingsRate =
    totalIncome > 0
      ? (netIncome / totalIncome) * 100
      : 0;

  // Add percentage to spending categories
  const formattedSpendingByCategory =
    spendingByCategory.map((item) => ({
      ...item,
      percentage:
        totalSpending > 0
          ? Number(
              ((item.amount / totalSpending) * 100).toFixed(2)
            )
          : 0,
    }));

  // Add percentage to income categories
  const formattedIncomeByCategory =
    incomeByCategory.map((item) => ({
      ...item,
      percentage:
        totalIncome > 0
          ? Number(
              ((item.amount / totalIncome) * 100).toFixed(2)
            )
          : 0,
    }));

  const previousNetIncome =
    (previous.totalIncome || 0) -
    (previous.totalSpending || 0);

  const calculateChange = (currentValue, previousValue) => {
    if (previousValue === 0) {
      return currentValue > 0 ? 100 : 0;
    }

    return Number(
      (
        ((currentValue - previousValue) / previousValue) *
        100
      ).toFixed(2)
    );
  };

  const report = {
    overview: {
      totalIncome,
      totalSpending,
      netIncome,
      savingsRate: Number(savingsRate.toFixed(2)),
      transactionCount,
    },

    trend,

    spendingByCategory:
      formattedSpendingByCategory,

    incomeByCategory:
      formattedIncomeByCategory,

    topExpenses,

    topIncome,

    comparison: {
      previousPeriod: {
        totalIncome: previous.totalIncome || 0,
        totalSpending: previous.totalSpending || 0,
        netIncome: previousNetIncome,
      },

      changes: {
        income: calculateChange(
          totalIncome,
          previous.totalIncome || 0
        ),

        spending: calculateChange(
          totalSpending,
          previous.totalSpending || 0
        ),

        netIncome: calculateChange(
          netIncome,
          previousNetIncome
        ),
      },
    },

    period: {
      startDate: start,
      endDate: end,
      previousStartDate: previousStart,
      previousEndDate: previousEnd,
    },
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        report,
        "Financial report generated successfully."
      )
    );
});

export { getFinancialReport };