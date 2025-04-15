import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { USER } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { ERROR_MESSAGES, STATUS_CODES } from "./middleware.constants.js";
import { USER_FIELDS } from "../models/models.constansts.js";

/**
 * @description Middleware function to verify the JSON Web Token (JWT) from the request cookies or headers.
 * It decodes the JWT, checks the validity of the token, retrieves the associated user from the database,
 * and attaches the user data to the `req.user` object. If the token is invalid or the user does not exist,
 * it sends an unauthorized error response.
 *
 * This middleware is typically used to protect routes that require authentication.
 *
 * @async
 * @function verifyJWT
 * @param {Object} req - The request object, containing the access token in the cookies or Authorization header.
 * @param {Object} _ - The response object (not used in this function).
 * @param {Function} next - The next middleware function to call once authentication is complete.
 * @returns {void} Calls the `next()` middleware if the token is valid and the user is found.
 * @throws {apiError} Throws an error with a `401 Unauthorized` status if the token is invalid or user does not exist.
 */

export const verifyJWT = asyncHandler(async (req, _, next) => {
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
    const user = await USER.findById(decodedUser._id).select(
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
