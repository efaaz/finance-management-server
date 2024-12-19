import { Router} from "express";
import { createSpendingRecord } from "../controllers/spendingRecords.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();


router.route("/create").post(verifyJWT, createSpendingRecord);

export default router;