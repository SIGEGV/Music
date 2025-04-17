import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { USER } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.service.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import { SONG } from "../models/song.model.js";
import { OTP } from "../models/otp.model.js";
import otpGenerator from "otp-generator";
import bcrypt from "bcrypt";
import tempUserStorage from "../utils/tempUserStorage.js";
import { sendOtp } from "../utils/mailService.js";
import {
  EMAIL_FOR_OTP,
  ERROR_MESSAGES,
  RESPONSE_MESSAGES,
  STATUS_CODE,
} from "./controller.constants.js";
import { SONG_FIELDS, USER_FIELDS } from "../models/models.constansts.js";

/**
 * Generates access and refresh tokens for a user.
 *
 * @async
 * @function generateAccessAndRefreshToken
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Object>} - An object containing accessToken and refreshToken.
 * @throws {apiError} 500 - If token generation fails.
 * @description Fetches the user by ID, generates access and refresh tokens, saves the refresh token, and returns both tokens.
 */
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await USER.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.UNABLE_TO_GENERATE_TOKENS
    );
  }
};

/**
 * @route POST /register
 * @group User - Operations related to user registration
 * @param {Object} req.body - The user registration data
 * @param {string} req.body.fullname - The full name of the user
 * @param {string} req.body.email - The email of the user
 * @param {string} req.body.username - The username of the user
 * @param {string} req.body.password - The password for the user account
 * @param {Object} req.files - The files uploaded (in this case, an avatar image)
 * @param {string} req.files.avatar - The avatar image uploaded by the user
 * @returns {Object} 200 - OTP sent successfully with a cookie for email verification
 * @returns {Error} 400 - Missing fields (fullname, email, username, password, or avatar)
 * @returns {Error} 409 - Email or username already exists in the database
 * @returns {Error} 500 - OTP storage or sending failure
 * @description Registers a new user, uploads their avatar to Cloudinary, checks for existing email or username, and sends an OTP for email verification.
 * After a successful registration, an OTP is sent to the user's email, and a cookie is set for further verification.
 */
const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;
  if (
    [fullname, email, username, password].some(
      (fields) => fields?.trim() === ""
    )
  ) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.MISSING_FIELDS);
  }
  const userExist = await USER.findOne({
    $or: [{ username }, { email }],
  });

  if (userExist) {
    throw new apiError(
      STATUS_CODE.CONFLICT,
      ERROR_MESSAGES.EMAIL_OR_USERNAME_EXISTS
    );
  }
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  if (!avatarLocalPath) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.AVATAR_MISSING);
  }

  const avatarPath = await uploadOnCloudinary(avatarLocalPath);
  if (!avatarPath) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.AVATAR_MISSING);
  }
  tempUserStorage[email] = { fullname, username, password, avatarPath };
  const generateOtp = otpGenerator.generate(6, {
    digits: true,
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
  const hashedOtp = await bcrypt.hash(generateOtp, 10);
  await OTP.deleteMany({ email });
  const otpCreated = await OTP.create({ email: email, otp: hashedOtp });
  if (!otpCreated) {
    throw new apiError(STATUS_CODE.INTERNAL_SERVER_ERROR, OTP_FAILED_TO_STORE);
  }
  const sent = await sendOtp(email, generateOtp);
  if (!sent) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.FAILED_TO_SEND_OTP
    );
  }
  const options = {
    httpOnly: true,
    secure: true,
    maxAge: 5 * 60 * 1000,
  };
  return res
    .status(STATUS_CODE.SUCCESS)
    .cookie(EMAIL_FOR_OTP, email, options)
    .json(new apiResponse(STATUS_CODE.SUCCESS, RESPONSE_MESSAGES.OTP_SENT));
});

