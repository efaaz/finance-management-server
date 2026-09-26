import { Router} from "express";
import { createCategory, getUserCreatedCategories,deleteUserCreatedCategory } from "../controllers/category.controller.js";
const router = Router();

import { verifyJWT } from "../middlewares/auth.middleware.js";

router.route("/getUserCreatedCategories").get(verifyJWT, getUserCreatedCategories);
router.route("/createCategory").post(verifyJWT, createCategory);
router.route("/delete/:categoryId").delete(verifyJWT, deleteUserCreatedCategory);

export default router;