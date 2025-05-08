import { Router} from "express";
import { createTransection, getMonthlyTransactions, getSpendingByCategory, getTodaysTransactions, getTransactions } from "../controllers/transaction.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();


router.route("/createTransection").post(verifyJWT, createTransection);
router.route("/getTransactions").get(verifyJWT, getTransactions);
router.route('/today').get(getTodaysTransactions);
router.route("/monthly").get(verifyJWT, getMonthlyTransactions);
router.route("/categories").get(verifyJWT, getSpendingByCategory);


export default router;