import { Router } from "express";
import { getDashboardOverview } from "../controllers/dashboardOverview.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/overview").get(verifyJWT, getDashboardOverview);

export default router;
