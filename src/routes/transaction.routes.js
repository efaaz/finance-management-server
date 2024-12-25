import { Router} from "express";
import { createTransection, getTransactions } from "../controllers/transaction.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();


router.route("/createTransection").post(verifyJWT, createTransection);
router.route("/getTransactions").get(verifyJWT, getTransactions);

export default router;