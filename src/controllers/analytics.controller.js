import { Transaction } from "../model/transection.model.js";
import { Category } from "../model/category.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// ==================================================
// Configuration
// ==================================================

const TIMEZONE = "Asia/Dhaka";

const SUPPORTED_RANGES = ["6months", "12months"];

const roundToTwo = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const roundToOne = (value) => Math.round((value + Number.EPSILON) * 10) / 10;

// ==================================================
// Date helpers
// ==================================================

// Get the current year and month in Bangladesh time.
// Month returned by Intl is 1-12.
const getCurrentDhakaYearMonth = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);

  const month = Number(parts.find((part) => part.type === "month")?.value);

  return { year, month };
};

// Convert midnight on a Bangladesh calendar month's first day
// into a JavaScript Date representing that instant in UTC.
const getDhakaMonthStart = (year, zeroBasedMonth) => {
  return new Date(Date.UTC(year, zeroBasedMonth, 1) - 6 * 60 * 60 * 1000);
};

const getMonthLabel = (year, zeroBasedMonth) => {
  const date = new Date(Date.UTC(year, zeroBasedMonth, 1));

  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(date);

  const shortYear = String(date.getUTCFullYear()).slice(-2);

  return `${month} '${shortYear}`;
};

// ==================================================
// Main controller
// ==================================================