/**
 * @route POST /verify-otp
 * @group User - Operations related to user registration
 * @param {Object} req.body - The OTP verification data
 * @param {string} req.body.otp - The OTP sent to the user's email for verification
 * @returns {Object} 200 - User successfully registered
 * @returns {Error} 400 - Missing OTP in the request
 * @returns {Error} 400 - OTP expired or not found
 * @returns {Error} 400 - Invalid OTP
 * @returns {Error} 400 - Session expired (user details missing)
 * @returns {Error} 500 - User registration failure
 * @description Verifies the OTP entered by the user, registers the user if the OTP is correct, and clears the OTP cookie.
 * After successful OTP verification, the user details are stored in the database, and a success response is returned.
 */
const verifyUserOtpAndRegister = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const email = req.cookies.emailForOTP;
  if ([otp].some((fields) => fields?.trim() === "")) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.MISSING_OTP);
  }
  const otpRecord = await OTP.findOne({ email });
  if (!otpRecord) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.OTP_EXPIRED);
  }
  const isMatch = await bcrypt.compare(otp, otpRecord.otp);
  if (!isMatch) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.INVALID_OTP);
  }
  await OTP.deleteOne({ email });
  const userDetails = tempUserStorage[email];
  if (!userDetails) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.SESSION_EXPIRED);
  }
  const { fullname, username, password, avatarPath } = userDetails;

  const user = await USER.create({
    fullname,
    email,
    username,
    password,
    avatar: avatarPath.url,
  });
  delete tempUserStorage[email];
  const userCreated = await USER.findById(user._id).select(
    `-${USER_FIELDS.PASSWORD} -${USER_FIELDS.REFRESH_TOKEN}`
  );
  if (!userCreated) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.REGISTRATION_FAILED
    );
  }
  res.clearCookie(EMAIL_FOR_OTP);
  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(STATUS_CODE.SUCCESS, RESPONSE_MESSAGES.USER_REGISTERED)
    );
});

/**
 * @route POST /login
 * @group User - Operations related to user authentication
 * @param {Object} req.body - The login data
 * @param {string} req.body.username - The username of the user trying to log in
 * @param {string} req.body.email - The email of the user trying to log in
 * @param {string} req.body.password - The password of the user trying to log in
 * @returns {Object} 200 - User successfully logged in with access and refresh tokens
 * @returns {Error} 400 - Missing fields in the request body
 * @returns {Error} 404 - User not found
 * @returns {Error} 400 - Invalid credentials (username/email mismatch)
 * @returns {Error} 401 - Invalid password
 * @description Authenticates a user by checking the provided credentials (username/email and password).
 * If valid, the user is logged in, and access and refresh tokens are issued and sent as cookies.
 */
const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!(username || email || password)) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.MISSING_FIELDS);
  }
  const user = await USER.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new apiError(STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  if (username && email) {
    const emailUser = await USER.findOne({ email });
    if (!emailUser || emailUser.username !== username) {
      throw new apiError(
        STATUS_CODE.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_CREDENTIALS
      );
    }
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new apiError(
      STATUS_CODE.UNAUTHORIZED,
      ERROR_MESSAGES.INVALID_CREDENTIALS
    );
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = await USER.findById(user._id).select(
    `-${USER_FIELDS.PASSWORD} -${USER_FIELDS.REFRESH_TOKEN}`
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(STATUS_CODE.SUCCESS)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        {
          user: loggedInUser,
          accessToken,
          refreshToken, // for Mobile Apps
        },
        RESPONSE_MESSAGES.USER_LOGGED_IN
      )
    );
});

/**
 * @route POST /logout
 * @group User - Operations related to user authentication
 * @param {Object} req.headers - The request headers
 * @returns {Object} 200 - User successfully logged out and cookies cleared
 * @returns {Error} 401 - Unauthorized request, invalid or expired tokens
 * @description Logs the user out by removing the refresh token from the database, clearing the authentication cookies, and responding with a success message.
 */
const loggedoutUser = asyncHandler(async (req, res) => {
  const user = req.user._id;
  await USER.findByIdAndUpdate(
    // Removing Refresh token form db
    user,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(STATUS_CODE.SUCCESS)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        {},
        RESPONSE_MESSAGES.USER_LOGGED_OUT
      )
    );
});

