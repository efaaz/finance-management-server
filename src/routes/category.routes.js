import { Router } from "express";
import {
  createCategory,
  getUserCreatedCategories,
  deleteUserCreatedCategory,
  toggleCategoryStatus,
  getAvailableCategories,
  getManageCategories,
} from "../controllers/category.controller.js";
const router = Router();

import { verifyJWT } from "../middlewares/auth.middleware.js";

router
  .route("/getUserCreatedCategories")
  .get(verifyJWT, getUserCreatedCategories);
router.route("/createCategory").post(verifyJWT, createCategory);
router
  .route("/delete/:categoryId")
  .delete(verifyJWT, deleteUserCreatedCategory);
router.patch("/:categoryId/toggle", verifyJWT, toggleCategoryStatus);
router.get("/available", verifyJWT, getAvailableCategories);
router.get("/manage", verifyJWT, getManageCategories);
export default router;
