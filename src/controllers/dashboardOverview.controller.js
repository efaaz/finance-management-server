import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Transaction } from "../model/transection.model.js";

// Bangladesh is currently UTC+6 and does not use DST.
// Keeping the timezone explicit prevents Vercel's UTC runtime
// from shifting your dashboard dates.
const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const getBangladeshNow = () => {
  return new Date(Date.now() + BD_OFFSET_MS);
};

const getDayStartInBangladesh = (year, month, day) => {
  // Create midnight in Bangladesh and convert it to UTC.
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - BD_OFFSET_MS);
};

const getMonthRange = () => {
  const now = getBangladeshNow();

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const start = getDayStartInBangladesh(year, month, 1);

  const end = getDayStartInBangladesh(year, month + 1, 1);

  return {
    start,
    end,
    year,
    month,
  };
};

const getCurrentWeekRange = () => {
  const now = getBangladeshNow();

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  // JavaScript:
  // Sunday = 0
  // Monday = 1
  // ...
  // Saturday = 6
  const dayOfWeek = now.getUTCDay();

  // Current week starts on Sunday.
  const daysFromSunday = dayOfWeek;

  const start = getDayStartInBangladesh(year, month, day - daysFromSunday);

  // Sunday -> Saturday = 7 calendar days.
  // Saturday 00:00 is the exclusive end.
  const end = new Date(start.getTime() + 7 * DAY_MS);

  return {
    start,
    end,
  };
};

