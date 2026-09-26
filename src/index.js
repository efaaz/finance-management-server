import dotenv from "dotenv";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import connectDB from "./db/index.js";
import userRoutes from "./routes/user.routes.js";
import spendingRecordRoutes from "./routes/spendingRecord.routes.js";
import updateDailyRecord from "./routes/dailyRecords.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import categoryRoutes from "./routes/category.routes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://finx-fawn.vercel.app",
    ],
    credentials: true,
  }),
);

app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/v1/auth/users", userRoutes);
app.use("/api/v1/spending-records", spendingRecordRoutes);
app.use("/api/v1/updateDailyRecord", updateDailyRecord);
app.use("/api/v1/transactions", transactionRoutes);

app.use("/api/v1/categories", categoryRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Finance Management API is running",
  });
});

// Connect to MongoDB
await connectDB();

export default app;