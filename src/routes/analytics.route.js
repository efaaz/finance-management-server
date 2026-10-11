import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getFinancialReports } from "../controllers/analytics.controller.js";
const router = Router();

router.route("/fullReport").get(verifyJWT, getFinancialReports);

export default router;
