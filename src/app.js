import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import spendingRecordRoutes from "./routes/spendingRecord.routes.js";
import updateDailyRecord from "./routes/dailyRecords.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
    ],
    credentials: true,
    exposedHeaders: ["set-cookie"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.options("*", cors());
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());


app.use("/api/v1/auth/users", userRoutes);
app.use("/api/v1/spending-records", spendingRecordRoutes);
app.use("/api/v1/updateDailyRecord", updateDailyRecord);
app.use("/api/v1/transactions", transactionRoutes);

export { app };
