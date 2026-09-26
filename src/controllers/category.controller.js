import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Category } from "../model/category.model.js";
import mongoose from "mongoose";
import { Transaction } from "../model/transection.model.js";

// get all user created categories
const getUserCreatedCategories = asyncHandler(async (req, res) => {
  
  const categories = await Category.find({ userId: req.user._id });

  if (!categories || categories.length === 0) {
    return res.json(new ApiResponse(204, {data:categories}, "No categories found."));
  }
  return res.json(new ApiResponse(200, {categories} , "Categories found."));
});

const createCategory = asyncHandler(async (req, res) => {
  const { categoryName, type } = req.body;
  const userId = req.user._id;

  if (!categoryName || !categoryName.trim()) {
    return res.status(400).json({
      success: false,
      message: "Category name is required",
    });
  }

  if (!["income", "spending"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Category type must be income or spending",
    });
  }

  const normalizedName = categoryName.trim();

  const existingCategory = await Category.findOne({
    userId,
    type,
    categoryName: {
      $regex: `^${normalizedName}$`,
      $options: "i",
    },
  });

  if (existingCategory) {
    return res
      .status(409)
      .json(new ApiError(409, "You already have a category with this name"));
  }

  const category = await Category.create({
    categoryName: normalizedName,
    type,
    userId: userId,
  });

  const created = res
    .status(201)
    .json(new ApiResponse(201, category, "Category created successfully"));

  if (!created) {
    return res.status(500).json(new ApiError(500, "Failed to create category"));
  }
});
const deleteUserCreatedCategory = asyncHandler(
  async (req, res) => {
    const { categoryId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json(
        new ApiResponse(
          400,
          null,
          "Invalid category ID."
        )
      );
    }

    // ---------------------------------------
    // Find only the user's custom category
    // ---------------------------------------

    const category = await Category.findOne({
      _id: categoryId,
      userId: userId,
    });

    if (!category) {
      return res.status(404).json(
        new ApiResponse(
          404,
          null,
          "Category not found or you do not have permission to delete it."
        )
      );
    }

    // ---------------------------------------
    // Check whether transactions use it
    // ---------------------------------------

    const transactionExists = await Transaction.exists({
      categoryId: category._id,
      userId: userId.toString(),
    });

    if (transactionExists) {
      return res.status(409).json(
        new ApiResponse(
          409,
          null,
          "This category is already used by transactions and cannot be deleted."
        )
      );
    }

    // ---------------------------------------
    // Delete category
    // ---------------------------------------

    await Category.deleteOne({
      _id: category._id,
      userId: userId,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "Category deleted successfully."
      )
    );
  }
);
export { getUserCreatedCategories, createCategory, deleteUserCreatedCategory };
