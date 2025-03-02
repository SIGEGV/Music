import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

// to decode token stored in either cookies or header and then send the user details to the controller or next middleware
export const verifyJWT = asyncHandler(async (req, _, next) => {
  // used _ in replace of res as it is not used in this function
  try {
    const Token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", ""); // for Mobile Apps

    if (!Token) {
      throw new apiError(401, "Unauthorized Request");
    }
    const decodedUser = jwt.verify(Token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedUser._id).select("-refreshToken");
    if (!user) {
      throw new apiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid Access Token");
  }
});
