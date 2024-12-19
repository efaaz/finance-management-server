import { Router} from "express";
import { updateDailyRecord } from "../controllers/dailyRecords.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();


router.route("/updateDailyRecord").post(verifyJWT, updateDailyRecord);

export default router;