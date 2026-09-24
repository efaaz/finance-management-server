import { Router} from "express";
import { createTransaction, getMonthlyTransactions, getSpendingByCategory, getThisMonthTransactions, getTodaysTransactions, getTransactions, getThisMonthsSummary } from "../controllers/transaction.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/createTransaction").post(verifyJWT, createTransaction);
router.route("/getTransactions").get(verifyJWT, getTransactions);
router.route("/getTodaysTransactions").get(verifyJWT, getTodaysTransactions);
router.route("/getThisMonthTransactions").get(verifyJWT, getThisMonthTransactions);
router.route("/getThisMonthsSummary").get(verifyJWT, getThisMonthsSummary); 
router.route('/today').get(getTodaysTransactions);
router.route("/monthly").get(verifyJWT, getMonthlyTransactions);
router.route("/categories").get(verifyJWT, getSpendingByCategory);


export default router;