/**
 * @route POST /refresh-token
 * @group User - Operations related to user authentication
 * @param {Object} req.cookies - The cookies, including the refresh token
 * @param {string} req.body.refreshToken - Optional refresh token provided in the body
 * @returns {Object} 200 - New access and refresh tokens are returned and set in cookies
 * @returns {Error} 401 - Unauthorized request due to missing or invalid refresh token
 * @description Refreshes the user's access token by verifying the provided refresh token and issuing a new access and refresh token.
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(
      STATUS_CODE.UNAUTHORIZED,
      ERROR_MESSAGES.UNAUTHORIZED_REQUEST
    );
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await USER.findById(decodedToken?._id);
    if (!user) {
      throw new apiError(
        STATUS_CODE.UNAUTHORIZED,
        ERROR_MESSAGES.INVALID_REFRESHTOKEN
      );
    }

    if (user?.refreshToken !== incomingRefreshToken) {
      throw new apiError(
        STATUS_CODE.UNAUTHORIZED,
        ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED
      );
    }

    const { newAccessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(STATUS_CODE.SUCCESS)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          STATUS_CODE.SUCCESS,
          { newAccessToken: newAccessToken, refreshToken: newRefreshToken },
          RESPONSE_MESSAGES.ACCESS_TOKEN_REFRESHED
        )
      );
  } catch (error) {
    throw new apiError(
      STATUS_CODE.UNAUTHORIZED,
      ERROR_MESSAGES.INVALID_REFRESHTOKEN
    );
  }
});

/**
 * @route POST /change-password
 * @group User - Operations related to user account management
 * @param {Object} req.body - The request body containing password change details
 * @param {string} req.body.oldPassword - The user's current password
 * @param {string} req.body.newPassword - The new password to set
 * @param {string} req.body.confirmPassword - The confirmation of the new password
 * @returns {Object} 200 - Password successfully updated
 * @returns {Error} 400 - Incorrect old password, password mismatch, or unauthorized request
 * @description Changes the user's current password by validating the old password and ensuring that the new password matches the confirmation.
 */
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  console.log(oldPassword, newPassword, confirmPassword);
  const user = req.user;

  try {
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      throw new apiError(
        STATUS_CODE.BAD_REQUEST,
        ERROR_MESSAGES.INCORRECT_OLD_PASSWORD
      );
    }
    if (newPassword !== confirmPassword) {
      throw new apiError(
        STATUS_CODE.BAD_REQUEST,
        ERROR_MESSAGES.PASSWORD_MISMATCH
      );
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res
      .status(200)
      .json(
        new apiResponse(
          STATUS_CODE.SUCCESS,
          {},
          RESPONSE_MESSAGES.PASSWORD_UPDATED
        )
      );
  } catch (error) {
    throw new apiError(
      STATUS_CODE.BAD_REQUEST,
      ERROR_MESSAGES.UNAUTHORIZED_REQUEST
    );
  }
});

/**
 * @route GET /current-user
 * @group User - Operations related to user account management
 * @param {Object} req.user - The authenticated user's details from the JWT
 * @returns {Object} 200 - The current authenticated user's details
 * @returns {Error} 401 - Unauthorized request, no valid authentication token
 * @description Fetches the details of the currently authenticated user, excluding sensitive fields like password and refresh token.
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await USER.findById(req.user?._id).select(
    `-${USER_FIELDS.PASSWORD} -${USER_FIELDS.REFRESH_TOKEN}`
  );
  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { user },
        RESPONSE_MESSAGES.USER_FETCHED
      )
    );
});

/**
 * @route PATCH /update-account
 * @group User - Operations related to user account management
 * @param {Object} req.body - The request body containing updated user details
 * @param {string} req.body.fullname - The updated full name of the user
 * @param {string} req.body.email - The updated email of the user
 * @returns {Object} 200 - Successfully updated user account details
 * @returns {Error} 400 - Missing fields in the request or invalid details
 * @returns {Error} 500 - Failed to update user account due to server issues
 * @description Updates the authenticated user's details such as fullname and email.
 */