const getFinancialReports = asyncHandler(async (req, res) => {
  // ------------------------------------------------
  // 1. Validate query parameters
  // ------------------------------------------------

  const requestedRange = req.query.range;

  const range =
    typeof requestedRange === "string" ? requestedRange : "12months";

  if (!SUPPORTED_RANGES.includes(range)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Range must be 6months or 12months."));
  }

  const requestedCurrency = req.query.currency;

  const currency = (
    typeof requestedCurrency === "string"
      ? requestedCurrency
      : req.user.currency || "BDT"
  ).toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Currency must be a valid three-letter currency code."
        )
      );
  }

  // Transaction.userId is currently stored as String.
  const userId = req.user._id;

  // ------------------------------------------------
  // 2. Build the user's currency filter
  // ------------------------------------------------

  // Older records without a currency are treated as BDT.
  // Never combine different currencies in one total.
  const currencyCondition =
    currency === "BDT"
      ? {
          $or: [
            { currency: "BDT" },
            { currency: { $exists: false } },
            { currency: null },
            { currency: "" },
          ],
        }
      : {
          currency,
        };

  const baseMatch = {
    userId,
    ...currencyCondition,
  };

  // ------------------------------------------------
  // 3. All-time financial overview
  // ------------------------------------------------

  const overviewGroups = await Transaction.aggregate([
    {
      $match: baseMatch,
    },
    {
      $group: {
        _id: "$type",

        totalAmount: {
          $sum: "$amount",
        },

        transactionCount: {
          $sum: 1,
        },
      },
    },
  ]);

  const overviewMap = {};

  for (const group of overviewGroups) {
    overviewMap[group._id] = {
      amount: group.totalAmount || 0,
      count: group.transactionCount || 0,
    };
  }

  const totalIncome = roundToTwo(overviewMap.income?.amount || 0);

  const totalSpending = roundToTwo(overviewMap.spending?.amount || 0);

  const netCashFlow = roundToTwo(totalIncome - totalSpending);

  // This is not necessarily the user's actual savings balance.
  const incomeRemainingRate =
    totalIncome > 0 ? roundToOne((netCashFlow / totalIncome) * 100) : 0;

  const totalIncomeTransactions = overviewMap.income?.count || 0;

  const totalSpendingTransactions = overviewMap.spending?.count || 0;

  const totalTransactions = totalIncomeTransactions + totalSpendingTransactions;

  // ------------------------------------------------
  // 4. All-time spending by category
  // ------------------------------------------------

  const categoryGroups = await Transaction.aggregate([
    {
      $match: {
        ...baseMatch,
        type: "spending",
      },
    },
    {
      $group: {
        _id: "$categoryId",

        amount: {
          $sum: "$amount",
        },

        transactions: {
          $sum: 1,
        },
      },
    },
    {
      $lookup: {
        from: Category.collection.name,
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

        name: {
          $ifNull: ["$category.categoryName", "Uncategorized"],
        },

        amount: 1,
        transactions: 1,
      },
    },
    {
      $sort: {
        amount: -1,
      },
    },
  ]);

  const categories = categoryGroups.map((category) => ({
    id: category.categoryId?.toString() || null,

    name: category.name,

    amount: roundToTwo(category.amount),

    transactions: category.transactions,

    sharePercentage:
      totalSpending > 0
        ? roundToOne((category.amount / totalSpending) * 100)
        : 0,
  }));

  const topCategory = categories[0] || null;

  const secondCategory = categories[1] || null;

  const topTwoCategorySharePercentage =
    topCategory && secondCategory
      ? roundToOne(topCategory.sharePercentage + secondCategory.sharePercentage)
      : topCategory?.sharePercentage || 0;

  // ------------------------------------------------
  // 5. Build the monthly trend date range
  // ------------------------------------------------

  const { year, month } = getCurrentDhakaYearMonth();

  const numberOfMonths = range === "6months" ? 6 : 12;

  // month is 1-12; getDhakaMonthStart accepts a
  // zero-based month offset and handles year changes.
  const firstMonthOffset = month - 1 - (numberOfMonths - 1);

  const startDate = getDhakaMonthStart(year, firstMonthOffset);

  const endDate = getDhakaMonthStart(year, month);

  // ------------------------------------------------
  // 6. Monthly income vs. spending aggregation
  // ------------------------------------------------

  const monthlyGroups = await Transaction.aggregate([
    {
      $match: {
        ...baseMatch,

        date: {
          $gte: startDate,
          $lt: endDate,
        },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m",
            date: "$date",
            timezone: TIMEZONE,
          },
        },

        income: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
          },
        },

        spending: {
          $sum: {
            $cond: [{ $eq: ["$type", "spending"] }, "$amount", 0],
          },
        },

        incomeTransactions: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, 1, 0],
          },
        },

        spendingTransactions: {
          $sum: {
            $cond: [{ $eq: ["$type", "spending"] }, 1, 0],
          },
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  // Index aggregated months for quick lookup.
  const monthlyMap = new Map(monthlyGroups.map((item) => [item._id, item]));

  // Return every month, including months with no
  // transactions, so the chart has a continuous timeline.
  const months = [];

  for (let offset = firstMonthOffset; offset <= month - 1; offset++) {
    const monthDate = new Date(Date.UTC(year, offset, 1));

    const monthYear = monthDate.getUTCFullYear();

    const monthNumber = String(monthDate.getUTCMonth() + 1).padStart(2, "0");

    const monthKey = `${monthYear}-${monthNumber}`;

    const group = monthlyMap.get(monthKey);

    const income = roundToTwo(group?.income || 0);

    const spending = roundToTwo(group?.spending || 0);

    months.push({
      monthKey,

      month: getMonthLabel(monthYear, monthDate.getUTCMonth()),

      income,

      spending,

      netCashFlow: roundToTwo(income - spending),

      incomeTransactions: group?.incomeTransactions || 0,

      spendingTransactions: group?.spendingTransactions || 0,
    });
  }

  const trendIncome = roundToTwo(
    months.reduce((sum, item) => sum + item.income, 0)
  );

  const trendSpending = roundToTwo(
    months.reduce((sum, item) => sum + item.spending, 0)
  );

  // ------------------------------------------------
  // 7. Assemble response
  // ------------------------------------------------

  const report = {
    currency,

    timezone: TIMEZONE,

    overview: {
      totalIncome,
      totalSpending,
      netCashFlow,

      incomeRemainingRate,

      totalIncomeTransactions,
      totalSpendingTransactions,
      totalTransactions,
    },

    trend: {
      range,
      months,

      totalIncome: trendIncome,
      totalSpending: trendSpending,

      netCashFlow: roundToTwo(trendIncome - trendSpending),
    },

    categories,

    insights: {
      topSpendingCategory: topCategory,

      secondSpendingCategory: secondCategory,

      topTwoCategorySharePercentage,

      hasPositiveNetCashFlow: netCashFlow > 0,

      hasRecordedIncome: totalIncome > 0,
    },
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, report, "Financial reports fetched successfully.")
    );
});

export { getFinancialReports };
