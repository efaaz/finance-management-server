import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {Category} from "../model/category.model.js";

// get all categories
const getCategories = asyncHandler(async (req, res) => {
  const user = req.user; // Authenticated user

  const categories = await Category.find({ user: user._id });

  return res.json(new ApiResponse(200, categories, "Categories found."));
});