import { User } from "../model/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { ApiResponse } from "../utils/apiResponse.js";
dotenv.config();

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    console.log("From middleware", req.cookies);
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization").replace("Bearer ", "");
      

    if (!token) {
      throw new ApiResponse(401, null, "Authorization required");
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded?._id).select(
      "-password -refreshToken"
    );
    console.log("User from middleware", user);
    
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Unauthorized Access Token");
  }
});
