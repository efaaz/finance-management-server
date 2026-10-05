import { Router } from "express";

import {
  createReport,
  getMyReportById,
} from "../controllers/HelpReport.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", verifyJWT, createReport);

// router.get("/my-reports", verifyJWT, getMyReports);

router.get("/:reportId", verifyJWT, getMyReportById);

export default router;
