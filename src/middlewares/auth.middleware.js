import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { ERROR_MESSAGES, STATUS_CODES } from "./middleware.constants.js";
import { USER_FIELDS } from "../models/models.constansts.js";

// to decode token stored in either cookies or header and then send the user details to the controller or next middleware
export const verifyJWT = asyncHandler(async (req, _, next) => {
  // used _ in replace of res as it is not used in this function
  try {
    const Token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", ""); // for Mobile Apps

    if (!Token) {
      throw new apiError(
        STATUS_CODES.UNAUTHORIZED,
        ERROR_MESSAGES.UNAUTHORIZED_REQUEST
      );
    }
    const decodedUser = jwt.verify(Token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedUser._id).select(
      `-${USER_FIELDS.REFRESH_TOKEN}`
    );
    if (!user) {
      throw new apiError(
        STATUS_CODES.UNAUTHORIZED,
        ERROR_MESSAGES.INVALID_ACCESS_TOKEN
      );
    }

    req.user = user;
    next();
  } catch (error) {
    throw new apiError(
      STATUS_CODES.UNAUTHORIZED,
      ERROR_MESSAGES.INVALID_ACCESS_TOKEN
    );
  }
});