const updateUserDetail = asyncHandler(async (req, res) => {
  try {
    const { fullname, email } = req.body;
    if (!fullname || !email) {
      throw new apiError(
        STATUS_CODE.BAD_REQUEST,
        ERROR_MESSAGES.MISSING_FIELDS
      );
    }
    const user = await USER.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullname: fullname,
          email: email,
        },
      },
      { new: true }
    ).select(`-${USER_FIELDS.PASSWORD}`);

    return res
      .status(STATUS_CODE.SUCCESS)
      .json(
        new apiResponse(
          STATUS_CODE.SUCCESS,
          { user: user },
          RESPONSE_MESSAGES.ACCOUNT_UPDATED
        )
      );
  } catch (error) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.USER_UPDATION_FAILED
    );
  }
});

/**
 * @route PATCH /update-avatar
 * @group User - Operations related to user account management
 * @param {Object} req.file - The file representing the user's avatar image
 * @returns {Object} 200 - Successfully updated user avatar
 * @returns {Error} 400 - Missing avatar file
 * @returns {Error} 500 - Failed to upload avatar to Cloudinary
 * @description Allows the user to upload and update their avatar image.
 */
const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new apiError(STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.AVATAR_MISSING);
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.FAILED_AVATAR_UPLOAD
    );
  }
  const user = await USER.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select(`-${USER_FIELDS.PASSWORD}`);

  return res
    .status(200)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        { user: user },
        RESPONSE_MESSAGES.AVATAR_UPDATED
      )
    );
});

/**
 * @route GET /user/{userId}/content
 * @group User - Operations related to user data retrieval
 * @param {string} userId.path - The user ID whose content is being retrieved
 * @returns {Object} 200 - Successfully fetched user content (user and songs)
 * @returns {Error} 400 - Invalid user ID format
 * @returns {Error} 404 - User not found
 * @description Fetches a user's public content, such as their username, fullname, avatar, and associated songs.
 */
const getUserContent = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new apiError(
        STATUS_CODE.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_USER_ID
      );
    }

    const user = await USER.findById(userId).select(
      `${USER_FIELDS.USERNAME} ${USER_FIELDS.FULLNAME} ${USER_FIELDS.AVATAR}`
    );
    if (!user) {
      throw new apiError(STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const songs = await SONG.find({ owner: userId });

    return res
      .status(STATUS_CODE.SUCCESS)
      .json(
        new apiResponse(
          STATUS_CODE.SUCCESS,
          { user, songs },
          RESPONSE_MESSAGES.USER_FETCHED
        )
      );
  } catch (error) {
    throw new apiError(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.SERVER_ERROR
    );
  }
});

/**
 * @route POST /watchHistory
 * @group User - Operations related to user data retrieval
 * @param {Object} req.user - The authenticated user's details from the JWT
 * @returns {Object} 200 - Successfully fetched the user's watch history
 * @returns {Error} 404 - User not found
 * @description Fetches the authenticated user's watch history, including the songs they have watched, along with related metadata.
 */
const getWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await USER.findById(userId)
    .populate({
      path: USER_FIELDS.WATCH_HISTORY_SONG,
      select: `${SONG_FIELDS.TITLE} ${SONG_FIELDS.THUMBNAIL} ${SONG_FIELDS.DURATION} ${SONG_FIELDS.OWNER}`,
      populate: {
        path: SONG_FIELDS.OWNER,
        select: `${USER_FIELDS.USERNAME} ${USER_FIELDS.AVATAR}`,
      },
    })
    .select(USER_FIELDS.WATCH_HISTORY);

  if (!user) {
    throw new apiError(STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  return res
    .status(STATUS_CODE.SUCCESS)
    .json(
      new apiResponse(
        STATUS_CODE.SUCCESS,
        user.watchHistory,
        RESPONSE_MESSAGES.WATCH_HISTORY_FETCHED
      )
    );
});

export {
  registerUser,
  loginUser,
  loggedoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetail,
  updateAvatar,
  getUserContent,
  verifyUserOtpAndRegister,
  getWatchHistory,
};