const getFinancialSummary = async (match) => {
  const result = await Transaction.aggregate([
    {
      $match: match,
    },

    {
      $group: {
        _id: null,

        totalIncome: {
          $sum: {
            $cond: [
              {
                $eq: ["$type", "income"],
              },
              "$amount",
              0,
            ],
          },
        },

        totalSpending: {
          $sum: {
            $cond: [
              {
                $eq: ["$type", "spending"],
              },
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
  ]);

  return (
    result[0] ?? {
      totalIncome: 0,
      totalSpending: 0,
      transactionCount: 0,
    }
  );
};

const calculateSavingsRate = (income, netIncome) => {
  if (!income || income <= 0) {
    return 0;
  }

  return Number(((netIncome / income) * 100).toFixed(2));
};

const getDashboardOverview = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // ==========================================
  // Date ranges
  // ==========================================

  const monthRange = getMonthRange();
  const weekRange = getCurrentWeekRange();

  const lifetimeMatch = {
    userId,
  };

  const weeklyMatch = {
    userId,
    date: {
      $gte: weekRange.start,
      $lt: weekRange.end,
    },
  };

  const monthlyMatch = {
    userId,
    date: {
      $gte: monthRange.start,
      $lt: monthRange.end,
    },
  };

  // ==========================================
  // Fetch independent dashboard data
  // ==========================================

  const [
    lifetimeSummary,
    weeklySummary,
    monthlySummary,
    spendingByCategory,
    monthlyTrend,
    recentTransactions,
  ] = await Promise.all([
    // --------------------------------------
    // Lifetime summary
    // --------------------------------------

    getFinancialSummary(lifetimeMatch),

    // --------------------------------------
    // Current week
    // Sunday -> Friday
    // --------------------------------------

    getFinancialSummary(weeklyMatch),

    // --------------------------------------
    // Current month
    // --------------------------------------

    getFinancialSummary(monthlyMatch),

    // --------------------------------------
    // Monthly spending by category
    // --------------------------------------

    Transaction.aggregate([
      {
        $match: {
          ...monthlyMatch,
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
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          categoryName: {
            $ifNull: ["$category.categoryName", "Unknown"],
          },
          amount: 1,
        },
      },

      {
        $sort: {
          amount: -1,
        },
      },

      // Dashboard only needs the top 5.
      {
        $limit: 5,
      },
    ]),

    // --------------------------------------
    // Current month daily trend
    // --------------------------------------

    Transaction.aggregate([
      {
        $match: monthlyMatch,
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
              timezone: "Asia/Dhaka",
            },
          },

          income: {
            $sum: {
              $cond: [
                {
                  $eq: ["$type", "income"],
                },
                "$amount",
                0,
              ],
            },
          },

          spending: {
            $sum: {
              $cond: [
                {
                  $eq: ["$type", "spending"],
                },
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

      {
        $project: {
          _id: 0,
          date: "$_id",
          income: 1,
          spending: 1,
          transactionCount: 1,
        },
      },

      {
        $sort: {
          date: 1,
        },
      },
    ]),

    // --------------------------------------
    // Recent transactions
    // --------------------------------------

    Transaction.find({
      userId,
    })
      .sort({
        date: -1,
      })
      .limit(5)
      .populate({
        path: "categoryId",
        select: "categoryName type",
      })
      .lean(),
  ]);

  // ==========================================
  // Calculate derived values
  // ==========================================

  // Lifetime
  const lifetimeIncome = lifetimeSummary.totalIncome || 0;

  const lifetimeSpending = lifetimeSummary.totalSpending || 0;

  const lifetimeNetIncome = lifetimeIncome - lifetimeSpending;

  // Weekly
  const weeklyIncome = weeklySummary.totalIncome || 0;

  const weeklySpending = weeklySummary.totalSpending || 0;

  const weeklyNetIncome = weeklyIncome - weeklySpending;

  const weeklySavingsRate = calculateSavingsRate(weeklyIncome, weeklyNetIncome);

  // Monthly
  const monthlyIncome = monthlySummary.totalIncome || 0;

  const monthlySpending = monthlySummary.totalSpending || 0;

  const monthlyNetIncome = monthlyIncome - monthlySpending;

  const monthlySavingsRate = calculateSavingsRate(
    monthlyIncome,
    monthlyNetIncome
  );

  // ==========================================
  // Spending category percentages
  // ==========================================

  const formattedSpendingByCategory = spendingByCategory.map((category) => ({
    ...category,

    percentage:
      monthlySpending > 0
        ? Number(((category.amount / monthlySpending) * 100).toFixed(2))
        : 0,
  }));

  const topSpendingCategory = formattedSpendingByCategory[0] ?? null;

  // ==========================================
  // Fill missing trend dates
  // ==========================================

  const trendMap = new Map(monthlyTrend.map((item) => [item.date, item]));

  const now = getBangladeshNow();

  const currentYear = now.getUTCFullYear();

  const currentMonth = now.getUTCMonth();

  const currentDay = now.getUTCDate();

  const trend = [];

  for (let day = 1; day <= currentDay; day++) {
    const localDate = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;

    const existing = trendMap.get(localDate);

    trend.push({
      date: localDate,
      income: existing?.income ?? 0,
      spending: existing?.spending ?? 0,
      transactionCount: existing?.transactionCount ?? 0,
    });
  }

  // ==========================================
  // Final response
  // ==========================================

  const dashboard = {
    lifetime: {
      totalIncome: lifetimeIncome,
      totalSpending: lifetimeSpending,
      netIncome: lifetimeNetIncome,
      transactionCount: lifetimeSummary.transactionCount || 0,
    },

    weekly: {
      startDate: weekRange.start,
      endDate: new Date(weekRange.end.getTime() - 1),

      totalIncome: weeklyIncome,
      totalSpending: weeklySpending,
      netIncome: weeklyNetIncome,
      savingsRate: weeklySavingsRate,
      transactionCount: weeklySummary.transactionCount || 0,
    },

    monthly: {
      startDate: monthRange.start,
      endDate: new Date(monthRange.end.getTime() - 1),

      totalIncome: monthlyIncome,
      totalSpending: monthlySpending,
      netIncome: monthlyNetIncome,
      savingsRate: monthlySavingsRate,
      transactionCount: monthlySummary.transactionCount || 0,
    },

    topSpendingCategory,

    spendingByCategory: formattedSpendingByCategory,

    trend,

    recentTransactions,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        dashboard,
        "Dashboard overview fetched successfully."
      )
    );
});

export { getDashboardOverview };
