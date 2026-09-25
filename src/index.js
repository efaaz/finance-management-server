// src/index.js

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./expressApp.js";

dotenv.config();

await connectDB();

export default app;